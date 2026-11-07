"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { addChosenRecipe, setMealRecipe } from "@/app/actions";
import type { WeekSlots } from "@/lib/data";
import { DAYS, MEAL_SLOTS, type Category, type Slot } from "@/lib/types";
import { formatWeekRange } from "@/lib/week";
import { PlusIcon } from "@/components/icons";

type Target = { day: number; slot: Slot; replaceId?: string };

/**
 * Ajoute une recette à la semaine en cours, depuis la bibliothèque ou la fiche :
 * en plus des créneaux, ou sur un créneau midi / soir (libre ou à remplacer).
 */
export function AddToWeekButton({
  recipeId,
  recipeName,
  category,
  week,
  compact = false,
}: {
  recipeId: string;
  recipeName: string;
  category: Category;
  week: WeekSlots | null;
  /** Petite pastille « + » posée sur une carte de la bibliothèque */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function pick(target: Target, label: string) {
    if (!week) return;
    setOpen(false);
    setError(null);
    start(async () => {
      const res = target.replaceId
        ? await setMealRecipe(week.planId, target.replaceId, recipeId)
        : await addChosenRecipe(week.planId, recipeId, { day: target.day, slot: target.slot });
      if (res.error) setError(res.error);
      else setDone(label);
    });
  }

  const mealAt = (day: number, slot: Slot) => week?.meals.find((m) => m.day === day && m.slot === slot);

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={pending}
          aria-label={`Ajouter ${recipeName} à la semaine`}
          title="Ajouter à la semaine"
          className={`flex size-9 items-center justify-center rounded-full shadow-[0_2px_8px_rgba(23,32,26,0.25)] transition-transform active:scale-95 ${done ? "bg-brand text-white" : "bg-white/95 text-brand"}`}
        >
          {pending ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : done ? "✓" : <PlusIcon size={18} />}
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => setOpen(true)} disabled={pending} className="btn-primary gap-1.5">
            <PlusIcon size={18} />
            {pending ? "Ajout…" : "Ajouter à la semaine"}
          </button>
          {done && (
            <p role="status" className="text-sm text-brand-dark">
              Ajouté : {done}.{" "}
              <Link href="/" className="font-semibold underline">
                Voir la semaine
              </Link>
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={compact ? "sr-only" : "rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn"}>
          {error}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center">
          <button type="button" aria-label="Fermer" onClick={() => setOpen(false)} className="absolute inset-0 animate-[fade_0.2s_ease] bg-[#17201a]/45" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Ajouter ${recipeName} à la semaine`}
            className="relative flex max-h-[85dvh] w-full max-w-md flex-col gap-3 rounded-t-[22px] bg-ground px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(23,32,26,0.25)] animate-[slide-up_0.28s_cubic-bezier(0.22,0.8,0.3,1)]"
          >
            <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[#c9cfc8]" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <h2 className="font-display text-xl font-bold">Ajouter à la semaine</h2>
                <span className="truncate text-sm text-muted">
                  {recipeName}
                  {week && ` · ${formatWeekRange(week.weekStart)}`}
                </span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary min-h-9 shrink-0 px-2.5 text-xs">
                Annuler
              </button>
            </div>

            {!week ? (
              <div className="card flex flex-col gap-3 p-4 text-sm">
                <p className="text-ink-2">Aucune semaine n&apos;est planifiée pour l&apos;instant.</p>
                <Link href="/generer" className="btn-primary">
                  Générer ma semaine
                </Link>
              </div>
            ) : (
              <div className="-mx-1 flex flex-col gap-2 overflow-y-auto px-1 pb-1">
                <button
                  type="button"
                  onClick={() => pick({ day: 0, slot: "extra" }, "en plus de la semaine")}
                  className="card flex min-h-[58px] flex-col justify-center rounded-[14px] px-3.5 py-2 text-left hover:ring-2 hover:ring-brand-soft"
                >
                  <span className="text-[15px] font-semibold">En plus de la semaine</span>
                  <span className="text-xs text-muted">Sans toucher aux repas prévus, ajouté aux courses et au batch</span>
                </button>

                {category === "plat" && (
                  <>
                    <h3 className="section-title mt-1">Ou à la place d&apos;un repas</h3>
                    {DAYS.map((day, d) => (
                      <div key={day} className="card flex flex-col gap-1 rounded-[14px] px-3 py-2">
                        <span className="text-xs font-medium text-muted">{day}</span>
                        {MEAL_SLOTS.map((slot) => {
                          const meal = mealAt(d, slot);
                          const label = `${day.toLowerCase()} ${slot}`;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => pick({ day: d, slot, replaceId: meal?.id }, label)}
                              className="flex min-h-10 items-center gap-2 rounded-lg px-1 text-left hover:bg-chip"
                            >
                              <span className="w-[30px] shrink-0 text-[11px] text-muted capitalize">{slot}</span>
                              <span className="min-w-0 flex-1 truncate text-sm">
                                {meal ? meal.recipeName : <span className="text-muted italic">libre</span>}
                              </span>
                              <span className="shrink-0 text-xs font-medium text-brand">{meal ? "Remplacer" : "Ajouter"}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
