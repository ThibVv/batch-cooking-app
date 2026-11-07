import { describe, expect, it } from "vitest";
import { parseMeta, parseTextRecipe, recipeToText } from "@/lib/import/parse-text-recipe";

const DAHL = `**Pour 2 personnes · Se congèle très bien**

Plat végétarien crémeux et économique, prêt en 30 minutes. Parfait à réchauffer au bureau.

## Ingrédients

  - 200 g de lentilles corail
  - 200 ml de lait de coco
  - 1 oignon
  - 2 gousses d'ail
  - 1 c. à c. de gingembre moulu

## Préparation

1.  Émincer l'oignon et l'ail, les faire revenir dans l'huile 3 min.
2.  Ajouter lentilles rincées, tomates, lait de coco et 300 ml d'eau.
3.  Mijoter 20 min à feu doux en remuant de temps en temps.
`;

const POULET = `# Poulet Miel et Sésame

Pour 4 personnes · Conservation : 2 jours au réfrigérateur, 5 jours sous vide (Congélation : Oui) · Préparation : 20 min | Cuisson : 15 min

## Ingrédients

### Pour le poulet et sa panure :
- 600 g de blanc de poulet
- 2 œufs

Pour la sauce :
- 3 c. à soupe de miel
- 1 cube de bouillon

## Préparation

1. Couper le poulet en dés.
2. Laisser mariner 2 heures au frais.

## Conseils

- Servir avec du riz.
`;

describe("parseTextRecipe", () => {
  it("lit l'en-tête, la description, les ingrédients et les étapes", () => {
    const r = parseTextRecipe(DAHL, { title: "Dahl de lentilles corail" });
    expect(r).toMatchObject({ name: "Dahl de lentilles corail", servings: 2, freezable: true, fridge_days: 3 });
    expect(r.description).toMatch(/^Plat végétarien crémeux/);
    expect(r.recipe_ingredients).toHaveLength(5);
    expect(r.recipe_ingredients[3]).toMatchObject({ quantity: 2, unit: "gousse", name: "Ail" });
    expect(r.recipe_ingredients[4]).toMatchObject({ quantity: 1, unit: "c. à c.", name: "Gingembre moulu" });
    expect(r.recipe_steps.map((s) => [s.station, s.duration_minutes, s.hands_busy])).toEqual([
      ["plaque", 3, true],
      ["plan", 5, true],
      ["plaque", 20, false],
    ]);
  });

  it("gère titre, conservation détaillée, temps, sous-parties et conseils", () => {
    const r = parseTextRecipe(POULET);
    expect(r.name).toBe("Poulet Miel et Sésame");
    expect(r).toMatchObject({ servings: 4, fridge_days: 2, freezable: true, prep_minutes: 20, cook_minutes: 15 });
    expect(r.recipe_ingredients.map((i) => i.group_label)).toEqual(["Pour le poulet et sa panure", "Pour le poulet et sa panure", "Pour la sauce", "Pour la sauce"]);
    expect(r.recipe_ingredients[2]).toMatchObject({ quantity: 3, unit: "c. à s.", name: "Miel" });
    expect(r.recipe_ingredients[3]).toMatchObject({ quantity: 1, unit: "cube" });
    expect(r.recipe_steps[1]).toMatchObject({ station: "repos", duration_minutes: 120, hands_busy: false });
    expect(r.notes).toContain("Servir avec du riz");
  });

  it("relit ce qu'elle écrit", () => {
    const r = parseTextRecipe(POULET);
    const again = parseTextRecipe(recipeToText(r));
    expect(again.name).toBe(r.name);
    expect(again.recipe_ingredients.map((i) => [i.quantity, i.unit, i.name.toLowerCase()])).toEqual(
      r.recipe_ingredients.map((i) => [i.quantity, i.unit, i.name.toLowerCase()]),
    );
    expect(again.recipe_steps.map((s) => s.text)).toEqual(r.recipe_steps.map((s) => s.text));
  });
});

describe("parseMeta", () => {
  it.each([
    ["Pour 10 gaufres · Préparation : 15 min | Cuisson : 20 min", { servings: 10, yield_label: "10 gaufres", prep_minutes: 15, cook_minutes: 20 }],
    ["Pour environ 2 à 3 personnes · Conservation : Au frais dans une boîte hermétique", { servings: 2, freezable: null }],
    ["Pour 3 portions · Conservation : 3 jours au réfrigérateur (Congélation : Déconseillée avec les pommes de terre)", { servings: 3, fridge_days: 3, freezable: false }],
    ["Pour 1 pain (6 boules) · Préparation : 30 min | Repos : 2h15", { servings: 1, rest_minutes: 135 }],
    ["Pour 4 personnes · Conservation : 24 heures maximum au réfrigérateur", { fridge_days: 1 }],
  ])("%s", (line, expected) => {
    expect(parseMeta(line)).toMatchObject(expected);
  });
});
