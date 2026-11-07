"use client";

import { useState, useTransition } from "react";
import { addChosenRecipe, removeDish, removeMeal, setMealRecipe } from "@/app/actions";
import { RecipeSheet } from "@/components/RecipeSheet";
import { DAYS, type Slot } from "@/lib/types";
import { ListIcon, PlusIcon, TrashIcon } from "@/components/icons";

function slotLabel(day: number, slot: Slot) {
  return slot === "extra" ? "en plus" : `${DAYS[day].toLowerCase()} ${slot}`;
}

/** Remplacer le plat d'un créneau par une recette choisie à la main. */
export function ChooseMealButton({ planId, mealId, day, slot }: { planId: string; mealId: string; day: number; slot: Slot }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label={`Choisir la recette de ${slotLabel(day, slot)}`}
        title="Choisir une recette"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-chip active:scale-95"
      >
        <ListIcon size={16} />
      </button>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
      {open && (
        <RecipeSheet
          onClose={() => setOpen(false)}
          categories={slot === "extra" ? ["plat", "petit-dej", "gouter"] : ["plat"]}
          day={slot === "extra" ? undefined : day}
          title={`Recette de ${slotLabel(day, slot)}`}
          onPick={(recipeId) => {
            setOpen(false);
            start(async () => {
              const res = await setMealRecipe(planId, mealId, recipeId);
              if (res.error) setError(res.error);
            });
          }}
        />
      )}
    </>
  );
}

/** Remplir un créneau libre avec une recette choisie à la main. */
export function AddMealButton({ planId, day, slot }: { planId: string; day: number; slot: Slot }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="flex min-h-8 items-center gap-1 rounded-full border border-dashed border-[#a9b1ab] px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-chip active:scale-95"
      >
        <PlusIcon size={14} />
        {pending ? "Ajout…" : "Ajouter"}
      </button>
      {error && (
        <span className="text-xs text-warn" role="alert">
          {error}
        </span>
      )}
      {open && (
        <RecipeSheet
          onClose={() => setOpen(false)}
          categories={["plat"]}
          day={day}
          title={`Plat de ${slotLabel(day, slot)}`}
          onPick={(recipeId) => {
            setOpen(false);
            start(async () => {
              const res = await addChosenRecipe(planId, recipeId, {
                day,
                slot,
              });
              if (res.error) setError(res.error);
            });
          }}
        />
      )}
    </>
  );
}

/** Ajouter en plus des créneaux un plat, un petit-déj ou un goûter choisi à la main. */
export function ChooseExtraButton({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className="btn-dashed flex-1 gap-1.5">
        <ListIcon size={16} />
        {pending ? "Ajout…" : "Choisir"}
      </button>
      {error && (
        <span className="text-xs text-warn" role="alert">
          {error}
        </span>
      )}
      {open && (
        <RecipeSheet
          onClose={() => setOpen(false)}
          categories={["plat", "petit-dej", "gouter"]}
          title="Ajouter en plus"
          onPick={(recipeId) => {
            setOpen(false);
            start(async () => {
              const res = await addChosenRecipe(planId, recipeId, {
                day: 0,
                slot: "extra",
              });
              if (res.error) setError(res.error);
            });
          }}
        />
      )}
    </>
  );
}

/** Retirer un plat de la semaine : tous ses repas, ses créneaux redeviennent libres. */
export function RemoveDishButton({ planId, recipeId, recipeName }: { planId: string; recipeId: string; recipeName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => removeDish(planId, recipeId))}
      disabled={pending}
      aria-label={`Retirer ${recipeName} de la semaine`}
      title="Retirer ce plat de la semaine"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-chip active:scale-95"
    >
      <TrashIcon size={15} />
    </button>
  );
}

/** Vider un créneau (le plat retourne à la bibliothèque, la liste de courses se met à jour). */
export function RemoveMealButton({ planId, mealId, recipeName }: { planId: string; mealId: string; recipeName: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => removeMeal(planId, mealId))}
      disabled={pending}
      aria-label={`Retirer ${recipeName} de la semaine`}
      title="Retirer de la semaine"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-chip active:scale-95"
    >
      <TrashIcon size={15} />
    </button>
  );
}
