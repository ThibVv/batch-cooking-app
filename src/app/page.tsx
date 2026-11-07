import Link from "next/link";
import { getContext, getLatestPlan, getPlanRecipes } from "@/lib/data";
import { DAYS, EXTRA_CATEGORIES, MEAL_SLOTS, type PlanMeal } from "@/lib/types";
import { stationCapacities } from "@/lib/equipment";
import { formatMinutes, scheduleBatch } from "@/lib/planner/schedule";
import { cookedDishes, formatScale, partsOf } from "@/lib/planner/shopping";
import { weekBalance } from "@/lib/nutrition/analyze";
import { dayNumber, formatWeekRange } from "@/lib/week";
import { AppShell, Avatar, EmptyState, PageHeader, PeopleBadge } from "@/components/ui";
import { WeekBalanceCard } from "@/components/NutritionCard";
import { RecipePhoto } from "@/components/RecipePhoto";
import { ChevronRight, PlusIcon } from "@/components/icons";
import { SwapButton } from "./SwapButton";
import { AddExtraButton, RemoveExtraButton } from "./ExtraButtons";
import { AddMealButton, ChooseExtraButton, ChooseMealButton, RemoveDishButton, RemoveMealButton } from "./MealActions";

const EXTRA_LABEL: Record<string, string> = { plat: "Plat", "petit-dej": "Petit-déj", gouter: "Goûter" };

export default async function WeekPage() {
  const [{ people, household }, plan] = await Promise.all([getContext(), getLatestPlan()]);
  const personById = new Map(people.map((p) => [p.id, p]));
  const everyone = people.map((p) => p.id);

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Ma semaine" action={<PeopleBadge people={people} />} />
        <EmptyState
          title="Aucune semaine planifiée"
          text="Laissez l'app choisir des plats à partager, ou composez la semaine selon vos envies : la liste de courses et le guide de préparation suivent."
          href="/generer"
          cta="Préparer ma semaine"
        />
        <Link href="/placard" className="btn-secondary">Fonds de placard</Link>
      </AppShell>
    );
  }

  // Seules les recettes du planning, pas toute la bibliothèque
  const planRecipes = await getPlanRecipes([...new Set(plan.plan_meals.map((m) => m.recipe_id))]);
  const byId = new Map(planRecipes.map((r) => [r.id, r]));
  const meals = plan.plan_meals.filter((m) => m.slot !== "extra");
  const extras = plan.plan_meals.filter((m) => m.slot === "extra");
  const eatersOf = (m: PlanMeal) => (m.eaters?.length ? m.eaters.filter((id) => personById.has(id)) : everyone);
  const dishes = cookedDishes(meals, byId, everyone).sort((a, b) => b.parts - a.parts);
  const parts = meals.reduce((n, m) => n + partsOf(m, people.length), 0);
  const schedule = scheduleBatch(planRecipes, everyone, stationCapacities(household.equipment, household.burners));
  const days = DAYS.map((label, day) => ({
    label,
    day,
    num: dayNumber(plan.week_start, day),
    slots: MEAL_SLOTS.map((slot) => {
      const rows = meals.filter((m) => m.day === day && m.slot === slot);
      const covered = new Set(rows.flatMap(eatersOf));
      return { slot, rows, free: people.filter((p) => !covered.has(p.id)) };
    }),
  }));

  return (
    <AppShell>
      <PageHeader
        kicker={`Semaine du ${formatWeekRange(plan.week_start)}`}
        title="Ma semaine"
        action={
          <Link href="/generer?mode=envie" className="btn-primary min-h-10 gap-1 px-3 text-[13px]">
            <PlusIcon size={16} />
            Un plat
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-1.5">
        {[
          [dishes.length, dishes.length > 1 ? "plats" : "plat"],
          [parts, "repas"],
          [formatMinutes(schedule.totalMinutes), "de prep"],
        ].map(([value, label]) => (
          <div key={label} className="card flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5">
            <span className="font-display text-xl font-bold">{value}</span>
            <span className="text-[11px] text-muted">{label}</span>
          </div>
        ))}
      </div>

      <Link href="/prep" className="flex min-h-11 items-center justify-between gap-3 rounded-[14px] bg-brand px-4 py-3 text-white hover:bg-brand-dark">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold">Batch cooking dimanche</span>
          <span className="text-xs text-[#d6eadf]">Ouvrir le guide · {people.length} cuisinier{people.length > 1 ? "s" : ""}</span>
        </span>
        <ChevronRight size={20} />
      </Link>

      {dishes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="section-title">À cuisiner · {dishes.length} plat{dishes.length > 1 ? "s" : ""}</h2>
          {dishes.map((d, i) => {
            const shared = d.eaters.length === people.length && people.length > 1;
            const firstMeal = meals.find((m) => m.recipe_id === d.recipe.id);
            return (
              <div key={d.recipe.id} style={{ "--i": Math.min(i, 10) } as React.CSSProperties} className="card rise flex items-center gap-3 rounded-[14px] p-2 pr-1">
                <RecipePhoto name={d.recipe.name} url={d.recipe.image_url} index={i} className="size-12 shrink-0 rounded-[10px]" glyph={18} sizes="48px" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link href={`/recettes/${d.recipe.id}`} className="truncate text-sm font-semibold hover:underline">
                    {d.recipe.name}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="flex shrink-0">
                      {d.eaters.map((id, j) => (
                        <span key={id} className={j ? "-ml-1.5" : ""}>
                          <Avatar person={personById.get(id)} size={18} />
                        </span>
                      ))}
                    </span>
                    <span className="min-w-0 truncate">
                      {shared ? (people.length === 2 ? "Vous deux" : "Tout le monde") : d.eaters.map((id) => personById.get(id)?.name).join(", ")} · {d.parts} part
                      {d.parts > 1 ? "s" : ""}
                    </span>
                    <strong className="shrink-0 rounded-full bg-chip px-1.5 py-px font-semibold text-ink" title="Multiplicateur de la recette">
                      {formatScale(d.scale)}
                    </strong>
                  </span>
                </div>
                {firstMeal?.id && <SwapButton planId={plan.id} mealId={firstMeal.id} recipeName={d.recipe.name} />}
                <RemoveDishButton planId={plan.id} recipeId={d.recipe.id} recipeName={d.recipe.name} />
              </div>
            );
          })}
        </section>
      )}

      <div className="flex flex-col gap-2">
        {days.map((d) => (
          <div key={d.label} className="card flex items-stretch gap-3 rounded-[14px] px-3 py-2.5">
            <div className="flex w-[38px] shrink-0 flex-col items-center justify-center border-r border-[#e4e7e1] pr-2.5">
              <span className="text-xs font-medium text-muted">{d.label.slice(0, 3)}</span>
              <span className="font-display text-xl font-bold">{d.num}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {d.slots.map(({ slot, rows, free }) => (
                <div key={slot} className="flex items-start gap-2">
                  <span className="w-[30px] shrink-0 pt-2 text-[11px] text-muted capitalize">{slot}</span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {rows.map((meal) => {
                      const recipe = byId.get(meal.recipe_id);
                      const who = eatersOf(meal);
                      const all = who.length === people.length;
                      return (
                        <div key={meal.id} className={`flex min-h-9 items-center gap-1.5 rounded-lg pl-2 ${all && people.length > 1 ? "bg-brand-soft" : "bg-chip"}`}>
                          {!all && (
                            <span className="flex shrink-0">
                              {who.map((id) => (
                                <span key={id} className="size-2.5 rounded-full" style={{ background: personById.get(id)?.color }} title={personById.get(id)?.name} />
                              ))}
                            </span>
                          )}
                          <Link href={`/recettes/${meal.recipe_id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline">
                            {recipe?.name ?? "Recette supprimée"}
                            {!all && <span className="font-normal text-muted"> · {who.map((id) => personById.get(id)?.name).join(", ")}</span>}
                          </Link>
                          {meal.storage === "congelo" && <span className="shrink-0 rounded-full bg-freeze-soft px-[7px] py-0.5 text-[11px] text-freeze">congélo</span>}
                          {meal.id && <ChooseMealButton planId={plan.id} mealId={meal.id} day={d.day} slot={slot} />}
                          {meal.id && <RemoveMealButton planId={plan.id} mealId={meal.id} recipeName={recipe?.name ?? ""} />}
                        </div>
                      );
                    })}
                    {free.length > 0 && (
                      <span className="flex items-center gap-2">
                        <AddMealButton planId={plan.id} day={d.day} slot={slot} />
                        {rows.length > 0 && <span className="text-xs text-muted">pour {free.map((p) => p.name).join(", ")}</span>}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <WeekBalanceCard balance={weekBalance(planRecipes)} mealCount={dishes.length} />

      <section className="flex flex-col gap-2">
        <h2 className="section-title">En plus · plats, petit-déj & goûters</h2>
        {extras.map((m) => {
          const recipe = byId.get(m.recipe_id);
          return (
            <div key={m.id} className="card flex min-h-12 items-center gap-2 rounded-[14px] px-3">
              <span className="shrink-0 rounded-full bg-[#f4ead8] px-2 py-0.5 text-[11px] text-[#6b4e12]">{recipe ? EXTRA_LABEL[recipe.category] : ""}</span>
              {recipe && (
                <Link href={`/recettes/${recipe.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                  {recipe.name}
                  {recipe.yield_label && <span className="font-normal text-muted"> · {recipe.yield_label}</span>}
                </Link>
              )}
              {m.id && <ChooseMealButton planId={plan.id} mealId={m.id} day={0} slot="extra" />}
              {m.id && <SwapButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
              {m.id && <RemoveExtraButton planId={plan.id} mealId={m.id} recipeName={recipe?.name ?? ""} />}
            </div>
          );
        })}
        <div className="flex gap-2">
          {EXTRA_CATEGORIES.map((c) => (
            <AddExtraButton key={c} planId={plan.id} category={c} label={EXTRA_LABEL[c]} />
          ))}
          <ChooseExtraButton planId={plan.id} />
        </div>
      </section>
    </AppShell>
  );
}
