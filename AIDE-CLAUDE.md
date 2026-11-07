# Pour Claude : aider à installer et adapter cette app

> Ce fichier t'est joint par une personne qui installe sa propre version de l'app « Batch
> cooking ». **Elle ne code pas** et son nombre de messages avec toi est limité.
>
> **Comment répondre :**
> - en français, sans jargon, avec des phrases courtes ;
> - **va droit au but** : identifie son étape et son problème, donne la solution en une seule
>   réponse, avec les clics exacts (« menu de gauche → … → bouton … ») ;
> - une liste numérotée si plusieurs actions, et ce qu'elle doit voir quand c'est réussi ;
> - ne pose une question que si c'est indispensable, et une seule à la fois ;
> - ne lui fais **jamais** partager une clé `secret` / `service_role` ni un mot de passe.

---

## L'app en bref

Planificateur de batch cooking : on cuisine une fois (le dimanche) les repas du lundi au
vendredi, midi et soir, pour une ou plusieurs personnes. L'app choisit les plats selon les
goûts, vérifie qu'ils tiennent jusqu'à leur repas (sinon congélateur), fait la liste de courses
(synchronisée entre téléphones) et un guide de préparation selon le matériel du foyer.

Écrans : Connexion, Créer / rejoindre un foyer (code d'invitation), Ma semaine, Générer
(automatique, ou « Selon une envie » : recherche dans ses recettes, puis pour qui et quand),
Recettes (ajout par lien, texte collé ou saisie), Courses, Prep, Placard, Foyer.

Aucune recette n'est fournie : chacun ajoute les siennes.

## Comment elle l'installe (README du dépôt)

Tout se fait dans le navigateur, rien à installer sur l'ordinateur.

1. **Supabase** : nouveau projet (région West EU – Paris), coller `supabase/schema.sql` dans
   **SQL Editor** → **Run** (« Success. No rows returned »), désactiver **Authentication → Sign In /
   Providers → Email → Confirm email**, noter l'URL du projet et la **Publishable key**
   (`sb_publishable_…`).
2. **Vercel** : bouton « Deploy » du README → crée sa copie GitHub → coller
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → **Deploy** → noter
   l'adresse `….vercel.app` (Domains).
3. **Supabase → Authentication → URL Configuration** : Site URL = l'adresse de l'app ; Redirect
   URLs = l'adresse suivie de `/**`.
4. **Téléphone** : ouvrir l'adresse, « Sur l'écran d'accueil » (Safari) ou « Installer
   l'application » (Chrome), créer son compte puis son foyer. Les autres membres choisissent
   « Rejoindre » avec le code d'invitation (page Foyer).

## Problèmes connus et solutions

| Symptôme | Cause | Solution |
| --- | --- | --- |
| `must be owner of table …` dans le SQL Editor | script lancé avec un autre rôle | choisir le rôle **postgres** à côté de **Run**, relancer |
| `relation "…" already exists` | script déjà lancé | rien à faire |
| page blanche, erreur au chargement | variables Vercel absentes ou fausses | Vercel → Settings → Environment Variables : vérifier les deux valeurs, puis Deployments → ⋯ → **Redeploy** |
| « E-mail ou mot de passe incorrect » après inscription | confirmation d'e-mail activée | désactiver « Confirm email », recréer le compte |
| app très lente | base et serveur sur deux continents | éditer `vercel.json` sur GitHub (crayon ✏️) : remplacer `cdg1` par la région Supabase (`fra1` Francfort, `dub1` Irlande, `lhr1` Londres, `iad1` USA), **Commit changes** |
| e-mail « mot de passe oublié » jamais reçu | le service d'e-mail intégré de Supabase n'écrit qu'aux membres du projet Supabase | brancher un SMTP (Authentication → Emails → SMTP Settings, par ex. Brevo), ou débloquer en SQL : `update auth.users set encrypted_password = extensions.crypt('Nouveau', extensions.gen_salt('bf')) where email = '…';` |
| ancienne version sur le téléphone | cache de l'app installée | fermer complètement l'app et la rouvrir |
| import d'une recette par lien vide | le site ne publie pas de données de recette | « Coller un texte » à la place |

## Personnaliser sans coder

- Nom de l'app : variable Vercel `NEXT_PUBLIC_APP_NAME`. Couleur : `NEXT_PUBLIC_APP_COLOR`
  (code `#rrggbb`). Puis **Redeploy**.
- Photos des plats (facultatif) : variable `UNSPLASH_ACCESS_KEY` (clé gratuite sur
  unsplash.com/developers), puis **Redeploy**.
- Personnes, goûts, matériel, placard, recettes : tout se règle dans l'app.

## Si elle veut modifier un petit quelque chose dans le code

Elle n'a pas d'outil de développement : elle modifie un fichier **sur le site GitHub** (ouvrir
le fichier dans son dépôt → crayon ✏️ → modifier → **Commit changes**). Vercel remet l'app en
ligne en une minute. Donne-lui alors **le chemin exact du fichier**, **le texte exact à chercher**
(Ctrl+F) et **le texte qui le remplace**, rien de plus. Si la modification touche plus de deux
endroits, dis-lui honnêtement que c'est un travail pour Claude Code (abonnement payant) ou pour
quelqu'un qui code.

Fichiers utiles pour de petites modifications :

| Pour changer… | Fichier |
| --- | --- |
| les envies proposées (tags), les « n'aime pas » et le placard fréquents, les couleurs des personnes | `src/lib/tags.ts` |
| le catalogue du matériel de cuisine | `src/lib/equipment.ts` |
| les rayons de la liste de courses, les jours, les catégories | `src/lib/types.ts` |
| les mots compris par « Selon une envie » (« réconfortant » → comfort food…) | `src/lib/planner/mood.ts` |
| les textes de la page de connexion | `src/app/connexion/LoginForm.tsx` |

Règles à respecter dans le code : tout est en français ; le batch a lieu le dimanche (lundi =
J+1) ; `plan_meals.day` va de 0 (lundi) à 4 (vendredi) ; `slot` vaut `midi`, `soir` ou `extra`.
Plus de détails techniques dans `CLAUDE.md`.
