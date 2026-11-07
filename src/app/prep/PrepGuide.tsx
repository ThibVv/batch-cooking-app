"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Person, Station } from "@/lib/types";
import { stationLabel } from "@/lib/equipment";
import { formatClock, formatMinutes, type GroupedPrep, type Schedule, type ScheduledTask } from "@/lib/planner/schedule";
import { Avatar } from "@/components/ui";


const PROGRESS_EVENT = "batch-prep-progress";

function subscribe(onChange: () => void) {
  window.addEventListener(PROGRESS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROGRESS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Répartit les tâches d'un poste sur des sous-lignes pour que les barres ne se chevauchent pas. */
function lanesFor(tasks: ScheduledTask[]): ScheduledTask[][] {
  const lanes: ScheduledTask[][] = [];
  for (const t of tasks) {
    const lane = lanes.find((l) => l[l.length - 1].end <= t.start);
    if (lane) lane.push(t);
    else lanes.push([t]);
  }
  return lanes;
}

export function PrepGuide({
  storageKey,
  schedule,
  people,
  groupedPrep,
  freezerMeals,
}: {
  storageKey: string;
  schedule: Schedule;
  people: Person[];
  groupedPrep: GroupedPrep[];
  freezerMeals: string[];
}) {
  // L'avancement est gardé sur ce téléphone, pour reprendre si on quitte la page
  const saved = useSyncExternalStore(subscribe, () => readSaved(storageKey), () => null);
  const done = useMemo(() => new Set<string>(saved ? JSON.parse(saved) : []), [saved]);
  const [onlyCook, setOnlyCook] = useState<string | null>(null);
  const personById = new Map(people.map((p) => [p.id, p]));
  const total = Math.max(schedule.totalMinutes, 1);

  function toggle(id: string) {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // stockage indisponible : l'avancement ne sera pas gardé
    }
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }

  const BASE: Station[] = ["four", "plaque", "plan", "repos"];
  const appliances = [...new Set(schedule.tasks.map((t) => t.station))].filter((s) => !BASE.includes(s));
  const stations = [...BASE.slice(0, 2), ...appliances, ...BASE.slice(2)]
    .map((s) => ({ station: s, lanes: lanesFor(schedule.tasks.filter((t) => t.station === s)) }))
    .filter((s) => s.lanes.length);

  const visibleTasks = schedule.tasks.filter((t) => !onlyCook || !t.handsBusy || t.cook === onlyCook);
  const nextTask = schedule.tasks.find((t) => !done.has(t.id));
  const ticks = [0, Math.round(total / 3), Math.round((2 * total) / 3), total];

  return (
    <>
      <section aria-label="Occupation des postes" className="card flex flex-col gap-2 p-3.5">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Postes de cuisson</h2>
          <span className="flex gap-2.5 text-xs text-ink-2">
            {people.map((m) => (
              <span key={m.id} className="flex items-center gap-1">
                <span className="size-2.5 rounded-[3px]" style={{ background: m.color }} />
                {m.name}
              </span>
            ))}
          </span>
        </div>
        {stations.map(({ station, lanes }) => (
          <div key={station} className="flex items-start gap-2">
            <span className="w-16 shrink-0 pt-0.5 text-xs text-ink-2">{stationLabel(station)}</span>
            <div className="flex flex-1 flex-col gap-0.5">
              {lanes.map((lane, i) => (
                <div key={i} className="relative h-[18px] rounded-[5px] bg-[#f0f2ee]">
                  {lane.map((t, j) => {
                    const cook = t.cook ? personById.get(t.cook) : undefined;
                    return (
                      <span
                        key={t.id}
                        title={`${t.recipeName} · ${t.text}`}
                        className="bar absolute top-[3px] h-3 rounded transition-opacity"
                        style={{
                          left: `${(t.start / total) * 100}%`,
                          width: `calc(${((t.end - t.start) / total) * 100}% - 2px)`,
                          background: cook?.color ?? "#a9b1ab",
                          opacity: done.has(t.id) ? 0.35 : 1,
                          ["--i" as string]: Math.min(j, 12),
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex justify-between pl-[72px] text-[11px] text-muted">
          {ticks.map((t) => (
            <span key={t}>{formatClock(t)}</span>
          ))}
        </div>
        <p className="text-xs text-muted">Gris : cuisson passive (mijoter, four), personne n&apos;a besoin d&apos;être là.</p>
      </section>

      {groupedPrep.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title">Mise en place groupée</h2>
          <p className="text-xs text-muted">À éplucher et couper en une fois, puis répartir.</p>
          {groupedPrep.map((g) => (
            <div key={g.name} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 last:border-0">
              <span className="flex flex-col">
                <span className="text-[15px] font-medium">{g.name}</span>
                <span className="text-xs text-muted">{g.recipes.join(", ")}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-ink-2">{g.quantity}</span>
            </div>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Étapes</h2>
          {people.length > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setOnlyCook(null)} aria-pressed={!onlyCook} className={`min-h-9 rounded-full px-3 text-xs ${!onlyCook ? "bg-ink font-semibold text-white" : "bg-surface text-ink-2"}`}>
                Tout
              </button>
              {people.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOnlyCook(m.id)}
                  aria-pressed={onlyCook === m.id}
                  className={`min-h-9 rounded-full px-3 text-xs ${onlyCook === m.id ? "bg-ink font-semibold text-white" : "bg-surface text-ink-2"}`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {visibleTasks.map((t) => {
          const cook = t.cook ? personById.get(t.cook) : undefined;
          const isDone = done.has(t.id);
          const isNext = nextTask?.id === t.id;
          return (
            <label
              key={t.id}
              className={`card flex cursor-pointer gap-3 rounded-[14px] border-2 p-3 ${isNext ? "border-brand" : "border-transparent"} ${isDone ? "opacity-70" : ""}`}
            >
              <div className="flex w-10 shrink-0 flex-col items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ink-2">{formatClock(t.start)}</span>
                {cook ? <Avatar person={cook} size={24} /> : <span className="text-[10px] text-muted">auto</span>}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={`text-[15px] font-semibold ${isDone ? "text-muted line-through" : ""}`}>{t.recipeName}</span>
                <span className="text-[13px] leading-snug text-muted">{t.text}</span>
                <span className="mt-0.5 flex flex-wrap gap-1.5">
                  <span className="chip">{stationLabel(t.station)}</span>
                  <span className="chip">{formatMinutes(t.end - t.start)}</span>
                  {!t.handsBusy && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-dark">Mains libres</span>}
                </span>
              </div>
              <input type="checkbox" checked={isDone} onChange={() => toggle(t.id)} aria-label={`Étape faite : ${t.recipeName}`} className="size-[22px] shrink-0 self-center" />
            </label>
          );
        })}

        <div className="card flex flex-col gap-1 rounded-[14px] p-3">
          <span className="text-[15px] font-semibold">Refroidir & conditionner · {formatMinutes(schedule.packagingMinutes)}</span>
          <span className="text-[13px] text-muted">
            Portionner dans les tups et étiqueter.
            {freezerMeals.length > 0 && ` Au congélateur : ${[...new Set(freezerMeals)].join(", ")}.`}
          </span>
        </div>

        {schedule.afterwards.length > 0 && (
          <div className="card flex flex-col gap-1 rounded-[14px] p-3">
            <span className="text-[15px] font-semibold">Après le batch</span>
            {schedule.afterwards.map((a) => (
              <span key={a.recipeName + a.text} className="text-[13px] text-muted">
                <strong className="font-medium text-ink-2">{a.recipeName}</strong> : {a.text}
              </span>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
