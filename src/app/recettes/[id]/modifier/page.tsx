import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/data";
import { RecipeEditor } from "../../RecipeEditor";

export default async function EditRecipePage({ params }: PageProps<"/recettes/[id]/modifier">) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  const { id: _id, household_id: _h, author_id: _a, ...draft } = recipe;
  void _id;
  void _h;
  void _a;
  return <RecipeEditor initial={draft} id={id} />;
}
