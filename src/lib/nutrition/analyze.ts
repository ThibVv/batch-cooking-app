/**
 * Ce qu'une recette apporte, et ce qui lui manque.
 *
 * Les valeurs viennent de `foods.ts` : ce sont des estimations, calculées sur
 * les ingrédients reconnus. `coverage` dit quelle part du poids a été
 * identifiée, pour ne pas afficher un chiffre avec un aplomb qu'il n'a pas.
 */
import type { Recipe, RecipeDraft } from "@/lib/types";
import { gramsOf, matchFood, type Family } from "@/lib/nutrition/foods";

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** mg */
  iron: number;
  /** mg */
  calcium: number;
}

export type Level = "ok" | "info" | "warn";

export interface Insight {
  level: Level;
  text: string;
}

export interface RecipeNutrition {
  /** Pour une portion de la recette */
  perPortion: Macros;
  /** Grammes par famille d'aliment, pour une portion */
  families: Partial<Record<Family, number>>;
  /** Part du poids des ingrédients qu'on a su identifier (0 à 1) */
  coverage: number;
  /** Part des ingrédients dont la recette donne une quantité (0 à 1) */
  quantified: number;
  /**
   * Les chiffres valent-ils d'être affichés ? Non si trop d'ingrédients sont
   * sans quantité ou inconnus : on garde alors les constats, sans les valeurs.
   */
  reliable: boolean;
  /** Ingrédients non reconnus, pour pouvoir compléter la table */
  unknown: string[];
  /** Ce que la recette apporte, et ce qui lui manque */
  insights: Insight[];
}

const EMPTY: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, iron: 0, calcium: 0 };

const ANIMAL_PROTEIN: Family[] = ["viande", "poisson", "oeuf"];
/** Familles qui comptent comme une vraie source de protéines */
const PROTEIN_SOURCES: Family[] = [...ANIMAL_PROTEIN, "laitier", "legumineuse", "noix"];

/** Seuils par portion d'un plat principal, volontairement indulgents. */
const T = {
  proteinRich: 25,
  proteinLow: 12,
  vegRich: 150,
  vegLow: 60,
  fiberRich: 7,
  fiberLow: 3,
  ironRich: 3.5,
  calciumRich: 250,
  fatRich: 35,
};

function round(n: number, step = 1) {
  return Math.round(n / step) * step;
}

/** Somme les apports des ingrédients reconnus, puis ramène à une portion. */
function totals(recipe: Recipe | RecipeDraft) {
  const sum = { ...EMPTY };
  const families: Partial<Record<Family, number>> = {};
  const unknown: string[] = [];
  let knownGrams = 0;
  let weighedGrams = 0;
  let quantifiedCount = 0;

  for (const ing of recipe.recipe_ingredients) {
    if (ing.quantity != null) quantifiedCount++;
    const food = matchFood(ing.name);
    const grams = gramsOf(ing.quantity, ing.unit, food);
    if (grams != null) weighedGrams += grams;
    if (!food) {
      if (ing.name.trim()) unknown.push(ing.name);
      continue;
    }
    if (grams == null) continue;
    knownGrams += grams;
    const k = grams / 100;
    sum.kcal += food.kcal * k;
    sum.protein += food.protein * k;
    sum.carbs += food.carbs * k;
    sum.fat += food.fat * k;
    sum.fiber += food.fiber * k;
    sum.iron += food.iron * k;
    sum.calcium += food.calcium * k;
    families[food.family] = (families[food.family] ?? 0) + grams;
  }

  const count = Math.max(recipe.recipe_ingredients.length, 1);
  return {
    sum,
    families,
    unknown,
    coverage: weighedGrams > 0 ? knownGrams / weighedGrams : 0,
    quantified: quantifiedCount / count,
  };
}

function gramsIn(families: Partial<Record<Family, number>>, list: Family[]) {
  return list.reduce((n, fam) => n + (families[fam] ?? 0), 0);
}

/** Les constats affichés sur la fiche : d'abord ce qui manque, puis ce qui est bon. */
function buildInsights(m: Macros, families: Partial<Record<Family, number>>, recipe: Recipe | RecipeDraft, reliable: boolean): Insight[] {
  const warn: Insight[] = [];
  const info: Insight[] = [];
  const ok: Insight[] = [];
  const isMain = recipe.category === "plat";

  const animal = gramsIn(families, ANIMAL_PROTEIN);
  const proteinSource = gramsIn(families, PROTEIN_SOURCES);
  const veg = families.legume ?? 0;
  const starch = families.feculent ?? 0;

  // Protéines : la demande explicite, « une recette sans viande doit avertir »
  if (animal === 0) {
    if (proteinSource === 0) {
      warn.push({ level: "warn", text: "Aucune source de protéines : à accompagner d'œufs, de légumineuses ou de fromage" });
    } else if (gramsIn(families, ["legumineuse", "noix"]) > 0 && gramsIn(families, ["laitier"]) === 0) {
      info.push({ level: "info", text: "Sans viande, poisson ni laitier : protéines végétales, pensez à la vitamine B12 sur la semaine" });
    } else {
      info.push({ level: "info", text: "Sans viande ni poisson : les protéines viennent des légumineuses, œufs ou fromages" });
    }
  }
  // Les seuils chiffrés n'ont de sens que si l'estimation tient debout
  if (reliable) {
    if (m.protein >= T.proteinRich) ok.push({ level: "ok", text: `Riche en protéines (${round(m.protein)} g)` });
    else if (isMain && m.protein < T.proteinLow) warn.push({ level: "warn", text: `Peu de protéines (${round(m.protein)} g par portion)` });
  }

  // Légumes
  if (isMain) {
    if (veg >= T.vegRich) ok.push({ level: "ok", text: reliable ? `Beaucoup de légumes (${round(veg, 10)} g)` : "Beaucoup de légumes" });
    else if (veg === 0) warn.push({ level: "warn", text: "Pas de légumes" });
    else if (reliable && veg < T.vegLow) warn.push({ level: "warn", text: `Peu de légumes (${round(veg, 10)} g)` });
  }

  // Féculent : utile à signaler pour un plat, c'est ce qui manque le plus souvent
  if (isMain && starch === 0) info.push({ level: "info", text: "Pas de féculent : à servir avec du riz, des pâtes ou du pain" });

  // Fibres, fer, calcium
  if (reliable) {
    if (m.fiber >= T.fiberRich) ok.push({ level: "ok", text: `Riche en fibres (${round(m.fiber)} g)` });
    else if (isMain && m.fiber < T.fiberLow) info.push({ level: "info", text: `Peu de fibres (${round(m.fiber)} g)` });
    if (m.iron >= T.ironRich) ok.push({ level: "ok", text: `Bonne source de fer (${m.iron.toFixed(1)} mg)` });
    if (m.calcium >= T.calciumRich) ok.push({ level: "ok", text: `Riche en calcium (${round(m.calcium, 10)} mg)` });
    if (m.fat >= T.fatRich) info.push({ level: "info", text: `Plat assez gras (${round(m.fat)} g de lipides)` });
  } else {
    info.push({ level: "info", text: "Quantités incomplètes dans la recette : pas de chiffres, seulement ce qu'elle contient" });
  }

  return [...warn, ...info, ...ok];
}

const cache = new WeakMap<Recipe | RecipeDraft, RecipeNutrition>();

/** Apports estimés d'une portion de la recette. Mémoïsé par objet recette. */
export function recipeNutrition(recipe: Recipe | RecipeDraft): RecipeNutrition {
  const hit = cache.get(recipe);
  if (hit) return hit;

  const { sum, families, unknown, coverage, quantified } = totals(recipe);
  const reliable = coverage >= 0.75 && quantified >= 0.6;
  const portions = Math.max(recipe.servings, 1);
  const perPortion: Macros = {
    kcal: sum.kcal / portions,
    protein: sum.protein / portions,
    carbs: sum.carbs / portions,
    fat: sum.fat / portions,
    fiber: sum.fiber / portions,
    iron: sum.iron / portions,
    calcium: sum.calcium / portions,
  };
  const perPortionFamilies: Partial<Record<Family, number>> = {};
  for (const [fam, grams] of Object.entries(families)) perPortionFamilies[fam as Family] = grams / portions;

  const result: RecipeNutrition = {
    perPortion,
    families: perPortionFamilies,
    coverage,
    quantified,
    reliable,
    unknown,
    insights: buildInsights(perPortion, perPortionFamilies, recipe, reliable),
  };
  cache.set(recipe, result);
  return result;
}

/** Une recette apporte-t-elle une vraie source de protéines ? */
export function hasProtein(recipe: Recipe | RecipeDraft): boolean {
  return gramsIn(recipeNutrition(recipe).families, PROTEIN_SOURCES) > 0;
}

export interface WeekBalance {
  /** Moyenne par portion sur la semaine */
  average: Macros;
  fishMeals: number;
  redMeatMeals: number;
  vegetarianMeals: number;
  lowVegMeals: number;
  insights: Insight[];
}

/** Équilibre de la semaine entière : ce qui revient trop, ce qui manque. */
export function weekBalance(recipes: (Recipe | RecipeDraft)[]): WeekBalance {
  const average = { ...EMPTY };
  let fishMeals = 0;
  let redMeatMeals = 0;
  let vegetarianMeals = 0;
  let lowVegMeals = 0;
  const mains = recipes.filter((r) => r.category === "plat");
  let counted = 0;

  for (const recipe of mains) {
    const n = recipeNutrition(recipe);
    // La moyenne ne porte que sur les recettes correctement chiffrées
    if (n.reliable) {
      counted++;
      for (const key of Object.keys(average) as (keyof Macros)[]) average[key] += n.perPortion[key];
    }
    if ((n.families.poisson ?? 0) > 0) fishMeals++;
    if ((n.families.viande ?? 0) > 0) redMeatMeals++;
    else if ((n.families.poisson ?? 0) === 0) vegetarianMeals++;
    if ((n.families.legume ?? 0) < T.vegLow) lowVegMeals++;
  }

  for (const key of Object.keys(average) as (keyof Macros)[]) average[key] /= Math.max(counted, 1);

  const insights: Insight[] = [];
  if (mains.length >= 4) {
    if (!fishMeals) insights.push({ level: "info", text: "Aucun poisson cette semaine" });
    if (!vegetarianMeals) insights.push({ level: "info", text: "Aucun plat végétarien cette semaine" });
    if (lowVegMeals > mains.length / 2) insights.push({ level: "warn", text: `${lowVegMeals} plats sur ${mains.length} contiennent peu de légumes` });
    if (redMeatMeals > mains.length * 0.7) insights.push({ level: "info", text: "Beaucoup de viande : un ou deux plats végé équilibreraient la semaine" });
    if (average.protein >= T.proteinRich) insights.push({ level: "ok", text: "Semaine bien pourvue en protéines" });
    if (average.fiber >= T.fiberRich) insights.push({ level: "ok", text: "Semaine riche en fibres" });
  }

  return { average, fishMeals, redMeatMeals, vegetarianMeals, lowVegMeals, insights };
}

/** « ~520 kcal · P 22 g · G 61 g · L 19 g » */
export function formatMacros(m: Macros): string {
  return `~${round(m.kcal, 10)} kcal · P ${round(m.protein)} g · G ${round(m.carbs)} g · L ${round(m.fat)} g`;
}
