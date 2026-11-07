import { formatQuantity, ingredientKey, normalizeUnit, roundForShopping } from "@/lib/units";
import type { Recipe, Station } from "@/lib/types";

/** Capacités par défaut, quand on ne connaît pas le matériel du foyer. */
export const DEFAULT_CAPACITY: Record<Station, number> = {
  plan: Infinity,
  plaque: 4,
  four: 1,
  repos: Infinity,
};

/** Un repos long en fin de recette (une nuit au frigo…) se fait après le batch, pas pendant. */
const AFTER_BATCH_REST = 60;

export interface ScheduledTask {
  id: string;
  recipeId: string;
  recipeName: string;
  text: string;
  station: Station;
  start: number;
  end: number;
  handsBusy: boolean;
  /** Cuisinier qui s'en occupe (null = tâche passive, rien à faire) */
  cook: string | null;
}

export interface Schedule {
  tasks: ScheduledTask[];
  totalMinutes: number;
  packagingMinutes: number;
  loadByCook: Record<string, number>;
  /** Étapes à faire après le batch (repos au frigo…) */
  afterwards: { recipeName: string; text: string }[];
}

interface PendingTask {
  id: string;
  recipeId: string;
  recipeName: string;
  text: string;
  station: Station;
  duration: number;
  handsBusy: boolean;
  /** Durée restante de la recette à partir de cette étape (priorité chemin critique) */
  tail: number;
  prev: PendingTask | null;
  scheduled?: ScheduledTask;
}

function buildTasks(recipes: Recipe[], afterwards: Schedule["afterwards"]): PendingTask[] {
  const all: PendingTask[] = [];
  for (const r of recipes) {
    const steps = [...r.recipe_steps].sort((a, b) => a.position - b.position);
    while (steps.length && steps[steps.length - 1].station === "repos" && steps[steps.length - 1].duration_minutes >= AFTER_BATCH_REST) {
      afterwards.unshift({ recipeName: r.name, text: steps.pop()!.text });
    }
    let prev: PendingTask | null = null;
    const chain: PendingTask[] = [];
    steps.forEach((s, i) => {
      const t: PendingTask = {
        id: `${r.id}:${i}`,
        recipeId: r.id,
        recipeName: r.name,
        text: s.text,
        station: s.station,
        duration: s.duration_minutes,
        handsBusy: s.hands_busy,
        tail: 0,
        prev,
      };
      chain.push(t);
      prev = t;
    });
    let acc = 0;
    for (let i = chain.length - 1; i >= 0; i--) {
      acc += chain[i].duration;
      chain[i].tail = acc;
    }
    all.push(...chain);
  }
  return all;
}

/**
 * Ordonnancement glouton : à chaque instant on lance les étapes prêtes,
 * en priorité celles des recettes les plus longues, si le poste est libre
 * et (pour les étapes actives) si un cuisinier a les mains libres.
 */
export function scheduleBatch(recipes: Recipe[], cooks: string[], capacities: Record<Station, number> = DEFAULT_CAPACITY): Schedule {
  const afterwards: Schedule["afterwards"] = [];
  const tasks = buildTasks(recipes, afterwards);
  // Un poste absent du foyer (pas de four…) garde une place, sinon l'étape ne serait jamais planifiée
  const capacity = (station: Station) => Math.max(capacities[station] ?? 1, 1);
  const cookFreeAt = new Map(cooks.map((c) => [c, 0]));
  const loadByCook: Record<string, number> = Object.fromEntries(cooks.map((c) => [c, 0]));
  const running: ScheduledTask[] = [];
  let t = 0;
  let guard = 0;

  while (tasks.some((x) => !x.scheduled) && guard++ < 10000) {
    const ready = tasks
      .filter((x) => !x.scheduled && (!x.prev || (x.prev.scheduled && x.prev.scheduled.end <= t)))
      .sort((a, b) => b.tail - a.tail);

    for (const task of ready) {
      const busyHere = running.filter((r) => r.station === task.station && r.start <= t && r.end > t).length;
      if (busyHere >= capacity(task.station)) continue;

      let cook: string | null = null;
      if (task.handsBusy) {
        const free = cooks.filter((c) => cookFreeAt.get(c)! <= t);
        if (!free.length) continue;
        const previousCook = task.prev?.scheduled?.cook;
        cook = previousCook && free.includes(previousCook) ? previousCook : free.sort((a, b) => loadByCook[a] - loadByCook[b])[0];
        cookFreeAt.set(cook, t + task.duration);
        loadByCook[cook] += task.duration;
      }

      const s: ScheduledTask = {
        id: task.id,
        recipeId: task.recipeId,
        recipeName: task.recipeName,
        text: task.text,
        station: task.station,
        start: t,
        end: t + task.duration,
        handsBusy: task.handsBusy,
        cook,
      };
      task.scheduled = s;
      running.push(s);
    }

    const next = [...running.map((r) => r.end), ...cookFreeAt.values()].filter((x) => x > t);
    if (!next.length) break;
    t = Math.min(...next);
  }

  const scheduled = tasks.map((x) => x.scheduled!).filter(Boolean).sort((a, b) => a.start - b.start || a.end - b.end);
  const cookingEnd = scheduled.reduce((m, s) => Math.max(m, s.end), 0);
  // Refroidir, portionner et étiqueter : ~4 min par recette, partagé entre cuisiniers
  const packagingMinutes = Math.ceil((recipes.length * 4) / Math.max(cooks.length, 1));
  return { tasks: scheduled, totalMinutes: cookingEnd + packagingMinutes, packagingMinutes, loadByCook, afterwards };
}

export interface GroupedPrep {
  name: string;
  quantity: string;
  recipes: string[];
}

/** Légumes utilisés dans plusieurs recettes : à éplucher et couper en une seule fois. */
export function groupedPrep(items: { recipe: Recipe; scale: number }[]): GroupedPrep[] {
  const map = new Map<string, { name: string; qty: number | null; unit: string; recipes: Set<string> }>();
  for (const { recipe: r, scale } of items) {
    for (const ing of r.recipe_ingredients) {
      if (ing.aisle !== "Fruits & légumes") continue;
      const { unit, factor } = normalizeUnit(ing.unit);
      const key = `${ingredientKey(ing.name)}|${unit}`;
      const qty = ing.quantity == null ? null : ing.quantity * factor * scale;
      const cur = map.get(key);
      if (cur) {
        cur.qty = cur.qty == null || qty == null ? (cur.qty ?? qty) : cur.qty + qty;
        cur.recipes.add(r.name);
      } else {
        map.set(key, { name: ing.name, qty, unit, recipes: new Set([r.name]) });
      }
    }
  }
  return [...map.values()]
    .filter((g) => g.recipes.size >= 2)
    .sort((a, b) => b.recipes.size - a.recipes.size)
    .map((g) => ({
      name: g.name,
      quantity: formatQuantity(g.qty == null ? null : roundForShopping(g.qty, g.unit), g.unit),
      recipes: [...g.recipes],
    }));
}

export function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export function formatClock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
