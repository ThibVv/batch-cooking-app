/** Poste de cuisson : plan, plaque, four, repos, ou un appareil du catalogue (air-fryer, mijoteuse…). */
export type Station = string;
export type Slot = "midi" | "soir" | "extra";
export type Storage = "frigo" | "congelo";
export type Category = "plat" | "petit-dej" | "gouter";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "plat", label: "Plat" },
  { value: "petit-dej", label: "Petit-déj" },
  { value: "gouter", label: "Goûter" },
];

/** Catégories ajoutées « en plus » des repas de la semaine */
export const EXTRA_CATEGORIES: Category[] = ["petit-dej", "gouter"];

export const AISLES = [
  "Fruits & légumes",
  "Boucherie & poisson",
  "Crèmerie",
  "Épicerie",
  "Épicerie sucrée",
  "Surgelés",
  "Boulangerie",
  "Autre",
] as const;

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"] as const;
export const MEAL_SLOTS: Slot[] = ["midi", "soir"];

/** Une personne du foyer (avec ou sans compte) */
export interface Person {
  id: string;
  household_id: string;
  user_id: string | null;
  name: string;
  color: string;
  /** Envies habituelles (tags) */
  likes: string[];
  /** Ingrédients à éviter */
  dislikes: string[];
  position: number;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  equipment: string[];
  burners: number;
}

export interface Ingredient {
  id?: string;
  position: number;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  /** Sous-partie de la liste (« Pour la sauce ») */
  group_label: string | null;
}

export interface Step {
  id?: string;
  position: number;
  text: string;
  station: Station;
  duration_minutes: number;
  hands_busy: boolean;
}

export interface Recipe {
  id: string;
  household_id: string;
  author_id: string | null;
  name: string;
  category: Category;
  description: string | null;
  servings: number;
  /** Rendement quand ce ne sont pas des portions : « 10 gaufres », « 1 cake » */
  yield_label: string | null;
  prep_minutes: number;
  cook_minutes: number;
  rest_minutes: number;
  fridge_days: number;
  freezable: boolean;
  tags: string[];
  equipment: string[];
  source_url: string | null;
  notes: string | null;
  /** Photo du plat, et son crédit : la licence des banques d'images l'exige */
  image_url?: string | null;
  image_author?: string | null;
  image_source?: string | null;
  recipe_ingredients: Ingredient[];
  recipe_steps: Step[];
}

/** Recette sans identifiants base, utilisée pour la création, l'import et les recettes de départ. */
export type RecipeDraft = Omit<Recipe, "id" | "household_id" | "author_id">;

/**
 * Recette allégée pour les listes : ni étapes ni quantités, les ingrédients réduits
 * à leur nom (la recherche en a besoin). Évite de rapatrier toute la bibliothèque.
 */
export interface RecipeSummary {
  id: string;
  name: string;
  category: Category;
  servings: number;
  yield_label: string | null;
  prep_minutes: number;
  cook_minutes: number;
  fridge_days: number;
  freezable: boolean;
  tags: string[];
  author_id: string | null;
  image_url: string | null;
  recipe_ingredients: { name: string }[];
}

/** Recette proposée dans le sélecteur : juste de quoi choisir en connaissance de cause. */
export interface RecipeChoice {
  id: string;
  name: string;
  category: Category;
  tags: string[];
  servings: number;
  yield_label: string | null;
  prep_minutes: number;
  cook_minutes: number;
  fridge_days: number;
  freezable: boolean;
}

export interface PlanMeal {
  id?: string;
  recipe_id: string;
  person_id: string | null;
  day: number;
  slot: Slot;
  storage: Storage;
  /** Personnes qui mangent ce plat à ce créneau ; vide = tout le foyer (semaines d'avant ce champ) */
  eaters?: string[];
}

export interface MealPlan {
  id: string;
  household_id: string;
  week_start: string;
  criteria: Criteria;
  plan_meals: PlanMeal[];
}

export interface PersonCriteria {
  personId: string;
  /** Nombre de plats différents pour cette personne sur ses 10 repas */
  count: number;
  /** Envies de la semaine (tags) */
  tags: string[];
}

export interface Criteria {
  people: PersonCriteria[];
  /** Temps de cuisine total visé pour le batch (minutes), null = peu importe */
  maxMinutes: number | null;
  /** Nombre minimum de recettes par tag, ex. { "végé": 3 } */
  minTags: Record<string, number>;
  excludeIngredients: string[];
  avoidRecentWeeks: number;
  shareIngredients: boolean;
  /** Utiliser en priorité les fonds de placard */
  usePantry: boolean;
  /** Cuisiner une seule fois les plats qui conviennent à tout le monde (absent = oui) */
  share?: boolean;
  /** Recettes en plus des repas : { "petit-dej": 1, "gouter": 1 } */
  extras: Partial<Record<Category, number>>;
}

export interface ShoppingItem {
  id: string;
  plan_id: string;
  name: string;
  quantity: number | null;
  unit: string;
  aisle: string;
  sources: string[];
  manual: boolean;
  in_pantry: boolean;
  checked: boolean;
  checked_by: string | null;
}

export interface PantryItem {
  id: string;
  name: string;
}
