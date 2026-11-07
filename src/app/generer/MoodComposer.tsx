"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addDishToWeek, completeWeekAuto, searchMood, type MoodResult } from "@/app/actions";
import { DAYS, MEAL_SLOTS, type Person } from "@/lib/types";
import { formatScale } from "@/lib/planner/shopping";
import { Avatar } from "@/components/ui";
import { RecipePhoto } from "@/components/RecipePhoto";
import { PlusIcon, SearchIcon } from "@/components/icons";

const MEALS_PER_PERSON = 10;
const SUGGESTIONS = ["réconfortant", "rapide", "léger", "protéiné", "épicé", "asiatique", "végé"];

type Occupied = { personId: string; day: number; slot: string };

function slotName(day: number, slot: string) {
  return `${DAYS[day].toLowerCase()} ${slot}`;
}

/** Composer la semaine plat par plat, à partir d'une envie écrite à la main. */
export function MoodComposer({
  people,
  weekStart,
  occupied,
  inPlan,
  hasPlan,
}: {
  people: Person[];
  weekStart: string;
  occupied: Occupied[];
  inPlan: string[];
  hasPlan: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{ understood: string[]; results: MoodResult[] } | null>(null);
  const [adding, setAdding] = useState<MoodResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [searching, startSearch] = useTransition();
  const [completing, startComplete] = useTransition();

  const covered = (personId: string) => occupied.filter((o) => o.personId === personId).length;
  const anyFree = people.some((p) => covered(p.id) < MEALS_PER_PERSON);

  function run(q: string) {
    const text = q.trim();
    if (!text) return;
    setQuery(text);
    startSearch(async () => setSearch(await searchMood(text)));
  }

  function complete() {
    setWarnings([]);
    startComplete(async () => {
      const res = await completeWeekAuto(weekStart);
      if (res.error || res.warnings.length) setWarnings([res.error, ...res.warnings].filter(Boolean) as string[]);
      else router.push("/");
    });
  }

  return (
    <>
      <section className="card flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-semibold">Repas couverts</h2>
          {hasPlan && (
            <Link href="/" className="text-xs font-semibold text-brand">
              Voir la semaine
            </Link>
          )}
        </div>
        {people.map((p) => {
          const n = Math.min(covered(p.id), MEALS_PER_PERSON);
          return (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar person={p} size={22} />
              <span className="sr-only">{p.name}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-chip" aria-hidden>
                <span className="block h-full rounded-full transition-[width]" style={{ width: `${(n / MEALS_PER_PERSON) * 100}%`, background: p.color }} />
              </span>
              <span className="w-12 text-right text-xs font-semibold">
                {n} / {MEALS_PER_PERSON}
              </span>
            </div>
          );
        })}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(query);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="envie" className="text-[15px] font-semibold">
          De quoi avez-vous envie ?
        </label>
        <span className="flex min-h-[52px] items-center gap-2.5 rounded-[14px] border-2 border-line bg-surface px-3.5 focus-within:border-brand">
          <SearchIcon size={18} />
          <input
            id="envie"
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="un truc réconfortant, des courgettes…"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
          <button type="submit" disabled={searching || !query.trim()} className="btn-primary min-h-9 px-3 text-[13px]">
            {searching ? "…" : "Chercher"}
          </button>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {search?.understood.length ? (
            <>
              <span className="self-center text-xs text-muted">Compris :</span>
              {search.understood.map((u) => (
                <span key={u} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">
                  {u}
                </span>
              ))}
            </>
          ) : (
            SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => run(s)} className="min-h-8 rounded-full border border-line bg-surface px-3 text-xs font-medium text-ink-2">
                {s}
              </button>
            ))
          )}
        </div>
      </form>

      {notice && (
        <p role="status" className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm text-brand-dark">
          {notice}
        </p>
      )}

      {search && (
        <section className="flex flex-col gap-2" aria-live="polite">
          {!search.results.length && <p className="py-4 text-center text-sm text-muted">Rien dans vos recettes pour « {query} ». Essayez un ingrédient ou un autre mot.</p>}
          {search.results.map((r, i) => {
            const added = inPlan.includes(r.id);
            return (
              <article key={r.id} style={{ "--i": Math.min(i, 8) } as React.CSSProperties} className="card rise flex items-center gap-3 rounded-[14px] p-2.5">
                <RecipePhoto name={r.name} url={r.image_url} index={i} className="size-14 shrink-0 rounded-[10px]" glyph={20} sizes="56px" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link href={`/recettes/${r.id}`} className="truncate text-[15px] font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <span className="truncate text-xs text-muted">
                    {[...r.reasons, r.freezable ? "se congèle" : `frigo ${r.fridge_days} j`].join(" · ")}
                  </span>
                  {r.conflicts.length > 0 && (
                    <span className="truncate text-[11px] text-warn">
                      {r.conflicts.map((c) => `${people.find((p) => p.id === c.personId)?.name} n'aime pas : ${c.word}`).join(" · ")}
                    </span>
                  )}
                </div>
                {added ? (
                  <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-dark">Ajouté</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setAdding(r);
                    }}
                    aria-label={`Ajouter ${r.name} à la semaine`}
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white active:scale-95"
                  >
                    <PlusIcon size={20} />
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {warnings.length > 0 && (
        <div role="status" className="flex flex-col gap-1 rounded-xl bg-warn-soft px-3 py-2.5 text-sm text-warn">
          {warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          <Link href="/" className="font-semibold underline">
            Voir la semaine
          </Link>
        </div>
      )}

      {anyFree && (
        <button type="button" onClick={complete} disabled={completing} className="btn-secondary">
          {completing ? "On complète…" : hasPlan ? "Compléter le reste automatiquement" : "Tout générer automatiquement"}
        </button>
      )}

      {adding && (
        <AddSheet
          recipe={adding}
          people={people}
          weekStart={weekStart}
          occupied={occupied}
          onClose={() => setAdding(null)}
          onAdded={(text) => {
            setAdding(null);
            setNotice(text);
          }}
        />
      )}
    </>
  );
}

function AddSheet({
  recipe,
  people,
  weekStart,
  occupied,
  onClose,
  onAdded,
}: {
  recipe: MoodResult;
  people: Person[];
  weekStart: string;
  occupied: Occupied[];
  onClose: () => void;
  onAdded: (text: string) => void;
}) {
  const disliking = new Set(recipe.conflicts.map((c) => c.personId));
  const fans = people.filter((p) => !disliking.has(p.id));
  const [eaters, setEaters] = useState<string[]>((fans.length ? fans : people).map((p) => p.id));
  const [mealsEach, setMealsEach] = useState(2);
  const [choose, setChoose] = useState(false);
  const [slots, setSlots] = useState<{ day: number; slot: "midi" | "soir" }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isDish = recipe.category === "plat";
  const everyone = eaters.length === people.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const freeAt = (day: number, slot: string) => eaters.filter((id) => !occupied.some((o) => o.personId === id && o.day === day && o.slot === slot));
  const parts = choose ? slots.reduce((n, s) => n + freeAt(s.day, s.slot).length, 0) : eaters.length * mealsEach;
  const scale = formatScale(parts / recipe.servings);

  function submit() {
    setError(null);
    start(async () => {
      const res = await addDishToWeek(weekStart, recipe.id, eaters, mealsEach, isDish && choose ? slots : undefined);
      if (res.error) {
        setError(res.error);
        return;
      }
      const where = res.placed?.length ? ` : ${[...new Set(res.placed.map((p) => slotName(p.day, p.slot)))].join(", ")}` : " en plus de la semaine";
      onAdded(`${recipe.name} ajouté${where}.`);
    });
  }

  const choices = [
    ...people.map((p) => ({ key: p.id, label: p.name, ids: [p.id], person: p as Person | undefined })),
    ...(people.length > 1 ? [{ key: "tous", label: people.length === 2 ? "Vous deux" : "Tout le monde", ids: people.map((p) => p.id), person: undefined }] : []),
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 animate-[fade_0.2s_ease] bg-[#17201a]/45" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Ajouter ${recipe.name}`}
        className="relative flex max-h-[90dvh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-ground px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(23,32,26,0.25)] animate-[slide-up_0.28s_cubic-bezier(0.22,0.8,0.3,1)]"
      >
        <span aria-hidden className="mx-auto h-1 w-10 shrink-0 rounded-full bg-[#c9cfc8]" />
        <div className="flex items-start gap-3">
          <RecipePhoto name={recipe.name} url={recipe.image_url} className="size-14 shrink-0 rounded-xl" glyph={20} sizes="56px" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="font-display text-xl leading-tight font-bold">{recipe.name}</h2>
            <span className="text-[13px] text-muted">
              Recette pour {recipe.servings} · {recipe.freezable ? "se congèle" : `frigo ${recipe.fridge_days} jours`}
            </span>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-9 shrink-0 px-2.5 text-xs">
            Annuler
          </button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[15px] font-semibold">Pour qui ?</legend>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(choices.length, 3)}, minmax(0, 1fr))` }}>
            {choices.map((c) => {
              const on = eaters.length === c.ids.length && c.ids.every((id) => eaters.includes(id));
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setEaters(c.ids)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[14px] border px-1 text-[13px] ${on ? "border-2 border-brand bg-brand-soft font-semibold text-brand-dark" : "border-line bg-surface font-medium"}`}
                >
                  <span className="flex">
                    {(c.person ? [c.person] : people).map((p, j) => (
                      <span key={p.id} className={j ? "-ml-2" : ""}>
                        <Avatar person={p} size={24} />
                      </span>
                    ))}
                  </span>
                  <span className="max-w-full truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
          {recipe.conflicts.some((c) => eaters.includes(c.personId)) && (
            <span className="text-xs text-warn">
              {recipe.conflicts
                .filter((c) => eaters.includes(c.personId))
                .map((c) => `${people.find((p) => p.id === c.personId)?.name} n'aime pas : ${c.word}`)
                .join(" · ")}
            </span>
          )}
        </fieldset>

        {isDish ? (
          <>
            {!choose && (
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold">{everyone && people.length > 1 ? "Combien de repas chacun ?" : "Combien de repas ?"}</span>
                <div className="flex items-center gap-3 rounded-[14px] border border-line bg-surface py-2 pr-2 pl-3.5">
                  <span className="flex flex-1 flex-col">
                    <span className="text-[15px] font-medium">
                      {mealsEach} repas
                    </span>
                    <span className="text-xs text-muted">
                      {parts} part{parts > 1 ? "s" : ""} en tout → <strong className="text-ink">recette {scale}</strong>
                    </span>
                  </span>
                  <span className="flex items-center rounded-xl border border-line">
                    <button type="button" aria-label="Un repas de moins" disabled={mealsEach <= 1} onClick={() => setMealsEach((n) => n - 1)} className="size-11 text-xl text-brand disabled:opacity-40">−</button>
                    <span className="w-5 text-center font-bold">{mealsEach}</span>
                    <button type="button" aria-label="Un repas de plus" disabled={mealsEach >= 5} onClick={() => setMealsEach((n) => n + 1)} className="size-11 text-xl text-brand disabled:opacity-40">+</button>
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-semibold">Quand ?</span>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
                {[
                  [false, "Placer pour moi"],
                  [true, "Choisir les jours"],
                ].map(([value, label]) => (
                  <button
                    key={String(value)}
                    type="button"
                    aria-pressed={choose === value}
                    onClick={() => setChoose(value as boolean)}
                    className={`min-h-10 rounded-[9px] text-[13px] ${choose === value ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              {choose ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {DAYS.map((day, d) => (
                    <div key={day} className="flex flex-col gap-1">
                      <span className="text-center text-[11px] text-muted">{day.slice(0, 3)}</span>
                      {MEAL_SLOTS.map((slot) => {
                        const free = freeAt(d, slot);
                        const on = slots.some((s) => s.day === d && s.slot === slot);
                        const late = !recipe.freezable && d + 1 > recipe.fridge_days;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={!free.length}
                            aria-pressed={on}
                            aria-label={`${slotName(d, slot)}${free.length ? "" : " : déjà pris"}${late ? " : ne tient pas jusque-là" : ""}`}
                            onClick={() =>
                              setSlots((cur) => (on ? cur.filter((s) => !(s.day === d && s.slot === slot)) : [...cur, { day: d, slot: slot as "midi" | "soir" }]))
                            }
                            className={`min-h-10 rounded-lg border text-[11px] capitalize disabled:border-dashed disabled:text-[#9aa29c] ${
                              on ? "border-brand bg-brand font-semibold text-white" : late ? "border-warn/40 bg-warn-soft text-warn" : "border-line bg-surface"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted">
                  {recipe.freezable || recipe.fridge_days >= 5 ? "Il se garde : il ira plutôt en fin de semaine." : `Il tient ${recipe.fridge_days} jours : il ira en début de semaine.`}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-[13px] text-muted">Ajouté en plus des repas, cuisiné une fois (recette telle qu&apos;écrite).</span>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            {error}
          </p>
        )}
        <button type="button" onClick={submit} disabled={pending || !eaters.length || (isDish && choose && !slots.length)} className="btn-primary">
          {pending ? "Ajout…" : "Ajouter à la semaine"}
        </button>
      </div>
    </div>
  );
}
