import { ingredientKey, normalizeUnit, roundForShopping } from "@/lib/units";
import type { PlanMeal, Recipe } from "@/lib/types";

export interface ShoppingLine {
  key: string;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  sources: string[];
  /** Déjà dans les fonds de placard */
  inPantry: boolean;
}

/** Parts d'un repas : une par mangeur ; une ligne sans mangeurs (semaines d'avant) nourrit tout le foyer. */
export function partsOf(meal: PlanMeal, householdSize: number): number {
  return meal.eaters?.length || householdSize;
}

/** Combien de fois la recette est cuisinée : un plat est mis à l'échelle des parts, un extra est fait une fois. */
function scaleFor(meal: PlanMeal, recipe: Recipe, householdSize: number) {
  return meal.slot === "extra" ? 1 : partsOf(meal, householdSize) / recipe.servings;
}

export interface CookedDish {
  recipe: Recipe;
  /** Parts cuisinées (0 pour un extra, fait une fois) */
  parts: number;
  /** Multiplicateur de la recette telle qu'écrite */
  scale: number;
  /** Personnes qui en mangent */
  eaters: string[];
}

/** « ×2 », « ×1,5 », « ×0,7 » : le multiplicateur d'une recette, lisible d'un coup d'œil. */
export function formatScale(scale: number): string {
  const half = Math.round(scale * 2) / 2;
  const value = Math.abs(half - scale) < 0.05 ? half : Math.round(scale * 10) / 10;
  return `×${value.toLocaleString("fr-FR")}`;
}

/** Ce qu'on cuisine le jour du batch : une entrée par recette, quantités additionnées sur tous ses repas. */
export function cookedDishes(meals: PlanMeal[], recipesById: Map<string, Recipe>, people: string[]): CookedDish[] {
  const out = new Map<string, CookedDish>();
  for (const meal of meals) {
    const recipe = recipesById.get(meal.recipe_id);
    if (!recipe) continue;
    const dish = out.get(recipe.id) ?? { recipe, parts: 0, scale: 0, eaters: [] };
    if (meal.slot === "extra") dish.scale = Math.max(dish.scale, 1);
    else {
      dish.parts += partsOf(meal, people.length);
      dish.scale = dish.parts / recipe.servings;
    }
    for (const id of meal.eaters?.length ? meal.eaters : people) if (!dish.eaters.includes(id)) dish.eaters.push(id);
    out.set(recipe.id, dish);
  }
  return [...out.values()];
}

export function inPantry(name: string, pantry: string[]): boolean {
  const key = ingredientKey(name);
  return pantry.some((p) => {
    const pk = ingredientKey(p);
    // « riz » au placard couvre « riz basmati », mais « lait de coco » ne couvre pas « lait »
    return pk && (key === pk || key.startsWith(`${pk} `));
  });
}

/**
 * Additionne les ingrédients de toutes les recettes de la semaine,
 * mis à l'échelle du nombre de parts réellement cuisinées.
 */
export function buildShoppingList(meals: PlanMeal[], recipesById: Map<string, Recipe>, householdSize: number, pantry: string[] = []): ShoppingLine[] {
  const lines = new Map<string, ShoppingLine>();

  for (const meal of meals) {
    const recipe = recipesById.get(meal.recipe_id);
    if (!recipe) continue;
    const scale = scaleFor(meal, recipe, householdSize);

    for (const ing of recipe.recipe_ingredients) {
      const { unit, factor } = normalizeUnit(ing.unit);
      const key = `${ingredientKey(ing.name)}|${unit}`;
      const qty = ing.quantity == null ? null : ing.quantity * factor * scale;
      const line = lines.get(key);
      if (line) {
        line.quantity = line.quantity == null || qty == null ? (line.quantity ?? qty) : line.quantity + qty;
        if (!line.sources.includes(recipe.name)) line.sources.push(recipe.name);
      } else {
        lines.set(key, { key, name: ing.name, quantity: qty, unit, aisle: ing.aisle || "Autre", sources: [recipe.name], inPantry: inPantry(ing.name, pantry) });
      }
    }
  }

  return [...lines.values()]
    .map((l) => ({ ...l, quantity: l.quantity == null ? null : roundForShopping(l.quantity, l.unit) }))
    .sort((a, b) => a.aisle.localeCompare(b.aisle, "fr") || a.name.localeCompare(b.name, "fr"));
}

export function shoppingKey(name: string, unit: string) {
  return `${ingredientKey(name)}|${normalizeUnit(unit).unit}`;
}
