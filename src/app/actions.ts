"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getContext, getPantry, getPlanRecipes, getRecipeSummaries, getRecipes, getWeeksSinceEaten } from "@/lib/data";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { completeWeek, daysAfterCooking, freeSlotsOf, generatePlan, pickExtras, pickReplacement, placeChosen, type GenerateInput } from "@/lib/planner/generate";
import { criteriaFor } from "@/lib/planner/criteria";
import { searchByMood } from "@/lib/planner/mood";
import { mentionsIngredient } from "@/lib/units";
import { buildShoppingList, shoppingKey } from "@/lib/planner/shopping";
import { parseRecipeFromHtml } from "@/lib/import/parse-recipe";
import { fetchPublicPage } from "@/lib/import/fetch-page";
import { findPhoto, photosAvailable } from "@/lib/images/photo";
import type { Category, Criteria, PlanMeal, Recipe, RecipeChoice, RecipeDraft } from "@/lib/types";

export type FormState = { error?: string } | undefined;

// Authentification ------------------------------------------------------------

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "E-mail ou mot de passe incorrect." };
  redirect("/");
}

export async function signUp(_: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: error.message };
  redirect("/foyer/nouveau");
}

export type ResetState = { error?: string; sent?: boolean } | undefined;

/** Envoie l'e-mail de réinitialisation ; le lien revient sur /auth/confirm puis /mot-de-passe. */
export async function requestPasswordReset(_: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Indiquez votre e-mail." };
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/mot-de-passe`,
  });
  if (error) {
    return { error: error.status === 429 ? "Trop de demandes, réessayez dans une heure." : error.message };
  }
  return { sent: true };
}

export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Au moins 6 caractères." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.code === "same_password" ? "Choisissez un mot de passe différent de l'ancien." : error.message };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

// Recettes (écriture) ---------------------------------------------------------

function recipeRow(householdId: string, authorId: string | null, d: RecipeDraft & { drive_id?: string }) {
  return {
    household_id: householdId,
    author_id: authorId,
    name: d.name.trim(),
    category: d.category,
    description: d.description?.trim() || null,
    servings: Math.max(1, Math.round(d.servings)),
    yield_label: d.yield_label?.trim() || null,
    prep_minutes: Math.max(0, Math.round(d.prep_minutes)),
    cook_minutes: Math.max(0, Math.round(d.cook_minutes)),
    rest_minutes: Math.max(0, Math.round(d.rest_minutes)),
    fridge_days: Math.min(7, Math.max(1, Math.round(d.fridge_days))),
    freezable: d.freezable,
    tags: [...new Set(d.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    equipment: d.equipment,
    source_url: d.source_url,
    drive_id: d.drive_id ?? null,
    notes: d.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
}

function childRows(recipeId: string, d: RecipeDraft) {
  return {
    ingredients: d.recipe_ingredients
      .filter((i) => i.name.trim())
      .map((i, position) => ({
        recipe_id: recipeId,
        position,
        group_label: i.group_label?.trim() || null,
        name: i.name.trim(),
        quantity: i.quantity,
        unit: i.unit,
        aisle: i.aisle,
      })),
    steps: d.recipe_steps
      .filter((s) => s.text.trim())
      .map((s, position) => ({
        recipe_id: recipeId,
        position,
        text: s.text.trim(),
        station: s.station,
        duration_minutes: Math.max(1, Math.round(s.duration_minutes)),
        hands_busy: s.hands_busy,
      })),
  };
}

/** Insère plusieurs recettes en trois requêtes (recettes, ingrédients, étapes). */
async function insertRecipes(supabase: SupabaseClient, householdId: string, authorId: string | null, drafts: (RecipeDraft & { drive_id?: string })[]) {
  const { data, error } = await supabase
    .from("recipes")
    .insert(drafts.map((d) => recipeRow(householdId, authorId, d)))
    .select("id");
  if (error) throw error;
  const ingredients = [];
  const steps = [];
  for (let i = 0; i < drafts.length; i++) {
    const rows = childRows(data[i].id as string, drafts[i]);
    ingredients.push(...rows.ingredients);
    steps.push(...rows.steps);
  }
  if (ingredients.length) {
    const { error: e } = await supabase.from("recipe_ingredients").insert(ingredients);
    if (e) throw e;
  }
  if (steps.length) {
    const { error: e } = await supabase.from("recipe_steps").insert(steps);
    if (e) throw e;
  }
  return data.map((r) => r.id as string);
}

// Foyer -----------------------------------------------------------------------

export interface NewPerson {
  name: string;
  color: string;
  likes: string[];
  dislikes: string[];
}

export async function createHousehold(input: {
  name: string;
  people: NewPerson[];
  me: number;
  equipment: string[];
  burners: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return { error: "Session expirée, reconnectez-vous." };
  if (!input.people.some((p) => p.name.trim())) return { error: "Ajoutez au moins une personne." };

  const { data: householdId, error } = await supabase.rpc("create_household", {
    p_name: input.name.trim() || "Notre foyer",
    p_people: input.people.map((p) => ({ ...p, name: p.name.trim() || "Sans nom" })),
    p_me: input.me,
    p_equipment: input.equipment,
    p_burners: input.burners,
  });
  if (error) return { error: error.message };

  try {
    if (STARTER_RECIPES.length) await insertRecipes(supabase, householdId as string, userId, STARTER_RECIPES);
  } catch (e) {
    return { error: `Foyer créé, mais l'import des recettes a échoué : ${e instanceof Error ? e.message : e}` };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function previewHousehold(code: string): Promise<{ name?: string; people: { id: string; name: string; color: string }[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("household_preview", { p_code: code });
  if (error) return { people: [], error: error.message };
  const rows = (data ?? []) as { household_name: string; person_id: string; person_name: string; color: string }[];
  return { name: rows[0]?.household_name, people: rows.map((r) => ({ id: r.person_id, name: r.person_name, color: r.color })) };
}

export async function joinHousehold(code: string, personId: string | null, name: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_household", { p_code: code, p_person_id: personId, p_name: name });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}

export async function updateHousehold(patch: { name?: string; equipment?: string[]; burners?: number }) {
  const { supabase, household } = await getContext();
  await supabase.from("households").update(patch).eq("id", household.id);
  revalidatePath("/", "layout");
}

export async function savePerson(id: string, patch: Partial<NewPerson>) {
  const { supabase } = await getContext();
  await supabase.from("household_people").update(patch).eq("id", id);
  revalidatePath("/", "layout");
}

export async function addPerson(name: string) {
  const { supabase, household, people } = await getContext();
  const colors = ["#2F5BD3", "#B8461B", "#1F6B4A", "#7A4FB5", "#A3366B", "#8A6D1F"];
  await supabase.from("household_people").insert({
    household_id: household.id,
    name: name.trim() || "Nouvelle personne",
    color: colors[people.length % colors.length],
    position: people.length,
  });
  revalidatePath("/", "layout");
}

export async function removePerson(id: string) {
  const { supabase } = await getContext();
  // Une personne qui a un compte ne peut pas être retirée d'ici
  await supabase.from("household_people").delete().eq("id", id).is("user_id", null);
  revalidatePath("/", "layout");
}

// Recettes --------------------------------------------------------------------

export async function saveRecipe(draft: RecipeDraft, id?: string): Promise<{ id?: string; error?: string }> {
  const { supabase, household, userId } = await getContext();
  if (!draft.name.trim()) return { error: "Donnez un nom à la recette." };
  try {
    let recipeId = id;
    if (recipeId) {
      const { author_id: _author, household_id: _household, ...update } = recipeRow(household.id, userId, draft);
      void _author;
      void _household;
      const { error } = await supabase.from("recipes").update(update).eq("id", recipeId);
      if (error) throw error;
      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
      await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);
      const rows = childRows(recipeId, draft);
      if (rows.ingredients.length) await supabase.from("recipe_ingredients").insert(rows.ingredients);
      if (rows.steps.length) await supabase.from("recipe_steps").insert(rows.steps);
    } else {
      [recipeId] = await insertRecipes(supabase, household.id, userId, [draft]);
    }
    revalidatePath("/recettes");
    return { id: recipeId };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Enregistrement impossible." };
  }
}

export async function deleteRecipe(id: string) {
  const { supabase } = await getContext();
  await supabase.from("recipes").delete().eq("id", id);
  revalidatePath("/recettes");
  redirect("/recettes");
}

export async function importRecipe(url: string): Promise<{ draft?: RecipeDraft; error?: string }> {
  await getContext();
  try {
    const html = await fetchPublicPage(url);
    const draft = parseRecipeFromHtml(html, url);
    if (!draft) return { error: "Aucune recette lisible sur cette page." };
    return { draft };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import impossible." };
  }
}

// Photos des plats ------------------------------------------------------------

/**
 * Cherche une photo pour une recette et l'enregistre. `skip` passe à la
 * proposition suivante quand la première ne correspond pas au plat.
 */
export async function fetchRecipePhoto(recipeId: string, skip = 0): Promise<{ url?: string | null; error?: string }> {
  const { supabase } = await getContext();
  if (!photosAvailable()) return { error: "Les photos ne sont pas configurées : ajoutez UNSPLASH_ACCESS_KEY dans .env.local." };

  const { data: recipe } = await supabase.from("recipes").select("id, name").eq("id", recipeId).maybeSingle();
  if (!recipe) return { error: "Recette introuvable." };

  try {
    const photo = await findPhoto(recipe.name as string, skip);
    if (!photo) return { error: "Aucune photo trouvée pour ce plat." };
    const { error } = await supabase
      .from("recipes")
      .update({ image_url: photo.url, image_author: photo.author, image_source: photo.source })
      .eq("id", recipeId);
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    return { url: photo.url };
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "rate-limited") return { error: "Quota horaire d'Unsplash atteint (50 requêtes), réessayez dans un moment." };
    if (code === "bad-key") return { error: "Clé Unsplash refusée : vérifiez UNSPLASH_ACCESS_KEY." };
    return { error: "Recherche de photo impossible." };
  }
}

/** Retire la photo d'une recette : on retrouve la vignette colorée. */
export async function removeRecipePhoto(recipeId: string) {
  const { supabase } = await getContext();
  await supabase.from("recipes").update({ image_url: null, image_author: null, image_source: null }).eq("id", recipeId);
  revalidatePath("/", "layout");
}

// Fonds de placard ------------------------------------------------------------

export async function addPantryItems(names: string[]) {
  const { supabase, household } = await getContext();
  const existing = new Set((await getPantry()).map((p) => p.name.toLowerCase()));
  const rows = [...new Set(names.map((n) => n.trim()).filter((n) => n && !existing.has(n.toLowerCase())))].map((name) => ({
    household_id: household.id,
    name,
  }));
  if (rows.length) await supabase.from("pantry_items").insert(rows);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

export async function removePantryItem(id: string) {
  const { supabase } = await getContext();
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

export async function clearPantry() {
  const { supabase, household } = await getContext();
  await supabase.from("pantry_items").delete().eq("household_id", household.id);
  revalidatePath("/placard");
  revalidatePath("/generer");
}

// Planning --------------------------------------------------------------------

async function generationInput(criteria: Criteria, weekStart: string): Promise<GenerateInput> {
  const { household, people } = await getContext();
  const [recipes, weeksSinceEaten, pantry] = await Promise.all([getRecipes(), getWeeksSinceEaten(weekStart), getPantry()]);
  return {
    recipes,
    criteria: criteriaFor(people, criteria),
    weeksSinceEaten,
    equipment: household.equipment,
    pantry: criteria.usePantry ? pantry.map((p) => p.name) : [],
    dislikes: people.flatMap((p) => p.dislikes),
    dislikesByPerson: Object.fromEntries(people.map((p) => [p.id, p.dislikes])),
  };
}

async function rebuildShopping(supabase: SupabaseClient, planId: string, meals: PlanMeal[], recipes: Recipe[]) {
  const { people } = await getContext();
  const [pantryItems, { data: existing }] = await Promise.all([
    getPantry(),
    supabase.from("shopping_items").select("id, name, unit, manual, checked").eq("plan_id", planId),
  ]);
  const pantry = pantryItems.map((p) => p.name);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const lines = buildShoppingList(meals, byId, Math.max(people.length, 1), pantry);
  const checkedKeys = new Set((existing ?? []).filter((e) => e.checked && !e.manual).map((e) => shoppingKey(e.name, e.unit)));

  await supabase.from("shopping_items").delete().eq("plan_id", planId).eq("manual", false);
  if (lines.length) {
    await supabase.from("shopping_items").insert(
      lines.map((l) => ({
        plan_id: planId,
        name: l.name,
        quantity: l.quantity,
        unit: l.unit,
        aisle: l.aisle,
        sources: l.sources,
        in_pantry: l.inPantry,
        // Ce qui est déjà au placard est coché d'office : on ne l'achète pas
        checked: l.inPantry || checkedKeys.has(l.key),
      })),
    );
  }
}

type LoadedPlan = { id: string; week_start: string; criteria: Criteria; plan_meals: (PlanMeal & { id: string })[] };

async function loadPlan(planId: string) {
  const { supabase } = await getContext();
  const { data: plan } = await supabase.from("meal_plans").select("*, plan_meals(*)").eq("id", planId).single();
  return plan as LoadedPlan | null;
}

/** La semaine qui commence à `weekStart`, créée vide si besoin (pour la remplir à la main). */
async function ensurePlan(weekStart: string): Promise<LoadedPlan | null> {
  const { supabase, household, people, userId } = await getContext();
  const { data } = await supabase.from("meal_plans").select("*, plan_meals(*)").eq("household_id", household.id).eq("week_start", weekStart).maybeSingle();
  if (data) return data as LoadedPlan;
  const { data: last } = await supabase.from("meal_plans").select("criteria").eq("household_id", household.id).order("week_start", { ascending: false }).limit(1).maybeSingle();
  const criteria = criteriaFor(people, last?.criteria as Partial<Criteria> | undefined);
  const { data: created } = await supabase
    .from("meal_plans")
    .insert({ household_id: household.id, week_start: weekStart, criteria, created_by: userId })
    .select("*, plan_meals(*)")
    .single();
  return (created as LoadedPlan) ?? null;
}

async function planRecipesOf(meals: { recipe_id: string }[]): Promise<Recipe[]> {
  return getPlanRecipes([...new Set(meals.map((m) => m.recipe_id))]);
}

/** Les repas d'une ligne : ses mangeurs, ou tout le foyer pour une semaine d'avant le partage. */
function eatersOf(meal: PlanMeal, people: { id: string }[]) {
  return meal.eaters?.length ? meal.eaters : people.map((p) => p.id);
}

export async function generateWeek(criteria: Criteria, weekStart: string): Promise<{ warnings: string[]; error?: string }> {
  const { supabase, household, userId } = await getContext();
  const input = await generationInput(criteria, weekStart);
  const { meals, warnings } = generatePlan(input);
  if (!meals.length) return { warnings, error: "Aucune recette disponible : ajoutez-en d'abord." };

  await supabase.from("meal_plans").delete().eq("household_id", household.id).eq("week_start", weekStart);
  const { data: plan, error } = await supabase
    .from("meal_plans")
    .insert({ household_id: household.id, week_start: weekStart, criteria, created_by: userId })
    .select("id")
    .single();
  if (error) return { warnings, error: error.message };

  const { error: mealsError } = await supabase.from("plan_meals").insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
  if (mealsError) return { warnings, error: mealsError.message };
  await rebuildShopping(supabase, plan.id, meals, input.recipes);
  revalidatePath("/", "layout");
  return { warnings };
}

/**
 * Échange un plat : la nouvelle recette remplace l'ancienne sur tous ses repas (on la
 * cuisine une fois). Elle doit plaire à tous ceux qui la mangent et tenir jusqu'au dernier.
 */
export async function swapMeal(planId: string, mealId: string) {
  const { supabase, people } = await getContext();
  const plan = await loadPlan(planId);
  const meal = plan?.plan_meals.find((m) => m.id === mealId);
  if (!plan || !meal) return;

  const rows = meal.slot === "extra" ? [meal] : plan.plan_meals.filter((m) => m.slot !== "extra" && m.recipe_id === meal.recipe_id);
  const eaters = [...new Set(rows.flatMap((m) => eatersOf(m, people)))];
  const lastDay = Math.max(...rows.map((m) => m.day));
  const input = await generationInput(plan.criteria, plan.week_start);
  const current = input.recipes.find((r) => r.id === meal.recipe_id);
  const replacement = pickReplacement(
    input,
    plan.plan_meals.map((m) => m.recipe_id),
    meal.recipe_id,
    meal.slot === "extra" ? [] : eaters,
    lastDay,
    current?.category ?? "plat",
  );
  if (!replacement) return;

  const updates = rows.map((m) => ({ id: m.id, storage: m.slot === "extra" ? (replacement.freezable ? "congelo" : "frigo") : storageFor(replacement, m.day) }));
  await Promise.all(updates.map((u) => supabase.from("plan_meals").update({ recipe_id: replacement.id, storage: u.storage }).eq("id", u.id)));
  const changed = new Map(updates.map((u) => [u.id, u.storage]));
  const updated = plan.plan_meals.map((m) => (changed.has(m.id) ? { ...m, recipe_id: replacement.id, storage: changed.get(m.id)! } : m));
  await rebuildShopping(supabase, planId, updated as PlanMeal[], input.recipes);
  revalidatePath("/", "layout");
}

/** Retire un plat de la semaine : tous ses repas, ses créneaux redeviennent libres. */
export async function removeDish(planId: string, recipeId: string) {
  const { supabase } = await getContext();
  await supabase.from("plan_meals").delete().eq("plan_id", planId).eq("recipe_id", recipeId).neq("slot", "extra");
  const plan = await loadPlan(planId);
  if (plan) await rebuildShopping(supabase, planId, plan.plan_meals, await planRecipesOf(plan.plan_meals));
  revalidatePath("/", "layout");
}

/** Le « + » : ajoute un petit-déj ou un goûter à la semaine. */
export async function addExtra(planId: string, category: Category) {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  if (!plan) return;
  const input = await generationInput({ ...plan.criteria, extras: { [category]: 1 } }, plan.week_start);
  const [extra] = pickExtras(input, plan.plan_meals.map((m) => m.recipe_id));
  if (!extra) return;
  await supabase.from("plan_meals").insert({ ...extra, plan_id: planId });
  await rebuildShopping(supabase, planId, [...plan.plan_meals, extra], input.recipes);
  revalidatePath("/", "layout");
}

export async function removeExtra(planId: string, mealId: string) {
  const { supabase } = await getContext();
  await supabase.from("plan_meals").delete().eq("id", mealId).eq("slot", "extra");
  const plan = await loadPlan(planId);
  if (plan) await rebuildShopping(supabase, planId, plan.plan_meals, await planRecipesOf(plan.plan_meals));
  revalidatePath("/", "layout");
}

// Choisir soi-même une recette ------------------------------------------------

/** Les recettes du foyer, en version légère : de quoi remplir le sélecteur sans tout charger. */
export async function recipeChoices(): Promise<RecipeChoice[]> {
  const { supabase, household } = await getContext();
  const { data } = await supabase
    .from("recipes")
    .select("id, name, category, tags, servings, yield_label, prep_minutes, cook_minutes, fridge_days, freezable")
    .eq("household_id", household.id)
    .order("name");
  return (data ?? []) as RecipeChoice[];
}

function storageFor(recipe: { fridge_days: number; freezable: boolean }, day: number, slot: PlanMeal["slot"] = "midi") {
  if (slot === "extra") return recipe.freezable ? "congelo" : "frigo";
  return daysAfterCooking(day) > recipe.fridge_days && recipe.freezable ? "congelo" : "frigo";
}

/** Remplace la recette d'un créneau par celle choisie à la main. */
export async function setMealRecipe(planId: string, mealId: string, recipeId: string): Promise<{ error?: string }> {
  const { supabase } = await getContext();
  const plan = await loadPlan(planId);
  const meal = plan?.plan_meals.find((m) => m.id === mealId);
  if (!plan || !meal) return { error: "Créneau introuvable." };
  const [recipe] = await getPlanRecipes([recipeId]);
  if (!recipe) return { error: "Recette introuvable." };

  const storage = storageFor(recipe, meal.day, meal.slot);
  const { error } = await supabase.from("plan_meals").update({ recipe_id: recipeId, storage }).eq("id", mealId);
  if (error) return { error: error.message };
  const updated = plan.plan_meals.map((m) => (m.id === mealId ? { ...m, recipe_id: recipeId, storage } : m));
  await rebuildShopping(supabase, planId, updated as PlanMeal[], await planRecipesOf(updated));
  revalidatePath("/", "layout");
  return {};
}

/** Ajoute une recette choisie à la main sur un créneau (pour ceux qui y sont libres), ou en extra. */
export async function addChosenRecipe(planId: string, recipeId: string, target: { day: number; slot: PlanMeal["slot"] }): Promise<{ error?: string }> {
  const { supabase, people } = await getContext();
  const plan = await loadPlan(planId);
  if (!plan) return { error: "Semaine introuvable." };
  const [recipe] = await getPlanRecipes([recipeId]);
  if (!recipe) return { error: "Recette introuvable." };

  let eaters: string[] = [];
  if (target.slot !== "extra") {
    const taken = new Set(plan.plan_meals.filter((m) => m.day === target.day && m.slot === target.slot).flatMap((m) => eatersOf(m, people)));
    eaters = people.map((p) => p.id).filter((id) => !taken.has(id));
    if (!eaters.length) return { error: "Ce créneau est déjà pris." };
  }

  const meal: PlanMeal = {
    recipe_id: recipeId,
    person_id: null,
    day: target.slot === "extra" ? 0 : target.day,
    slot: target.slot,
    storage: storageFor(recipe, target.day, target.slot),
    eaters,
  };
  const { error } = await supabase.from("plan_meals").insert({ ...meal, plan_id: planId });
  if (error) return { error: error.message };
  const updated = [...plan.plan_meals, meal];
  await rebuildShopping(supabase, planId, updated as PlanMeal[], await planRecipesOf(updated));
  revalidatePath("/", "layout");
  return {};
}

/** Retire un plat d'un créneau (laisse le créneau libre). */
export async function removeMeal(planId: string, mealId: string) {
  const { supabase } = await getContext();
  await supabase.from("plan_meals").delete().eq("id", mealId);
  const plan = await loadPlan(planId);
  if (plan) await rebuildShopping(supabase, planId, plan.plan_meals, await planRecipesOf(plan.plan_meals));
  revalidatePath("/", "layout");
}

// Composer sa semaine selon une envie -----------------------------------------

export interface MoodResult {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  servings: number;
  fridge_days: number;
  freezable: boolean;
  image_url: string | null;
  reasons: string[];
  /** Qui n'aime pas un de ses ingrédients, et lequel */
  conflicts: { personId: string; word: string }[];
}

/** Recettes de la bibliothèque qui répondent à une envie écrite à la main. */
export async function searchMood(query: string): Promise<{ understood: string[]; results: MoodResult[] }> {
  const { people } = await getContext();
  const recipes = await getRecipeSummaries();
  const { understood, matches } = searchByMood(query, recipes);
  const byId = new Map(recipes.map((r) => [r.id, r]));
  const results = matches.slice(0, 30).map((m) => {
    const r = byId.get(m.id)!;
    const conflicts = people.flatMap((p) =>
      p.dislikes.filter((d) => r.recipe_ingredients.some((i) => mentionsIngredient(i.name, d))).map((word) => ({ personId: p.id, word })),
    );
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      tags: r.tags,
      servings: r.servings,
      fridge_days: r.fridge_days,
      freezable: r.freezable,
      image_url: r.image_url,
      reasons: m.reasons,
      conflicts,
    };
  });
  return { understood, results };
}

/**
 * Ajoute une recette à la semaine pour certaines personnes, `mealsEach` repas chacune.
 * Sans créneaux donnés, l'app les place elle-même selon la conservation du plat.
 */
export async function addDishToWeek(
  weekStart: string,
  recipeId: string,
  eaters: string[],
  mealsEach: number,
  slots?: { day: number; slot: "midi" | "soir" }[],
): Promise<{ error?: string; placed?: { day: number; slot: string }[] }> {
  const { supabase, people } = await getContext();
  if (!eaters.length) return { error: "Choisissez pour qui." };
  const plan = await ensurePlan(weekStart);
  if (!plan) return { error: "Impossible de créer la semaine." };
  const [recipe] = await getPlanRecipes([recipeId]);
  if (!recipe) return { error: "Recette introuvable." };

  const ids = people.map((p) => p.id);
  let rows: PlanMeal[];
  if (recipe.category !== "plat") {
    rows = [{ recipe_id: recipe.id, person_id: null, day: 0, slot: "extra", storage: storageFor(recipe, 0, "extra"), eaters }];
  } else if (slots?.length) {
    const free = freeSlotsOf(plan.plan_meals, ids);
    rows = slots.flatMap((s) => {
      const who = eaters.filter((id) => free.get(id)?.some((f) => f.day === s.day && f.slot === s.slot));
      return who.length ? [{ recipe_id: recipe.id, person_id: null, day: s.day, slot: s.slot, storage: storageFor(recipe, s.day), eaters: who }] : [];
    });
  } else {
    rows = placeChosen(recipe, eaters, mealsEach, plan.plan_meals, ids);
  }
  if (!rows.length) return { error: "Plus de créneau libre pour ces personnes : retirez un plat d'abord." };

  const { error } = await supabase.from("plan_meals").insert(rows.map((m) => ({ ...m, plan_id: plan.id })));
  if (error) return { error: error.message };
  const updated = [...plan.plan_meals, ...rows];
  await rebuildShopping(supabase, plan.id, updated, await planRecipesOf(updated));
  revalidatePath("/", "layout");
  return { placed: rows.filter((m) => m.slot !== "extra").map((m) => ({ day: m.day, slot: m.slot })) };
}

/** Remplit automatiquement les repas encore libres d'une semaine composée à la main. */
export async function completeWeekAuto(weekStart: string): Promise<{ warnings: string[]; error?: string }> {
  const { supabase, people } = await getContext();
  const plan = await ensurePlan(weekStart);
  if (!plan) return { warnings: [], error: "Impossible de créer la semaine." };
  const input = await generationInput(plan.criteria, plan.week_start);
  const { meals, warnings } = completeWeek(
    input,
    plan.plan_meals,
    people.map((p) => p.id),
  );
  if (meals.length) {
    const { error } = await supabase.from("plan_meals").insert(meals.map((m) => ({ ...m, plan_id: plan.id })));
    if (error) return { warnings, error: error.message };
  }
  await rebuildShopping(supabase, plan.id, [...plan.plan_meals, ...meals], input.recipes);
  revalidatePath("/", "layout");
  return { warnings };
}

// Courses ---------------------------------------------------------------------

export async function toggleShoppingItem(id: string, checked: boolean) {
  const { supabase, userId } = await getContext();
  await supabase
    .from("shopping_items")
    .update({ checked, checked_by: checked ? userId : null, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function addShoppingItem(planId: string, name: string) {
  const { supabase } = await getContext();
  if (!name.trim()) return;
  await supabase.from("shopping_items").insert({ plan_id: planId, name: name.trim(), manual: true, aisle: "Autre" });
}

export async function removeShoppingItem(id: string) {
  const { supabase } = await getContext();
  await supabase.from("shopping_items").delete().eq("id", id);
}
