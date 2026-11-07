import type { RecipeDraft } from "@/lib/types";
import data from "@/data/starter-recipes.json";

/**
 * Recettes ajoutées à la création d'un foyer. Vide par défaut : chaque foyer ajoute
 * les siennes dans l'app (Recettes → Nouvelle recette). Pour en fournir d'office,
 * remplir src/data/starter-recipes.json avec des brouillons au format RecipeDraft.
 */
export const STARTER_RECIPES = data as (RecipeDraft & { drive_id?: string })[];
