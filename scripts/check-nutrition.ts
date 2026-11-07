/**
 * Contrôle la table nutritionnelle sur les recettes de départ : couverture,
 * ingrédients non reconnus, et valeurs aberrantes.
 *
 *   npx tsx@4.23.15 --tsconfig tsconfig.json scripts/check-nutrition.ts
 */
import { STARTER_RECIPES } from "@/lib/starter-recipes";
import { formatMacros, recipeNutrition, weekBalance } from "@/lib/nutrition/analyze";

const recipes = STARTER_RECIPES;
const results = recipes.map((r) => ({ recipe: r, n: recipeNutrition(r) }));

const coverage = results.reduce((s, x) => s + x.n.coverage, 0) / results.length;
console.log(`${recipes.length} recettes · couverture moyenne des ingrédients : ${(coverage * 100).toFixed(0)} %`);

const unknown = new Map<string, number>();
for (const { n } of results) for (const name of n.unknown) unknown.set(name, (unknown.get(name) ?? 0) + 1);
const missing = [...unknown].sort((a, b) => b[1] - a[1]);
console.log(`\n${missing.length} ingrédients non reconnus — les 30 plus fréquents :`);
console.log(missing.slice(0, 30).map(([n, c]) => `${n} (${c})`).join(", "));

console.log("\nPlats les plus caloriques par portion :");
for (const { recipe, n } of [...results].filter((x) => x.recipe.category === "plat").sort((a, b) => b.n.perPortion.kcal - a.n.perPortion.kcal).slice(0, 5)) {
  console.log(`  ${recipe.name} — ${formatMacros(n.perPortion)}`);
}

console.log("\nPlats les moins caloriques par portion :");
for (const { recipe, n } of [...results].filter((x) => x.recipe.category === "plat").sort((a, b) => a.n.perPortion.kcal - b.n.perPortion.kcal).slice(0, 5)) {
  console.log(`  ${recipe.name} — ${formatMacros(n.perPortion)}`);
}

const suspicious = results.filter(({ recipe, n }) => recipe.category === "plat" && (n.perPortion.kcal < 150 || n.perPortion.kcal > 1400));
if (suspicious.length) {
  console.log(`\n${suspicious.length} plats aux valeurs douteuses (<150 ou >1400 kcal) :`);
  for (const { recipe, n } of suspicious) console.log(`  ${recipe.name} — ${Math.round(n.perPortion.kcal)} kcal · couverture ${(n.coverage * 100).toFixed(0)} %`);
}

console.log("\nExemples d'analyse :");
for (const name of ["Dahl", "Chili", "Gaufres"]) {
  const hit = results.find((x) => x.recipe.name.startsWith(name));
  if (!hit) continue;
  console.log(`\n  ${hit.recipe.name} (pour ${hit.recipe.servings})`);
  console.log(`  ${formatMacros(hit.n.perPortion)} · fibres ${hit.n.perPortion.fiber.toFixed(0)} g · fer ${hit.n.perPortion.iron.toFixed(1)} mg`);
  for (const i of hit.n.insights) console.log(`    ${i.level === "warn" ? "⚠" : i.level === "ok" ? "✓" : "·"} ${i.text}`);
}

const week = weekBalance(recipes.filter((r) => r.category === "plat").slice(0, 10));
console.log("\nÉquilibre d'une semaine de 10 plats :");
console.log(`  moyenne ${formatMacros(week.average)} · poisson ${week.fishMeals} · végé ${week.vegetarianMeals} · pauvres en légumes ${week.lowVegMeals}`);
for (const i of week.insights) console.log(`    ${i.level === "warn" ? "⚠" : i.level === "ok" ? "✓" : "·"} ${i.text}`);
