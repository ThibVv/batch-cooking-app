import type { Insight, Macros, RecipeNutrition, WeekBalance } from "@/lib/nutrition/analyze";
import { formatMacros } from "@/lib/nutrition/analyze";

const BADGE: Record<Insight["level"], { className: string; glyph: string }> = {
  ok: { className: "bg-brand-soft text-brand-dark", glyph: "✓" },
  info: { className: "bg-chip text-ink-2", glyph: "·" },
  warn: { className: "bg-warn-soft text-warn", glyph: "!" },
};

/** Un constat : ce que la recette apporte, ou ce qui lui manque. */
export function InsightRow({ insight, index = 0 }: { insight: Insight; index?: number }) {
  const badge = BADGE[insight.level];
  return (
    <li className="rise flex items-start gap-2 text-[13px] leading-snug" style={{ "--i": index } as React.CSSProperties}>
      <span aria-hidden className={`mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${badge.className}`}>
        {badge.glyph}
      </span>
      <span className={insight.level === "warn" ? "text-warn" : "text-ink-2"}>{insight.text}</span>
    </li>
  );
}

function Detail({ m }: { m: Macros }) {
  const parts = [
    `fibres ${m.fiber.toFixed(0)} g`,
    m.iron >= 0.5 ? `fer ${m.iron.toFixed(1)} mg` : null,
    m.calcium >= 20 ? `calcium ${Math.round(m.calcium / 10) * 10} mg` : null,
  ].filter(Boolean);
  return <span className="text-xs text-muted">{parts.join(" · ")}</span>;
}

/** Apports d'une portion de recette, et les constats qui vont avec. */
export function NutritionCard({ nutrition, portionLabel = "par portion" }: { nutrition: RecipeNutrition; portionLabel?: string }) {
  const { perPortion, insights, reliable } = nutrition;
  return (
    <section className="card flex flex-col gap-2.5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="section-title">Apports {portionLabel}</h2>
        {reliable && <span className="text-[11px] text-muted">estimation</span>}
      </div>

      {reliable ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-lg font-bold">{formatMacros(perPortion)}</span>
          <Detail m={perPortion} />
        </div>
      ) : (
        <p className="text-[13px] text-muted">Les quantités de la recette sont incomplètes : seuls les constats ci-dessous sont fiables.</p>
      )}

      {insights.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {insights.map((insight, i) => (
            <InsightRow key={insight.text} insight={insight} index={i} />
          ))}
        </ul>
      )}

      <p className="text-[11px] leading-snug text-muted">
        Calculé depuis les ingrédients, à partir de valeurs moyennes. À prendre comme un ordre de grandeur, pas comme une analyse nutritionnelle.
      </p>
    </section>
  );
}

/** Bilan de la semaine entière : la variété plutôt que les chiffres. */
export function WeekBalanceCard({ balance, mealCount }: { balance: WeekBalance; mealCount: number }) {
  const { average, fishMeals, vegetarianMeals, insights } = balance;
  const counts = [
    `${mealCount} plats`,
    fishMeals ? `${fishMeals} poisson` : null,
    vegetarianMeals ? `${vegetarianMeals} végé` : null,
    average.kcal > 0 ? `~${Math.round(average.kcal / 10) * 10} kcal/portion` : null,
  ].filter(Boolean);

  return (
    <section className="card flex flex-col gap-2.5 p-4">
      <h2 className="section-title">Équilibre de la semaine</h2>
      <span className="text-[13px] font-medium text-ink-2">{counts.join(" · ")}</span>
      {insights.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {insights.map((insight, i) => (
            <InsightRow key={insight.text} insight={insight} index={i} />
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">Semaine variée, rien à signaler.</p>
      )}
    </section>
  );
}
