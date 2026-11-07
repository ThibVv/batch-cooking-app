import Link from "next/link";
import { getPantry } from "@/lib/data";
import { AppShell, PageHeader } from "@/components/ui";
import { PantryEditor } from "@/components/PantryEditor";

export default async function PantryPage() {
  const items = await getPantry();
  return (
    <AppShell>
      <PageHeader kicker="Avant de générer la semaine" title="Fonds de placard" />
      <p className="text-sm text-muted">
        Notez ce qu&apos;il reste à la maison : la génération privilégie les recettes qui les utilisent, et la liste de courses les coche d&apos;office.
      </p>
      <section className="card p-4">
        <PantryEditor items={items} />
      </section>
      <Link href="/generer" className="btn-primary">Générer la semaine</Link>
    </AppShell>
  );
}
