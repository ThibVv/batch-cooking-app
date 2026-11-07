"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateWeek } from "@/app/actions";
import type { Category, Criteria, PantryItem, Person } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { DiceIcon } from "@/components/icons";
import { PantryEditor } from "@/components/PantryEditor";

const TIMES: { label: string; value: number | null }[] = [
  { label: "2h", value: 120 },
  { label: "3h", value: 180 },
  { label: "4h", value: 240 },
  { label: "Peu importe", value: null },
];

const BALANCE_TAGS = ["végé", "poisson"];
const EXTRA_LABELS: Record<string, string> = { "petit-dej": "Petit-déj", gouter: "Goûter" };
/** Repas de chacun dans la semaine : midi et soir, du lundi au vendredi */
const MEALS_PER_PERSON = 10;

function Stepper({
  value,
  onChange,
  min = 0,
  max = 10,
  label,
  name,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
  /** Ce qu'on compte, pour les lecteurs d'écran (ex. « plats pour Léa ») */
  name: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Moins de ${name}`} className="size-11 rounded-xl border border-line bg-surface text-lg disabled:opacity-40">−</button>
      <span aria-live="polite" className="min-w-[44px] text-center text-sm font-semibold">{value} {label}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Plus de ${name}`} className="size-11 rounded-xl border border-line bg-surface text-lg disabled:opacity-40">+</button>
    </span>
  );
}

function repeatLabel(count: number) {
  if (!count) return "ne mange pas cette semaine";
  const low = Math.floor(MEALS_PER_PERSON / count);
  const high = Math.ceil(MEALS_PER_PERSON / count);
  if (high === 1) return "un plat différent à chaque repas";
  return `chaque plat revient ${low === high ? low : `${low} à ${high}`} fois`;
}

export function GenerateForm({
  people,
  tags,
  initial,
  weekStart: defaultWeek,
  recipeCount,
  extrasAvailable,
  pantry,
}: {
  people: Person[];
  tags: string[];
  initial: Criteria;
  weekStart: string;
  recipeCount: number;
  extrasAvailable: Partial<Record<Category, number>>;
  pantry: PantryItem[];
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criteria>(initial);
  const [weekStart, setWeekStart] = useState(defaultWeek);
  const [exclude, setExclude] = useState("");
  const [result, setResult] = useState<{ warnings: string[]; error?: string } | null>(null);
  const [pending, start] = useTransition();

  const counts = criteria.people.map((p) => p.count);
  const share = (criteria.share ?? true) && people.length > 1;
  const most = counts.reduce((n, c) => n + c, 0);
  const fewest = share ? Math.min(...counts) + counts.reduce((n, c) => n + c - Math.min(...counts), 0) : most;
  // Les envies valent pour toute la semaine : on les garde identiques pour chacun
  const envies = [...new Set(criteria.people.flatMap((p) => p.tags))];
  const extrasTotal = Object.values(criteria.extras).reduce((n, v) => n + (v ?? 0), 0);
  const balanceTags = BALANCE_TAGS.filter((t) => tags.includes(t));

  const setCount = (personId: string, count: number) =>
    setCriteria((c) => ({ ...c, people: c.people.map((p) => (p.personId === personId ? { ...p, count } : p)) }));
  const toggleEnvie = (tag: string) => {
    const next = envies.includes(tag) ? envies.filter((t) => t !== tag) : [...envies, tag];
    setCriteria((c) => ({ ...c, people: c.people.map((p) => ({ ...p, tags: next })) }));
  };

  function addExclusion() {
    const v = exclude.trim().toLowerCase();
    if (v && !criteria.excludeIngredients.includes(v)) setCriteria((c) => ({ ...c, excludeIngredients: [...c.excludeIngredients, v] }));
    setExclude("");
  }

  function submit() {
    setResult(null);
    start(async () => {
      const res = await generateWeek(criteria, weekStart);
      if (!res.error && !res.warnings.length) {
        router.push("/");
        return;
      }
      setResult(res);
    });
  }

  return (
    <>
      <section className="card flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">Plats différents par personne</h2>
          <span className="text-xs text-muted">Pour {MEALS_PER_PERSON} repas chacun, du lundi au vendredi</span>
        </div>
        {people.map((person) => {
          const pc = criteria.people.find((p) => p.personId === person.id)!;
          return (
            <div key={person.id} className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar person={person} size={32} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-medium">{person.name}</span>
                  <span className="text-xs text-muted">{repeatLabel(pc.count)}</span>
                </span>
              </span>
              <Stepper value={pc.count} onChange={(v) => setCount(person.id, v)} max={MEALS_PER_PERSON} label="" name={`plats pour ${person.name}`} />
            </div>
          );
        })}

        {people.length > 1 && (
          <label className="flex items-start gap-3 rounded-xl bg-brand-soft p-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold text-brand-dark">Mettre les plats en commun</span>
              <span className="text-[13px] text-ink-2">Un plat qui plaît à tout le monde est cuisiné une fois, en plus grande quantité.</span>
            </span>
            <input
              type="checkbox"
              checked={criteria.share ?? true}
              onChange={(e) => setCriteria((c) => ({ ...c, share: e.target.checked }))}
              className="mt-0.5 size-[22px]"
            />
          </label>
        )}

        <div className="flex items-baseline justify-between gap-3 border-t border-line-soft pt-3 text-sm">
          <span className="shrink-0 text-muted">À cuisiner</span>
          <span className="flex flex-col items-end">
            <span className="font-semibold">{fewest === most ? `${most} plats` : `entre ${fewest} et ${most} plats`}</span>
            <span className="text-xs text-muted">{recipeCount} plats dans la bibliothèque</span>
          </span>
        </div>
      </section>

      {tags.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="section-title">Envies de la semaine</h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Envies de la semaine">
            {tags.map((t) => {
              const on = envies.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  aria-pressed={on}
                  onClick={() => toggleEnvie(t)}
                  className={`min-h-9 rounded-full border px-3 text-[13px] font-medium ${on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card flex flex-col gap-2.5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Finir le placard</h2>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            En tenir compte
            <input type="checkbox" checked={criteria.usePantry} onChange={(e) => setCriteria((c) => ({ ...c, usePantry: e.target.checked }))} className="size-5" />
          </label>
        </div>
        <PantryEditor items={pantry} compact />
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="section-title">En plus des repas</h2>
        {(["petit-dej", "gouter"] as const).map((cat) => (
          <div key={cat} className="flex items-center justify-between gap-2">
            <span className="flex flex-col">
              <span className="text-sm font-medium">{EXTRA_LABELS[cat]}</span>
              <span className="text-xs text-muted">{extrasAvailable[cat] ?? 0} recettes disponibles</span>
            </span>
            <Stepper
              value={criteria.extras[cat] ?? 0}
              onChange={(v) => setCriteria((c) => ({ ...c, extras: { ...c.extras, [cat]: v } }))}
              max={Math.min(3, extrasAvailable[cat] ?? 0)}
              label=""
              name={`recettes ${EXTRA_LABELS[cat]}`}
            />
          </div>
        ))}
      </section>

      <details className="card group flex flex-col p-4">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-sm font-semibold">
          Plus d&apos;options
          <span className="text-xs font-normal text-muted group-open:hidden">temps, minimums, exclusions, date</span>
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="section-title">Temps de cuisine max</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {TIMES.map((t) => {
                const on = criteria.maxMinutes === t.value;
                return (
                  <button
                    type="button"
                    key={t.label}
                    aria-pressed={on}
                    onClick={() => setCriteria((c) => ({ ...c, maxMinutes: t.value }))}
                    className={`min-h-11 rounded-xl border font-semibold ${t.value ? "text-sm" : "text-xs"} ${on ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            {balanceTags.map((tag) => (
              <div key={tag} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Au moins, en « {tag} »</span>
                <Stepper
                  value={criteria.minTags[tag] ?? 0}
                  onChange={(v) => setCriteria((c) => ({ ...c, minTags: { ...c.minTags, [tag]: v } }))}
                  label=""
                  name={`plats « ${tag} » au minimum`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="section-title">Exclure cette semaine</h3>
            <p className="text-xs text-muted">Les « n&apos;aime pas » de chacun sont déjà pris en compte (page Foyer).</p>
            <div className="flex flex-wrap gap-1.5">
              {criteria.excludeIngredients.map((e) => (
                <button
                  type="button"
                  key={e}
                  onClick={() => setCriteria((c) => ({ ...c, excludeIngredients: c.excludeIngredients.filter((x) => x !== e) }))}
                  aria-label={`Ne plus exclure ${e}`}
                  className="rounded-full bg-warn-soft px-2.5 py-1.5 text-[13px] text-warn"
                >
                  {e} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label htmlFor="exclude" className="sr-only">Ingrédient à exclure</label>
              <input
                id="exclude"
                value={exclude}
                onChange={(e) => setExclude(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addExclusion()}
                placeholder="champignons, porc…"
                className="field"
              />
              <button type="button" onClick={addExclusion} className="btn-secondary shrink-0">Ajouter</button>
            </div>
          </div>

          <div className="flex flex-col">
            <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Éviter les répétitions</span>
                <span className="text-xs text-muted">Rien de planifié ces 3 dernières semaines</span>
              </span>
              <input
                type="checkbox"
                checked={criteria.avoidRecentWeeks > 0}
                onChange={(e) => setCriteria((c) => ({ ...c, avoidRecentWeeks: e.target.checked ? 3 : 0 }))}
                className="size-[22px]"
              />
            </label>
            <label className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-soft">
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Mutualiser les ingrédients</span>
                <span className="text-xs text-muted">Moins de restes, liste plus courte</span>
              </span>
              <input
                type="checkbox"
                checked={criteria.shareIngredients}
                onChange={(e) => setCriteria((c) => ({ ...c, shareIngredients: e.target.checked }))}
                className="size-[22px]"
              />
            </label>
            <label className="flex min-h-[52px] items-center justify-between gap-3">
              <span className="text-sm font-medium">Semaine commençant le</span>
              <input type="date" value={weekStart} onChange={(e) => e.target.value && setWeekStart(e.target.value)} className="field w-auto" />
            </label>
          </div>
        </div>
      </details>

      {result && (
        <div role="status" className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 text-sm ${result.error ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"}`}>
          {result.error && <p>{result.error}</p>}
          {result.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {!result.error && (
            <Link href="/" className="font-semibold underline">
              Voir la semaine
            </Link>
          )}
        </div>
      )}

      <button type="button" onClick={submit} disabled={pending || most === 0} className="btn-primary">
        <DiceIcon size={20} />
        {pending ? "Préparation…" : `Proposer ma semaine${extrasTotal ? ` (+${extrasTotal} extra${extrasTotal > 1 ? "s" : ""})` : ""}`}
      </button>
    </>
  );
}
