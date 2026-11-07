import { getContext } from "@/lib/data";
import { RecipeEditor } from "../RecipeEditor";

export default async function NewRecipePage() {
  await getContext();
  return <RecipeEditor />;
}
