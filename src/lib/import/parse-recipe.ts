import type { Ingredient, RecipeDraft, Station, Step } from "@/lib/types";
import { normalizeUnit } from "@/lib/units";

const AISLE_KEYWORDS: [string, string[]][] = [
  ["Boucherie & poisson", ["poulet", "boeuf", "bœuf", "porc", "veau", "agneau", "dinde", "saumon", "thon", "cabillaud", "crevette", "lardon", "jambon", "chorizo", "saucisse", "merguez", "knack", "viande", "steak", "poisson", "colin", "lieu", "paleron", "bacon", "haché"]],
  ["Crèmerie", ["lait", "crème", "creme", "beurre", "fromage", "feta", "mozzarella", "parmesan", "emmental", "yaourt", "skyr", "oeuf", "œuf", "ricotta", "gruyère", "comté", "chèvre", "mascarpone", "boursin", "cheddar", "fromage blanc", "pâte feuilletée", "pâte brisée"]],
  ["Fruits & légumes", ["oignon", "ail", "échalote", "carotte", "courgette", "tomate", "poivron", "aubergine", "brocoli", "épinard", "courge", "butternut", "potiron", "poireau", "chou", "salade", "pomme de terre", "patate", "champignon", "citron", "coriandre", "persil", "basilic", "gingembre", "menthe", "avocat", "concombre", "céleri", "haricot vert", "petits pois", "ciboulette", "thym", "pomme", "banane", "framboise", "ananas", "estragon", "aneth", "romarin", "citronnelle", "piment frais", "salade"]],
  ["Boulangerie", ["pain", "baguette", "tortilla", "wrap", "pain à hot dog", "pain burger"]],
  ["Surgelés", ["surgelé", "surgelée", "surgelés"]],
  ["Épicerie sucrée", ["sucre", "chocolat", "cacao", "levure chimique", "sirop", "flocons d'avoine", "flocons d’avoine", "vanille", "beurre de cacahuète", "confiture", "pépites", "sucre perlé", "farine", "protéine en poudre", "whey"]],
  ["Épicerie", ["riz", "pâtes", "pates", "spaghetti", "tagliatelle", "nouilles", "udon", "ramen", "orzo", "lentille", "pois chiche", "huile", "vinaigre", "sauce", "épice", "curry", "cumin", "paprika", "curcuma", "bouillon", "kub", "conserve", "coulis", "lait de coco", "quinoa", "semoule", "polenta", "boulgour", "haricot rouge", "concentré", "pulpe", "moutarde", "miel", "sel", "poivre", "maïs", "soja", "cacahuète", "noix", "sésame", "olive", "pesto", "miso", "tomates concassées", "herbes de provence"]],
];

export function guessAisle(name: string): string {
  const n = name.toLowerCase();
  // « lait de coco » avant « lait », etc. : on prend le mot-clé le plus long qui correspond
  let best: { aisle: string; len: number } | null = null;
  for (const [aisle, words] of AISLE_KEYWORDS) {
    for (const w of words) if (n.includes(w) && (!best || w.length > best.len)) best = { aisle, len: w.length };
  }
  return best?.aisle ?? "Autre";
}

const APPLIANCE_STATIONS: [Station, RegExp][] = [
  ["mijoteuse", /mijoteuse|slow ?cooker/],
  ["air-fryer", /air ?fryer|friteuse sans huile/],
  ["gaufrier", /gaufrier/],
  ["multicuiseur", /cookeo|multicuiseur/],
  ["robot-cuiseur", /thermomix|monsieur cuisine|robot cuiseur/],
  ["micro-ondes", /micro-?ondes?/],
  ["cuiseur-riz", /cuiseur à riz|rice cooker/],
];

export function guessStation(text: string): Station {
  const t = text.toLowerCase();
  // « si tu utilises un Cookeo » : simple alternative, pas le poste de l'étape
  const main = t.replace(/\(.*?\)/g, "").replace(/si (tu utilises|vous utilisez)[^.]*\./g, "");
  for (const [station, re] of APPLIANCE_STATIONS) if (re.test(main)) return station;
  if (/(four|enfourne|gratin|rôti|roti|préchauff|prechauff|th\.\s?\d)/.test(main)) return "four";
  if (/(mariner|réfrigér|refriger|reposer|repos|au frais|lever|pousser)/.test(main)) return "repos";
  if (/(poêle|poele|casserole|faitout|cocotte|marmite|sauteuse|wok|mijot|cuire|cuisson|bouill|revenir|dorer|frire|sauter|fondre|porter à|saisir|chauffer)/.test(main)) return "plaque";
  return "plan";
}

const PASSIVE_COOKING = /(laisse[rz]? (mijoter|cuire|mijot|reposer|refroidir|lever|gonfler|dégorger)|mijote|enfourne|au four pendant|cuire au four|selon les instructions|sous pression|(fais|faites|faire) cuire (le riz|les pâtes|les pates|le quinoa|les nouilles|la semoule|les pommes de terre))/;

export function guessHandsBusy(text: string, station: Station, duration?: number): boolean {
  const t = text.toLowerCase();
  if (station === "repos") return false;
  if (["mijoteuse", "multicuiseur", "cuiseur-riz", "robot-cuiseur", "machine-pain", "yaourtiere"].includes(station)) return false;
  if (PASSIVE_COOKING.test(t)) return false;
  // Au-delà de 25 min, personne ne reste les mains occupées : c'est une cuisson qui tourne seule
  if (duration != null && duration >= 25 && !/(couper|coupe|éplucher|épluche|émincer|émince|hacher|façonner|former)/.test(t)) return false;
  return true;
}

/** « 1h30 », « 2 à 3 heures », « env. 20-25 min » → minutes (borne haute) */
export function parseDurationText(text: string): number | null {
  const t = text.toLowerCase().replace(/,/g, ".");
  const hm = t.match(/(\d+)\s*h\s*(\d{1,2})(?!\s*\d)/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h\b|heures?)/);
  const m = t.match(/(\d+)\s*(?:min|mn)/);
  const total = (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
  return total ? Math.round(total) : null;
}

export function guessDuration(text: string): number | null {
  // Les parenthèses donnent souvent une variante (« ou 45 min au Cookeo ») : on lit le texte principal
  const explicit = parseDurationText(text.replace(/\([^)]*\)/g, ""));
  if (explicit) return explicit;
  const t = text.toLowerCase();
  if (/pr[ée]chauff/.test(t)) return 2;
  if (/\briz\b/.test(t) && /cuire|cuisson/.test(t)) return 12;
  if (/(pâtes|pates|spaghetti|tagliatelles|nouilles|orzo|penne)/.test(t) && /cuire|cuisson/.test(t)) return 10;
  if (/laisse[rz]? (cuire|mijoter)|jusqu.à ce que .*(tendre|fondant|cuit)/.test(t)) return 15;
  return null;
}

/** "PT1H15M" → 75 */
export function parseIsoDuration(iso: unknown): number {
  if (typeof iso !== "string") return 0;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 1440 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };

const UNIT_PATTERN =
  "kg|g|gr|grammes?|mg|ml|cl|dl|l|litres?|cm|c\\.?\\s?à\\.?\\s?s\\.?|c\\.?\\s?à\\.?\\s?c\\.?|cuill(?:è|e)res? à soupe|cuill(?:è|e)res? à café|c\\.?\\s?à\\s?soupe|c\\.?\\s?à\\s?café|cas|cac|cs|cc|boîtes?|boites?|bottes?|bouquets?|brins?|branches?|feuilles?|poignées?|filets?|morceaux?|verres?|gousses?|tranches?|sachets?|pincées?|pots?|briques?|cubes?";

function canonicalUnit(raw: string): string {
  const u = raw.replace(/\s+/g, " ").toLowerCase();
  if (/^cubes?$/.test(u)) return "cube";
  if (/^cm$/.test(u)) return "cm";
  if (/^c/.test(u) && /(soupe|^c\.? ?à\.? ?s\.?$|^cs$|^cas$)/.test(u)) return "c. à s.";
  if (/^c/.test(u) && /(café|^c\.? ?à\.? ?c\.?$|^cc$|^cac$)/.test(u)) return "c. à c.";
  const n = normalizeUnit(u);
  // kg, cl, l… restent tels quels : la conversion en g / ml se fait à l'addition des courses
  if (n.factor !== 1) return u.replace(/^(kilo|kilos)$/, "kg").replace(/^litres?$/, "l");
  return n.unit || u.replace(/s$/, "");
}

/** « Une pincée », « Petit bouquet », « Grosse c. à s. » : nombre en toutes lettres et adjectifs de taille */
function normalizeLeadingWords(s: string): string {
  return s
    .replace(/^(un|une)\s+/i, "1 ")
    .replace(/^(\d+(?:[.,]\d+)?\s*)?(petite?s?|gros(?:se)?s?|grande?s?|belles?|beaux?|bonne?s?|quelques)\s+/i, (_, n) => n ?? "");
}

/** "200 g de lentilles corail" → { quantity: 200, unit: "g", name: "Lentilles corail" } */
export function parseIngredientLine(line: string, position = 0, group: string | null = null): Ingredient {
  let s = normalizeLeadingWords(line.replace(/\s+/g, " ").trim());
  let quantity: number | null = null;

  const qty = s.match(/^(\d+(?:[.,]\d+)?)?\s*([½¼¾⅓⅔])?(?:\s*\/\s*(\d+))?(?:\s*(?:à|-)\s*\d+(?:[.,]\d+)?)?/);
  if (qty && (qty[1] || qty[2])) {
    let q = qty[1] ? Number(qty[1].replace(",", ".")) : 0;
    if (qty[3] && qty[1]) q = q / Number(qty[3]);
    if (qty[2]) q += UNICODE_FRACTIONS[qty[2]];
    quantity = q;
    s = s.slice(qty[0].length).trim();
  }

  let unit = "";
  const unitMatch = s.match(new RegExp(`^(${UNIT_PATTERN})(?=\\s|$|\\.)\\.?\\s*`, "i"));
  // « c. à s. de miel » sans nombre devant : une cuillère
  const implicitOne = !!unitMatch && quantity == null && /^(c\.|c |cuill|pincée|filet|bouquet|brin|poignée|botte)/i.test(unitMatch[1]);
  if (implicitOne) quantity = 1;
  if (unitMatch && quantity != null) {
    unit = canonicalUnit(unitMatch[1]);
    s = normalizeLeadingWords(s.slice(unitMatch[0].length).trim());
  }
  s = s.replace(/^(de |d'|d’|du |des )/i, "").trim();
  // Les précisions entre parenthèses ne servent pas à la liste de courses
  const name = s.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const clean = name.charAt(0).toUpperCase() + name.slice(1);

  return { position, name: clean || line.trim(), quantity, unit, aisle: guessAisle(clean), group_label: group };
}

export function stepFromText(text: string, position: number): Step {
  const station = guessStation(text);
  const duration = guessDuration(text) ?? 5;
  return {
    position,
    text,
    station,
    duration_minutes: duration,
    hands_busy: guessHandsBusy(text, station, duration),
  };
}

function textOf(node: unknown): string[] {
  if (!node) return [];
  if (typeof node === "string") return node.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (Array.isArray(node)) return node.flatMap(textOf);
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o["@type"] === "HowToSection") return textOf(o.itemListElement);
    if (typeof o.text === "string") return [o.text.trim()];
    if (typeof o.name === "string") return [o.name.trim()];
  }
  return [];
}

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    for (const d of data) {
      const r = findRecipeNode(d);
      if (r) return r;
    }
    return null;
  }
  const o = data as Record<string, unknown>;
  const type = o["@type"];
  if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return o;
  if (o["@graph"]) return findRecipeNode(o["@graph"]);
  return null;
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Lit la recette décrite en JSON-LD schema.org dans une page web. */
export function parseRecipeFromHtml(html: string, url: string): RecipeDraft | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const [, json] of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(json.trim());
    } catch {
      continue;
    }
    const node = findRecipeNode(data);
    if (!node) continue;

    const yieldRaw = Array.isArray(node.recipeYield) ? node.recipeYield[0] : node.recipeYield;
    const servings = Number(String(yieldRaw ?? "").match(/\d+/)?.[0] ?? 4) || 4;
    const ingredients = (Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [])
      .map((l: unknown) => decodeEntities(String(l)))
      .map((l: string, i: number) => parseIngredientLine(l, i));
    const steps = textOf(node.recipeInstructions).map((t, i) => stepFromText(decodeEntities(t), i));
    const keywords = typeof node.keywords === "string" ? node.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 5) : [];
    const description = typeof node.description === "string" ? decodeEntities(node.description) : null;

    return {
      name: decodeEntities(String(node.name ?? "Recette importée")),
      category: "plat",
      description,
      servings,
      yield_label: null,
      prep_minutes: parseIsoDuration(node.prepTime),
      cook_minutes: parseIsoDuration(node.cookTime),
      rest_minutes: 0,
      fridge_days: 3,
      freezable: false,
      tags: keywords,
      equipment: [],
      source_url: url,
      notes: null,
      recipe_ingredients: ingredients,
      recipe_steps: steps,
    };
  }
  return null;
}
