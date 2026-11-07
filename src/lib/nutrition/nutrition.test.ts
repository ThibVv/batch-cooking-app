import { describe, expect, it } from "vitest";
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { gramsOf, matchFood } from "@/lib/nutrition/foods";
import { hasProtein, recipeNutrition, weekBalance } from "@/lib/nutrition/analyze";
import type { Recipe, RecipeDraft } from "@/lib/types";

const byName = (name: string) => STARTER_RECIPES.find((r) => r.name.startsWith(name))!;

function draft(over: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    name: "Test",
    category: "plat",
    description: null,
    servings: 2,
    yield_label: null,
    prep_minutes: 10,
    cook_minutes: 10,
    rest_minutes: 0,
    fridge_days: 3,
    freezable: false,
    tags: [],
    equipment: [],
    source_url: null,
    notes: null,
    recipe_ingredients: [],
    recipe_steps: [],
    ...over,
  };
}

function ing(name: string, quantity: number | null, unit = "") {
  return { position: 0, name, quantity, unit, aisle: "Autre", group_label: null };
}

describe("matchFood", () => {
  it("retrouve l'aliment de base dans un libellé composé", () => {
    expect(matchFood("Escalope de poulet")?.family).toBe("viande");
    expect(matchFood("Oignon jaune")?.family).toBe("legume");
    expect(matchFood("Pousses d'épinard")?.family).toBe("legume");
    expect(matchFood("Mozzarella allégée")?.family).toBe("laitier");
  });

  it("prend le libellé le plus long : le lait de coco n'est pas du lait", () => {
    expect(matchFood("Lait de coco")?.family).toBe("matiere-grasse");
    expect(matchFood("Lait")?.family).toBe("laitier");
    expect(matchFood("Beurre de cacahuète")?.family).toBe("noix");
    expect(matchFood("Beurre")?.family).toBe("laitier");
  });

  it("distingue le riz cru du riz cuit", () => {
    expect(matchFood("Riz basmati")!.kcal).toBeGreaterThan(300);
    expect(matchFood("Riz basmati cuit")!.kcal).toBeLessThan(200);
  });

  it("renvoie null sur un ingrédient qu'elle ne connaît pas", () => {
    expect(matchFood("Poudre de perlimpinpin")).toBeNull();
  });
});

describe("gramsOf", () => {
  it("convertit les unités de poids et de volume", () => {
    expect(gramsOf(200, "g", null)).toBe(200);
    expect(gramsOf(1.5, "kg", null)).toBe(1500);
    expect(gramsOf(20, "cl", null)).toBe(200);
    expect(gramsOf(2, "c. à s.", null)).toBe(30);
  });

  it("accepte les unités au pluriel", () => {
    expect(gramsOf(8, "feuilles", matchFood("Lasagne"))).toBe(gramsOf(8, "feuille", matchFood("Lasagne")));
    expect(gramsOf(2, "brins", null)).toBe(gramsOf(2, "brin", null));
  });

  it("préfère le poids de l'aliment pour les unités qui comptent des objets", () => {
    // Une feuille de lasagne pèse 14 g, une feuille de laurier 1 g
    expect(gramsOf(8, "feuilles", matchFood("Lasagne"))).toBe(112);
    expect(gramsOf(2, "feuilles", matchFood("Laurier"))).toBe(2);
    expect(gramsOf(2, "gousses", matchFood("Ail"))).toBe(10);
  });

  it("compte en pièces quand la recette ne donne pas d'unité", () => {
    expect(gramsOf(1, "", matchFood("Oignon"))).toBe(120);
    expect(gramsOf(2, "", matchFood("Oeuf"))).toBe(110);
  });

  it("ne chiffre rien sans quantité", () => {
    expect(gramsOf(null, "g", matchFood("Oignon"))).toBeNull();
  });
});

describe.skipIf(!STARTER_RECIPES.length)("recipeNutrition", () => {
  it("avertit quand il n'y a ni viande ni poisson", () => {
    const { insights } = recipeNutrition(byName("Dahl de lentilles corail"));
    expect(insights.some((i) => /sans viande/i.test(i.text))).toBe(true);
  });

  it("avertit quand la recette n'apporte aucune protéine", () => {
    const soup = draft({ recipe_ingredients: [ing("Carottes", 400, "g"), ing("Oignon", 1), ing("Eau", 500, "ml")] });
    const { insights } = recipeNutrition(soup);
    expect(insights.some((i) => i.level === "warn" && /aucune source de protéines/i.test(i.text))).toBe(true);
    expect(hasProtein(soup)).toBe(false);
  });

  it("reconnaît un plat complet sans rien lui reprocher", () => {
    const dish = draft({
      recipe_ingredients: [ing("Blanc de poulet", 300, "g"), ing("Riz basmati", 150, "g"), ing("Brocoli", 300, "g"), ing("Huile d'olive", 1, "c. à s.")],
    });
    const { insights, perPortion } = recipeNutrition(dish);
    expect(insights.some((i) => i.level === "warn")).toBe(false);
    expect(perPortion.protein).toBeGreaterThan(35);
  });

  it("signale un plat sans légumes et un plat sans féculent", () => {
    const noVeg = draft({ recipe_ingredients: [ing("Boeuf haché", 300, "g"), ing("Pâtes", 200, "g")] });
    expect(recipeNutrition(noVeg).insights.some((i) => /pas de légumes/i.test(i.text))).toBe(true);
    const noStarch = draft({ recipe_ingredients: [ing("Blanc de poulet", 300, "g"), ing("Courgette", 2)] });
    expect(recipeNutrition(noStarch).insights.some((i) => /pas de féculent/i.test(i.text))).toBe(true);
  });

  it("refuse de chiffrer une recette sans quantités", () => {
    const vague = draft({ recipe_ingredients: [ing("Pâtes", null), ing("Courgettes", null), ing("Tomates", null)] });
    const n = recipeNutrition(vague);
    expect(n.reliable).toBe(false);
    expect(n.insights.some((i) => /quantités incomplètes/i.test(i.text))).toBe(true);
  });

  it("ramène les apports à une portion", () => {
    const base = [ing("Blanc de poulet", 400, "g"), ing("Riz basmati", 200, "g")];
    const forTwo = recipeNutrition(draft({ servings: 2, recipe_ingredients: base }));
    const forFour = recipeNutrition(draft({ servings: 4, recipe_ingredients: base }));
    expect(forTwo.perPortion.kcal).toBeCloseTo(forFour.perPortion.kcal * 2, 0);
  });

  it("chiffre les recettes de départ dans leur grande majorité", () => {
    const mains = STARTER_RECIPES.filter((r) => r.category === "plat");
    const reliable = mains.filter((r) => recipeNutrition(r).reliable);
    expect(reliable.length / mains.length).toBeGreaterThan(0.85);
  });
});

describe.skipIf(!STARTER_RECIPES.length)("weekBalance", () => {
  const mains = STARTER_RECIPES.filter((r) => r.category === "plat") as unknown as Recipe[];

  it("signale une semaine sans poisson", () => {
    const week = mains.filter((r) => !recipeNutrition(r).families.poisson).slice(0, 10);
    const { insights, fishMeals } = weekBalance(week);
    expect(fishMeals).toBe(0);
    expect(insights.some((i) => /aucun poisson/i.test(i.text))).toBe(true);
  });

  it("ne signale rien sur une semaine variée", () => {
    const fish = mains.filter((r) => (recipeNutrition(r).families.poisson ?? 0) > 0).slice(0, 2);
    const veggie = mains.filter((r) => !recipeNutrition(r).families.viande && !recipeNutrition(r).families.poisson).slice(0, 3);
    const rest = mains.filter((r) => (recipeNutrition(r).families.viande ?? 0) > 0).slice(0, 5);
    const { insights } = weekBalance([...fish, ...veggie, ...rest]);
    expect(insights.some((i) => /aucun poisson|aucun plat végétarien/i.test(i.text))).toBe(false);
  });

  it("ne moyenne que les recettes chiffrables", () => {
    const vague = draft({ recipe_ingredients: [ing("Pâtes", null)] });
    const solid = draft({ recipe_ingredients: [ing("Blanc de poulet", 400, "g"), ing("Riz basmati", 200, "g")] });
    const withVague = weekBalance([solid, vague]);
    const alone = weekBalance([solid]);
    expect(withVague.average.kcal).toBeCloseTo(alone.average.kcal, 0);
  });
});
