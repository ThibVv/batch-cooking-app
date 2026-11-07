/**
 * Valeurs nutritionnelles pour 100 g, par aliment de base.
 *
 * Ce sont des ordres de grandeur (type CIQUAL), pas des valeurs de laboratoire :
 * l'app les présente toujours comme des estimations. Les aliments secs sont
 * comptés crus (riz, pâtes, lentilles), les conserves égouttées (pois chiches,
 * haricots rouges, maïs), parce que c'est ainsi que les recettes les pèsent.
 *
 * `piece` est le poids d'une unité, pour les recettes qui comptent en pièces
 * (« 1 oignon », « 2 gousses d'ail »).
 */
import { ingredientKey } from "@/lib/units";

export type Family =
  | "viande"
  | "poisson"
  | "oeuf"
  | "laitier"
  | "legumineuse"
  | "feculent"
  | "legume"
  | "fruit"
  | "noix"
  | "matiere-grasse"
  | "sucre"
  | "condiment";

export interface Food {
  family: Family;
  /** pour 100 g */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  /** mg pour 100 g */
  iron: number;
  calcium: number;
  /** poids d'une pièce en grammes */
  piece?: number;
}

function f(family: Family, kcal: number, protein: number, carbs: number, fat: number, fiber = 0, iron = 0, calcium = 0, piece?: number): Food {
  return { family, kcal, protein, carbs, fat, fiber, iron, calcium, piece };
}

/** Les noms sont écrits normalement : ils sont normalisés au chargement. */
const TABLE: Record<string, Food> = {
  // Viandes et charcuterie -----------------------------------------------------
  poulet: f("viande", 121, 23, 0, 3, 0, 0.7, 10, 150),
  "escalope de poulet": f("viande", 121, 23, 0, 3, 0, 0.7, 10, 150),
  "blanc de poulet": f("viande", 121, 23, 0, 3, 0, 0.7, 10, 150),
  "cuisse de poulet": f("viande", 180, 19, 0, 11, 0, 1, 12, 200),
  dinde: f("viande", 110, 24, 0, 1.5, 0, 0.8, 12, 150),
  boeuf: f("viande", 160, 20, 0, 9, 0, 2.8, 12),
  "boeuf haché": f("viande", 150, 21, 0, 7, 0, 2.6, 12),
  "viande hachée": f("viande", 150, 21, 0, 7, 0, 2.6, 12),
  "boeuf à mijoter": f("viande", 160, 20, 0, 9, 0, 2.8, 12),
  paleron: f("viande", 170, 20, 0, 10, 0, 2.8, 12),
  steak: f("viande", 150, 21, 0, 7, 0, 2.6, 12),
  porc: f("viande", 160, 21, 0, 8, 0, 0.9, 10),
  veau: f("viande", 130, 21, 0, 4, 0, 1.2, 12),
  agneau: f("viande", 230, 18, 0, 17, 0, 1.8, 12),
  jambon: f("viande", 110, 18, 1, 3, 0, 1, 10, 40),
  "jambon blanc": f("viande", 110, 18, 1, 3, 0, 1, 10, 40),
  lardon: f("viande", 300, 15, 1, 27, 0, 0.8, 10),
  chorizo: f("viande", 450, 24, 2, 38, 0, 1.5, 15),
  saucisse: f("viande", 290, 14, 2, 25, 0, 1.2, 12),
  merguez: f("viande", 300, 15, 1, 27, 0, 1.5, 12),
  knack: f("viande", 270, 12, 2, 24, 0, 1, 12, 60),
  bacon: f("viande", 300, 20, 1, 24, 0, 1, 10),
  "magret de canard": f("viande", 200, 19, 0, 14, 0, 2.5, 10),

  // Poissons et fruits de mer --------------------------------------------------
  poisson: f("poisson", 110, 20, 0, 3, 0, 0.5, 30),
  saumon: f("poisson", 180, 20, 0, 11, 0, 0.4, 15, 140),
  thon: f("poisson", 110, 25, 0, 1, 0, 1.2, 15),
  cabillaud: f("poisson", 80, 18, 0, 0.7, 0, 0.3, 20, 150),
  colin: f("poisson", 80, 17, 0, 1, 0, 0.3, 20, 150),
  lieu: f("poisson", 80, 17, 0, 1, 0, 0.3, 20, 150),
  crevette: f("poisson", 85, 18, 0.5, 1, 0, 1.5, 60, 8),
  "saumon fumé": f("poisson", 180, 22, 0, 10, 0, 0.5, 15),
  sardine: f("poisson", 200, 24, 0, 11, 0, 2.5, 380),
  surimi: f("poisson", 100, 9, 12, 1, 0, 0.3, 20),

  // Oeufs ----------------------------------------------------------------------
  oeuf: f("oeuf", 140, 13, 0.7, 10, 0, 1.8, 55, 55),

  // Produits laitiers ----------------------------------------------------------
  lait: f("laitier", 46, 3.3, 4.8, 1.6, 0, 0, 115),
  "lait entier": f("laitier", 64, 3.2, 4.8, 3.6, 0, 0, 115),
  "crème liquide": f("laitier", 300, 2.3, 3, 30, 0, 0, 80),
  "crème épaisse": f("laitier", 300, 2.3, 3, 30, 0, 0, 80),
  "crème fraîche": f("laitier", 300, 2.3, 3, 30, 0, 0, 80),
  beurre: f("laitier", 750, 0.7, 0.6, 82, 0, 0, 15),
  "fromage râpé": f("laitier", 380, 27, 1, 29, 0, 0.3, 900),
  parmesan: f("laitier", 400, 35, 0, 28, 0, 0.8, 1200),
  emmental: f("laitier", 380, 28, 1, 29, 0, 0.3, 980),
  gruyère: f("laitier", 400, 28, 0, 32, 0, 0.3, 950),
  comté: f("laitier", 410, 27, 0, 34, 0, 0.3, 950),
  mozzarella: f("laitier", 280, 19, 1, 22, 0, 0.4, 500, 125),
  feta: f("laitier", 260, 14, 1.5, 21, 0, 0.6, 490),
  chèvre: f("laitier", 280, 18, 2, 22, 0, 1.6, 300),
  cheddar: f("laitier", 400, 25, 1, 33, 0, 0.7, 720),
  ricotta: f("laitier", 150, 10, 3, 11, 0, 0.4, 210),
  mascarpone: f("laitier", 430, 4, 4, 44, 0, 0.1, 100),
  boursin: f("laitier", 400, 7, 3, 40, 0, 0.2, 120),
  "yaourt nature": f("laitier", 60, 4, 5, 3, 0, 0.1, 130, 125),
  "fromage blanc": f("laitier", 75, 8, 4, 3, 0, 0.1, 115),
  skyr: f("laitier", 60, 11, 4, 0.2, 0, 0.1, 150),
  "lait de coco": f("matiere-grasse", 190, 2, 3, 19, 0, 1.6, 20),
  "crème de coco": f("matiere-grasse", 230, 2, 3, 23, 0, 1.6, 20),

  // Légumineuses et protéines végétales ----------------------------------------
  "lentilles corail": f("legumineuse", 350, 24, 50, 1.5, 11, 7, 50),
  lentille: f("legumineuse", 340, 24, 48, 1.5, 11, 7.5, 50),
  "pois chiches": f("legumineuse", 140, 8, 20, 2.5, 7, 2, 50),
  "haricots rouges": f("legumineuse", 120, 8, 17, 0.5, 7, 2, 40),
  "haricots blancs": f("legumineuse", 120, 8, 17, 0.5, 7, 2, 60),
  flageolet: f("legumineuse", 120, 8, 17, 0.5, 7, 2, 50),
  tofu: f("legumineuse", 120, 13, 2, 7, 1, 2.5, 200),
  "protéine de soja": f("legumineuse", 340, 50, 30, 1, 18, 9, 240),

  // Féculents -------------------------------------------------------------------
  // Secs, tels qu'on les pèse avant cuisson…
  riz: f("feculent", 350, 7, 78, 0.6, 1.4, 1, 10),
  "riz basmati": f("feculent", 350, 8, 77, 0.9, 1.4, 1, 10),
  pâtes: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  spaghetti: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  tagliatelle: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  penne: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  mafaldine: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  lasagne: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20, 14),
  orzo: f("feculent", 355, 12, 71, 1.5, 3, 1.3, 20),
  nouille: f("feculent", 350, 11, 71, 1.5, 2.5, 1.2, 20),
  // … et cuits, quand la recette le précise : trois fois moins dense
  "riz cuit": f("feculent", 130, 2.7, 28, 0.3, 0.5, 0.4, 5),
  "riz basmati cuit": f("feculent", 130, 2.9, 28, 0.4, 0.5, 0.4, 5),
  "pâtes cuites": f("feculent", 140, 5, 27, 0.9, 1.5, 0.6, 10),
  "quinoa cuit": f("feculent", 120, 4.4, 21, 1.9, 2.8, 1.5, 17),
  "boulgour cuit": f("feculent", 110, 4, 21, 0.3, 4, 1, 10),
  "semoule cuite": f("feculent", 110, 4, 23, 0.2, 1.4, 0.4, 8),
  "lentilles cuites": f("legumineuse", 115, 9, 17, 0.4, 8, 3.3, 20),
  udon: f("feculent", 350, 10, 73, 1, 2, 1, 20),
  ramen: f("feculent", 360, 10, 70, 3, 2, 1, 20),
  spaetzle: f("feculent", 350, 12, 70, 2, 3, 1.3, 20),
  gnocchi: f("feculent", 160, 4, 32, 1, 2, 0.6, 20),
  semoule: f("feculent", 350, 12, 72, 1.5, 3, 1.2, 20),
  quinoa: f("feculent", 370, 14, 59, 6, 7, 4.5, 50),
  boulgour: f("feculent", 340, 12, 64, 1.5, 8, 2.5, 35),
  polenta: f("feculent", 360, 8, 77, 1.5, 2, 1, 10),
  "pomme de terre": f("feculent", 80, 2, 17, 0.2, 2, 0.5, 10, 150),
  "patate douce": f("feculent", 90, 1.6, 20, 0.1, 3, 0.6, 30, 200),
  pain: f("feculent", 265, 9, 49, 3, 3, 1.5, 30),
  baguette: f("feculent", 265, 9, 49, 3, 3, 1.5, 30, 250),
  tortilla: f("feculent", 300, 8, 50, 7, 3, 1.5, 40, 50),
  wrap: f("feculent", 300, 8, 50, 7, 3, 1.5, 40, 50),
  farine: f("feculent", 350, 10, 73, 1, 3, 1.2, 20),
  "farine d'avoine": f("feculent", 380, 13, 60, 7, 10, 4, 50),
  "flocons d'avoine": f("feculent", 380, 13, 60, 7, 10, 4, 50),
  "farine de riz": f("feculent", 360, 6, 80, 1, 2, 0.4, 10),
  chapelure: f("feculent", 350, 12, 70, 3, 4, 1.5, 30),
  "pâte feuilletée": f("feculent", 400, 6, 36, 26, 2, 1, 20),
  "pâte brisée": f("feculent", 450, 6, 45, 28, 2, 1, 20),
  "pâte à pizza": f("feculent", 270, 8, 50, 3, 2, 1.2, 20),
  "fécule de maïs": f("feculent", 350, 0.3, 86, 0, 0, 0.1, 2),

  // Légumes ---------------------------------------------------------------------
  carotte: f("legume", 35, 0.8, 7, 0.2, 2.8, 0.3, 35, 100),
  courgette: f("legume", 20, 1.2, 2.5, 0.3, 1.1, 0.4, 20, 250),
  tomate: f("legume", 20, 0.8, 3, 0.2, 1.2, 0.3, 10, 120),
  "tomates concassées": f("legume", 30, 1.2, 5, 0.2, 1.2, 0.8, 25),
  "pulpe de tomate": f("legume", 30, 1.2, 5, 0.2, 1.2, 0.8, 25),
  "coulis de tomate": f("legume", 30, 1.2, 5, 0.2, 1.2, 0.8, 25),
  "sauce tomate": f("legume", 40, 1.2, 7, 0.5, 1.2, 0.8, 25),
  "concentré de tomate": f("legume", 90, 4, 16, 0.5, 4, 2.5, 40),
  "tomate cerise": f("legume", 20, 0.9, 3, 0.2, 1.2, 0.3, 10, 10),
  oignon: f("legume", 35, 1.2, 6, 0.2, 1.7, 0.3, 25, 120),
  "oignon nouveau": f("legume", 30, 1.8, 4, 0.2, 2, 1.5, 70, 15),
  échalote: f("legume", 40, 1.5, 7, 0.2, 2, 0.6, 35, 30),
  ail: f("legume", 130, 6, 25, 0.5, 2, 1.7, 180, 5),
  poivron: f("legume", 25, 1, 4, 0.3, 1.8, 0.4, 10, 150),
  aubergine: f("legume", 25, 1, 3, 0.2, 2.5, 0.3, 10, 300),
  brocoli: f("legume", 35, 3, 4, 0.4, 3, 0.7, 50, 500),
  "chou-fleur": f("legume", 25, 2, 3, 0.3, 2.5, 0.4, 25, 700),
  chou: f("legume", 30, 1.5, 4, 0.2, 2.5, 0.5, 45),
  "chou rouge": f("legume", 30, 1.4, 5, 0.2, 2.5, 0.5, 45),
  épinard: f("legume", 25, 2.7, 1.5, 0.4, 2, 2.7, 100),
  "pousse d'épinard": f("legume", 25, 2.7, 1.5, 0.4, 2, 2.7, 100),
  champignon: f("legume", 25, 3, 1, 0.3, 1.5, 0.5, 5, 20),
  poireau: f("legume", 30, 1.5, 5, 0.3, 2.5, 0.6, 50, 150),
  courge: f("legume", 35, 1, 7, 0.1, 2, 0.5, 30),
  butternut: f("legume", 35, 1, 7, 0.1, 2, 0.5, 30, 900),
  potiron: f("legume", 30, 1, 6, 0.1, 2, 0.5, 25),
  céleri: f("legume", 20, 0.7, 2, 0.2, 1.6, 0.3, 40),
  concombre: f("legume", 15, 0.6, 2, 0.1, 0.7, 0.2, 15, 300),
  "haricot vert": f("legume", 30, 1.8, 4, 0.2, 3, 0.8, 50),
  "petits pois": f("legume", 80, 5.4, 11, 0.4, 5, 1.5, 25),
  salade: f("legume", 15, 1.2, 1.5, 0.2, 1.3, 0.7, 35),
  roquette: f("legume", 25, 2.6, 2, 0.7, 1.6, 1.5, 160),
  avocat: f("legume", 160, 2, 2, 15, 7, 0.6, 12, 150),
  "maïs doux": f("legume", 95, 3, 19, 1.2, 2.5, 0.5, 5),
  maïs: f("legume", 95, 3, 19, 1.2, 2.5, 0.5, 5),
  gingembre: f("legume", 80, 1.8, 15, 0.8, 2, 0.6, 16, 30),
  radis: f("legume", 20, 0.7, 2, 0.1, 1.6, 0.3, 25, 15),
  betterave: f("legume", 45, 1.6, 9, 0.2, 2.8, 0.8, 20, 150),
  navet: f("legume", 25, 0.9, 4, 0.1, 2, 0.3, 30, 150),
  fenouil: f("legume", 30, 1.2, 4, 0.2, 3, 0.7, 50, 300),
  "piment frais": f("legume", 40, 2, 7, 0.4, 1.5, 1, 15, 10),

  // Fruits ----------------------------------------------------------------------
  citron: f("fruit", 30, 1, 3, 0.3, 2, 0.5, 25, 100),
  "citron vert": f("fruit", 30, 0.7, 3, 0.2, 2, 0.6, 30, 70),
  banane: f("fruit", 90, 1.1, 20, 0.3, 2.6, 0.3, 6, 120),
  pomme: f("fruit", 55, 0.3, 12, 0.2, 2, 0.1, 5, 150),
  poire: f("fruit", 55, 0.4, 12, 0.1, 3, 0.2, 10, 160),
  ananas: f("fruit", 50, 0.5, 11, 0.1, 1.4, 0.3, 15),
  framboise: f("fruit", 50, 1.2, 6, 0.6, 6.5, 0.7, 25),
  fraise: f("fruit", 35, 0.7, 6, 0.3, 2, 0.4, 20),
  myrtille: f("fruit", 55, 0.7, 12, 0.3, 3, 0.3, 10),
  mangue: f("fruit", 60, 0.8, 14, 0.4, 1.6, 0.2, 10, 300),
  orange: f("fruit", 45, 1, 9, 0.2, 2, 0.1, 40, 180),
  raisin: f("fruit", 70, 0.6, 16, 0.2, 1, 0.3, 15),
  datte: f("fruit", 280, 2, 65, 0.4, 7, 1, 40, 8),
  abricot: f("fruit", 50, 0.9, 10, 0.2, 2, 0.4, 15, 50),

  // Noix et graines --------------------------------------------------------------
  amande: f("noix", 600, 21, 7, 53, 12, 3.7, 250),
  "poudre d'amande": f("noix", 600, 21, 7, 53, 12, 3.7, 250),
  noix: f("noix", 650, 15, 7, 63, 6, 2.6, 90),
  "noix de cajou": f("noix", 580, 18, 27, 44, 3, 6, 40),
  cacahuète: f("noix", 600, 25, 12, 50, 6, 2.5, 60),
  "beurre de cacahuète": f("noix", 600, 25, 12, 50, 6, 2, 50),
  "graines de sésame": f("noix", 570, 18, 10, 50, 11, 10, 980),
  sésame: f("noix", 570, 18, 10, 50, 11, 10, 980),
  "pignon de pin": f("noix", 670, 14, 4, 68, 4, 5.5, 20),
  "graines de courge": f("noix", 570, 30, 10, 45, 6, 9, 50),
  "graines de tournesol": f("noix", 580, 20, 11, 50, 9, 5, 80),
  "noix de coco": f("noix", 350, 3.3, 15, 33, 9, 2, 15),
  noisette: f("noix", 630, 15, 7, 60, 10, 4.7, 115),
  tahini: f("noix", 600, 17, 10, 54, 9, 9, 420),

  // Matières grasses -------------------------------------------------------------
  huile: f("matiere-grasse", 900, 0, 0, 100),
  "huile d'olive": f("matiere-grasse", 900, 0, 0, 100),
  "huile de colza": f("matiere-grasse", 900, 0, 0, 100),
  "huile de sésame": f("matiere-grasse", 900, 0, 0, 100),
  "huile de tournesol": f("matiere-grasse", 900, 0, 0, 100),
  margarine: f("matiere-grasse", 720, 0.2, 0.7, 80),
  olive: f("matiere-grasse", 150, 1, 1, 15, 3, 1, 90),

  // Sucres et sucré ---------------------------------------------------------------
  sucre: f("sucre", 400, 0, 100, 0),
  cassonade: f("sucre", 390, 0, 98, 0),
  "sucre perlé": f("sucre", 400, 0, 100, 0),
  "sucre vanillé": f("sucre", 400, 0, 100, 0),
  miel: f("sucre", 320, 0.4, 80, 0),
  "sirop d'érable": f("sucre", 260, 0, 67, 0),
  sirop: f("sucre", 260, 0, 65, 0),
  chocolat: f("sucre", 550, 7, 45, 35, 10, 10, 60),
  "pépites de chocolat": f("sucre", 520, 5, 60, 30, 6, 6, 50),
  cacao: f("sucre", 350, 20, 14, 21, 30, 13, 110),
  confiture: f("sucre", 270, 0.4, 65, 0, 1, 0.3, 15),
  "pâte à tartiner": f("sucre", 540, 6, 57, 31, 4, 4, 110),
  "lait concentré sucré": f("sucre", 330, 8, 55, 8, 0, 0.2, 280),

  // Condiments, aromates, liquides de cuisson -------------------------------------
  sel: f("condiment", 0, 0, 0, 0),
  poivre: f("condiment", 250, 10, 40, 3, 25, 10, 400),
  eau: f("condiment", 0, 0, 0, 0),
  "sauce soja": f("condiment", 60, 6, 6, 0, 0, 2, 20),
  "nuoc mam": f("condiment", 50, 8, 4, 0, 0, 1, 40),
  "sauce worcestershire": f("condiment", 80, 0, 19, 0, 0, 0.9, 25),
  "sauce aigre-douce": f("condiment", 150, 0.5, 36, 0.2, 0, 0.3, 10),
  sriracha: f("condiment", 100, 2, 19, 1, 2, 1, 20),
  harissa: f("condiment", 120, 3, 10, 7, 5, 2, 30),
  moutarde: f("condiment", 150, 8, 5, 11, 4, 2, 60),
  ketchup: f("condiment", 100, 1.2, 23, 0.1, 1, 0.5, 15),
  mayonnaise: f("condiment", 700, 1, 2, 76, 0, 0.2, 10),
  vinaigre: f("condiment", 20, 0, 0.5, 0, 0, 0.2, 5),
  "vinaigre balsamique": f("condiment", 90, 0.5, 17, 0, 0, 0.7, 25),
  "vinaigre de riz": f("condiment", 25, 0, 1, 0, 0, 0.2, 5),
  bouillon: f("condiment", 10, 0.5, 1, 0.2, 0, 0.1, 5),
  "cube de bouillon": f("condiment", 220, 10, 20, 12, 0, 1, 30, 10),
  "vin rouge": f("condiment", 80, 0.1, 2, 0, 0, 0.5, 8),
  "vin blanc": f("condiment", 80, 0.1, 2, 0, 0, 0.3, 10),
  pesto: f("condiment", 450, 5, 5, 45, 2, 1.5, 200),
  miso: f("condiment", 200, 12, 26, 6, 5, 2.5, 60),
  "levure chimique": f("condiment", 100, 0, 25, 0, 0, 0.5, 2000),
  "bicarbonate de soude": f("condiment", 0, 0, 0, 0),
  "levure de boulanger": f("condiment", 320, 40, 20, 6, 20, 5, 30),
  "herbes de provence": f("condiment", 250, 9, 45, 7, 30, 30, 1500),
  origan: f("condiment", 265, 9, 50, 4, 42, 36, 1600),
  thym: f("condiment", 275, 9, 45, 7, 37, 124, 1890),
  laurier: f("condiment", 310, 7, 75, 8, 26, 43, 830),
  romarin: f("condiment", 330, 5, 64, 15, 42, 29, 1280),
  basilic: f("condiment", 25, 3, 2, 0.6, 1.6, 3, 180),
  persil: f("condiment", 35, 3, 4, 0.8, 3, 6, 140),
  persillade: f("condiment", 60, 3, 5, 3, 3, 5, 150),
  coriandre: f("condiment", 25, 2, 2, 0.5, 2.8, 1.8, 70),
  ciboulette: f("condiment", 30, 3, 2, 0.7, 2.5, 1.6, 90),
  menthe: f("condiment", 45, 3, 6, 0.7, 7, 5, 200),
  aneth: f("condiment", 45, 3.5, 4, 1, 2, 6.6, 210),
  estragon: f("condiment", 300, 23, 42, 7, 7, 32, 1140),
  paprika: f("condiment", 280, 14, 34, 13, 35, 21, 230),
  cumin: f("condiment", 375, 18, 32, 22, 11, 66, 930),
  curcuma: f("condiment", 310, 10, 45, 3, 22, 41, 180),
  curry: f("condiment", 325, 13, 36, 14, 33, 30, 480),
  cannelle: f("condiment", 250, 4, 55, 1.2, 53, 8, 1000),
  muscade: f("condiment", 525, 6, 28, 36, 21, 3, 180),
  "quatre-épices": f("condiment", 300, 6, 50, 9, 25, 7, 650),
  "flocons de piment": f("condiment", 320, 12, 50, 17, 27, 8, 150),
  citronnelle: f("condiment", 100, 1.8, 25, 0.5, 4, 8, 65),
  gélatine: f("condiment", 340, 86, 0, 0, 0, 0.5, 50),
  zeste: f("condiment", 45, 1.5, 9, 0.3, 10, 0.8, 130),

  // Compléments relevés par scripts/check-nutrition.ts ----------------------------
  piment: f("condiment", 40, 2, 7, 0.4, 1.5, 1, 15, 10),
  "piment de cayenne": f("condiment", 320, 12, 50, 17, 27, 8, 150),
  "piment d'espelette": f("condiment", 320, 12, 50, 17, 27, 8, 150),
  maïzena: f("feculent", 350, 0.3, 86, 0, 0, 0.1, 2),
  "kub or": f("condiment", 220, 10, 20, 12, 0, 1, 30, 10),
  "bouquet garni": f("condiment", 250, 9, 45, 7, 30, 30, 1500, 5),
  pancetta: f("viande", 300, 15, 1, 27, 0, 0.8, 10),
  gomasio: f("noix", 500, 16, 12, 44, 10, 9, 850),
  béchamel: f("laitier", 120, 4, 9, 7, 0.3, 0.2, 120),
  "petits suisses": f("laitier", 110, 9, 3, 7, 0, 0.1, 110, 60),
  "crème légère": f("laitier", 110, 3, 4, 9, 0, 0, 100),
  "crème végétale": f("matiere-grasse", 170, 1, 3, 17, 0, 0.3, 15),
  "yaourt à la grecque": f("laitier", 130, 5, 4, 10, 0, 0.1, 120, 125),
  "pak choï": f("legume", 15, 1.5, 1, 0.2, 1, 0.8, 100, 200),
  laitue: f("legume", 15, 1.2, 1.5, 0.2, 1.3, 0.7, 35),
  vergeoise: f("sucre", 390, 0, 97, 0),
  "whey protéine": f("laitier", 380, 75, 10, 5, 0, 1, 400),
  "arôme vanille": f("condiment", 290, 0, 13, 0, 0, 0.1, 10),
  "tartare végétal": f("laitier", 230, 3, 4, 22, 0, 0.3, 60),
  "za'atar": f("condiment", 280, 10, 40, 10, 25, 20, 900),
  gochujang: f("condiment", 220, 5, 45, 2, 3, 2, 30),
  "levure sèche de boulanger": f("condiment", 320, 40, 20, 6, 20, 5, 30, 8),
};

/** Table indexée par la même clé normalisée que la liste de courses. */
export const FOODS = new Map(Object.entries(TABLE).map(([name, food]) => [ingredientKey(name), food]));

/** Clés de la plus longue à la plus courte : « lait de coco » doit gagner sur « lait ». */
const KEYS = [...FOODS.keys()].sort((a, b) => b.length - a.length);

/** Trouve l'aliment de base d'un ingrédient (« escalope de poulet » → poulet). */
export function matchFood(name: string): Food | null {
  const k = ingredientKey(name);
  const exact = FOODS.get(k);
  if (exact) return exact;
  const hit = KEYS.find((key) => k.startsWith(`${key} `) || k.endsWith(` ${key}`) || k.includes(` ${key} `));
  return hit ? (FOODS.get(hit) ?? null) : null;
}

/** Poids approché des unités de cuisine, en grammes. */
const UNIT_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  ml: 1,
  cl: 10,
  dl: 100,
  l: 1000,
  "c. à s.": 15,
  "c. à c.": 5,
  pincée: 0.5,
  tranche: 25,
  sachet: 8,
  boîte: 400,
  brique: 200,
  pot: 125,
  cube: 10,
  bouquet: 25,
  botte: 100,
  brin: 3,
  branche: 3,
  feuille: 1,
  poignée: 25,
  filet: 5,
  morceau: 30,
  verre: 200,
  cm: 8,
};

/**
 * Unités qui comptent des objets plutôt qu'un poids : le poids de l'aliment
 * l'emporte quand on le connaît (une feuille de lasagne pèse 14 g, une feuille
 * de laurier 1 g), sinon on prend la valeur générique ci-dessus.
 */
const COUNTING = new Set(["gousse", "tranche", "feuille", "morceau", "filet", "poignée", "brin", "branche", "bouquet", "botte", "sachet", "cube", "pot", "brique", "verre"]);

/** Poids retenu quand la recette compte en pièces sans qu'on connaisse l'aliment. */
const DEFAULT_PIECE = 100;

/** Poids en grammes d'une quantité d'ingrédient (null si la recette ne la chiffre pas). */
export function gramsOf(quantity: number | null, unit: string, food: Food | null): number | null {
  if (quantity == null) return null;
  // Les unités arrivent parfois au pluriel (« 8 feuilles », « 2 brins »)
  const raw = unit.trim().toLowerCase();
  const u = UNIT_GRAMS[raw] != null || COUNTING.has(raw) ? raw : raw.replace(/s$/, "");
  if (!u) return quantity * (food?.piece ?? DEFAULT_PIECE);
  if (COUNTING.has(u)) return quantity * (food?.piece ?? UNIT_GRAMS[u] ?? DEFAULT_PIECE);
  return quantity * (UNIT_GRAMS[u] ?? food?.piece ?? DEFAULT_PIECE);
}
