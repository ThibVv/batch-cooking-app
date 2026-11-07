import { describe, expect, it } from "vitest";
import { parseIngredientLine, parseIsoDuration, parseRecipeFromHtml } from "@/lib/import/parse-recipe";

describe("parseIngredientLine", () => {
  it.each([
    ["200 g de lentilles corail", 200, "g", "Lentilles corail", "Épicerie"],
    ["1,5 kg de courge butternut", 1.5, "kg", "Courge butternut", "Fruits & légumes"],
    ["2 c. à s. de sauce soja", 2, "c. à s.", "Sauce soja", "Épicerie"],
    ["½ botte de coriandre", 0.5, "botte", "Coriandre", "Fruits & légumes"],
    ["3 oignons", 3, "", "Oignons", "Fruits & légumes"],
    ["20 cl de crème fraîche", 20, "cl", "Crème fraîche", "Crèmerie"],
    ["Une pincée de muscade", 1, "pincée", "Muscade", "Autre"],
    ["2 cm de gingembre frais", 2, "cm", "Gingembre frais", "Fruits & légumes"],
    ["Petit bouquet de coriandre", 1, "bouquet", "Coriandre", "Fruits & légumes"],
    ["Grosse c. à s. de beurre de cacahuète", 1, "c. à s.", "Beurre de cacahuète", "Épicerie sucrée"],
  ])("%s", (line, quantity, unit, name, aisle) => {
    const ing = parseIngredientLine(line);
    expect(ing).toMatchObject({ quantity, unit, name, aisle });
  });

  it("garde le texte quand il n'y a pas de quantité", () => {
    expect(parseIngredientLine("Sel, poivre")).toMatchObject({ quantity: null, unit: "", name: "Sel, poivre" });
  });
});

describe("parseRecipeFromHtml", () => {
  it("lit une recette schema.org dans un @graph", () => {
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage" },
        {
          "@type": "Recipe",
          name: "Curry express",
          recipeYield: "4 personnes",
          prepTime: "PT15M",
          cookTime: "PT1H5M",
          recipeIngredient: ["400 ml de lait de coco", "2 gousses d'ail"],
          recipeInstructions: [
            { "@type": "HowToStep", text: "Émincer l'ail." },
            { "@type": "HowToStep", text: "Laisser mijoter 20 min dans une casserole." },
            { "@type": "HowToStep", text: "Enfourner 30 minutes." },
          ],
        },
      ],
    };
    const html = `<html><script type="application/ld+json">${JSON.stringify(ld)}</script></html>`;
    const r = parseRecipeFromHtml(html, "https://example.com/curry")!;
    expect(r.name).toBe("Curry express");
    expect(r.servings).toBe(4);
    expect(r.prep_minutes).toBe(15);
    expect(r.cook_minutes).toBe(65);
    expect(r.recipe_ingredients[1]).toMatchObject({ quantity: 2, unit: "gousse", name: "Ail" });
    expect(r.recipe_steps.map((s) => [s.station, s.duration_minutes, s.hands_busy])).toEqual([
      ["plan", 5, true],
      ["plaque", 20, false],
      ["four", 30, false],
    ]);
  });

  it("renvoie null sans recette", () => {
    expect(parseRecipeFromHtml("<html></html>", "https://x.y")).toBeNull();
  });

  it("convertit les durées ISO", () => {
    expect(parseIsoDuration("PT1H30M")).toBe(90);
  });
});
