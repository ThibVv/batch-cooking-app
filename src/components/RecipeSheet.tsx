"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recipeChoices } from "@/app/actions";
import { CATEGORIES, DAYS, type Category, type RecipeChoice } from "@/lib/types";
import { SearchIcon } from "@/components/icons";

/** La liste ne change quasiment jamais : on la garde d'une ouverture à l'autre. */
let cached: RecipeChoice[] | null = null;

/** Un plat tient-il jusqu'à ce jour ? Même règle que la génération (batch le dimanche, lundi = J+1). */
function keepsUntil(r: RecipeChoice, day: number) {
  return r.freezable || day + 1 <= r.fridge_days;
}

function formatTotal(r: RecipeChoice) {
  const total = r.prep_minutes + r.cook_minutes;
  if (!total) return "—";
  const h = Math.floor(total / 60);
  return h ? `${h}h${String(total % 60).padStart(2, "0")}` : `${total} min`;
}

/** Monté seulement à l'ouverture : chaque ouverture repart d'une recherche vide. */
export function RecipeSheet({
  onClose,
  onPick,
  categories = ["plat", "petit-dej", "gouter"],
  day,
  title,
}: {
  onClose: () => void;
  onPick: (recipeId: string) => void;
  /** Catégories proposées : un créneau de la semaine ne prend que des plats */
  categories?: Category[];
  /** Créneau visé, pour avertir si le plat ne tient pas jusque-là */
  day?: number;
  title: string;
}) {
  const [choices, setChoices] = useState<RecipeChoice[] | null>(cached);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Category>(categories[0]);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    if (cached) return;
    let alive = true;
    recipeChoices()
      .then((list) => {
        cached = list;
        if (alive) setChoices(list);
      })
      .catch(() => alive && setError("Impossible de charger les recettes."));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (choices ?? []).filter((r) => r.category === tab).filter((r) => !q || r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)));
  }, [choices, tab, query]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button type="button" aria-label="Fermer" onClick={onClose} className="absolute inset-0 animate-[fade_0.2s_ease] bg-[#17201a]/45" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col gap-3 rounded-t-[22px] bg-ground px-5 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(23,32,26,0.25)] animate-[slide-up_0.28s_cubic-bezier(0.22,0.8,0.3,1)]"
      >
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[#c9cfc8]" />
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-secondary min-h-9 px-2.5 text-xs">
            Annuler
          </button>
        </div>

        {categories.length > 1 && (
          <div
            role="tablist"
            aria-label="Catégorie"
            className="grid gap-1 rounded-xl bg-[#e4e7e1] p-1"
            style={{
              gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
            }}
          >
            {CATEGORIES.filter((c) => categories.includes(c.value)).map((c) => (
              <button
                key={c.value}
                role="tab"
                aria-selected={tab === c.value}
                onClick={() => setTab(c.value)}
                className={`min-h-10 rounded-[9px] text-[13px] transition-colors ${tab === c.value ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 focus-within:border-brand">
          <SearchIcon size={18} />
          <span className="sr-only">Rechercher une recette</span>
          <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom ou tag…" className="flex-1 bg-transparent text-[15px] outline-none" />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            {error}
          </p>
        )}

        <div className="-mx-1 flex min-h-32 flex-1 flex-col gap-1.5 overflow-y-auto px-1 pb-1">
          {choices == null && Array.from({ length: 5 }, (_, i) => <span key={i} aria-hidden className="skeleton h-[58px] rounded-[14px]" />)}
          {choices != null && !visible.length && <p className="py-6 text-center text-sm text-muted">Aucune recette ne correspond.</p>}
          {visible.map((r, i) => {
            const risky = day != null && !keepsUntil(r, day);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onPick(r.id)}
                style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
                className="card rise flex min-h-[58px] items-center gap-3 rounded-[14px] px-3.5 py-2 text-left transition-transform active:scale-[0.99] hover:ring-2 hover:ring-brand-soft"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-medium">{r.name}</span>
                  <span className="truncate text-xs text-muted">
                    {formatTotal(r)} · {r.yield_label ?? `${r.servings} pers.`} · {r.freezable ? "congélo" : `frigo ${r.fridge_days} j`}
                  </span>
                </span>
                {risky && <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] text-warn">ne tient pas jusqu&apos;à {DAYS[day!].toLowerCase()}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
