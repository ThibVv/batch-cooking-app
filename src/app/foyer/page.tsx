import { getContext } from "@/lib/data";
import { signOut } from "@/app/actions";
import { AppShell, PageHeader } from "@/components/ui";
import { HouseholdSettings } from "./HouseholdSettings";

export default async function HouseholdPage() {
  const { household, people, meId } = await getContext();
  const withoutAccount = people.filter((p) => !p.user_id);

  return (
    <AppShell>
      <PageHeader kicker="Foyer" title={household.name} />

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="section-title">Inviter</h2>
        <p className="text-sm">
          Code d&apos;invitation : <strong className="text-lg tracking-[3px]">{household.invite_code}</strong>
        </p>
        <p className="text-xs text-muted">
          {withoutAccount.length
            ? `${withoutAccount.map((p) => p.name).join(", ")} n'${withoutAccount.length > 1 ? "ont" : "a"} pas encore de compte : après avoir créé son compte, choisir « Rejoindre », saisir ce code puis se choisir dans la liste.`
            : "Tout le monde a son compte."}
        </p>
      </section>

      <HouseholdSettings household={household} people={people} meId={meId} />

      <form action={signOut}>
        <button type="submit" className="btn-secondary w-full">Se déconnecter</button>
      </form>
    </AppShell>
  );
}
