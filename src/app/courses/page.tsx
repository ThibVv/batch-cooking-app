import { getContext, getLatestPlan, getShoppingItems } from "@/lib/data";
import { formatWeekRange } from "@/lib/week";
import { AppShell, EmptyState, PageHeader } from "@/components/ui";
import { ShoppingList } from "./ShoppingList";

export default async function ShoppingPage() {
  const [{ people, userId }, plan] = await Promise.all([getContext(), getLatestPlan()]);

  if (!plan) {
    return (
      <AppShell>
        <PageHeader title="Courses" />
        <EmptyState title="Pas encore de liste" text="La liste de courses est créée automatiquement quand vous générez une semaine." href="/generer" cta="Générer ma semaine" />
      </AppShell>
    );
  }

  const items = await getShoppingItems(plan.id);
  return (
    <AppShell>
      <PageHeader kicker={`Pour la semaine du ${formatWeekRange(plan.week_start)}`} title="Courses" />
      <ShoppingList planId={plan.id} initialItems={items} people={people} userId={userId} />
    </AppShell>
  );
}
