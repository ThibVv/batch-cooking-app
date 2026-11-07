/**
 * Recherche une photo de plat dans une banque d'images.
 *
 * Unsplash : clé gratuite sur https://unsplash.com/developers, 50 requêtes par
 * heure en mode démo. Sa licence demande de créditer l'auteur et de signaler
 * l'usage d'une photo — c'est à quoi servent `author`, `source` et l'appel à
 * `download_location`.
 *
 * Sans clé `UNSPLASH_ACCESS_KEY`, la recherche est simplement indisponible et
 * l'app garde ses vignettes colorées.
 *
 * La photo est cherchée une fois puis enregistrée sur la recette : aucune
 * requête vers la banque d'images pendant la navigation.
 */

export interface Photo {
  url: string;
  author: string;
  /** Page de la photo, à lier dans le crédit */
  source: string;
}

const SEARCH = "https://api.unsplash.com/search/photos";
/** Exigé par les règles d'Unsplash sur les liens de crédit. */
const UTM = "utm_source=batch-cooking&utm_medium=referral";

/**
 * Mots qui décrivent la recette plutôt que le plat : ils parasitent la
 * recherche d'image. Comparés sans accent, parce que `\b` en JavaScript
 * ne reconnaît pas les lettres accentuées (« protéiné » passait au travers).
 */
const NOISE = new Set([
  "facile",
  "express",
  "rapide",
  "maison",
  "ultra",
  "super",
  "cremeuse",
  "cremeux",
  "meal",
  "prep",
  "batch",
  "minute",
  "minutes",
  "leger",
  "legere",
  "allege",
  "allegee",
  "proteine",
  "proteinee",
  "revisite",
  "revisitee",
  "parfait",
  "parfaite",
  "meilleur",
  "meilleure",
  "choix",
  // Noms d'appareils : ils ne décrivent pas l'assiette
  "mijoteuse",
  "cookeo",
  "thermomix",
  "airfryer",
  "fryer",
  "multicuiseur",
  "gaufrier",
]);

/** Articles et liaisons : ils n'aident pas une banque d'images indexée en anglais. */
const STOPWORDS = new Set(["de", "du", "des", "d", "la", "le", "les", "l", "au", "aux", "a", "et", "en", "sur", "avec", "sans", "sa", "son", "ses", "un", "une"]);

function plain(word: string) {
  return word
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** « Pâtes sauce marinara ultra crémeuse (sans crème) » → « Pâtes sauce marinara » */
export function photoQuery(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .replace(/[&,:–—'’]/g, " ")
    .split(/\s+/)
    .filter((w) => {
      const key = plain(w);
      return key && !STOPWORDS.has(key) && !NOISE.has(key);
    });
  // Au-delà de quatre mots, la banque d'images ne trouve plus rien
  return words.slice(0, 4).join(" ") || name.trim();
}

interface UnsplashPhoto {
  urls?: { regular?: string; small?: string };
  user?: { name?: string; username?: string };
  links?: { html?: string; download_location?: string };
}

class PhotoError extends Error {}

async function search(query: string, perPage: number): Promise<UnsplashPhoto[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) throw new PhotoError("missing-key");

  const url = `${SEARCH}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 403 || res.status === 429) throw new PhotoError("rate-limited");
  if (res.status === 401) throw new PhotoError("bad-key");
  if (!res.ok) throw new PhotoError(`unsplash-${res.status}`);
  const body = (await res.json()) as { results?: UnsplashPhoto[] };
  return body.results ?? [];
}

/**
 * Unsplash demande de signaler qu'une photo est utilisée. L'appel n'a pas
 * besoin d'aboutir pour que la photo s'affiche : on ne bloque pas dessus.
 */
async function reportUse(downloadLocation: string | undefined) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!downloadLocation || !key) return;
  try {
    await fetch(downloadLocation, { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(5000) });
  } catch {
    // tant pis : le crédit reste affiché, c'est l'essentiel
  }
}

function toPhoto(p: UnsplashPhoto): Photo | null {
  const url = p.urls?.regular ?? p.urls?.small;
  if (!url) return null;
  const page = p.links?.html ?? "https://unsplash.com";
  return {
    url,
    author: p.user?.name ?? p.user?.username ?? "Unsplash",
    source: `${page}${page.includes("?") ? "&" : "?"}${UTM}`,
  };
}

/**
 * Cherche une photo pour un plat. `skip` passe à la suivante quand la première
 * ne va pas. `tries` plafonne le nombre de requêtes ; les replis ne partent que
 * si la précédente n'a rien donné, donc une recette trouvée du premier coup
 * ne coûte qu'une requête sur les 50 de l'heure.
 *
 * Deux leçons des essais : l'index d'Unsplash est anglophone, donc une requête
 * française longue ne renvoie souvent rien et il faut raccourcir ; et sans le
 * mot « food », « Gaufres liégeoises » rapporte la façade d'un hôtel.
 */
export async function findPhoto(recipeName: string, skip = 0, tries = 3): Promise<Photo | null> {
  const words = photoQuery(recipeName).split(" ");
  const queries = [words.join(" "), words.slice(0, 2).join(" "), words[0]]
    .map((q) => `${q} food`)
    .filter((q, i, all) => q.trim() !== "food" && all.indexOf(q) === i)
    .slice(0, Math.max(tries, 1));

  for (const query of queries) {
    const results = await search(query, Math.min(skip + 1, 10));
    const picked = results[skip % Math.max(results.length, 1)];
    if (!picked) continue;
    const photo = toPhoto(picked);
    if (photo) {
      await reportUse(picked.links?.download_location);
      return photo;
    }
  }
  return null;
}

/** La recherche de photos est-elle configurée ? */
export function photosAvailable(): boolean {
  return !!process.env.UNSPLASH_ACCESS_KEY;
}

/** Nom de la banque d'images, affiché dans le crédit. */
export const PHOTO_SOURCE_NAME = "Unsplash";
