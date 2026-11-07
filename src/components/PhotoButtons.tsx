"use client";

import { useState, useTransition } from "react";
import { fetchRecipePhoto, removeRecipePhoto } from "@/app/actions";

/** Cherche (ou change) la photo d'une recette. Chaque clic propose la suivante. */
export function RecipePhotoButton({ recipeId, hasPhoto }: { recipeId: string; hasPhoto: boolean }) {
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const next = hasPhoto ? skip + 1 : skip;
            setSkip(next);
            const res = await fetchRecipePhoto(recipeId, next);
            if (res.error) setError(res.error);
          })
        }
        className="btn-secondary min-h-9 text-xs"
      >
        {pending ? "Recherche…" : hasPhoto ? "Autre photo" : "Chercher une photo"}
      </button>
      {hasPhoto && (
        <button type="button" disabled={pending} onClick={() => start(() => removeRecipePhoto(recipeId))} className="text-xs font-medium text-muted underline">
          Retirer
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-xs text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
