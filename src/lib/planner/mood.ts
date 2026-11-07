import { ingredientKey } from "@/lib/units";

/**
 * Une envie en mots de tous les jours (« un truc réconfortant », « j'ai la flemme »)
 * renvoie vers les tags de la bibliothèque. Les mots sont comparés sans accents et au singulier.
 */
const MOODS: { words: string[]; tags: string[] }[] = [
  { words: ["reconfortant", "doudou", "cocooning", "cocon", "regressif", "gourmand", "hiver", "froid", "pluie"], tags: ["comfort food", "mijoté", "au four"] },
  { words: ["leger", "light", "detox", "regime", "sain", "healthy", "frai", "ete", "equilibre"], tags: ["léger", "végé"] },
  { words: ["rapide", "vite", "presse", "flemme", "simple", "facile", "express"], tags: ["express", "one pot"] },
  { words: ["proteine", "muscle", "sport", "musculation", "seche", "proteique"], tags: ["protéiné"] },
  { words: ["epice", "piquant", "releve", "pimente", "fort", "spicy"], tags: ["épicé"] },
  { words: ["asiatique", "asie", "thai", "japonai", "chinoi", "coreen", "wok", "nouille", "ramen"], tags: ["asiatique", "poêle & wok"] },
  { words: ["italien", "italie", "pate", "pasta"], tags: ["pâtes & italien"] },
  { words: ["vegetarien", "vegetarienne", "vege", "veggie", "vegetal"], tags: ["végé"] },
  { words: ["poisson", "mer"], tags: ["poisson"] },
  { words: ["boeuf", "viande rouge"], tags: ["bœuf"] },
  { words: ["volaille", "dinde"], tags: ["volaille"] },
  { words: ["mijote", "sauce", "cocotte"], tags: ["mijoté"] },
  { words: ["four", "gratin", "gratine"], tags: ["au four"] },
  { words: ["one pot", "une casserole"], tags: ["one pot"] },
];

const STOP_WORDS = new Set(
  "un une de des du d l le la les a au aux avec et ou en pour sur sans qui que quoi j ai envie truc chose quelque plat plats repas manger mange bien bon bonne tres trop un peu me moi on nous on veut voudrai aimerai faire cette semaine".split(" "),
);

export interface MoodQuery {
  /** Tags déduits de l'envie */
  tags: string[];
  /** Mots restants, cherchés dans les noms et les ingrédients (« courgette ») */
  terms: string[];
}

export function understandMood(query: string): MoodQuery {
  const text = ` ${ingredientKey(query)} `;
  const tags = new Set<string>();
  const used = new Set<string>();
  for (const mood of MOODS) {
    for (const w of mood.words) {
      const key = ingredientKey(w);
      if (text.includes(` ${key} `)) {
        mood.tags.forEach((t) => tags.add(t));
        key.split(" ").forEach((k) => used.add(k));
      }
    }
  }
  const terms = text
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w) && !used.has(w));
  return { tags: [...tags], terms: [...new Set(terms)] };
}

export interface Searchable {
  id: string;
  name: string;
  tags: string[];
  recipe_ingredients: { name: string }[];
}

export interface MoodMatch {
  id: string;
  score: number;
  /** Ce qui a fait remonter la recette, à afficher (« courgette », « comfort food ») */
  reasons: string[];
}

function containsWord(haystack: string, term: string) {
  return ` ${haystack} `.includes(` ${term}`);
}

/** Recettes qui répondent à l'envie, les plus pertinentes d'abord. */
export function searchByMood(query: string, recipes: Searchable[]): { understood: string[]; matches: MoodMatch[] } {
  const { tags, terms } = understandMood(query);
  const matches: MoodMatch[] = [];
  for (const r of recipes) {
    let score = 0;
    const reasons: string[] = [];
    const recipeTags = r.tags.map((t) => t.toLowerCase());
    for (const tag of tags) {
      if (recipeTags.includes(tag)) {
        score += 3;
        reasons.push(tag);
      }
    }
    const name = ingredientKey(r.name);
    const ingredients = r.recipe_ingredients.map((i) => ingredientKey(i.name));
    for (const term of terms) {
      if (containsWord(name, term)) {
        score += 5;
        reasons.push(term);
      } else if (ingredients.some((i) => containsWord(i, term))) {
        score += 4;
        reasons.push(term);
      } else if (recipeTags.some((t) => containsWord(ingredientKey(t), term))) {
        score += 3;
        reasons.push(term);
      }
    }
    // Un ingrédient demandé et absent fait passer la recette après celles qui l'ont
    if (terms.length && !terms.some((t) => reasons.includes(t))) score -= 2;
    if (score > 0) matches.push({ id: r.id, score, reasons: [...new Set(reasons)] });
  }
  matches.sort((a, b) => b.score - a.score);
  return { understood: [...tags, ...terms], matches };
}
