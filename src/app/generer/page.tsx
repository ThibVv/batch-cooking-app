import Link from "next/link";
import { getContext, getLatestPlan, getPantry, getRecipeFacets } from "@/lib/data";
import { criteriaFor } from "@/lib/planner/criteria";
import { formatWeekRange, upcomingMonday } from "@/lib/week";
import { AppShell, PageHeader } from "@/components/ui";
import { GenerateForm } from "./GenerateForm";
import { MoodComposer } from "./MoodComposer";

export default async function GeneratePage({ searchParams }: PageProps<"/generer">) {
  const { mode } = await searchParams;
  const manual = mode === "envie";
  // Seuls les tags et les compteurs : la page n'affiche aucune recette
  const [{ people }, { tags, counts }, latest, pantry] = await Promise.all([getContext(), getRecipeFacets(), getLatestPlan(), getPantry()]);
  const weekStart = upcomingMonday();
  // On repart des critères de la dernière génération ; les envies par défaut viennent des préférences
  const initial = criteriaFor(people, latest?.criteria);

  // La semaine en cours de composition, pour savoir qui a déjà quels repas
  const current = latest?.week_start === weekStart ? latest : null;
  const occupied = (current?.plan_meals ?? [])
    .filter((m) => m.slot !== "extra")
    .flatMap((m) => (m.eaters?.length ? m.eaters : people.map((p) => p.id)).map((personId) => ({ personId, day: m.day, slot: m.slot })));
  const inPlan = [...new Set((current?.plan_meals ?? []).map((m) => m.recipe_id))];

  return (
    <AppShell>
      <PageHeader kicker={`Semaine du ${formatWeekRange(weekStart)}`} title="Générer" />

      <div role="tablist" aria-label="Façon de préparer la semaine" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
        <Link
          href="/generer"
          replace
          role="tab"
          aria-selected={!manual}
          className={`flex min-h-11 items-center justify-center rounded-[9px] text-sm ${!manual ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
        >
          Automatique
        </Link>
        <Link
          href="/generer?mode=envie"
          replace
          role="tab"
          aria-selected={manual}
          className={`flex min-h-11 items-center justify-center rounded-[9px] text-sm ${manual ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
        >
          Selon une envie
        </Link>
      </div>

      {manual ? (
        <MoodComposer people={people} weekStart={weekStart} occupied={occupied} inPlan={inPlan} hasPlan={!!current} />
      ) : (
        <GenerateForm
          people={people}
          tags={tags}
          initial={initial}
          weekStart={weekStart}
          recipeCount={counts.plat}
          extrasAvailable={{ "petit-dej": counts["petit-dej"], gouter: counts.gouter }}
          pantry={pantry}
        />
      )}
    </AppShell>
  );
}
