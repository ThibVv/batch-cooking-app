/** Unités canoniques et conversions, pour pouvoir additionner les ingrédients. */

const UNIT_ALIASES: Record<string, { unit: string; factor: number }> = {
  g: { unit: "g", factor: 1 },
  gr: { unit: "g", factor: 1 },
  gramme: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  kilo: { unit: "g", factor: 1000 },
  mg: { unit: "g", factor: 0.001 },
  ml: { unit: "ml", factor: 1 },
  cl: { unit: "ml", factor: 10 },
  dl: { unit: "ml", factor: 100 },
  l: { unit: "ml", factor: 1000 },
  litre: { unit: "ml", factor: 1000 },
  "c. à s.": { unit: "c. à s.", factor: 1 },
  "c.à.s": { unit: "c. à s.", factor: 1 },
  cas: { unit: "c. à s.", factor: 1 },
  cs: { unit: "c. à s.", factor: 1 },
  "cuillère à soupe": { unit: "c. à s.", factor: 1 },
  "cuillere a soupe": { unit: "c. à s.", factor: 1 },
  "c. à c.": { unit: "c. à c.", factor: 1 },
  "c.à.c": { unit: "c. à c.", factor: 1 },
  cac: { unit: "c. à c.", factor: 1 },
  cc: { unit: "c. à c.", factor: 1 },
  "cuillère à café": { unit: "c. à c.", factor: 1 },
  "cuillere a cafe": { unit: "c. à c.", factor: 1 },
  boîte: { unit: "boîte", factor: 1 },
  boite: { unit: "boîte", factor: 1 },
  botte: { unit: "botte", factor: 1 },
  gousse: { unit: "gousse", factor: 1 },
  tranche: { unit: "tranche", factor: 1 },
  sachet: { unit: "sachet", factor: 1 },
  pincée: { unit: "pincée", factor: 1 },
  pincee: { unit: "pincée", factor: 1 },
  pot: { unit: "pot", factor: 1 },
  brique: { unit: "brique", factor: 1 },
  cube: { unit: "cube", factor: 1 },
  pièce: { unit: "", factor: 1 },
  piece: { unit: "", factor: 1 },
  pc: { unit: "", factor: 1 },
  "": { unit: "", factor: 1 },
};

export const UNIT_CHOICES = ["", "g", "kg", "ml", "cl", "l", "c. à s.", "c. à c.", "boîte", "botte", "gousse", "tranche", "sachet", "pincée", "pot", "brique", "cube", "cm", "bouquet", "brin", "branche", "feuille", "poignée", "filet", "morceau", "verre"];

export function normalizeUnit(raw: string): { unit: string; factor: number } {
  const key = raw.trim().toLowerCase().replace(/s$/, "");
  return UNIT_ALIASES[key] ?? UNIT_ALIASES[raw.trim().toLowerCase()] ?? { unit: raw.trim(), factor: 1 };
}

function stripAccents(s: string) {
  // « œ » et « æ » ne se décomposent pas : bœuf et boeuf doivent donner la même clé
  return s.replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * L'ingrédient parle-t-il de ce mot (« champignon » dans « champignons de Paris ») ?
 * Mot entier seulement, et l'huile d'olive n'est pas une olive pour qui n'aime pas les olives.
 */
export function mentionsIngredient(name: string, word: string): boolean {
  const wk = ingredientKey(word);
  if (!wk) return false;
  const key = wk.startsWith("huile") ? ingredientKey(name) : ingredientKey(name).replace(/\bhuile d ?\w+/g, "huile");
  return ` ${key} `.includes(` ${wk}`);
}

/** Clé de regroupement d'un ingrédient : minuscules, sans accents, au singulier. */
export function ingredientKey(name: string): string {
  return stripAccents(name.toLowerCase())
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length > 3 ? w.replace(/(s|x)$/, "") : w))
    .join(" ");
}

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [0.5, "½"],
  [0.75, "¾"],
];

export function formatQuantity(quantity: number | null, unit: string): string {
  if (quantity == null) return unit;
  let q = quantity;
  let u = unit;
  if (u === "g" && q >= 1000) {
    q = q / 1000;
    u = "kg";
  } else if (u === "ml" && q >= 1000) {
    q = q / 1000;
    u = "l";
  }
  let text: string;
  if (u === "g" || u === "ml") {
    text = String(Math.round(q / 5) * 5 || Math.round(q));
  } else {
    const whole = Math.floor(q);
    const rest = q - whole;
    const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.07);
    if (rest < 0.07) text = String(whole);
    else if (rest > 0.93) text = String(whole + 1);
    else if (frac) text = (whole ? String(whole) : "") + frac[1];
    else text = q.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  }
  if (q > 1 && PLURALIZABLE.has(u)) u += "s";
  return u ? `${text} ${u}` : text;
}

const PLURALIZABLE = new Set(["boîte", "botte", "gousse", "tranche", "sachet", "pincée", "pot", "brique", "cube", "bouquet", "brin", "branche", "feuille", "poignée", "filet", "verre"]);

/** Arrondi pratique pour les courses : on n'achète pas 1,3 oignon. */
export function roundForShopping(quantity: number, unit: string): number {
  if (unit === "g" || unit === "ml") return Math.ceil(quantity / 10) * 10;
  if (["c. à s.", "c. à c.", "pincée"].includes(unit)) return Math.round(quantity * 2) / 2;
  return Math.ceil(quantity - 0.15);
}
