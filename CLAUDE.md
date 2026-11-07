# Batch cooking — repères pour Claude Code

Planificateur de batch cooking pour un foyer : on cuisine le dimanche pour les
10 repas de la semaine (midi et soir, lundi à vendredi), seul·e ou à plusieurs.

L'app résout quatre problèmes à la fois : choisir des plats qui plaisent à
chacun, **qu'ils tiennent jusqu'à vendredi**, en une seule liste de courses, et
dans une cuisine réelle (un four, quatre feux, deux paires de mains).

Pour une personne qui installe l'app sans coder, le guide est le `README.md`, et
`AIDE-CLAUDE.md` sert de contexte à un Claude sans accès au code.

## Démarrer sur une machine

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs (voir ci-dessous)
npm run dev
```

`.env.local` n'est pas dans git (c'est voulu). Où trouver les valeurs :

| Variable | Où la prendre |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Connect (ou Project Settings → Data API) → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable key** (jamais la `secret`) |
| `NEXT_PUBLIC_APP_NAME` | facultatif : nom affiché de l'app (défaut « Batch cooking ») |
| `NEXT_PUBLIC_APP_COLOR` | facultatif : couleur principale `#rrggbb` (défaut `#1f6b4a`) |
| `UNSPLASH_ACCESS_KEY` | facultatif : unsplash.com → Developers → votre application (photos des plats) |

Les mêmes variables doivent exister côté **Vercel** (Settings → Environment
Variables) ; les `NEXT_PUBLIC_*` sont figées au build, il faut redéployer après
les avoir changées.

## Base de données

Une base neuve se crée en collant `supabase/schema.sql` dans le **SQL Editor**
de Supabase. Pour faire évoluer une base en service, écrire un **nouveau** script
(`alter table … add column if not exists …`) plutôt que de modifier
`schema.sql`, et le noter ici : chaque foyer devra le lancer sur sa propre base.

Les règles d'accès (RLS) utilisent toujours `in (select public.my_household_ids())`,
calculé une fois par requête : une fonction appelée ligne par ligne rend l'app
lente dès quelques centaines d'ingrédients.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement (port 3000) |
| `npm test` | tests unitaires (parsing des recettes, unités, photos ; ceux qui demandent des recettes ne tournent que si `src/data/starter-recipes.json` en contient) |
| `npm run lint` / `npm run build` | ESLint / build de production |

## Conventions

- **Tout est en français** : code, commentaires, noms de variables métier, UI.
- **Prettier, largeur 200** (`npx prettier --print-width 200 --end-of-line crlf`).
  Pas de fichier de config : ne pas lancer prettier sans ce réglage, sa valeur
  par défaut (80) casserait le style de tout le projet.
- Les commentaires expliquent **pourquoi**, pas quoi. Ils sont rares et vont droit au but.
- Mobile d'abord : `max-w-md` centré, cibles tactiles `min-h-11`, `aria-*` systématiques.
- Tailwind v4 avec `@theme` dans `globals.css` et des classes maison
  (`.card`, `.field`, `.btn-primary`, `.chip`, `.skeleton`, `.rise`).
- Le nom et la couleur de l'app passent par `src/lib/brand.ts`, jamais en dur.

## Règles métier à connaître

- Le batch a lieu **le dimanche** : lundi = J+1, vendredi = J+5. Un plat tient
  s'il est congelable ou si `fridge_days >= jour + 1`.
- `plan_meals.day` va de 0 (lundi) à 4 (vendredi), `slot` vaut `midi`, `soir` ou
  `extra` (en plus des 10 créneaux, cuisiné une fois).
- `plan_meals.eaters` : les personnes qui mangent ce plat à ce créneau. Un créneau
  peut avoir une ligne par personne ; vide = tout le foyer.
- **Une personne n'est pas un compte** : `household_people.user_id` est
  nullable. On planifie pour des mangeurs ; un compte vient se rattacher plus
  tard à une personne existante via le code d'invitation.
- Les quantités sont à l'échelle des parts (une par mangeur) / `recipe.servings`,
  sauf les extras, cuisinés une fois.
- Les aliments secs de la table nutritionnelle sont comptés **crus** (riz,
  pâtes, lentilles), les conserves **égouttées**.

## Organisation

- `src/lib/planner/` — `generate.ts` (plats partagés ou individuels choisis par
  score : envies, placard, matériel, anti-répétition, charge du four, équilibre ;
  placement par date limite, sans plat périmé), `schedule.ts` (ordonnancement
  glouton du batch par chemin critique), `shopping.ts` (fusion des ingrédients,
  parts par mangeur), `mood.ts` (envie écrite → tags et ingrédients).
- `src/lib/nutrition/` — `foods.ts` est la table des valeurs pour 100 g, `analyze.ts`
  en déduit les apports. Une recette aux quantités incomplètes n'affiche **aucun chiffre**.
- `src/lib/import/` — lecture de recettes collées en texte (`parse-text-recipe.ts`)
  et des pages web en JSON-LD (`parse-recipe.ts`). `fetch-page.ts` protège du SSRF.
- `src/lib/images/photo.ts` — recherche d'une photo chez Unsplash, enregistrée
  une fois sur la recette. Aucune requête pendant la navigation.
- `src/app/actions.ts` — toutes les écritures passent par là.
- `src/lib/data.ts` — toutes les lectures. **Ne pas appeler `getRecipes()` depuis
  une page** : c'est toute la bibliothèque. Utiliser `getRecipeSummaries()`,
  `getPlanRecipes()` ou `getRecipeFacets()` selon le besoin.
- `src/data/starter-recipes.json` — recettes ajoutées à la création d'un foyer
  (vide par défaut).

## Limites connues

- `getLatestPlan()` prend le `week_start` le plus grand : générer une semaine à
  l'avance masque la semaine en cours. Il n'y a pas d'historique navigable.
- Régénérer une semaine écrase l'ancienne et perd les cases cochées des courses.
- Le service d'e-mail intégré de Supabase n'écrit qu'aux membres du projet :
  sans SMTP, « mot de passe oublié » ne marche que pour eux.
