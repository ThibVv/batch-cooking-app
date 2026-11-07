"use client";

import { useMemo, useState } from "react";
import { EQUIPMENT_CATEGORIES, searchEquipment } from "@/lib/equipment";
import { SearchIcon } from "@/components/icons";

const HOB_IDS = ["plaque-induction", "plaque-vitro", "plaque-gaz", "plaque-electrique"];

export function EquipmentPicker({
  value,
  onChange,
  burners,
  onBurnersChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  burners: number;
  onBurnersChange: (n: number) => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchEquipment(query), [query]);
  const selected = new Set(value);
  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const hasHob = HOB_IDS.some((id) => selected.has(id));

  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-[46px] items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 focus-within:border-brand">
        <SearchIcon size={18} />
        <span className="sr-only">Rechercher un équipement</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Air fryer, Cookeo, gaufrier, wok…"
          className="flex-1 bg-transparent text-[15px] outline-none"
        />
      </label>
      <p className="text-xs text-muted">{value.length} équipement{value.length > 1 ? "s" : ""} sélectionné{value.length > 1 ? "s" : ""}</p>

      {hasHob && (
        <div className="card flex items-center justify-between gap-3 p-3">
          <span className="text-sm font-medium">Nombre de feux / plaques</span>
          <span className="flex items-center gap-1">
            <button type="button" onClick={() => onBurnersChange(Math.max(1, burners - 1))} aria-label="Un feu de moins" className="size-11 rounded-xl border border-line bg-surface text-lg">−</button>
            <span aria-live="polite" className="w-8 text-center text-sm font-semibold">{burners}</span>
            <button type="button" onClick={() => onBurnersChange(Math.min(8, burners + 1))} aria-label="Un feu de plus" className="size-11 rounded-xl border border-line bg-surface text-lg">+</button>
          </span>
        </div>
      )}

      {EQUIPMENT_CATEGORIES.map((category) => {
        const items = results.filter((e) => e.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="flex flex-col gap-1.5">
            <h3 className="section-title">{category}</h3>
            <div className="flex flex-wrap gap-1.5">
              {items.map((e) => {
                const on = selected.has(e.id);
                return (
                  <button
                    type="button"
                    key={e.id}
                    aria-pressed={on}
                    onClick={() => toggle(e.id)}
                    className={`min-h-10 rounded-full border px-3 text-[13px] font-medium ${
                      on ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2 hover:bg-chip"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {e.label}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {!results.length && <p className="text-sm text-muted">Rien ne correspond à « {query} ».</p>}
    </div>
  );
}
