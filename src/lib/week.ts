/** Dates de semaine au format ISO (AAAA-MM-JJ), en heure locale. */

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Lundi à venir (aujourd'hui si on est lundi) : la semaine qu'on prépare le week-end. */
export function upcomingMonday(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const offset = (8 - d.getDay()) % 7; // dimanche = 0 → +1, lundi = 1 → 0
  d.setDate(d.getDate() + offset);
  return toIsoDate(d);
}

export function addDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function weeksBetween(a: string, b: string): number {
  return Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / (7 * 86400000));
}

const fmtDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export function formatWeekRange(weekStart: string): string {
  return `${parseIsoDate(weekStart).getDate()} au ${fmtDay.format(parseIsoDate(addDays(weekStart, 4)))}`;
}

export function dayNumber(weekStart: string, day: number): number {
  return parseIsoDate(addDays(weekStart, day)).getDate();
}

/** Le dimanche qui précède la semaine : jour du batch cooking. */
export function cookingDay(weekStart: string): string {
  return fmtLong.format(parseIsoDate(addDays(weekStart, -1)));
}
