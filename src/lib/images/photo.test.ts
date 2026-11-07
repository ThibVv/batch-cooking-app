import { describe, expect, it } from "vitest";
import { photoQuery } from "@/lib/images/photo";
import { STARTER_RECIPES } from "@/lib/starter-recipes";

describe("photoQuery", () => {
  it("retire les parenthèses, la ponctuation et les mots de recette", () => {
    expect(photoQuery("Pâtes sauce marinara ultra crémeuse (sans crème)")).toBe("Pâtes sauce marinara");
    expect(photoQuery("Poulet rôti facile et rapide")).toBe("Poulet rôti");
    expect(photoQuery("Banana bread protéiné")).toBe("Banana bread");
  });

  it("retire les articles, qui n'aident pas la recherche", () => {
    expect(photoQuery("Dahl de lentilles corail")).toBe("Dahl lentilles corail");
    expect(photoQuery("Poulet à la crème et aux champignons")).toBe("Poulet crème champignons");
  });

  it("ne garde que quatre mots", () => {
    expect(photoQuery("Gratin de pommes de terre au comté et lardons fumés").split(" ")).toHaveLength(4);
  });

  it("ne rend jamais une requête vide", () => {
    expect(photoQuery("Sans")).toBeTruthy();
    expect(photoQuery("de la")).toBeTruthy();
  });

  it("produit une requête utilisable pour toutes les recettes de départ", () => {
    for (const recipe of STARTER_RECIPES) {
      const query = photoQuery(recipe.name);
      expect(query.length).toBeGreaterThan(1);
      expect(query.split(" ").length).toBeLessThanOrEqual(4);
    }
  });
});
