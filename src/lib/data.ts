import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { weeksBetween } from "@/lib/week";
import type { Category, Household, MealPlan, PantryItem, Person, Recipe, RecipeSummary, ShoppingItem, Slot } from "@/lib/types";

const RECIPE_SELECT = "*, recipe_ingredients(*), recipe_steps(*)";

/** Juste ce qu'affichent les listes : pas d'étapes, pas de quantités. */
const SUMMARY_SELECT =
  "id, name, category, servings, yield_label, prep_minutes, cook_minutes, fridge_days, freezable, tags, author_id, image_url, recipe_ingredients(name)";

function sortChildren(r: Recipe): Recipe {
  r.recipe_ingredients.sort((a, b) => a.position - b.position);
  r.recipe_steps.sort((a, b) => a.position - b.position);
  return r;
}

/** Utilisateur connecté, son foyer et les personnes du foyer. Redirige si l'un manque. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/connexion");

  // Une seule requête : les règles d'accès ne laissent voir que le foyer de l'utilisateur
  const { data } = await supabase
    .from("households")
    .select("id, name, invite_code, equipment, burners, household_people(*)")
    .order("position", { referencedTable: "household_people" })
    .limit(1)
    .maybeSingle();
  const people = (data?.household_people ?? []) as Person[];
  const me = people.find((p) => p.user_id === userId);
  if (!data || !me) redirect("/foyer/nouveau");

  return {
    supabase,
    userId,
    meId: me.id,
    household: {
      id: data.id,
      name: data.name,
      invite_code: data.invite_code,
      equipment: data.equipment,
      burners: data.burners,
    } as Household,
    people,
  };
});

/** Toute la bibliothèque, en entier : réservé à la génération, qui a besoin des étapes et des quantités. */
export const getRecipes = cache(async (): Promise<Recipe[]> => {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("recipes").select(RECIPE_SELECT).eq("household_id", household.id).order("name");
  return ((data ?? []) as Recipe[]).map(sortChildren);
});

/** La bibliothèque pour l'affichage en liste : ~10 fois plus léger que `getRecipes`. */
export const getRecipeSummaries = cache(async (): Promise<RecipeSummary[]> => {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("recipes").select(SUMMARY_SELECT).eq("household_id", household.id).order("name");
  return (data ?? []) as unknown as RecipeSummary[];
});

/** Les recettes d'un planning, en entier (étapes pour le batch, quantités pour les courses). */
export async function getPlanRecipes(recipeIds: string[]): Promise<Recipe[]> {
  if (!recipeIds.length) return [];
  const { supabase } = await getContext();
  const { data } = await supabase.from("recipes").select(RECIPE_SELECT).in("id", recipeIds);
  return ((data ?? []) as Recipe[]).map(sortChildren);
}

/** Tags disponibles et nombre de recettes par catégorie, sans rapatrier les recettes. */
export const getRecipeFacets = cache(async (): Promise<{ tags: string[]; counts: Record<Category, number> }> => {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("recipes").select("category, tags").eq("household_id", household.id);
  const rows = (data ?? []) as { category: Category; tags: string[] }[];
  const counts = { plat: 0, "petit-dej": 0, gouter: 0 } as Record<Category, number>;
  const tags = new Set<string>();
  for (const r of rows) {
    counts[r.category] = (counts[r.category] ?? 0) + 1;
    if (r.category === "plat") for (const t of r.tags) tags.add(t);
  }
  return { tags: [...tags].sort((a, b) => a.localeCompare(b, "fr")), counts };
});

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("recipes").select(RECIPE_SELECT).eq("id", id).maybeSingle();
  return data ? sortChildren(data as Recipe) : null;
}

/** Le planning le plus récent (celui de la semaine en cours ou à venir). */
export async function getLatestPlan(): Promise<MealPlan | null> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("meal_plans")
    .select("*, plan_meals(*)")
    .eq("household_id", household.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MealPlan) ?? null;
}

export interface WeekSlots {
  planId: string;
  weekStart: string;
  meals: { id: string; day: number; slot: Slot; recipeName: string }[];
}

/** La semaine en cours, en version légère : ce qu'il faut pour proposer « Ajouter à la semaine ». */
export const getWeekSlots = cache(async (): Promise<WeekSlots | null> => {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("meal_plans")
    .select("id, week_start, plan_meals(id, day, slot, recipes(name))")
    .eq("household_id", household.id)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const meals = data.plan_meals as unknown as { id: string; day: number; slot: Slot; recipes: { name: string } | null }[];
  return {
    planId: data.id,
    weekStart: data.week_start,
    meals: meals.map((m) => ({ id: m.id, day: m.day, slot: m.slot, recipeName: m.recipes?.name ?? "" })),
  };
});

export async function getShoppingItems(planId: string): Promise<ShoppingItem[]> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("shopping_items").select("*").eq("plan_id", planId).order("name");
  return (data ?? []) as ShoppingItem[];
}

export async function getPantry(): Promise<PantryItem[]> {
  const { supabase, household } = await getContext();
  const { data } = await supabase.from("pantry_items").select("id, name").eq("household_id", household.id).order("created_at");
  return (data ?? []) as PantryItem[];
}

/** Pour chaque recette, nombre de semaines depuis son dernier passage au planning. */
export async function getWeeksSinceEaten(refWeek: string): Promise<Map<string, number>> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("meal_plans")
    .select("week_start, plan_meals(recipe_id)")
    .eq("household_id", household.id)
    .lt("week_start", refWeek);
  const out = new Map<string, number>();
  for (const plan of data ?? []) {
    const weeks = weeksBetween(plan.week_start, refWeek);
    for (const m of plan.plan_meals as { recipe_id: string }[]) {
      const prev = out.get(m.recipe_id);
      if (prev == null || weeks < prev) out.set(m.recipe_id, weeks);
    }
  }
  return out;
}
