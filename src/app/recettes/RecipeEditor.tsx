"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { importRecipe, saveRecipe } from "@/app/actions";
import { AISLES, CATEGORIES, type Ingredient, type RecipeDraft, type Step } from "@/lib/types";
import { EQUIPMENT, EQUIPMENT_BY_ID, STATION_CHOICES, stationLabel } from "@/lib/equipment";
import { LIKE_TAGS } from "@/lib/tags";
import { formatQuantity } from "@/lib/units";
import { parseIngredientLine, stepFromText } from "@/lib/import/parse-recipe";
import { parseTextRecipe } from "@/lib/import/parse-text-recipe";
import { ChevronLeft, LinkIcon, TrashIcon } from "@/components/icons";

interface Block {
  label: string | null;
  items: (Ingredient & { text: string })[];
}

/** Une étape dont on devine poste, durée et mains libres tant que la personne n'y a pas touché */
type EditorStep = Step & { auto: boolean };

const EMPTY: RecipeDraft = {
  name: "",
  category: "plat",
  description: null,
  servings: 2,
  yield_label: null,
  prep_minutes: 0,
  cook_minutes: 0,
  rest_minutes: 0,
  fridge_days: 3,
  freezable: false,
  tags: [],
  equipment: [],
  source_url: null,
  notes: null,
  recipe_ingredients: [],
  recipe_steps: [],
};

function ingredientText(i: Ingredient) {
  if (i.quantity == null) return i.name;
  const qty = formatQuantity(i.quantity, i.unit);
  return `${qty} ${/^[aeiouyéèêh]/i.test(i.name) ? "d'" : "de "}${i.name.charAt(0).toLowerCase()}${i.name.slice(1)}`;
}

function toBlocks(ingredients: Ingredient[]): Block[] {
  const blocks: Block[] = [];
  for (const i of ingredients) {
    const last = blocks[blocks.length - 1];
    const item = { ...i, text: ingredientText(i) };
    if (last && last.label === i.group_label) last.items.push(item);
    else blocks.push({ label: i.group_label, items: [item] });
  }
  return blocks.length ? blocks : [{ label: null, items: [emptyIngredient()] }];
}

function emptyIngredient(): Ingredient & { text: string } {
  return { position: 0, name: "", quantity: null, unit: "", aisle: "Autre", group_label: null, text: "" };
}

function emptyStep(): EditorStep {
  return { position: 0, text: "", station: "plan", duration_minutes: 5, hands_busy: true, auto: true };
}

export function RecipeEditor({ initial, id }: { initial?: RecipeDraft; id?: string }) {
  const router = useRouter();
  const start0 = initial ?? EMPTY;
  const [draft, setDraft] = useState<RecipeDraft>(start0);
  const [blocks, setBlocks] = useState<Block[]>(toBlocks(start0.recipe_ingredients));
  const [steps, setSteps] = useState<EditorStep[]>(start0.recipe_steps.length ? start0.recipe_steps.map((s) => ({ ...s, auto: false })) : [emptyStep()]);
  const [customYield, setCustomYield] = useState(!!start0.yield_label);
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState<"none" | "text" | "url">(id ? "none" : "text");
  const [pasted, setPasted] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function load(d: RecipeDraft, note: string) {
    setDraft(d);
    setBlocks(toBlocks(d.recipe_ingredients));
    setSteps(d.recipe_steps.length ? d.recipe_steps.map((s) => ({ ...s, auto: true })) : [emptyStep()]);
    setCustomYield(!!d.yield_label);
    setSource("none");
    setMessage(note);
  }

  function fromText() {
    if (!pasted.trim()) return;
    load(parseTextRecipe(pasted, { category: draft.category }), "Recette lue : vérifiez les quantités et les étapes avant d'enregistrer.");
  }

  function fromUrl() {
    setMessage(null);
    startTransition(async () => {
      const res = await importRecipe(importUrl);
      if (res.error || !res.draft) return setMessage(res.error ?? "Import impossible.");
      load(res.draft, "Recette importée : vérifiez les étapes avant d'enregistrer.");
    });
  }

  // Ingrédients ----------------------------------------------------------------
  const updateItem = (b: number, i: number, patch: Partial<Block["items"][number]>) =>
    setBlocks((list) => list.map((bl, bi) => (bi !== b ? bl : { ...bl, items: bl.items.map((it, ii) => (ii === i ? { ...it, ...patch } : it)) })));
  const parseItem = (b: number, i: number, text: string) => {
    const parsed = parseIngredientLine(text);
    updateItem(b, i, { ...parsed, text });
  };

  // Étapes -----------------------------------------------------------------------
  const updateStep = (i: number, patch: Partial<EditorStep>) => setSteps((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const reguess = (i: number) => {
    const s = steps[i];
    if (!s.auto || !s.text.trim()) return;
    const g = stepFromText(s.text, i);
    updateStep(i, { station: g.station, duration_minutes: g.duration_minutes, hands_busy: g.hands_busy });
  };

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (t && !draft.tags.includes(t)) set("tags", [...draft.tags, t]);
    setTagInput("");
  }

  function save() {
    setMessage(null);
    const ingredients: Ingredient[] = blocks.flatMap((b) =>
      b.items
        .filter((it) => it.name.trim())
        .map(({ text: _text, ...it }) => {
          void _text;
          return { ...it, group_label: b.label?.trim() || null };
        }),
    );
    const cleanSteps: Step[] = steps.filter((s) => s.text.trim()).map(({ auto: _auto, ...s }) => {
      void _auto;
      return s;
    });
    const usedStations = cleanSteps.map((s) => s.station).filter((s) => !["plan", "repos"].includes(s));
    const payload: RecipeDraft = {
      ...draft,
      // « 10 gaufres » : le nombre suit toujours le champ « Pour »
      yield_label: customYield ? `${draft.servings} ${(draft.yield_label ?? "").replace(/^\d+\s*/, "")}`.trim() : null,
      recipe_ingredients: ingredients.map((x, position) => ({ ...x, position })),
      recipe_steps: cleanSteps.map((x, position) => ({ ...x, position })),
      equipment: [...new Set([...draft.equipment, ...usedStations])],
    };
    startTransition(async () => {
      const res = await saveRecipe(payload, id);
      if (res.error || !res.id) return setMessage(res.error ?? "Enregistrement impossible.");
      router.push(`/recettes/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="flex items-center justify-between px-3 pt-3.5 pb-1.5">
        <Link href={id ? `/recettes/${id}` : "/recettes"} aria-label="Retour" className="flex size-11 items-center justify-center rounded-xl">
          <ChevronLeft />
        </Link>
        <span className="text-[15px] font-semibold">{id ? "Modifier la recette" : "Nouvelle recette"}</span>
        <span className="size-11" />
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-1.5 pb-32">
        <div role="tablist" aria-label="Point de départ" className="grid grid-cols-3 gap-1 rounded-xl bg-[#e4e7e1] p-1">
          {([
            ["none", "Saisir"],
            ["text", "Coller un texte"],
            ["url", "Depuis un lien"],
          ] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={source === v} onClick={() => setSource(v)} className={`min-h-10 rounded-[9px] text-[13px] ${source === v ? "bg-surface font-semibold" : "font-medium text-ink-2"}`}>
              {label}
            </button>
          ))}
        </div>

        {source === "text" && (
          <section className="card flex flex-col gap-2 p-4">
            <label htmlFor="paste" className="label">Collez une recette (depuis un Doc, un message…)</label>
            <textarea
              id="paste"
              rows={8}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={"Dahl de lentilles corail\nPour 2 personnes · Se congèle très bien\n\n## Ingrédients\n- 200 g de lentilles corail\n- 1 oignon\n\n## Préparation\n1. Émincer l'oignon…\n2. Mijoter 20 min."}
              className="field py-2 font-mono text-[13px] leading-snug"
            />
            <button type="button" onClick={fromText} disabled={!pasted.trim()} className="btn-secondary">Lire la recette</button>
          </section>
        )}

        {source === "url" && (
          <section className="card flex flex-col gap-2 p-4">
            <label htmlFor="import-url" className="label">Lien d&apos;une recette (Marmiton, blog…)</label>
            <div className="flex gap-2">
              <input id="import-url" type="url" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://…" className="field" />
              <button type="button" onClick={fromUrl} disabled={pending || !importUrl} className="btn-secondary shrink-0">
                <LinkIcon size={18} />
                Lire
              </button>
            </div>
          </section>
        )}

        {message && <p role="status" className="rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-dark">{message}</p>}

        {/* En-tête, comme sur les fiches : titre, « Pour N personnes · Conservation · Temps » */}
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="label">Titre</label>
            <input id="name" value={draft.name} onChange={(e) => set("name", e.target.value)} className="field text-base font-semibold" />
          </div>

          <div role="radiogroup" aria-label="Catégorie" className="grid grid-cols-3 gap-1">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                role="radio"
                aria-checked={draft.category === c.value}
                key={c.value}
                onClick={() => set("category", c.value)}
                className={`min-h-10 rounded-xl border text-sm ${draft.category === c.value ? "border-brand bg-brand font-semibold text-white" : "border-line bg-surface text-ink-2"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">Pour</span>
            <label htmlFor="servings" className="sr-only">Nombre</label>
            <input id="servings" type="number" min={1} value={draft.servings} onChange={(e) => set("servings", Math.max(1, Number(e.target.value) || 1))} className="field w-16 px-2" />
            {customYield ? (
              <>
                <label htmlFor="yield" className="sr-only">Unité (gaufres, tranches…)</label>
                <input
                  id="yield"
                  value={(draft.yield_label ?? "").replace(/^\d+\s*/, "")}
                  onChange={(e) => set("yield_label", `${draft.servings} ${e.target.value}`)}
                  placeholder="gaufres, tranches…"
                  className="field w-32"
                />
              </>
            ) : (
              <span>personne{draft.servings > 1 ? "s" : ""}</span>
            )}
            <button type="button" onClick={() => setCustomYield(!customYield)} className="text-xs font-medium text-brand underline">
              {customYield ? "en personnes" : "autre unité"}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ["prep_minutes", "Préparation"],
              ["cook_minutes", "Cuisson"],
              ["rest_minutes", "Repos"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label htmlFor={key} className="label">{label} (min)</label>
                <input id={key} type="number" min={0} value={draft[key]} onChange={(e) => set(key, Math.max(0, Number(e.target.value) || 0))} className="field px-2.5" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fridge" className="label">Conservation au frigo</label>
              <select id="fridge" value={draft.fridge_days} onChange={(e) => set("fridge_days", Number(e.target.value))} className="field">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>{d} jour{d > 1 ? "s" : ""}</option>
                ))}
              </select>
            </div>
            <label className="flex min-h-11 items-center justify-between gap-2 self-end rounded-[10px] border border-line px-3 text-sm font-medium">
              Se congèle
              <input type="checkbox" checked={draft.freezable} onChange={(e) => set("freezable", e.target.checked)} className="size-5" />
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Plat végétarien crémeux, parfait à réchauffer au bureau."
              className="field py-2 leading-snug"
            />
          </div>
        </section>

        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {draft.tags.map((t) => (
              <button type="button" key={t} onClick={() => set("tags", draft.tags.filter((x) => x !== t))} aria-label={`Retirer le tag ${t}`} className="rounded-full bg-brand-soft px-2.5 py-1.5 text-[13px] text-brand-dark">
                {t} ×
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {LIKE_TAGS.filter((t) => !draft.tags.includes(t)).map((t) => (
              <button type="button" key={t} onClick={() => addTag(t)} className="min-h-8 rounded-full border border-dashed border-[#a9b1ab] px-2.5 text-xs text-ink-2">
                + {t}
              </button>
            ))}
            <label htmlFor="tag" className="sr-only">Autre tag</label>
            <input
              id="tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              onBlur={() => addTag(tagInput)}
              placeholder="autre tag…"
              className="min-h-8 w-28 rounded-full border border-line px-2.5 text-xs outline-none"
            />
          </div>
        </section>

        <section className="card flex flex-col gap-2 p-4">
          <h2 className="section-title">Matériel</h2>
          <div className="flex flex-wrap gap-1.5">
            {draft.equipment.map((e) => (
              <button type="button" key={e} onClick={() => set("equipment", draft.equipment.filter((x) => x !== e))} aria-label={`Retirer ${e}`} className="rounded-full bg-chip px-2.5 py-1.5 text-[13px] text-ink-2">
                {EQUIPMENT_BY_ID.get(e)?.label ?? stationLabel(e)} ×
              </button>
            ))}
          </div>
          <label htmlFor="add-equipment" className="sr-only">Ajouter du matériel</label>
          <select
            id="add-equipment"
            value=""
            onChange={(e) => e.target.value && set("equipment", [...new Set([...draft.equipment, e.target.value])])}
            className="field text-sm text-muted"
          >
            <option value="">+ Ajouter du matériel nécessaire</option>
            {EQUIPMENT.filter((e) => !draft.equipment.includes(e.id)).map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </select>
        </section>

        <section className="card flex flex-col gap-2 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="section-title">Ingrédients</h2>
            <p className="text-xs text-muted">Écrivez comme dans vos fiches : « 200 g de lentilles corail », « 2 gousses d&apos;ail ».</p>
          </div>
          {blocks.map((block, b) => (
            <div key={b} className="flex flex-col gap-1.5">
              {(block.label !== null || b > 0) && (
                <div className="flex items-center gap-2">
                  <label htmlFor={`group-${b}`} className="sr-only">Nom de la sous-partie</label>
                  <input
                    id={`group-${b}`}
                    value={block.label ?? ""}
                    onChange={(e) => setBlocks((list) => list.map((bl, bi) => (bi === b ? { ...bl, label: e.target.value } : bl)))}
                    placeholder="Pour la sauce"
                    className="field min-h-9 font-semibold"
                  />
                  <button type="button" onClick={() => setBlocks((list) => list.filter((_, bi) => bi !== b))} aria-label="Supprimer la sous-partie" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip">
                    <TrashIcon size={16} />
                  </button>
                </div>
              )}
              {block.items.map((it, i) => (
                <div key={i} className="flex flex-col gap-1 border-b border-line-soft pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor={`ing-${b}-${i}`} className="sr-only">Ingrédient</label>
                    <input
                      id={`ing-${b}-${i}`}
                      value={it.text}
                      onChange={(e) => updateItem(b, i, { text: e.target.value })}
                      onBlur={(e) => parseItem(b, i, e.target.value)}
                      placeholder="200 g de lentilles corail"
                      className="field min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setBlocks((list) => list.map((bl, bi) => (bi === b ? { ...bl, items: bl.items.filter((_, ii) => ii !== i) } : bl)))}
                      aria-label="Supprimer l'ingrédient"
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-chip"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  {it.name && (
                    <div className="flex items-center gap-2 pl-1 text-xs text-muted">
                      <span>{it.quantity != null ? formatQuantity(it.quantity, it.unit) : "—"} · {it.name}</span>
                      <label htmlFor={`aisle-${b}-${i}`} className="sr-only">Rayon</label>
                      <select id={`aisle-${b}-${i}`} value={it.aisle} onChange={(e) => updateItem(b, i, { aisle: e.target.value })} className="ml-auto rounded-md bg-chip px-1.5 py-1 text-xs">
                        {AISLES.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBlocks((list) => list.map((bl, bi) => (bi === b ? { ...bl, items: [...bl.items, emptyIngredient()] } : bl)))}
                className="btn-dashed"
              >
                + Ingrédient
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setBlocks((list) => [...list, { label: "", items: [emptyIngredient()] }])} className="self-start text-xs font-medium text-brand underline">
            + Sous-partie (« Pour la sauce »…)
          </button>
        </section>

        <section className="card flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="section-title">Préparation</h2>
            <p className="text-xs text-muted">Le poste, la durée et « mains libres » sont devinés depuis le texte : ils servent au guide de batch cooking.</p>
          </div>
          {steps.map((s, i) => (
            <div key={i} className="flex gap-2.5">
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
              <div className="flex flex-1 flex-col gap-1.5">
                <label className="sr-only" htmlFor={`s-${i}`}>Étape {i + 1}</label>
                <textarea id={`s-${i}`} rows={2} value={s.text} onChange={(e) => updateStep(i, { text: e.target.value })} onBlur={() => reguess(i)} className="field py-2 leading-snug" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="sr-only" htmlFor={`st-${i}`}>Poste</label>
                  <select id={`st-${i}`} value={s.station} onChange={(e) => updateStep(i, { station: e.target.value, auto: false })} className="field min-h-9 w-auto text-[13px]">
                    {STATION_CHOICES.map((st) => (
                      <option key={st.value} value={st.value}>{st.label}</option>
                    ))}
                    {!STATION_CHOICES.some((c) => c.value === s.station) && <option value={s.station}>{stationLabel(s.station)}</option>}
                  </select>
                  <label className="flex items-center gap-1 text-[13px] text-muted">
                    <input
                      type="number"
                      min={1}
                      value={s.duration_minutes}
                      onChange={(e) => updateStep(i, { duration_minutes: Number(e.target.value) || 1, auto: false })}
                      className="field min-h-9 w-16 px-2 text-[13px]"
                    />
                    min
                  </label>
                  <button
                    type="button"
                    onClick={() => updateStep(i, { hands_busy: !s.hands_busy, auto: false })}
                    aria-pressed={!s.hands_busy}
                    className={`min-h-9 rounded-full px-3 text-xs font-medium ${s.hands_busy ? "bg-warn-soft text-warn" : "bg-brand-soft text-brand-dark"}`}
                  >
                    {s.hands_busy ? "Mains occupées" : "Mains libres"}
                  </button>
                  <button type="button" onClick={() => setSteps((list) => list.filter((_, j) => j !== i))} aria-label="Supprimer l'étape" className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted hover:bg-chip">
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setSteps((list) => [...list, emptyStep()])} className="btn-dashed">
            + Étape
          </button>
        </section>

        <section className="card flex flex-col gap-1.5 p-4">
          <label htmlFor="notes" className="section-title">Conseils</label>
          <textarea
            id="notes"
            rows={3}
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Astuces, variantes, conservation…"
            className="field py-2 leading-snug"
          />
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ground px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <button type="button" onClick={save} disabled={pending} className="btn-primary w-full">
            {pending ? "Enregistrement…" : "Enregistrer la recette"}
          </button>
        </div>
      </div>
    </div>
  );
}
