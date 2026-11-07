import { ingredientKey, mentionsIngredient } from "@/lib/units";
import { hasEquipmentFor } from "@/lib/equipment";
import { hasProtein, recipeNutrition } from "@/lib/nutrition/analyze";
import { inPantry } from "@/lib/planner/shopping";
import { EXTRA_CATEGORIES, type Category, type Criteria, type PlanMeal, type Recipe, type Slot } from "@/lib/types";

/** Ingrédients trop courants pour compter comme « mutualisés ». */
const STAPLES = new Set(["sel", "poivre", "huile", "huile d olive", "eau", "sucre", "beurre", "farine", "sel et poivre", "huile d olive sel poivre"]);

export interface GenerateInput {
  recipes: Recipe[];
  criteria: Criteria;
  /** Nombre de semaines depuis la dernière fois que la recette a été planifiée */
  weeksSinceEaten: Map<string, number>;
  /** Matériel du foyer : les recettes qui demandent un appareil absent sont écartées */
  equipment?: string[];
  /** Fonds de placard à écouler en priorité */
  pantry?: string[];
  /** Ingrédients que quelqu'un du foyer n'aime pas */
  dislikes?: string[];
  /** Aversions de chaque personne : un plat n'est partagé que s'il convient à tous ceux qui le mangent */
  dislikesByPerson?: Record<string, string[]>;
  rng?: () => number;
}

export interface GenerateResult {
  meals: PlanMeal[];
  warnings: string[];
}

/** Créneaux de la semaine dans l'ordre : lundi midi, lundi soir, mardi midi… */
export function weekSlots(days = 5): { day: number; slot: Slot }[] {
  const out: { day: number; slot: Slot }[] = [];
  for (let day = 0; day < days; day++) {
    out.push({ day, slot: "midi" }, { day, slot: "soir" });
  }
  return out;
}

/** Jours écoulés depuis le batch du dimanche pour un créneau (lundi = 1). */
export function daysAfterCooking(day: number) {
  return day + 1;
}

/** Le plat tient-il jusqu'à ce jour (au frigo, ou au congélateur) ? */
export function keepsUntil(r: Recipe, day: number) {
  return r.freezable || daysAfterCooking(day) <= r.fridge_days;
}

/** Temps où il faut avoir les mains occupées, en minutes. */
export function activeMinutes(r: Recipe): number {
  const fromSteps = r.recipe_steps.filter((s) => s.hands_busy).reduce((sum, s) => sum + s.duration_minutes, 0);
  return fromSteps || r.prep_minutes;
}

function keysOf(r: Recipe): Set<string> {
  return new Set(r.recipe_ingredients.map((i) => ingredientKey(i.name)).filter((k) => !STAPLES.has(k)));
}

function hasTag(r: Recipe, tag: string) {
  const t = tag.toLowerCase();
  return r.tags.some((x) => x.toLowerCase() === t);
}

function matchesAny(r: Recipe, words: string[]) {
  if (!words.length) return false;
  const keys = [...keysOf(r)];
  return words.some((w) => keys.some((k) => mentionsIngredient(k, w)));
}

/** Recettes utilisables : bonne catégorie, rien d'exclu, et le matériel nécessaire est là. */
export function eligibleRecipes(input: GenerateInput, category: Category, dislikes: string[] = input.dislikes ?? []): Recipe[] {
  const excluded = [...input.criteria.excludeIngredients, ...dislikes];
  return input.recipes.filter(
    (r) =>
      r.category === category &&
      !matchesAny(r, excluded) &&
      (!input.equipment || hasEquipmentFor(r.equipment, input.equipment)),
  );
}

function pantryUses(r: Recipe, pantry: string[]): number {
  if (!pantry.length) return 0;
  return pantry.filter((p) => r.recipe_ingredients.some((i) => inPantry(i.name, [p]))).length;
}

interface ScoreContext {
  selected: Recipe[];
  criteria: Criteria;
  personTags: string[];
  weeksSinceEaten: Map<string, number>;
  pantry: string[];
  lateSlotsNeeded: number;
  picksLeft: number;
  rng: () => number;
}

function score(r: Recipe, ctx: ScoreContext): number {
  const { selected, criteria } = ctx;
  let s = ctx.rng() * 1.5;

  for (const tag of ctx.personTags) if (hasTag(r, tag)) s += 2;

  for (const [tag, min] of Object.entries(criteria.minTags)) {
    const have = selected.filter((x) => hasTag(x, tag)).length;
    if (have < min && hasTag(r, tag)) s += 3;
  }

  if (criteria.shareIngredients && selected.length) {
    const mine = keysOf(r);
    const shared = new Set<string>();
    for (const other of selected) for (const k of keysOf(other)) if (mine.has(k)) shared.add(k);
    s += Math.min(shared.size, 3) * 0.6;
  }

  // Écouler le placard compte autant que les envies : un ingrédient déjà là pèse lourd
  if (criteria.usePantry) s += Math.min(pantryUses(r, ctx.pantry), 3) * 5;

  // Éviter deux plats trop proches (même ingrédient principal ou même type de plat, ex. deux chilis)
  const main = r.recipe_ingredients[0] && ingredientKey(r.recipe_ingredients[0].name);
  if (main && selected.some((x) => x.recipe_ingredients[0] && ingredientKey(x.recipe_ingredients[0].name) === main)) s -= 1.5;
  const kind = ingredientKey(r.name).split(" ")[0];
  if (selected.some((x) => ingredientKey(x.name).split(" ")[0] === kind)) s -= 6;

  // Le four (souvent unique) est le goulot du batch : on évite d'empiler les plats au four
  const oven = (x: Recipe) => x.recipe_steps.filter((st) => st.station === "four").reduce((n, st) => n + st.duration_minutes, 0);
  const ovenBudget = (criteria.maxMinutes ?? 240) * 0.6;
  if (oven(r) > 0 && selected.reduce((n, x) => n + oven(x), 0) + oven(r) > ovenBudget) s -= 3;

  if (criteria.maxMinutes) {
    const cooks = Math.max(criteria.people.length, 1);
    const used = selected.reduce((sum, x) => sum + activeMinutes(x), 0) / cooks;
    const budgetPerPick = (criteria.maxMinutes - used) / Math.max(ctx.picksLeft, 1);
    if (activeMinutes(r) / cooks > budgetPerPick) s -= 2;
  }

  // Les créneaux de jeudi/vendredi demandent des plats congelables ou qui tiennent
  const keepsLate = r.freezable || r.fridge_days >= 4;
  const lateHave = selected.filter((x) => x.freezable || x.fridge_days >= 4).length;
  if (keepsLate && lateHave < ctx.lateSlotsNeeded) s += ctx.picksLeft <= ctx.lateSlotsNeeded - lateHave ? 5 : 1;

  const weeks = ctx.weeksSinceEaten.get(r.id);
  if (weeks != null && weeks < criteria.avoidRecentWeeks) s -= 4;
  else if (weeks == null) s += 0.5; // jamais cuisinée : petit bonus nouveauté

  s += nutritionScore(r, selected);

  return s;
}

/**
 * Équilibre de la semaine : on pousse ce qui manque encore (poisson, légumes,
 * légumineuses) et on écarte les plats qui n'apportent aucune protéine.
 * Les poids restent inférieurs à ceux des envies et du placard : la nutrition
 * départage, elle ne décide pas à la place du foyer.
 */
function nutritionScore(r: Recipe, selected: Recipe[]): number {
  const mine = recipeNutrition(r);
  const chosen = selected.map(recipeNutrition);
  let s = 0;

  if (!hasProtein(r)) s -= 2;

  const fish = mine.families.poisson ?? 0;
  if (fish > 0 && !chosen.some((x) => (x.families.poisson ?? 0) > 0)) s += 2;

  const veg = mine.families.legume ?? 0;
  if (veg === 0) s -= 1;
  else if (veg >= 150 && chosen.filter((x) => (x.families.legume ?? 0) >= 150).length < 3) s += 1.2;

  const pulses = mine.families.legumineuse ?? 0;
  if (pulses > 0 && !chosen.some((x) => (x.families.legumineuse ?? 0) > 0)) s += 1;

  // Une semaine tout en viande rouge : on freine à partir de la moitié
  if ((mine.families.viande ?? 0) > 0 && chosen.filter((x) => (x.families.viande ?? 0) > 0).length >= Math.max(chosen.length / 2, 3)) s -= 1;

  return s;
}

function choose(candidates: Recipe[], ctx: ScoreContext): Recipe | undefined {
  let best: Recipe | undefined;
  let bestScore = -Infinity;
  for (const r of candidates) {
    const sc = score(r, ctx);
    if (sc > bestScore) {
      bestScore = sc;
      best = r;
    }
  }
  return best;
}

/** Un plat de la semaine et ceux qui le mangent. */
export interface Dish {
  recipe: Recipe;
  eaters: string[];
}

function dislikesOf(input: GenerateInput, personId: string): string[] {
  return input.dislikesByPerson?.[personId] ?? input.dislikes ?? [];
}

/**
 * Choisit les plats de la semaine. Avec le partage, chacun reçoit d'abord des plats
 * communs (autant que la personne qui en veut le moins), pris parmi ceux qui ne
 * déplaisent à personne ; le reste se complète par des plats pour une seule personne.
 */
export function pickDishes(input: GenerateInput): { dishes: Dish[]; warnings: string[] } {
  const { criteria, weeksSinceEaten, rng = Math.random } = input;
  const warnings: string[] = [];
  const persons = criteria.people.filter((p) => p.count > 0);
  if (!persons.length) return { dishes: [], warnings };

  const share = (criteria.share ?? true) && persons.length > 1;
  const sharedWanted = share ? Math.min(...persons.map((p) => p.count)) : 0;
  const total = sharedWanted + persons.reduce((n, p) => n + p.count - sharedWanted, 0);
  const selected: Recipe[] = [];
  const dishes: Dish[] = [];
  const context = (personTags: string[]): ScoreContext => ({
    selected,
    criteria,
    personTags,
    weeksSinceEaten,
    pantry: input.pantry ?? [],
    lateSlotsNeeded: Math.ceil(total * 0.4),
    picksLeft: total - selected.length,
    rng,
  });

  // Chaque plat revient plusieurs fois : trop de plats fragiles ne tiendraient pas jusqu'à leur dernier repas
  const fits = (personId: string, candidate: Recipe) => {
    const count = persons.find((p) => p.personId === personId)!.count;
    const mine = [...dishes.filter((d) => d.eaters.includes(personId)).map((d) => d.recipe), candidate];
    return fitsBeforeDeadlines(mine, count);
  };
  const keepable = (pool: Recipe[], eaters: string[]) => {
    const ok = pool.filter((r) => eaters.every((id) => fits(id, r)));
    return ok.length ? ok : pool;
  };

  const everyone = persons.map((p) => p.personId);
  const sharedPool = eligibleRecipes(input, "plat", [...new Set(everyone.flatMap((id) => dislikesOf(input, id)))]);
  const sharedTags = [...new Set(persons.flatMap((p) => p.tags))];
  for (let i = 0; i < sharedWanted; i++) {
    const recipe = choose(
      keepable(
        sharedPool.filter((r) => !selected.includes(r)),
        everyone,
      ),
      context(sharedTags),
    );
    if (!recipe) break;
    selected.push(recipe);
    dishes.push({ recipe, eaters: everyone });
  }
  const sharedCount = dishes.length;
  if (sharedCount < sharedWanted) warnings.push(`Seulement ${sharedCount} plat(s) conviennent à tout le monde : les autres seront individuels.`);

  // Plats individuels, à tour de rôle pour que personne ne prenne tous les meilleurs
  const remaining = persons.map((p) => ({ ...p, left: p.count - sharedCount, pool: eligibleRecipes(input, "plat", dislikesOf(input, p.personId)) }));
  while (remaining.some((p) => p.left > 0)) {
    for (const person of remaining) {
      if (person.left <= 0) continue;
      person.left--;
      const recipe = choose(
        keepable(
          person.pool.filter((r) => !selected.includes(r)),
          [person.personId],
        ),
        context(person.tags),
      );
      if (!recipe) {
        warnings.push("Pas assez de recettes compatibles pour tous les plats demandés.");
        person.left = 0;
        continue;
      }
      selected.push(recipe);
      dishes.push({ recipe, eaters: [person.personId] });
    }
  }

  for (const [tag, min] of Object.entries(criteria.minTags)) {
    const have = selected.filter((r) => hasTag(r, tag)).length;
    if (have < min) warnings.push(`Seulement ${have} recette(s) « ${tag} » sur ${min} demandées.`);
  }
  return { dishes, warnings: [...new Set(warnings)] };
}

function shelfLife(r: Recipe) {
  return r.freezable ? 100 + r.fridge_days : r.fridge_days;
}

/** Dernier jour (0 = lundi) où le plat se mange encore ; congelable, il tient toute la semaine. */
function deadline(r: Recipe) {
  return r.freezable ? Infinity : r.fridge_days - 1;
}

/** Repas par plat : répartis également, le surplus aux plats qui se gardent le mieux (durées de vie données). */
function spread(lives: number[], slots: number): number[] {
  const uses = lives.map(() => Math.floor(slots / lives.length));
  let extra = slots % lives.length;
  for (const i of lives.map((_, i) => i).sort((a, b) => lives[b] - lives[a])) {
    if (extra-- <= 0) break;
    uses[i]++;
  }
  return uses;
}

/**
 * Une personne qui aura `count` plats, dont ceux-ci, peut-elle tous les manger à temps ?
 * Les plats pas encore choisis sont supposés se garder. Un plat fragile doit tenir dans
 * les jours avant sa date limite (un repas par jour), et l'ensemble des plats fragiles
 * dans les créneaux disponibles.
 */
function fitsBeforeDeadlines(recipes: Recipe[], count: number): boolean {
  const slots = weekSlots();
  const lives = [...recipes.map(shelfLife), ...Array(Math.max(count - recipes.length, 0)).fill(Infinity)];
  const uses = spread(lives, slots.length);
  const days = slots.reduce((m, s) => Math.max(m, s.day), 0);
  if (recipes.some((r, i) => uses[i] > deadline(r) + 1)) return false;
  for (let day = 0; day <= days; day++) {
    const need = recipes.reduce((n, r, i) => n + (deadline(r) <= day ? uses[i] : 0), 0);
    if (need > slots.filter((s) => s.day <= day).length) return false;
  }
  return true;
}

function usesFor(mine: Dish[], slots: number): Map<Dish, number> {
  const uses = spread(
    mine.map((d) => shelfLife(d.recipe)),
    slots,
  );
  return new Map(mine.map((d, i) => [d, uses[i]]));
}

/**
 * Ordre des repas d'une personne. Par priorité : le plat qui périmerait s'il attendait,
 * celui qui doit revenir autant de fois qu'il reste de jours, celui que les autres
 * mangent à ce créneau (pour manger ensemble), puis la date limite la plus proche.
 * Jamais deux fois le même plat dans la journée, sauf pour éviter qu'il périme.
 */
function sequenceFor(mine: Dish[], uses: Map<Dish, number>, slots: { day: number; slot: Slot }[], others: Map<string, Set<string>>): (Dish | null)[] {
  const left = new Map(uses);
  const order = new Map(mine.map((d, i) => [d, i]));
  // À date limite égale, celui qui doit revenir le plus souvent d'abord : les plats s'étalent sur les jours
  const byDeadline = (a: Dish, b: Dish) =>
    deadline(a.recipe) - deadline(b.recipe) || left.get(b)! - left.get(a)! || shelfLife(a.recipe) - shelfLife(b.recipe) || order.get(a)! - order.get(b)!;
  const out: (Dish | null)[] = [];

  slots.forEach((s, i) => {
    const available = mine.filter((d) => (left.get(d) ?? 0) > 0);
    if (!available.length) {
      out.push(null);
      return;
    }
    const today = new Set(out.filter((_, j) => slots[j].day === s.day));
    const notToday = available.filter((d) => !today.has(d));
    const pool = notToday.length ? notToday : available;
    const slotsBefore = (d: Dish) => slots.slice(i).filter((x) => x.day <= deadline(d.recipe)).length;
    const remainingDays = new Set(slots.slice(i).map((x) => x.day)).size;
    const shared = others.get(`${s.day}|${s.slot}`);

    const forced = available.filter((d) => left.get(d)! >= slotsBefore(d));
    // Prendre ce plat maintenant doit laisser assez de créneaux aux plats fragiles qui attendent
    const rest = slots.slice(i + 1);
    const fragile = available.filter((d) => Number.isFinite(deadline(d.recipe)));
    const safe = (pick: Dish) =>
      fragile.every((limit) => {
        const due = fragile.filter((d) => deadline(d.recipe) <= deadline(limit.recipe));
        const need = due.reduce((n, d) => n + left.get(d)! - (d === pick ? 1 : 0), 0);
        return need <= rest.filter((x) => x.day <= deadline(limit.recipe)).length;
      });
    const urgent = pool.filter((d) => left.get(d)! >= remainingDays && safe(d));
    const together = pool.filter((d) => shared?.has(d.recipe.id) && safe(d));
    const calm = pool.filter(safe);
    const candidates = forced.length ? forced : urgent.length ? urgent : together.length ? together : calm.length ? calm : available;
    const pick = [...candidates].sort(byDeadline)[0];
    left.set(pick, left.get(pick)! - 1);
    out.push(pick);
  });
  return out;
}

/**
 * Place les plats sur les créneaux de chaque personne, puis regroupe : deux personnes qui
 * mangent le même plat au même créneau donnent une seule ligne à deux mangeurs.
 * `freeSlots` limite les créneaux d'une personne (pour compléter une semaine commencée).
 */
export function placeDishes(dishes: Dish[], people: string[], freeSlots?: Map<string, { day: number; slot: Slot }[]>): GenerateResult {
  const warnings: string[] = [];
  const rows = new Map<string, PlanMeal>();
  const eaten = new Map<string, Set<string>>();
  const dishesOf = (person: string) => dishes.filter((d) => d.eaters.includes(person));

  // Celui qui a le moins de plats a le planning le plus contraint : il passe en premier, les autres s'alignent
  for (const person of [...people].sort((a, b) => dishesOf(a).length - dishesOf(b).length)) {
    const mine = dishesOf(person);
    const slots = freeSlots?.get(person) ?? weekSlots();
    if (!mine.length || !slots.length) continue;
    sequenceFor(mine, usesFor(mine, slots.length), slots, eaten).forEach((dish, i) => {
      if (!dish) return;
      const { day, slot } = slots[i];
      const key = `${day}|${slot}|${dish.recipe.id}`;
      const row = rows.get(key);
      if (row) row.eaters!.push(person);
      else rows.set(key, { recipe_id: dish.recipe.id, person_id: null, day, slot, storage: "frigo", eaters: [person] });
      const at = eaten.get(`${day}|${slot}`) ?? new Set<string>();
      eaten.set(`${day}|${slot}`, at.add(dish.recipe.id));
    });
  }

  const byId = new Map(dishes.map((d) => [d.recipe.id, d.recipe]));
  const meals = [...rows.values()].sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));
  const fragile = new Set<string>();
  for (const meal of meals) {
    const r = byId.get(meal.recipe_id)!;
    if (daysAfterCooking(meal.day) > r.fridge_days) {
      if (r.freezable) meal.storage = "congelo";
      else fragile.add(r.name);
    }
  }
  for (const name of fragile) warnings.push(`« ${name} » ne tient pas jusqu'à son dernier repas et n'est pas congelable.`);
  return { meals, warnings };
}

type SlotRef = { day: number; slot: Slot };

/** Créneaux encore libres de chaque personne dans une semaine commencée. */
export function freeSlotsOf(meals: PlanMeal[], people: string[]): Map<string, SlotRef[]> {
  const taken = new Set<string>();
  for (const m of meals) {
    if (m.slot === "extra") continue;
    for (const id of m.eaters?.length ? m.eaters : people) taken.add(`${id}|${m.day}|${m.slot}`);
  }
  return new Map(people.map((id) => [id, weekSlots().filter((s) => !taken.has(`${id}|${s.day}|${s.slot}`))]));
}

function storageFor(recipe: Recipe, day: number) {
  return daysAfterCooking(day) > recipe.fridge_days && recipe.freezable ? "congelo" : "frigo";
}

/**
 * Place une recette choisie à la main : `mealsEach` repas pour chacun de `eaters`, sur des
 * créneaux où ils sont tous libres, un par jour si possible. Un plat fragile va en début
 * de semaine, un plat qui se garde en fin de semaine (pour laisser le début aux fragiles).
 * Sans assez de créneaux communs, chacun le mange sur ses propres créneaux libres.
 */
export function placeChosen(recipe: Recipe, eaters: string[], mealsEach: number, meals: PlanMeal[], people: string[]): PlanMeal[] {
  const free = freeSlotsOf(meals, people);
  const keeps = recipe.freezable || recipe.fridge_days >= 5;
  const isFree = (id: string, s: SlotRef) => free.get(id)?.some((f) => f.day === s.day && f.slot === s.slot) ?? false;
  const pick = (slots: SlotRef[], n: number) => {
    const ordered = [...slots].sort((a, b) => (keeps ? b.day - a.day : a.day - b.day));
    const fresh = [...ordered.filter((s) => s.day <= deadline(recipe)), ...ordered.filter((s) => s.day > deadline(recipe))];
    const chosen: SlotRef[] = [];
    for (const s of fresh) if (chosen.length < n && !chosen.some((c) => c.day === s.day)) chosen.push(s);
    for (const s of fresh) if (chosen.length < n && !chosen.includes(s)) chosen.push(s);
    return chosen;
  };

  const row = (s: SlotRef, who: string[]): PlanMeal => ({ recipe_id: recipe.id, person_id: null, day: s.day, slot: s.slot, storage: storageFor(recipe, s.day), eaters: who });
  const together = pick(
    weekSlots().filter((s) => eaters.every((id) => isFree(id, s))),
    mealsEach,
  );
  const rows = together.map((s) => row(s, eaters));
  if (together.length < mealsEach) {
    for (const id of eaters) {
      const own = (free.get(id) ?? []).filter((s) => !together.some((t) => t.day === s.day && t.slot === s.slot));
      rows.push(...pick(own, mealsEach - together.length).map((s) => row(s, [id])));
    }
  }
  return rows.sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot));
}

/** Complète une semaine commencée à la main : environ un plat pour deux repas libres de chacun. */
export function completeWeek(input: GenerateInput, meals: PlanMeal[], people: string[]): GenerateResult {
  const free = freeSlotsOf(meals, people);
  const already = new Set(meals.map((m) => m.recipe_id));
  const criteria: Criteria = {
    ...input.criteria,
    people: people.map((id) => ({
      personId: id,
      tags: input.criteria.people.find((p) => p.personId === id)?.tags ?? [],
      count: Math.ceil(free.get(id)!.length / 2),
    })),
  };
  const { dishes, warnings } = pickDishes({ ...input, criteria, recipes: input.recipes.filter((r) => !already.has(r.id)) });
  const placed = placeDishes(dishes, people, free);
  return { meals: placed.meals, warnings: [...warnings, ...placed.warnings] };
}

/** Choisit les extras (petit-déj, goûter) demandés avec les « + ». */
export function pickExtras(input: GenerateInput, alreadyIds: string[] = []): PlanMeal[] {
  const { criteria, weeksSinceEaten, rng = Math.random } = input;
  const meals: PlanMeal[] = [];
  const taken = new Set(alreadyIds);
  for (const category of EXTRA_CATEGORIES) {
    const count = criteria.extras[category] ?? 0;
    for (let i = 0; i < count; i++) {
      const candidates = eligibleRecipes(input, category).filter((r) => !taken.has(r.id));
      const recipe = choose(candidates, {
        selected: [],
        criteria: { ...criteria, minTags: {}, maxMinutes: null },
        personTags: [],
        weeksSinceEaten,
        pantry: input.pantry ?? [],
        lateSlotsNeeded: 0,
        picksLeft: 1,
        rng,
      });
      if (!recipe) break;
      taken.add(recipe.id);
      meals.push({ recipe_id: recipe.id, person_id: null, day: 0, slot: "extra", storage: recipe.freezable ? "congelo" : "frigo" });
    }
  }
  return meals;
}

export function generatePlan(input: GenerateInput): GenerateResult {
  const { dishes, warnings } = pickDishes(input);
  const people = input.criteria.people.filter((p) => p.count > 0).map((p) => p.personId);
  const placed = placeDishes(dishes, people);
  const extras = pickExtras(input);
  return { meals: [...placed.meals, ...extras], warnings: [...warnings, ...placed.warnings] };
}

/**
 * Propose une autre recette pour un plat, sans toucher au reste de la semaine :
 * elle doit convenir à tous ceux qui le mangent et tenir jusqu'à son dernier repas.
 */
export function pickReplacement(
  input: GenerateInput,
  currentRecipeIds: string[],
  replacedId: string,
  eaters: string[],
  day: number,
  category: Category = "plat",
): Recipe | undefined {
  const { recipes, criteria, weeksSinceEaten, rng = Math.random } = input;
  const selected = recipes.filter((r) => currentRecipeIds.includes(r.id) && r.id !== replacedId && r.category === category);
  const dislikes = eaters.length ? [...new Set(eaters.flatMap((id) => dislikesOf(input, id)))] : input.dislikes;
  const available = eligibleRecipes(input, category, dislikes).filter((r) => !currentRecipeIds.includes(r.id));
  // On ne propose un plat fragile que s'il n'existe aucune autre option pour ce jour-là
  const safe = category === "plat" ? available.filter((r) => keepsUntil(r, day)) : available;
  const candidates = safe.length ? safe : available;
  const personTags = criteria.people.filter((p) => eaters.includes(p.personId)).flatMap((p) => p.tags);
  return choose(candidates, {
    selected,
    criteria,
    personTags,
    weeksSinceEaten,
    pantry: input.pantry ?? [],
    lateSlotsNeeded: 0,
    picksLeft: 1,
    rng,
  });
}
