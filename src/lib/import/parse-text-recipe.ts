import type { Category, Ingredient, RecipeDraft, Step } from "@/lib/types";
import { detectRequiredEquipment, EQUIPMENT } from "@/lib/equipment";
import { parseDurationText, parseIngredientLine, stepFromText } from "@/lib/import/parse-recipe";

/**
 * Lit une recette écrite au format des fiches du Drive :
 *
 *   # Titre
 *   Pour 4 personnes · Conservation : 3 jours au réfrigérateur · Préparation : 15 min | Cuisson : 20 min
 *   Une phrase de description.
 *   ## Matériel        (facultatif)
 *   ## Ingrédients     (avec des sous-parties « Pour la sauce : »)
 *   ## Préparation     (étapes numérotées)
 *   ## Conseils        (facultatif)
 */

type Section = "intro" | "equipment" | "ingredients" | "steps" | "notes";

function unescapeMarkdown(s: string) {
  return s.replace(/\\([!#*_\-.()[\]+])/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1");
}

function sectionOf(heading: string): Section | null {
  const h = heading.toLowerCase();
  if (/^ingr[ée]dients?/.test(h)) return "ingredients";
  if (/^(pr[ée]paration|[ée]tapes|instructions|recette)/.test(h)) return "steps";
  if (/^(mat[ée]riel|ustensiles)/.test(h)) return "equipment";
  if (/^(conseils?|astuces?|informations|conservation|notes?|variantes?|le petit plus|bon à savoir)/.test(h)) return "notes";
  return null;
}

function isMetaLine(line: string) {
  const l = line.toLowerCase();
  return /^pour\s+(environ\s+)?\d/.test(l) || /(conservation|calories|macros|préparation\s*:|cuisson\s*:|repos\s*:)/.test(l);
}

export interface ParsedMeta {
  servings: number | null;
  yield_label: string | null;
  fridge_days: number | null;
  freezable: boolean | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  rest_minutes: number | null;
}

export function parseMeta(text: string): ParsedMeta {
  const t = text.toLowerCase();
  const meta: ParsedMeta = { servings: null, yield_label: null, fridge_days: null, freezable: null, prep_minutes: null, cook_minutes: null, rest_minutes: null };

  const portions = t.match(/pour\s+(?:environ\s+)?(\d+)(?:\s*(?:à|-)\s*\d+)?\s*(personnes?|portions?|repas|pers\b|parts?)/);
  const other = t.match(/pour\s+(?:environ\s+)?(\d+)\s+([a-zàâçéèêëîïôûùüÿœ-]+)/);
  if (portions) meta.servings = Number(portions[1]);
  else if (other) {
    meta.servings = Number(other[1]);
    meta.yield_label = `${other[1]} ${other[2]}`;
  }

  const days = t.match(/(\d+)\s*jours?\s*(?:au\s+|à\s+|dans\s+le\s+)?(?:r[ée]frig|frigo|frais)/) ?? t.match(/se garde\s+(\d+)\s*jours?/);
  if (days) meta.fridge_days = Math.min(Number(days[1]), 7);
  else if (/24\s*h(eures)?/.test(t)) meta.fridge_days = 1;

  if (/(cong[ée]lation|cong[ée]ler)\s*:?\s*(d[ée]conseill|non\b)|ne se cong[eè]le pas/.test(t)) meta.freezable = false;
  else if (/cong[eèé]l|surgel/.test(t)) meta.freezable = true;

  const time = (label: string) => {
    const m = t.match(new RegExp(`${label}\\s*:\\s*([^|·\\n)]+)`));
    return m ? parseDurationText(m[1]) : null;
  };
  meta.prep_minutes = time("pr[ée]paration");
  meta.cook_minutes = time("cuisson");
  meta.rest_minutes = time("repos");
  return meta;
}

function detectEquipment(lines: string[]): string[] {
  const found = new Set<string>();
  for (const line of lines) {
    const l = line.toLowerCase();
    for (const e of EQUIPMENT) {
      if ([e.label, ...(e.aliases ?? [])].some((a) => a.length > 3 && l.includes(a.toLowerCase()))) found.add(e.id);
    }
  }
  return [...found];
}

export interface ParseTextOptions {
  title?: string;
  category?: Category;
  tags?: string[];
}

export function parseTextRecipe(raw: string, options: ParseTextOptions = {}): RecipeDraft {
  const lines = unescapeMarkdown(raw)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let title = options.title?.trim() || "";
  let section: Section = "intro";
  let group: string | null = null;
  const metaLines: string[] = [];
  const description: string[] = [];
  const equipmentLines: string[] = [];
  const notes: string[] = [];
  const ingredients: Ingredient[] = [];
  const stepTexts: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^#{1,4}\s*(.+)$/);
    if (heading) {
      const text = heading[1].trim();
      const next = sectionOf(text);
      if (next) {
        section = next;
        group = null;
        // « Préparation (Préparation : 10 min | Cuisson : 20 min) »
        if (/:\s*\d/.test(text)) metaLines.push(text);
      } else if (section === "ingredients") {
        group = text.replace(/\s*:$/, "");
      } else if (section === "intro" && !title) {
        title = text.replace(/\s*\((meal prep|batch)\)\s*$/i, "");
      } else if (section === "intro") {
        // Titre répété dans le document : on l'ignore
      } else {
        notes.push(text);
      }
      continue;
    }

    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    const content = item ? item[1].trim() : line;

    switch (section) {
      case "intro":
        if (isMetaLine(line)) metaLines.push(line);
        else if (!title) title = line;
        else if (line.toLowerCase() === title.toLowerCase()) break;
        else description.push(line);
        break;
      case "equipment":
        equipmentLines.push(content);
        break;
      case "ingredients": {
        if (/:\s*$/.test(content)) {
          // « Pour la sauce : », en ligne simple ou en puce
          group = content.replace(/\s*:\s*$/, "");
          break;
        }
        if (line.startsWith("|")) {
          // Tableau Markdown « | Ingrédient | Quantité | » : on recompose « quantité ingrédient »
          const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
          if (cells.length < 2 || cells.every((c) => /^:?-*:?$/.test(c)) || /^ingr[ée]dient/i.test(cells[0])) break;
          ingredients.push(parseIngredientLine(`${cells[1]} ${cells[0]}`, ingredients.length, group));
          break;
        }
        ingredients.push(parseIngredientLine(content, ingredients.length, group));
        break;
      }
      case "steps":
        if (!item && /:\s*$/.test(line)) break; // sous-titre d'étapes
        stepTexts.push(content);
        break;
      case "notes":
        notes.push(item ? `• ${content}` : content);
        break;
    }
  }

  const meta = parseMeta(metaLines.join(" · "));
  const steps: Step[] = stepTexts.map((t, i) => stepFromText(t, i));
  const equipment = new Set([...detectEquipment(equipmentLines), ...detectRequiredEquipment([title, ...equipmentLines].join(" "))]);
  // Recette « à la mijoteuse » : la longue cuisson se fait dans l'appareil, pas sur la plaque
  const appliance = ["mijoteuse", "multicuiseur", "air-fryer", "robot-cuiseur"].find((a) => equipment.has(a));
  if (appliance) {
    for (const s of steps) {
      if (s.station === "plaque" && s.duration_minutes >= 30) {
        s.station = appliance;
        s.hands_busy = false;
      }
    }
  }
  if (steps.some((s) => s.station === "four")) equipment.add("four");
  if (steps.some((s) => s.station === "plaque")) equipment.add("plaque");
  for (const s of steps) if (!["plan", "plaque", "four", "repos"].includes(s.station)) equipment.add(s.station);

  const sum = (filter: (s: Step) => boolean) => steps.filter(filter).reduce((n, s) => n + s.duration_minutes, 0);

  return {
    name: title || "Recette sans titre",
    category: options.category ?? "plat",
    description: description.join("\n") || null,
    servings: meta.servings ?? 2,
    yield_label: meta.yield_label,
    prep_minutes: meta.prep_minutes ?? sum((s) => s.hands_busy),
    cook_minutes: meta.cook_minutes ?? sum((s) => !s.hands_busy && s.station !== "repos"),
    rest_minutes: meta.rest_minutes ?? sum((s) => s.station === "repos"),
    fridge_days: meta.fridge_days ?? 3,
    freezable: meta.freezable ?? false,
    tags: options.tags ?? [],
    equipment: [...equipment],
    source_url: null,
    notes: notes.join("\n") || null,
    recipe_ingredients: ingredients,
    recipe_steps: steps,
  };
}

/** Écrit une recette au même format, pour la copier ou la partager. */
export function recipeToText(r: RecipeDraft): string {
  const meta = [
    r.yield_label ? `Pour ${r.yield_label}` : `Pour ${r.servings} personnes`,
    r.freezable ? `Conservation : ${r.fridge_days} jours au réfrigérateur (se congèle)` : `Conservation : ${r.fridge_days} jours au réfrigérateur`,
    r.prep_minutes ? `Préparation : ${r.prep_minutes} min` : null,
    r.cook_minutes ? `Cuisson : ${r.cook_minutes} min` : null,
  ].filter(Boolean);
  const out = [`# ${r.name}`, "", meta.join(" · "), ""];
  if (r.description) out.push(r.description, "");
  out.push("## Ingrédients", "");
  let group: string | null = null;
  for (const i of r.recipe_ingredients) {
    if (i.group_label && i.group_label !== group) {
      group = i.group_label;
      out.push(`${group} :`);
    }
    const qty = i.quantity != null ? `${String(i.quantity).replace(".", ",")}${i.unit ? ` ${i.unit}` : ""} ` : "";
    out.push(`- ${qty}${qty && /^[aeiouyéèêh]/i.test(i.name) ? "d'" : qty ? "de " : ""}${qty ? i.name.toLowerCase() : i.name}`);
  }
  out.push("", "## Préparation", "");
  r.recipe_steps.forEach((s, i) => out.push(`${i + 1}. ${s.text}`));
  if (r.notes) out.push("", "## Conseils", "", r.notes);
  return out.join("\n");
}
