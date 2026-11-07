import Link from "next/link";
import { notFound } from "next/navigation";
import { getContext, getRecipe, getWeekSlots } from "@/lib/data";
import { deleteRecipe } from "@/app/actions";
import { CATEGORIES, type Ingredient } from "@/lib/types";
import { EQUIPMENT_BY_ID, hasEquipmentFor, stationLabel } from "@/lib/equipment";
import { formatQuantity } from "@/lib/units";
import { formatMinutes } from "@/lib/planner/schedule";
import { recipeNutrition } from "@/lib/nutrition/analyze";
import { PHOTO_SOURCE_NAME } from "@/lib/images/photo";
import { AppShell, Avatar } from "@/components/ui";
import { NutritionCard } from "@/components/NutritionCard";
import { RecipePhoto } from "@/components/RecipePhoto";
import { RecipePhotoButton } from "@/components/PhotoButtons";
import { AisleIcon, ChevronLeft, TrashIcon } from "@/components/icons";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CopyRecipeButton } from "./CopyRecipeButton";
import { AddToWeekButton } from "@/components/AddToWeekButton";

function groups(ingredients: Ingredient[]) {
  const out: { label: string | null; items: Ingredient[] }[] = [];
  for (const i of ingredients) {
    const last = out[out.length - 1];
    if (last && last.label === i.group_label) last.items.push(i);
    else out.push({ label: i.group_label, items: [i] });
  }
  return out;
}

export default async function RecipePage({ params }: PageProps<"/recettes/[id]">) {
  const { id } = await params;
  const [{ people, household }, recipe, week] = await Promise.all([getContext(), getRecipe(id), getWeekSlots()]);
  if (!recipe) notFound();
  const author = people.find((p) => p.user_id && p.user_id === recipe.author_id);
  const missing = recipe.equipment.filter((e) => !hasEquipmentFor([e], household.equipment));
  const meta = [
    recipe.yield_label ? `Pour ${recipe.yield_label}` : `Pour ${recipe.servings} personne${recipe.servings > 1 ? "s" : ""}`,
    recipe.prep_minutes ? `Préparation ${formatMinutes(recipe.prep_minutes)}` : null,
    recipe.cook_minutes ? `Cuisson ${formatMinutes(recipe.cook_minutes)}` : null,
    recipe.rest_minutes ? `Repos ${formatMinutes(recipe.rest_minutes)}` : null,
  ].filter(Boolean);

  return (
    <AppShell>
      <div className="-mx-2 -mt-3 flex items-center justify-between">
        <Link href="/recettes" aria-label="Retour aux recettes" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft />
        </Link>
        <div className="flex gap-2">
          <CopyRecipeButton recipe={recipe} />
          <Link href={`/recettes/${id}/modifier`} className="btn-secondary">Modifier</Link>
        </div>
      </div>

      <RecipePhoto name={recipe.name} url={recipe.image_url} className="-mx-5 h-44 rounded-b-[20px]" sizes="(max-width: 480px) 100vw, 448px" glyph={48} priority />

      <header className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-muted">{CATEGORIES.find((c) => c.value === recipe.category)?.label}</span>
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.5px]">{recipe.name}</h1>
        <p className="text-sm font-semibold text-ink-2">{meta.join(" · ")}</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-chip px-2.5 py-1 text-xs text-ink-2">Frigo {recipe.fridge_days} j</span>
          {recipe.freezable && <span className="rounded-full bg-freeze-soft px-2.5 py-1 text-xs text-freeze">Se congèle</span>}
          {recipe.tags.map((t) => (
            <span key={t} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs text-brand-dark">{t}</span>
          ))}
        </div>
        {recipe.description && <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{recipe.description}</p>}
        {author && (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Avatar person={author} size={20} /> Ajoutée par {author.name}
          </span>
        )}
        <div className="flex flex-col gap-1.5 border-t border-line-soft pt-2.5">
          <RecipePhotoButton recipeId={id} hasPhoto={!!recipe.image_url} />
          {recipe.image_author && (
            <span className="text-[11px] text-muted">
              Photo {recipe.image_author} sur{" "}
              <a href={recipe.image_source ?? "https://unsplash.com"} target="_blank" rel="noopener noreferrer" className="underline">
                {PHOTO_SOURCE_NAME}
              </a>
            </span>
          )}
        </div>
      </header>

      <AddToWeekButton recipeId={id} recipeName={recipe.name} category={recipe.category} week={week} />

      <NutritionCard nutrition={recipeNutrition(recipe)} portionLabel={recipe.yield_label ? "par part" : "par portion"} />

      {recipe.equipment.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title">Matériel</h2>
          <div className="flex flex-wrap gap-1.5">
            {recipe.equipment.map((e) => (
              <span key={e} className={`rounded-full px-2.5 py-1 text-xs ${missing.includes(e) ? "bg-warn-soft text-warn" : "bg-chip text-ink-2"}`}>
                {EQUIPMENT_BY_ID.get(e)?.label ?? stationLabel(e)}
                {missing.includes(e) ? " · absent du foyer" : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card flex flex-col p-4">
        <h2 className="section-title mb-2">Ingrédients</h2>
        {groups(recipe.recipe_ingredients).map((g, gi) => (
          <div key={gi} className="flex flex-col">
            {g.label && <h3 className="mt-2 mb-1 text-sm font-semibold">{g.label}</h3>}
            {g.items.map((i) => (
              <div key={i.id} className="flex min-h-10 items-center gap-2.5 border-b border-line-soft last:border-0">
                <span aria-hidden className="shrink-0 text-muted">
                  <AisleIcon aisle={i.aisle} size={17} />
                </span>
                <span className="w-20 shrink-0 text-sm font-semibold text-ink-2">{formatQuantity(i.quantity, i.unit)}</span>
                <span className="flex-1 text-[15px]">{i.name}</span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="section-title">Préparation</h2>
        {recipe.recipe_steps.map((s, idx) => (
          <div key={s.id} className="flex gap-2.5">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{idx + 1}</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-snug">{s.text}</p>
              <span className="flex flex-wrap gap-1.5">
                <span className="chip">{stationLabel(s.station)}</span>
                <span className="chip">{formatMinutes(s.duration_minutes)}</span>
                {!s.hands_busy && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-dark">Mains libres</span>}
              </span>
            </div>
          </div>
        ))}
      </section>

      {recipe.notes && (
        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title">Conseils</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}

      {recipe.source_url && (
        <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
          Recette d&apos;origine
        </a>
      )}

      <form action={deleteRecipe.bind(null, id)}>
        <ConfirmSubmit message="Supprimer définitivement cette recette ?" className="btn-secondary w-full text-warn">
          <TrashIcon size={18} />
          Supprimer la recette
        </ConfirmSubmit>
      </form>
    </AppShell>
  );
}
