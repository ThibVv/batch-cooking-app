"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, type Category, type Person, type RecipeSummary } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { RecipePhoto } from "@/components/RecipePhoto";
import { SearchIcon } from "@/components/icons";
import { formatMinutes } from "@/lib/planner/schedule";
import type { WeekSlots } from "@/lib/data";
import { AddToWeekButton } from "@/components/AddToWeekButton";

const QUICK_TAGS = ["végé", "poisson", "volaille", "bœuf", "épicé", "express", "au four", "mijoté", "one pot", "poêle & wok"];

export function RecipeLibrary({ recipes, people, week }: { recipes: RecipeSummary[]; people: Person[]; week: WeekSlots | null }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("plat");
  const [tag, setTag] = useState<string | null>(null);
  const [freezable, setFreezable] = useState(false);
  const byUser = new Map(people.filter((p) => p.user_id).map((p) => [p.user_id!, p]));

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.value, recipes.filter((r) => r.category === c.value).length])), [recipes]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((r) => {
      if (r.category !== category) return false;
      if (tag && !r.tags.includes(tag)) return false;
      if (freezable && !r.freezable) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.tags.some((t) => t.includes(q)) || r.recipe_ingredients.some((i) => i.name.toLowerCase().includes(q));
    });
  }, [recipes, category, tag, freezable, query]);

  return (
    <>
      <div role="tablist" aria-label="Catégorie" className="grid grid-cols-3 gap-1 rounded-xl bg-[#e4e7e1] p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            role="tab"
            aria-selected={category === c.value}
            onClick={() => {
              setCategory(c.value);
              setTag(null);
            }}
            className={`min-h-10 rounded-[9px] text-sm ${category === c.value ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
          >
            {c.label} <span className="text-xs text-muted">{counts[c.value]}</span>
          </button>
        ))}
      </div>

      <label className="flex min-h-[46px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 focus-within:border-brand">
        <SearchIcon size={18} />
        <span className="sr-only">Rechercher une recette</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Plat, ingrédient, tag…" className="flex-1 bg-transparent text-[15px] outline-none" />
      </label>

      {category === "plat" && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {QUICK_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              aria-pressed={tag === t}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-[13px] ${tag === t ? "border-brand bg-brand font-semibold text-white" : "border-line bg-surface font-medium text-ink-2"}`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={() => setFreezable(!freezable)}
            aria-pressed={freezable}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-[13px] ${freezable ? "border-brand bg-brand font-semibold text-white" : "border-line bg-surface font-medium text-ink-2"}`}
          >
            congélable
          </button>
        </div>
      )}

      <p className="text-xs text-muted">{visible.length} recette{visible.length > 1 ? "s" : ""}</p>

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((r, i) => {
          const total = r.prep_minutes + r.cook_minutes;
          return (
            <div key={r.id} className="relative">
              <Link
                href={`/recettes/${r.id}`}
                style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
                className="card rise flex h-full flex-col overflow-hidden transition-transform active:scale-[0.99] hover:ring-2 hover:ring-brand-soft"
              >
                <RecipePhoto name={r.name} url={r.image_url} index={i} className="h-24 w-full" glyph={28} sizes="(max-width: 480px) 45vw, 210px">
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/45 to-transparent p-2">
                    <span className="flex flex-wrap gap-1">
                      {r.tags.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-ink-2">{t}</span>
                      ))}
                    </span>
                    {r.author_id && byUser.get(r.author_id) && <Avatar person={byUser.get(r.author_id)} size={24} />}
                  </span>
                </RecipePhoto>
                <div className="flex flex-col gap-1 p-2.5 pb-3">
                  <h3 className="text-sm leading-tight font-semibold">{r.name}</h3>
                  <span className="text-xs text-muted">
                    {total ? formatMinutes(total) : "—"} · {r.yield_label ?? `${r.servings} pers.`} · {r.freezable ? "congélo" : `frigo ${r.fridge_days} j`}
                  </span>
                </div>
              </Link>
              <span className="absolute top-1.5 right-1.5">
                <AddToWeekButton recipeId={r.id} recipeName={r.name} category={r.category} week={week} compact />
              </span>
            </div>
          );
        })}
      </div>
      {!visible.length && <p className="py-8 text-center text-sm text-muted">Aucune recette ne correspond.</p>}
    </>
  );
}
