"use client";

import { useTransition } from "react";
import { addExtra, removeExtra } from "@/app/actions";
import type { Category } from "@/lib/types";
import { PlusIcon, TrashIcon } from "@/components/icons";

export function AddExtraButton({ planId, category, label }: { planId: string; category: Category; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" onClick={() => start(() => addExtra(planId, category))} disabled={pending} className="btn-dashed flex-1 gap-1.5">
      <PlusIcon size={16} />
      {pending ? "Ajout…" : label}
    </button>
  );
}

export function RemoveExtraButton({ planId, mealId, recipeName }: { planId: string; mealId: string; recipeName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => removeExtra(planId, mealId))}
      disabled={pending}
      aria-label={`Retirer ${recipeName} de la semaine`}
      className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip"
    >
      <TrashIcon size={16} />
    </button>
  );
}
