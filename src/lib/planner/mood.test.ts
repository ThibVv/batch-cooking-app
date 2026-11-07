import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { searchByMood, understandMood } from "@/lib/planner/mood";
import { mentionsIngredient } from "@/lib/units";

const recipes = STARTER_RECIPES.map((d, i) => ({ ...d, id: `r${i}` }));
const byId = new Map(recipes.map((r) => [r.id, r]));

describe.skipIf(!STARTER_RECIPES.length)("envie → recettes", () => {
  it("comprend une humeur et un ingrédient", () => {
    const q = understandMood("Un truc réconfortant avec des courgettes");
    expect(q.tags).toContain("comfort food");
    expect(q.terms).toEqual(["courgette"]);
  });

  it("met d'abord les recettes qui ont l'ingrédient demandé", () => {
    const { matches } = searchByMood("courgettes", recipes);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const r = byId.get(m.id)!;
      const has = [r.name, ...r.recipe_ingredients.map((i) => i.name)].some((n) => /courgette/i.test(n));
      expect(has).toBe(true);
    }
  });

  it("une humeur seule remonte les recettes du tag correspondant", () => {
    const { matches, understood } = searchByMood("j'ai la flemme", recipes);
    expect(understood).toContain("express");
    expect(matches.slice(0, 5).every((m) => byId.get(m.id)!.tags.some((t) => t === "express" || t === "one pot"))).toBe(true);
  });

  it("ne confond pas « pâtes » et « patate »", () => {
    const { matches } = searchByMood("patate douce", recipes);
    const top = byId.get(matches[0].id)!;
    expect([top.name, ...top.recipe_ingredients.map((i) => i.name)].some((n) => /patate/i.test(n))).toBe(true);
  });

  it("l'huile d'olive n'est pas une olive, et un mot ne matche que des mots entiers", () => {
    expect(mentionsIngredient("Huile d'olive", "olives")).toBe(false);
    expect(mentionsIngredient("Olives noires", "olives")).toBe(true);
    expect(mentionsIngredient("Champignons de Paris", "champignons")).toBe(true);
    expect(mentionsIngredient("Huile d'olive", "huile d'olive")).toBe(true);
    expect(mentionsIngredient("Porcelet", "porc")).toBe(true);
    expect(mentionsIngredient("Épaule de porc", "porc")).toBe(true);
  });
});
