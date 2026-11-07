/** Catalogue du matériel de cuisine : sert au choix des recettes et à l'ordonnancement du batch. */

export type EquipmentCategory = "Cuisson" | "Appareils de cuisson" | "Préparation" | "Ustensiles";

export interface Equipment {
  id: string;
  label: string;
  category: EquipmentCategory;
  /** Autres noms, pour la recherche et la détection dans les recettes */
  aliases?: string[];
  /** Poste de cuisson qu'il fournit dans le guide de batch */
  station?: string;
}

export const EQUIPMENT: Equipment[] = [
  // Cuisson
  { id: "plaque-induction", label: "Plaques induction", category: "Cuisson", aliases: ["induction", "plaque"], station: "plaque" },
  { id: "plaque-vitro", label: "Plaques vitrocéramique", category: "Cuisson", aliases: ["vitro", "plaque"], station: "plaque" },
  { id: "plaque-gaz", label: "Gazinière / feux gaz", category: "Cuisson", aliases: ["gaz", "feux", "plaque"], station: "plaque" },
  { id: "plaque-electrique", label: "Plaques électriques (fonte)", category: "Cuisson", aliases: ["électrique", "plaque"], station: "plaque" },
  { id: "four", label: "Four", category: "Cuisson", aliases: ["four traditionnel", "four chaleur tournante"], station: "four" },
  { id: "four-2", label: "Second four / four double", category: "Cuisson", aliases: ["double four"], station: "four" },
  { id: "four-vapeur", label: "Four vapeur", category: "Cuisson", aliases: ["vapeur"], station: "four" },
  { id: "mini-four", label: "Mini-four", category: "Cuisson", aliases: ["petit four", "four posable"], station: "four" },
  { id: "micro-ondes", label: "Micro-ondes", category: "Cuisson", aliases: ["micro onde", "microonde"], station: "micro-ondes" },
  { id: "plancha", label: "Plancha", category: "Cuisson", station: "plancha" },
  { id: "barbecue", label: "Barbecue", category: "Cuisson", aliases: ["bbq", "grill"], station: "barbecue" },

  // Appareils de cuisson
  { id: "air-fryer", label: "Air fryer", category: "Appareils de cuisson", aliases: ["airfryer", "friteuse sans huile", "ninja"], station: "air-fryer" },
  { id: "multicuiseur", label: "Multicuiseur (Cookeo…)", category: "Appareils de cuisson", aliases: ["cookeo", "instant pot", "multicuiseur"], station: "multicuiseur" },
  { id: "robot-cuiseur", label: "Robot cuiseur (Thermomix, Monsieur Cuisine…)", category: "Appareils de cuisson", aliases: ["thermomix", "monsieur cuisine", "companion", "i-cook"], station: "robot-cuiseur" },
  { id: "autocuiseur", label: "Autocuiseur / cocotte-minute", category: "Appareils de cuisson", aliases: ["cocotte minute", "seb"], station: "autocuiseur" },
  { id: "mijoteuse", label: "Mijoteuse (slow cooker)", category: "Appareils de cuisson", aliases: ["slow cooker", "crock pot"], station: "mijoteuse" },
  { id: "cuiseur-riz", label: "Cuiseur à riz", category: "Appareils de cuisson", aliases: ["rice cooker"], station: "cuiseur-riz" },
  { id: "cuiseur-vapeur", label: "Cuiseur vapeur électrique", category: "Appareils de cuisson", aliases: ["vitacuisine"], station: "cuiseur-vapeur" },
  { id: "gaufrier", label: "Gaufrier", category: "Appareils de cuisson", aliases: ["gaufres"], station: "gaufrier" },
  { id: "appareil-croque", label: "Appareil à croque-monsieur", category: "Appareils de cuisson", aliases: ["croque"], station: "appareil-croque" },
  { id: "crepiere", label: "Crêpière / billig", category: "Appareils de cuisson", aliases: ["crêpes", "billig"], station: "crepiere" },
  { id: "friteuse", label: "Friteuse", category: "Appareils de cuisson", station: "friteuse" },
  { id: "machine-pain", label: "Machine à pain", category: "Appareils de cuisson", station: "machine-pain" },
  { id: "yaourtiere", label: "Yaourtière", category: "Appareils de cuisson", station: "yaourtiere" },
  { id: "sous-vide", label: "Thermoplongeur sous vide", category: "Appareils de cuisson", aliases: ["roner", "cuisson sous vide"], station: "sous-vide" },
  { id: "raclette", label: "Appareil à raclette", category: "Appareils de cuisson" },
  { id: "fondue", label: "Appareil à fondue", category: "Appareils de cuisson" },
  { id: "pierrade", label: "Pierrade / grill de table", category: "Appareils de cuisson" },

  // Préparation
  { id: "robot-patissier", label: "Robot pâtissier (KitchenAid…)", category: "Préparation", aliases: ["kitchenaid", "kenwood", "pétrin"] },
  { id: "robot-multifonction", label: "Robot multifonction", category: "Préparation", aliases: ["magimix", "robot coupe"] },
  { id: "blender", label: "Blender", category: "Préparation", aliases: ["mixeur", "smoothie"] },
  { id: "mixeur-plongeant", label: "Mixeur plongeant", category: "Préparation", aliases: ["mixeur", "girafe"] },
  { id: "hachoir", label: "Mini-hachoir", category: "Préparation", aliases: ["hachoir", "mini hachoir"] },
  { id: "batteur", label: "Batteur électrique", category: "Préparation", aliases: ["fouet électrique"] },
  { id: "balance", label: "Balance de cuisine", category: "Préparation", aliases: ["pesée"] },
  { id: "mandoline", label: "Mandoline", category: "Préparation" },
  { id: "rape", label: "Râpe", category: "Préparation" },
  { id: "spiraliseur", label: "Spiraliseur", category: "Préparation", aliases: ["spaghetti de légumes"] },
  { id: "extracteur-jus", label: "Extracteur de jus", category: "Préparation", aliases: ["centrifugeuse"] },
  { id: "deshydrateur", label: "Déshydrateur", category: "Préparation" },
  { id: "machine-sous-vide", label: "Machine de mise sous vide", category: "Préparation", aliases: ["soudeuse", "sous vide"] },
  { id: "thermometre", label: "Thermomètre de cuisson", category: "Préparation" },

  // Ustensiles
  { id: "poele", label: "Poêle", category: "Ustensiles" },
  { id: "sauteuse", label: "Sauteuse", category: "Ustensiles" },
  { id: "wok", label: "Wok", category: "Ustensiles" },
  { id: "casserole", label: "Casseroles", category: "Ustensiles" },
  { id: "faitout", label: "Faitout / marmite", category: "Ustensiles", aliases: ["marmite"] },
  { id: "cocotte", label: "Cocotte en fonte", category: "Ustensiles", aliases: ["le creuset", "staub", "dutch oven"] },
  { id: "plat-four", label: "Plats à four / à gratin", category: "Ustensiles", aliases: ["gratin"] },
  { id: "plaque-four", label: "Plaque de cuisson du four", category: "Ustensiles", aliases: ["plaque à pâtisserie"] },
  { id: "moule-cake", label: "Moule à cake", category: "Ustensiles", aliases: ["moule à cake", "banana bread"] },
  { id: "moule-muffins", label: "Moule à muffins", category: "Ustensiles", aliases: ["muffins", "cupcakes"] },
  { id: "moule-tarte", label: "Moule à tarte", category: "Ustensiles", aliases: ["tarte", "quiche"] },
  { id: "moule-gateau", label: "Moule à gâteau", category: "Ustensiles" },
  { id: "panier-vapeur", label: "Panier vapeur", category: "Ustensiles", aliases: ["cuit-vapeur"] },
  { id: "passoire", label: "Passoire", category: "Ustensiles" },
  { id: "rouleau", label: "Rouleau à pâtisserie", category: "Ustensiles" },
  { id: "tupperwares", label: "Boîtes de conservation (tups)", category: "Ustensiles", aliases: ["tupperware", "boîtes"] },
];

export const EQUIPMENT_BY_ID = new Map(EQUIPMENT.map((e) => [e.id, e]));
export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ["Cuisson", "Appareils de cuisson", "Préparation", "Ustensiles"];

/** Matériel proposé par défaut à la création du foyer. */
export const DEFAULT_EQUIPMENT = ["plaque-induction", "four", "micro-ondes", "poele", "sauteuse", "casserole", "faitout", "plat-four", "mixeur-plongeant", "tupperwares"];

/** Postes de cuisson de base, toujours disponibles dans le guide. */
const BASE_STATIONS: Record<string, string> = { plan: "Plan de travail", plaque: "Plaque", four: "Four", repos: "Repos" };

export function stationLabel(station: string): string {
  return BASE_STATIONS[station] ?? EQUIPMENT.find((e) => e.station === station)?.label ?? station;
}

/** Postes proposés dans l'éditeur de recette : les postes de base et les appareils de cuisson. */
export const STATION_CHOICES: { value: string; label: string }[] = [
  ...Object.entries(BASE_STATIONS).map(([value, label]) => ({ value, label })),
  ...EQUIPMENT.filter((e) => e.station && !["plaque", "four"].includes(e.station)).map((e) => ({ value: e.station!, label: e.label })),
];

/** Nombre d'usages simultanés de chaque poste pour un foyer donné. */
export function stationCapacities(equipment: string[], burners: number): Record<string, number> {
  const caps: Record<string, number> = { plan: Infinity, repos: Infinity };
  const has = (id: string) => equipment.includes(id);
  if (["plaque-induction", "plaque-vitro", "plaque-gaz", "plaque-electrique"].some(has)) caps.plaque = Math.max(burners, 1);
  caps.four = ["four", "four-2", "four-vapeur", "mini-four"].filter(has).length;
  for (const e of EQUIPMENT) {
    if (e.station && !["plaque", "four"].includes(e.station) && has(e.id)) caps[e.station] = (caps[e.station] ?? 0) + 1;
  }
  return caps;
}

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function searchEquipment(query: string): Equipment[] {
  const q = normalize(query.trim());
  if (!q) return EQUIPMENT;
  return EQUIPMENT.filter((e) => [e.label, ...(e.aliases ?? [])].some((s) => normalize(s).includes(q)));
}

/** Appareils spéciaux dont une recette a besoin (on ne filtre pas sur les ustensiles courants). */
const REQUIRED_PATTERNS: [string, RegExp][] = [
  ["mijoteuse", /mijoteuse|slow ?cooker/],
  ["air-fryer", /air ?fryer|friteuse sans huile/],
  ["gaufrier", /gaufrier|gaufres?\b/],
  ["robot-cuiseur", /thermomix|monsieur cuisine|robot cuiseur/],
  ["crepiere", /crepiere|billig/],
  ["machine-pain", /machine a pain/],
  ["yaourtiere", /yaourtiere/],
];

export function detectRequiredEquipment(text: string): string[] {
  const t = normalize(text);
  return REQUIRED_PATTERNS.filter(([, re]) => re.test(t)).map(([id]) => id);
}

/** Le foyer a-t-il ce qu'il faut ? Un appareil peut en remplacer un autre (four ↔ air fryer pour un petit volume, non). */
export function hasEquipmentFor(required: string[], equipment: string[]): boolean {
  return required.every((id) => {
    if (id === "four") return ["four", "four-2", "four-vapeur", "mini-four"].some((x) => equipment.includes(x));
    if (id === "plaque") return ["plaque-induction", "plaque-vitro", "plaque-gaz", "plaque-electrique"].some((x) => equipment.includes(x));
    if (id === "mijoteuse") return equipment.includes("mijoteuse") || equipment.includes("multicuiseur") || equipment.includes("robot-cuiseur");
    return equipment.includes(id);
  });
}
