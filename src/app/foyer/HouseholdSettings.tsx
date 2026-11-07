"use client";

import { useState, useTransition } from "react";
import { addPerson, removePerson, savePerson, updateHousehold } from "@/app/actions";
import type { Household, Person } from "@/lib/types";
import { EquipmentPicker } from "@/components/household/EquipmentPicker";
import { PersonCard, type PersonValue } from "@/components/household/PersonCard";

function PersonEditor({ person, index, isMe }: { person: Person; index: number; isMe: boolean }) {
  const initial: PersonValue = { name: person.name, color: person.color, likes: person.likes, dislikes: person.dislikes };
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);

  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="section-title flex items-center gap-2">
        {person.name}
        <span className="font-normal tracking-normal normal-case">{isMe ? "· vous" : person.user_id ? "· a un compte" : "· sans compte"}</span>
      </h3>
      <PersonCard
        index={index}
        value={value}
        onChange={setValue}
        onRemove={person.user_id ? undefined : () => window.confirm(`Retirer ${person.name} du foyer ?`) && start(() => removePerson(person.id))}
      />
      {dirty && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await savePerson(person.id, value);
              setSaved(value);
            })
          }
          className="btn-primary min-h-11 text-sm"
        >
          Enregistrer {value.name}
        </button>
      )}
    </div>
  );
}

export function HouseholdSettings({ household, people, meId }: { household: Household; people: Person[]; meId: string }) {
  const [equipment, setEquipment] = useState(household.equipment);
  const [burners, setBurners] = useState(household.burners);
  const [newName, setNewName] = useState("");
  const [pending, start] = useTransition();
  const equipmentDirty = JSON.stringify(equipment) !== JSON.stringify(household.equipment) || burners !== household.burners;

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Personnes</h2>
        {people.map((p, i) => (
          <PersonEditor key={p.id} person={p} index={i} isMe={p.id === meId} />
        ))}
        <div className="flex gap-2">
          <label htmlFor="add-person" className="sr-only">Prénom de la personne à ajouter</label>
          <input id="add-person" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ajouter une personne" className="field" />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() =>
              start(async () => {
                await addPerson(newName);
                setNewName("");
              })
            }
            className="btn-secondary shrink-0"
          >
            Ajouter
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Matériel</h2>
        <EquipmentPicker value={equipment} onChange={setEquipment} burners={burners} onBurnersChange={setBurners} />
        {equipmentDirty && (
          <button type="button" disabled={pending} onClick={() => start(() => updateHousehold({ equipment, burners }))} className="btn-primary">
            Enregistrer le matériel
          </button>
        )}
      </section>
    </>
  );
}
