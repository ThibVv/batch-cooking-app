"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createHousehold, joinHousehold, previewHousehold } from "@/app/actions";
import { DEFAULT_EQUIPMENT, EQUIPMENT_BY_ID } from "@/lib/equipment";
import { PERSON_COLORS } from "@/lib/tags";
import { EquipmentPicker } from "@/components/household/EquipmentPicker";
import { PersonCard, type PersonValue } from "@/components/household/PersonCard";
import { ChevronLeft } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { APP_NAME } from "@/lib/brand";

const STEPS = ["Qui mange ?", "Préférences", "Matériel", "C'est parti"];

function newPerson(i: number): PersonValue {
  return { name: "", color: PERSON_COLORS[i % PERSON_COLORS.length], likes: [], dislikes: [] };
}

export default function NewHouseholdPage() {
  const [mode, setMode] = useState<"create" | "join">("create");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <span className="text-brand">
            <LogoMark size={20} />
          </span>
          Bienvenue sur {APP_NAME}
        </span>
        <h1 className="font-display text-[30px] font-bold tracking-[-0.5px]">Votre foyer</h1>
      </div>
      <div role="tablist" aria-label="Créer ou rejoindre un foyer" className="grid grid-cols-2 gap-1 rounded-xl bg-[#e4e7e1] p-1">
        {(["create", "join"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-[9px] text-sm ${mode === m ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}
          >
            {m === "create" ? "Créer un foyer" : "Rejoindre"}
          </button>
        ))}
      </div>
      {mode === "create" ? <CreateWizard /> : <JoinForm />}
    </main>
  );
}

function CreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<PersonValue[]>([newPerson(0), newPerson(1)]);
  const [me, setMe] = useState(0);
  const [equipment, setEquipment] = useState<string[]>(DEFAULT_EQUIPMENT);
  const [burners, setBurners] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const setCount = (n: number) => {
    setPeople((list) => (n > list.length ? [...list, ...Array.from({ length: n - list.length }, (_, i) => newPerson(list.length + i))] : list.slice(0, n)));
    if (me >= n) setMe(0);
  };
  const namesOk = people.every((p) => p.name.trim());

  function submit() {
    setError(null);
    start(async () => {
      const res = await createHousehold({ name, people, me, equipment, burners });
      if (res.error) return setError(res.error);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <ol className="flex gap-1.5" aria-label="Étapes">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-1" aria-current={i === step ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-[#e4e7e1]"}`} />
            <span className={`text-[11px] ${i === step ? "font-semibold text-ink" : "text-muted"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <section className="card flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="h-name" className="label">Nom du foyer</label>
              <input id="h-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Notre foyer" className="field" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Nombre de personnes</span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setCount(Math.max(1, people.length - 1))} aria-label="Une personne de moins" className="size-11 rounded-xl border border-line bg-surface text-lg">−</button>
                <span aria-live="polite" className="w-8 text-center text-sm font-semibold">{people.length}</span>
                <button type="button" onClick={() => setCount(Math.min(6, people.length + 1))} aria-label="Une personne de plus" className="size-11 rounded-xl border border-line bg-surface text-lg">+</button>
              </span>
            </div>
            <p className="text-xs text-muted">Chaque personne a ses portions dans les tups. Les autres pourront rejoindre le foyer avec leur propre compte.</p>
          </section>
          {people.map((p, i) => (
            <section key={i} className="card flex flex-col gap-2 p-4">
              <label htmlFor={`name-${i}`} className="label">Personne {i + 1}</label>
              <input
                id={`name-${i}`}
                value={p.name}
                onChange={(e) => setPeople((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder="Prénom"
                className="field"
              />
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="me" checked={me === i} onChange={() => setMe(i)} className="size-5" />
                C&apos;est moi (ce compte)
              </label>
            </section>
          ))}
        </>
      )}

      {step === 1 &&
        people.map((p, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <h2 className="section-title">{p.name}</h2>
            <PersonCard index={i} value={p} onChange={(v) => setPeople((list) => list.map((x, j) => (j === i ? v : x)))} />
          </div>
        ))}

      {step === 2 && (
        <section className="flex flex-col gap-2">
          <p className="text-sm text-muted">Cochez tout ce que vous avez : l&apos;app écarte les recettes qui demandent un appareil absent, et organise le batch selon vos plaques, four et appareils.</p>
          <EquipmentPicker value={equipment} onChange={setEquipment} burners={burners} onBurnersChange={setBurners} />
        </section>
      )}

      {step === 3 && (
        <section className="card flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-bold">{name || "Notre foyer"}</h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {people.map((p, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="size-3 rounded-full" style={{ background: p.color }} />
                <strong>{p.name}</strong>
                {i === me && <span className="text-muted">(vous)</span>}
                {p.likes.length > 0 && <span className="text-muted">· aime {p.likes.slice(0, 3).join(", ")}</span>}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            {equipment.length} équipements : {equipment.slice(0, 6).map((id) => EQUIPMENT_BY_ID.get(id)?.label ?? id).join(", ")}
            {equipment.length > 6 ? "…" : ""}
          </p>
          <p className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-dark">Les 77 recettes de votre Drive seront ajoutées au foyer, déjà classées.</p>
          {error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ground px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="Étape précédente" className="btn-secondary min-h-[52px] w-[52px] shrink-0">
              <ChevronLeft />
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={step === 0 && !namesOk} className="btn-primary flex-1">
              {step === 0 && !namesOk ? "Indiquez les prénoms" : "Continuer"}
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={pending} className="btn-primary flex-1">
              {pending ? "Création et import des recettes…" : "Créer le foyer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ name?: string; people: { id: string; name: string; color: string }[] } | null>(null);
  const [choice, setChoice] = useState<string | "new" | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function lookup() {
    setError(null);
    start(async () => {
      const res = await previewHousehold(code);
      if (res.error) return setError(res.error);
      if (!res.name) return setError("Code inconnu, ou toutes les personnes de ce foyer ont déjà un compte.");
      setPreview(res);
      setChoice(res.people[0]?.id ?? "new");
    });
  }

  function join() {
    setError(null);
    start(async () => {
      const res = await joinHousehold(code, choice === "new" ? null : choice, choice === "new" ? newName : null);
      if (res.error) return setError(res.error);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="code" className="label">Code d&apos;invitation</label>
        <div className="flex gap-2">
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} className="field uppercase tracking-[3px]" />
          <button type="button" onClick={lookup} disabled={pending || code.trim().length < 6} className="btn-secondary shrink-0">Vérifier</button>
        </div>
        <p className="text-xs text-muted">Le code est sur la page Foyer de la personne qui a créé le foyer.</p>
      </div>

      {preview && (
        <fieldset className="flex flex-col gap-2">
          <legend className="label mb-1.5">Foyer « {preview.name} » : qui êtes-vous ?</legend>
          {preview.people.map((p) => (
            <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3">
              <input type="radio" name="who" checked={choice === p.id} onChange={() => setChoice(p.id)} className="size-5" />
              <span className="size-3 rounded-full" style={{ background: p.color }} />
              {p.name}
            </label>
          ))}
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3">
            <input type="radio" name="who" checked={choice === "new"} onChange={() => setChoice("new")} className="size-5" />
            Quelqu&apos;un d&apos;autre
          </label>
          {choice === "new" && (
            <>
              <label htmlFor="new-name" className="sr-only">Votre prénom</label>
              <input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Votre prénom" className="field" />
            </>
          )}
          <button type="button" onClick={join} disabled={pending || (choice === "new" && !newName.trim())} className="btn-primary">
            Rejoindre le foyer
          </button>
        </fieldset>
      )}
      {error && <p role="alert" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>}
    </section>
  );
}
