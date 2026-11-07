"use client";

import { useOptimistic, useState, useTransition } from "react";
import { addPantryItems, clearPantry, removePantryItem } from "@/app/actions";
import { COMMON_PANTRY } from "@/lib/tags";
import type { PantryItem } from "@/lib/types";

/** Saisie des fonds de placard : chaque ajout est enregistré tout de suite pour tout le foyer. */
export function PantryEditor({ items, compact = false }: { items: PantryItem[]; compact?: boolean }) {
  const [input, setInput] = useState("");
  const [, start] = useTransition();
  const [optimistic, update] = useOptimistic(items, (list: PantryItem[], action: { add?: string[]; remove?: string; clear?: boolean }) => {
    if (action.clear) return [];
    if (action.remove) return list.filter((i) => i.id !== action.remove);
    const names = new Set(list.map((i) => i.name.toLowerCase()));
    return [...list, ...(action.add ?? []).filter((n) => !names.has(n.toLowerCase())).map((name) => ({ id: `tmp-${name}`, name }))];
  });
  const have = new Set(optimistic.map((i) => i.name.toLowerCase()));

  function add(raw: string) {
    // « riz, pâtes, thon » : plusieurs d'un coup
    const names = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    if (!names.length) return;
    setInput("");
    start(async () => {
      update({ add: names });
      await addPantryItems(names);
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {optimistic.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() =>
              start(async () => {
                update({ remove: item.id });
                await removePantryItem(item.id);
              })
            }
            aria-label={`Retirer ${item.name} du placard`}
            className="rounded-full bg-brand-soft px-2.5 py-1.5 text-[13px] text-brand-dark"
          >
            {item.name} ×
          </button>
        ))}
        {!optimistic.length && <p className="text-sm text-muted">Rien pour l&apos;instant.</p>}
      </div>
      <div className="flex gap-2">
        <label htmlFor="pantry-input" className="sr-only">Ajouter au placard</label>
        <input
          id="pantry-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
          placeholder="riz, lait de coco, feta…"
          className="field"
        />
        <button type="button" onClick={() => add(input)} className="btn-secondary shrink-0">Ajouter</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {COMMON_PANTRY.filter((n) => !have.has(n)).slice(0, compact ? 10 : undefined).map((n) => (
          <button type="button" key={n} onClick={() => add(n)} className="min-h-8 rounded-full border border-dashed border-[#a9b1ab] px-2.5 text-xs text-ink-2">
            + {n}
          </button>
        ))}
      </div>
      {optimistic.length > 0 && (
        <button
          type="button"
          onClick={() =>
            window.confirm("Vider tout le placard ?") &&
            start(async () => {
              update({ clear: true });
              await clearPantry();
            })
          }
          className="self-start text-xs font-medium text-muted underline"
        >
          Vider le placard
        </button>
      )}
    </div>
  );
}
