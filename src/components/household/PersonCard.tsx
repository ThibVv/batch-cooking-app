"use client";

import { useState } from "react";
import { COMMON_DISLIKES, LIKE_TAGS, PERSON_COLORS } from "@/lib/tags";
import { TrashIcon } from "@/components/icons";

export interface PersonValue {
  name: string;
  color: string;
  likes: string[];
  dislikes: string[];
}

/** Fiche d'une personne du foyer : prénom, couleur, envies et ingrédients à éviter. */
export function PersonCard({
  value,
  onChange,
  onRemove,
  isMe,
  onMe,
  index,
}: {
  value: PersonValue;
  onChange: (v: PersonValue) => void;
  onRemove?: () => void;
  /** Affiche le choix « c'est moi » (création du foyer) */
  isMe?: boolean;
  onMe?: () => void;
  index: number;
}) {
  const [dislike, setDislike] = useState("");
  const set = (patch: Partial<PersonValue>) => onChange({ ...value, ...patch });
  const addDislike = (d: string) => {
    const v = d.trim().toLowerCase();
    if (v && !value.dislikes.includes(v)) set({ dislikes: [...value.dislikes, v] });
    setDislike("");
  };

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor={`person-${index}`} className="label">Prénom</label>
          <input id={`person-${index}`} value={value.name} onChange={(e) => set({ name: e.target.value })} className="field" />
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Retirer ${value.name || "cette personne"}`} className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-chip">
            <TrashIcon size={18} />
          </button>
        )}
      </div>

      {onMe && (
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
          <input type="radio" name="me" checked={!!isMe} onChange={onMe} className="size-5 accent-[#1f6b4a]" />
          C&apos;est moi (ce compte)
        </label>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">Couleur</legend>
        <div className="flex gap-1">
          {PERSON_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => set({ color: c })}
              aria-pressed={value.color === c}
              aria-label={`Couleur ${c}`}
              className="flex size-11 items-center justify-center"
            >
              <span className={`size-7 rounded-full ring-offset-2 ${value.color === c ? "ring-2 ring-ink" : ""}`} style={{ background: c }} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">Envies habituelles</legend>
        <div className="flex flex-wrap gap-1.5">
          {LIKE_TAGS.map((t) => {
            const on = value.likes.includes(t);
            return (
              <button
                type="button"
                key={t}
                aria-pressed={on}
                onClick={() => set({ likes: on ? value.likes.filter((x) => x !== t) : [...value.likes, t] })}
                className={`min-h-8 rounded-full border px-2.5 text-xs font-medium ${on ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface text-ink-2"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">N&apos;aime pas / allergies</legend>
        <div className="flex flex-wrap gap-1.5">
          {value.dislikes.map((d) => (
            <button
              type="button"
              key={d}
              onClick={() => set({ dislikes: value.dislikes.filter((x) => x !== d) })}
              aria-label={`Retirer ${d}`}
              className="rounded-full bg-warn-soft px-2.5 py-1.5 text-xs text-warn"
            >
              {d} ×
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor={`dislike-${index}`} className="sr-only">Ingrédient à éviter</label>
          <input
            id={`dislike-${index}`}
            value={dislike}
            onChange={(e) => setDislike(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDislike(dislike);
              }
            }}
            placeholder="champignons, porc…"
            className="field"
          />
          <button type="button" onClick={() => addDislike(dislike)} className="btn-secondary shrink-0">Ajouter</button>
        </div>
        <div className="flex flex-wrap gap-1">
          {COMMON_DISLIKES.filter((d) => !value.dislikes.includes(d)).map((d) => (
            <button type="button" key={d} onClick={() => addDislike(d)} className="min-h-8 rounded-full border border-dashed border-[#a9b1ab] px-2.5 text-xs text-ink-2">
              + {d}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
