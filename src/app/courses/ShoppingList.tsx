"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addShoppingItem, removeShoppingItem, toggleShoppingItem } from "@/app/actions";
import { AISLES, type Person, type ShoppingItem } from "@/lib/types";
import { formatQuantity } from "@/lib/units";
import { Avatar } from "@/components/ui";
import { AisleIcon, TrashIcon } from "@/components/icons";

type GroupBy = "aisle" | "recipe";

export function ShoppingList({ planId, initialItems, people, userId }: { planId: string; initialItems: ShoppingItem[]; people: Person[]; userId: string }) {
  const [items, setItems] = useState(initialItems);
  const [groupBy, setGroupBy] = useState<GroupBy>("aisle");
  const [newItem, setNewItem] = useState("");
  const [copied, setCopied] = useState(false);
  const personByUser = new Map(people.filter((p) => p.user_id).map((p) => [p.user_id!, p]));
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronisation en direct : à chaque changement côté base, on relit la liste
  useEffect(() => {
    const supabase = createClient();
    const refetch = () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      refetchTimer.current = setTimeout(async () => {
        const { data } = await supabase.from("shopping_items").select("*").eq("plan_id", planId).order("name");
        if (data) setItems(data as ShoppingItem[]);
      }, 250);
    };
    const channel = supabase
      .channel(`courses-${planId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `plan_id=eq.${planId}` }, refetch)
      .subscribe();
    return () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
      supabase.removeChannel(channel);
    };
  }, [planId]);

  const doneCount = items.filter((i) => i.checked).length;

  const groups = useMemo(() => {
    const map = new Map<string, ShoppingItem[]>();
    for (const item of items) {
      const keys = groupBy === "aisle" ? [item.aisle] : item.sources.length ? item.sources : ["Ajouts manuels"];
      for (const k of keys) map.set(k, [...(map.get(k) ?? []), item]);
    }
    const order = (k: string) => (groupBy === "aisle" ? AISLES.indexOf(k as (typeof AISLES)[number]) : 0);
    return [...map.entries()].sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b, "fr"));
  }, [items, groupBy]);

  function toggle(item: ShoppingItem) {
    const checked = !item.checked;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, checked, checked_by: checked ? userId : null } : i)));
    toggleShoppingItem(item.id, checked);
  }

  async function add() {
    const name = newItem.trim();
    if (!name) return;
    setNewItem("");
    await addShoppingItem(planId, name);
  }

  async function copyAsText() {
    const text = groups
      .map(([g, list]) => `${g}\n${list.filter((i) => !i.checked).map((i) => `- ${i.name}${i.quantity != null ? ` : ${formatQuantity(i.quantity, i.unit)}` : ""}`).join("\n")}`)
      .join("\n\n");
    try {
      if (navigator.share) await navigator.share({ title: "Courses", text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // partage annulé
    }
  }

  return (
    <>
      <div className="card flex flex-col gap-2 rounded-[14px] px-3.5 py-3">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">{doneCount} / {items.length} articles</span>
          <button onClick={copyAsText} className="font-semibold text-brand">{copied ? "Copié !" : "Partager"}</button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e4e7e1]">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
        </div>
        <span className="text-xs text-muted">Synchronisée en direct entre vos téléphones</span>
      </div>

      <div role="group" aria-label="Regrouper par" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
        {(["aisle", "recipe"] as const).map((g) => (
          <button
            key={g}
            aria-pressed={groupBy === g}
            onClick={() => setGroupBy(g)}
            className={`min-h-10 rounded-[9px] text-sm ${groupBy === g ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
          >
            {g === "aisle" ? "Par rayon" : "Par recette"}
          </button>
        ))}
      </div>

      {groups.map(([group, list]) => (
        <section key={group} className="flex flex-col gap-1.5">
          <h2 className="section-title flex items-center gap-1.5">
            {groupBy === "aisle" && <AisleIcon aisle={group} size={16} />}
            {group}
          </h2>
          <div className="card rounded-[14px] px-3.5">
            {list.map((item) => {
              const by = item.checked_by ? personByUser.get(item.checked_by) : undefined;
              return (
                <div key={`${group}-${item.id}`} className="flex min-h-[50px] items-center gap-3 border-b border-line-soft last:border-0">
                  <label className="flex min-h-[50px] min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} className="size-[22px] shrink-0" />
                    <span aria-hidden className={`shrink-0 transition-colors ${item.checked ? "text-[#c2c9c4]" : "text-muted"}`}>
                      <AisleIcon aisle={item.aisle} size={18} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`text-[15px] font-medium ${item.checked ? "text-[#6b746e] line-through" : ""}`}>{item.name}</span>
                      {groupBy === "aisle" && item.sources.length > 0 && (
                        <span className="truncate text-xs text-muted">
                          {item.sources.length > 1 ? `Dans ${item.sources.length} recettes` : item.sources[0]}
                        </span>
                      )}
                    </span>
                  </label>
                  {item.in_pantry && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-dark">au placard</span>}
                  {item.checked && !item.in_pantry && by && by.user_id !== userId && <Avatar person={by} size={20} />}
                  {item.quantity != null && <span className="shrink-0 text-sm font-semibold text-ink-2">{formatQuantity(item.quantity, item.unit)}</span>}
                  {item.manual && (
                    <button onClick={() => removeShoppingItem(item.id)} aria-label={`Retirer ${item.name}`} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip">
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="flex gap-2">
        <label htmlFor="new-item" className="sr-only">Ajouter un article</label>
        <input
          id="new-item"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Ajouter un article (papier toilette…)"
          className="field"
        />
        <button onClick={add} className="btn-secondary shrink-0">Ajouter</button>
      </div>
    </>
  );
}
