"use client";

import { useState } from "react";
import { recipeToText } from "@/lib/import/parse-text-recipe";
import type { Recipe } from "@/lib/types";

/** Copie la recette au format des fiches (pour la coller dans un Doc ou l'envoyer). */
export function CopyRecipeButton({ recipe }: { recipe: Recipe }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const text = recipeToText(recipe);
        try {
          if (navigator.share) await navigator.share({ title: recipe.name, text });
          else {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          }
        } catch {
          // partage annulé
        }
      }}
      className="btn-secondary"
    >
      {done ? "Copiée !" : "Partager"}
    </button>
  );
}
