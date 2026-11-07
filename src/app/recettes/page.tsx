import Link from "next/link";
import { getContext, getRecipeSummaries, getWeekSlots } from "@/lib/data";
import { AppShell, PageHeader } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { RecipeLibrary } from "./RecipeLibrary";

export default async function RecipesPage() {
  const [{ people }, recipes, week] = await Promise.all([getContext(), getRecipeSummaries(), getWeekSlots()]);

  return (
    <AppShell>
      <PageHeader kicker={`${recipes.length} recettes partagées`} title="Recettes" />
      <RecipeLibrary recipes={recipes} people={people} week={week} />
      <Link
        href="/recettes/nouvelle"
        className="fixed right-5 bottom-[92px] z-10 flex h-[52px] items-center gap-2 rounded-2xl bg-brand px-[18px] text-[15px] font-semibold text-white shadow-[0_6px_18px_rgba(23,32,26,0.22)] hover:bg-brand-dark md:right-[calc(50%-208px)]"
      >
        <PlusIcon size={20} />
        Nouvelle recette
      </Link>
    </AppShell>
  );
}
