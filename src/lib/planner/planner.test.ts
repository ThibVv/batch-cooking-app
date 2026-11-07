import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { eligibleRecipes, generatePlan, pickExtras, pickReplacement, type GenerateInput } from "@/lib/planner/generate";
import { buildShoppingList } from "@/lib/planner/shopping";
import { groupedPrep, scheduleBatch } from "@/lib/planner/schedule";
import { DEFAULT_EQUIPMENT, stationCapacities } from "@/lib/equipment";
import type { Criteria, PlanMeal, Recipe } from "@/lib/types";

const recipes: Recipe[] = STARTER_RECIPES.map((d, i) => ({ ...d, id: `r${i}`, household_id: "h", author_id: null }));
const byId = new Map(recipes.map((r) => [r.id, r]));
const byName = (name: string) => recipes.find((r) => r.name.startsWith(name))!;

function seeded(seed = 42) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

const criteria: Criteria = {
  people: [
    { personId: "a", count: 5, tags: ["épicé"] },
    { personId: "b", count: 5, tags: ["comfort food"] },
  ],
  maxMinutes: 180,
  minTags: { végé: 3 },
  excludeIngredients: [],
  avoidRecentWeeks: 3,
  shareIngredients: true,
  usePantry: true,
  extras: {},
};

const input = (over: Partial<GenerateInput> = {}): GenerateInput => ({
  recipes,
  criteria,
  weeksSinceEaten: new Map(),
  equipment: [...DEFAULT_EQUIPMENT],
  rng: seeded(),
  ...over,
});

describe.skipIf(!STARTER_RECIPES.length)("generatePlan", () => {
  it("en partageant : 5 plats pour deux, 10 repas chacun, chaque plat mangé ensemble", () => {
    const { meals } = generatePlan(input());
    const mains = meals.filter((m) => m.slot !== "extra");
    expect(mains).toHaveLength(10);
    expect(new Set(mains.map((m) => m.recipe_id)).size).toBe(5);
    expect(mains.every((m) => m.eaters?.length === 2)).toBe(true);
    expect(mains.every((m) => byId.get(m.recipe_id)!.category === "plat")).toBe(true);
  });

  it("sans partage : 5 plats chacun, 10 plats différents", () => {
    const { meals } = generatePlan(input({ criteria: { ...criteria, share: false } }));
    const mains = meals.filter((m) => m.slot !== "extra");
    expect(new Set(mains.map((m) => m.recipe_id)).size).toBe(10);
    for (const person of ["a", "b"]) {
      const mine = mains.filter((m) => m.eaters?.includes(person));
      expect(mine).toHaveLength(10);
      expect(new Set(mine.map((m) => m.recipe_id)).size).toBe(5);
    }
  });

  it("chaque personne a un seul plat par créneau, et pas deux fois le même dans la journée", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { meals } = generatePlan(input({ criteria: { ...criteria, people: [{ ...criteria.people[0], count: 4 }, { ...criteria.people[1], count: 6 }] }, rng: seeded(seed) }));
      for (const person of ["a", "b"]) {
        const mine = meals.filter((m) => m.slot !== "extra" && m.eaters?.includes(person));
        expect(new Set(mine.map((m) => `${m.day}|${m.slot}`)).size).toBe(10);
        const twiceADay = mine.filter((m) => mine.some((o) => o !== m && o.day === m.day && o.recipe_id === m.recipe_id));
        expect(twiceADay).toHaveLength(0);
      }
    }
  });

  it("aucun plat non congelable n'est mangé après sa date limite, même en le servant plusieurs fois", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const counts = [[5, 5], [4, 6], [3, 6], [5, 7]][seed % 4];
      const people = criteria.people.map((p, i) => ({ ...p, count: counts[i] }));
      const { meals } = generatePlan(input({ criteria: { ...criteria, people, minTags: {} }, rng: seeded(seed) }));
      for (const m of meals.filter((x) => x.slot !== "extra")) {
        const r = byId.get(m.recipe_id)!;
        expect(r.freezable || m.day + 1 <= r.fridge_days).toBe(true);
      }
    }
  });

  it("ne partage pas un plat que l'un des deux n'aime pas", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { meals } = generatePlan(input({ dislikesByPerson: { a: [], b: ["champignons", "poulet"] }, rng: seeded(seed) }));
      for (const m of meals.filter((x) => x.eaters?.includes("b"))) {
        const names = byId.get(m.recipe_id)!.recipe_ingredients.map((i) => i.name.toLowerCase());
        expect(names.some((n) => n.includes("champignon") || n.includes("poulet"))).toBe(false);
      }
    }
  });

  it("respecte les exclusions, les « n'aime pas » et le minimum végé", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { meals } = generatePlan(input({ criteria: { ...criteria, excludeIngredients: ["bœuf"] }, dislikes: ["champignons"], rng: seeded(seed) }));
      const chosen = meals.map((m) => byId.get(m.recipe_id)!);
      const names = chosen.flatMap((r) => r.recipe_ingredients.map((i) => i.name.toLowerCase()));
      expect(names.some((n) => /b(œ|oe)uf/.test(n))).toBe(false);
      expect(names.some((n) => n.includes("champignon"))).toBe(false);
      expect(chosen.filter((r) => r.tags.includes("végé")).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("écarte les recettes dont le matériel manque (mijoteuse, air fryer, gaufrier)", () => {
    const pool = eligibleRecipes(input(), "plat");
    expect(pool.find((r) => r.name.includes("à la Mijoteuse"))).toBeUndefined();
    expect(pool.find((r) => r.name.startsWith("Gaufres salées"))).toBeUndefined();
    const withSlowCooker = eligibleRecipes(input({ equipment: [...DEFAULT_EQUIPMENT, "mijoteuse", "gaufrier"] }), "plat");
    expect(withSlowCooker.find((r) => r.name.includes("à la Mijoteuse"))).toBeDefined();
    expect(withSlowCooker.find((r) => r.name.startsWith("Gaufres salées"))).toBeDefined();
  });

  it("sans four, aucun plat au four", () => {
    const pool = eligibleRecipes(input({ equipment: ["plaque-induction", "poele"] }), "plat");
    expect(pool.some((r) => r.recipe_steps.some((s) => s.station === "four"))).toBe(false);
  });

  it("favorise les fonds de placard", () => {
    const PANTRY = ["lait de coco", "pois chiches", "lentilles corail", "crevettes"];
    const uses = /(lait de coco|pois chiches|lentilles corail|crevettes)/i;
    const count = (usePantry: boolean) => {
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const { meals } = generatePlan(input({ pantry: usePantry ? PANTRY : [], criteria: { ...criteria, minTags: {}, usePantry }, rng: seeded(seed) }));
        n += meals.filter((m) => byId.get(m.recipe_id)!.recipe_ingredients.some((i) => uses.test(i.name))).length;
      }
      return n;
    };
    expect(count(true)).toBeGreaterThan(count(false) * 1.3);
  });

  it("met au congélateur ce qui dépasse sa durée au frigo", () => {
    const { meals } = generatePlan(input({ rng: seeded(3) }));
    for (const m of meals.filter((x) => x.slot !== "extra")) {
      const r = byId.get(m.recipe_id)!;
      if (m.day + 1 > r.fridge_days && r.freezable) expect(m.storage).toBe("congelo");
    }
  });

  it("ajoute les extras demandés avec les « + », sans les compter dans les plats", () => {
    const { meals } = generatePlan(input({ criteria: { ...criteria, extras: { "petit-dej": 1, gouter: 2 } } }));
    const extras = meals.filter((m) => m.slot === "extra").map((m) => byId.get(m.recipe_id)!);
    expect(extras.filter((r) => r.category === "petit-dej")).toHaveLength(1);
    expect(extras.filter((r) => r.category === "gouter")).toHaveLength(2);
    expect(meals.filter((m) => m.slot !== "extra")).toHaveLength(10);
  });

  it("un extra ajouté plus tard n'est pas un doublon", () => {
    const first = pickExtras(input({ criteria: { ...criteria, extras: { gouter: 1 } } }));
    const second = pickExtras(input({ criteria: { ...criteria, extras: { gouter: 1 } } }), first.map((m) => m.recipe_id));
    expect(second[0].recipe_id).not.toBe(first[0].recipe_id);
  });

  it("évite deux plats du même type dans la semaine", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { meals } = generatePlan(input({ rng: seeded(seed) }));
      const kinds = [...new Set(meals.map((m) => m.recipe_id))].map((id) => byId.get(id)!.name.split(" ")[0].toLowerCase());
      expect(kinds.filter((k) => k === "chili").length).toBeLessThanOrEqual(1);
    }
  });

  it("ne remplace un plat de fin de semaine que par un plat qui tient jusque-là", () => {
    const { meals } = generatePlan(input());
    const ids = [...new Set(meals.map((m) => m.recipe_id))];
    for (let i = 0; i < 10; i++) {
      const r = pickReplacement(input({ rng: seeded(i + 1) }), ids, ids[0], ["a"], 4)!;
      expect(ids).not.toContain(r.id);
      expect(r.freezable || r.fridge_days >= 5).toBe(true);
    }
  });
});

describe.skipIf(!STARTER_RECIPES.length)("buildShoppingList", () => {
  const meal = (r: Recipe, slot: PlanMeal["slot"] = "midi"): PlanMeal => ({ recipe_id: r.id, person_id: null, day: 0, slot, storage: "frigo" });

  it("additionne les ingrédients communs et met à l'échelle des portions", () => {
    const dahl = byName("Dahl de lentilles corail"); // pour 2
    const ratatouille = byName("Ratatouille et riz"); // pour 2
    const list = buildShoppingList([meal(dahl), meal(ratatouille)], byId, 2);
    const oignon = list.find((l) => l.name.toLowerCase().startsWith("oignon"))!;
    expect(oignon.quantity).toBe(2);
    expect(oignon.sources).toHaveLength(2);
  });

  it("un plat partagé compte une part par mangeur, un plat individuel une seule", () => {
    const dahl = byName("Dahl de lentilles corail"); // pour 2
    const pour = (eaters: string[]) => ({ ...meal(dahl), eaters });
    const lentils = (meals: PlanMeal[]) => buildShoppingList(meals, byId, 2).find((l) => l.name === "Lentilles corail")!.quantity!;
    const recette = lentils([pour(["a", "b"])]);
    expect(lentils([pour(["a"])])).toBeLessThan(recette);
    // Deux repas à deux = deux fois la recette
    expect(lentils([pour(["a", "b"]), { ...pour(["a", "b"]), day: 1 }])).toBe(recette * 2);
  });

  it("marque ce qui est déjà au placard", () => {
    const list = buildShoppingList([meal(byName("Dahl de lentilles corail"))], byId, 2, ["lentilles corail", "riz basmati"]);
    expect(list.find((l) => l.name === "Lentilles corail")?.inPantry).toBe(true);
    expect(list.find((l) => l.name.toLowerCase().startsWith("oignon"))?.inPantry).toBe(false);
  });

  it("un extra (10 gaufres) n'est pas mis à l'échelle des portions", () => {
    const gaufres = byName("Gaufres liégeoises");
    const once = buildShoppingList([meal(gaufres, "extra")], byId, 2);
    const asMeal = buildShoppingList([meal(gaufres)], byId, 2);
    const flour = (l: typeof once) => l.find((x) => /farine/i.test(x.name))?.quantity ?? 0;
    expect(flour(once)).toBeGreaterThan(flour(asMeal));
  });
});

describe.skipIf(!STARTER_RECIPES.length)("scheduleBatch", () => {
  const week = recipes.filter((r) => r.category === "plat").slice(0, 10);
  const caps = stationCapacities(DEFAULT_EQUIPMENT, 4);

  it("planifie toutes les étapes, dans l'ordre de chaque recette", () => {
    const s = scheduleBatch(week, ["a", "b"], caps);
    expect(s.tasks.length + s.afterwards.length).toBe(week.reduce((n, r) => n + r.recipe_steps.length, 0));
    for (const r of week) {
      const steps = s.tasks.filter((t) => t.recipeId === r.id).sort((x, y) => Number(x.id.split(":")[1]) - Number(y.id.split(":")[1]));
      for (let i = 1; i < steps.length; i++) expect(steps[i].start).toBeGreaterThanOrEqual(steps[i - 1].end);
    }
  });

  it("respecte le nombre de feux, un seul four, et un cuisinier par tâche active", () => {
    const s = scheduleBatch(week, ["a", "b"], stationCapacities(DEFAULT_EQUIPMENT, 2));
    const overlaps = (x: { start: number; end: number }, y: { start: number; end: number }) => x.start < y.end && y.start < x.end;
    const oven = s.tasks.filter((t) => t.station === "four");
    for (const x of oven) for (const y of oven) if (x !== y) expect(overlaps(x, y)).toBe(false);
    const hob = s.tasks.filter((t) => t.station === "plaque");
    for (const x of hob) expect(hob.filter((y) => y.start <= x.start && y.end > x.start).length).toBeLessThanOrEqual(2);
    for (const cook of ["a", "b"]) {
      const mine = s.tasks.filter((t) => t.cook === cook);
      for (const x of mine) for (const y of mine) if (x !== y) expect(overlaps(x, y)).toBe(false);
    }
  });

  it("à deux, c'est plus rapide que seul", () => {
    expect(scheduleBatch(week, ["a", "b"], caps).totalMinutes).toBeLessThan(scheduleBatch(week, ["a"], caps).totalMinutes);
  });

  it("un repos d'une nuit au frigo passe après le batch", () => {
    const cake = byName("Gâteau invisible");
    const s = scheduleBatch([cake], ["a"], caps);
    expect(s.afterwards).toHaveLength(1);
    expect(s.totalMinutes).toBeLessThan(150);
  });

  it("regroupe les légumes communs à plusieurs recettes", () => {
    const g = groupedPrep(week.map((recipe) => ({ recipe, scale: 2 / recipe.servings })));
    expect(g.length).toBeGreaterThan(0);
    expect(g.every((x) => x.recipes.length >= 2)).toBe(true);
  });
});
