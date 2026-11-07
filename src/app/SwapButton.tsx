"use client";

import { useTransition } from "react";
import { swapMeal } from "@/app/actions";
import { SwapIcon } from "@/components/icons";

export function SwapButton({ planId, mealId, recipeName }: { planId: string; mealId: string; recipeName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => swapMeal(planId, mealId))}
      disabled={pending}
      aria-label={`Remplacer ${recipeName}`}
      title="Remplacer cette recette"
      className={`-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip ${pending ? "animate-spin" : ""}`}
    >
      <SwapIcon size={16} />
    </button>
  );
}
