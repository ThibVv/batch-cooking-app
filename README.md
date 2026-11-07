# Batch cooking

Une app pour préparer ses repas de la semaine en une seule fois, seul·e ou à plusieurs :
elle choisit les plats (ou vous les choisissez selon vos envies), vérifie qu'ils tiennent
jusqu'au vendredi, fait **une seule liste de courses** et un **guide de préparation**
adapté à votre cuisine.

Elle s'installe sur le téléphone comme une vraie app. Ce mode d'emploi permet d'avoir
**votre propre version**, à vous, sans écrire une ligne de code ni rien installer sur
votre ordinateur. Comptez une vingtaine de minutes, sur un ordinateur.

> Bloqué·e à une étape ? Voir [« Ça ne marche pas »](#ça-ne-marche-pas) en bas de la page,
> ou demandez à Claude avec le fichier [`AIDE-CLAUDE.md`](AIDE-CLAUDE.md) (mode d'emploi à la fin).

---

## Ce qu'il vous faut

Trois comptes gratuits. Le plus simple : créer d'abord GitHub, puis se connecter aux deux
autres **avec GitHub** (bouton « Continue with GitHub »).

| Service | À quoi il sert | Créer le compte |
| --- | --- | --- |
| GitHub | garde votre copie de l'app | <https://github.com/signup> |
| Supabase | la base de données (vos recettes, vos semaines, les comptes) | <https://supabase.com/dashboard/sign-up> |
| Vercel | met l'app en ligne, à votre adresse | <https://vercel.com/signup> (choisir « Hobby ») |

---

## Étape 1 — Créer la base de données (Supabase)

1. Sur <https://supabase.com/dashboard>, cliquez **New project**.
2. Remplissez :
   - **Name** : ce que vous voulez (par ex. `batch-cooking`) ;
   - **Database Password** : cliquez « Generate a password » (vous n'en aurez pas besoin ensuite) ;
   - **Region** : **West EU (Paris)** ← important pour que l'app soit rapide.
3. Cliquez **Create new project** et attendez une à deux minutes que le projet soit prêt.
4. Ouvrez le fichier [`supabase/schema.sql`](supabase/schema.sql) de ce dépôt et copiez tout son
   contenu (sur GitHub : bouton **Copy raw file**, les deux petits carrés en haut à droite du fichier).
5. Dans Supabase, menu de gauche **SQL Editor** → collez → bouton **Run**.
   - ✅ Vous devez voir **« Success. No rows returned »**.
6. Toujours dans Supabase, menu de gauche **Authentication** → **Sign In / Providers** → **Email** :
   **désactivez « Confirm email »** puis **Save**. (Sinon il faudrait confirmer chaque compte par e-mail.)
7. Récupérez deux valeurs (bouton **Connect** en haut de la page, ou **Project Settings → API Keys**) et
   gardez-les sous la main, par exemple dans une note :
   - l'**URL du projet**, qui ressemble à `https://abcdefgh.supabase.co` ;
   - la **Publishable key**, qui commence par `sb_publishable_…`.
   - ⚠️ Jamais la clé **secret** / **service_role** : elle ne doit aller nulle part.

## Étape 2 — Mettre l'app en ligne (Vercel)

1. Cliquez sur ce bouton :

   [![Déployer sur Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FThibVv%2Fbatch-cooking-app&project-name=batch-cooking&repository-name=batch-cooking&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY&envDescription=Les%20deux%20valeurs%20not%C3%A9es%20%C3%A0%20l%27%C3%A9tape%201%20(URL%20du%20projet%20Supabase%20et%20Publishable%20key)&envLink=https%3A%2F%2Fgithub.com%2FThibVv%2Fbatch-cooking-app%23%C3%A9tape-1--cr%C3%A9er-la-base-de-donn%C3%A9es-supabase)

2. Connectez-vous avec GitHub si on vous le demande. Vercel crée **votre propre copie** de l'app
   dans votre GitHub (vous pouvez changer son nom).
3. Vercel demande deux valeurs : collez celles de l'étape 1.
   - `NEXT_PUBLIC_SUPABASE_URL` → l'URL du projet ;
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` → la Publishable key.
4. Cliquez **Deploy** et attendez une à deux minutes.
   - ✅ Des confettis 🎉 : c'est en ligne. Cliquez **Continue to Dashboard**.
5. Notez l'adresse de votre app : sur le tableau de bord du projet, dans **Domains**, la première
   adresse (par ex. `https://batch-cooking-xyz.vercel.app`).

## Étape 3 — Relier les deux (Supabase)

Dans Supabase → **Authentication** → **URL Configuration** :

- **Site URL** : l'adresse de votre app (étape 2.5) → **Save** ;
- **Redirect URLs** → **Add URL** : la même adresse suivie de `/**`
  (par ex. `https://batch-cooking-xyz.vercel.app/**`) → **Save**.

## Étape 4 — L'installer et commencer

1. Ouvrez l'adresse de votre app **sur votre téléphone** :
   - **iPhone** : dans **Safari** → bouton Partager → **Sur l'écran d'accueil** ;
   - **Android** : dans **Chrome** → menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
2. Ouvrez l'app depuis l'écran d'accueil → **Créer un compte**.
3. Créez votre **foyer** : qui mange, les goûts de chacun, votre matériel de cuisine.
4. Ajoutez vos recettes : **Recettes → Nouvelle recette**. Trois façons :
   - **Depuis un lien** : collez l'adresse d'une recette sur un site de cuisine ;
   - **Coller un texte** : copiez une recette depuis vos notes ou un document ;
   - **Saisir** à la main.
5. **Générer** : laissez l'app choisir vos plats, ou composez la semaine « Selon une envie ».

**Plusieurs personnes dans le foyer ?** Les autres créent leur compte sur la même adresse,
choisissent **Rejoindre un foyer**, tapent le **code d'invitation** (page **Foyer** de la
première personne) et se reconnaissent dans la liste.

---

## Personnaliser

| Quoi | Où |
| --- | --- |
| Les personnes, leurs goûts, le matériel | dans l'app, page **Foyer** |
| Les recettes | dans l'app, page **Recettes** |
| Le **nom** de l'app | Vercel → votre projet → **Settings → Environment Variables** → ajoutez `NEXT_PUBLIC_APP_NAME` (par ex. `Popote`) |
| La **couleur** principale | même endroit : `NEXT_PUBLIC_APP_COLOR` avec un code couleur (par ex. `#c2410c`) |

Après avoir ajouté ou changé une variable : Vercel → **Deployments** → les trois points du
premier déploiement → **Redeploy**. Sur le téléphone, fermez puis rouvrez l'app.

Facultatif — **photos des plats** : créez une clé gratuite sur <https://unsplash.com/developers>
(« New Application ») et ajoutez-la dans Vercel sous le nom `UNSPLASH_ACCESS_KEY`, puis Redeploy.

## Mises à jour

Votre copie est indépendante : elle ne change que si vous la modifiez. Toute modification de
votre dépôt GitHub (même faite depuis le site GitHub, avec le crayon ✏️ sur un fichier) est mise
en ligne automatiquement par Vercel en une minute.

---

## Ça ne marche pas

| Ce que vous voyez | Ce qu'il faut faire |
| --- | --- |
| Dans le SQL Editor : `must be owner of table …` | Le script a été lancé avec un autre rôle. À côté de **Run**, choisissez le rôle **postgres**, puis relancez. |
| Dans le SQL Editor : `relation "…" already exists` | Le script a déjà été lancé : rien à refaire, passez à la suite. |
| L'app affiche une erreur ou une page blanche | Vercel → **Settings → Environment Variables** : vérifiez les deux valeurs (pas d'espace en trop, l'URL commence par `https://`). Puis **Redeploy**. |
| « E-mail ou mot de passe incorrect » juste après l'inscription | « Confirm email » est encore activé (étape 1.6). Désactivez-le, puis créez le compte à nouveau. |
| L'app est très lente | Le projet Supabase n'est pas à Paris. Ouvrez le fichier `vercel.json` de votre dépôt GitHub (crayon ✏️), remplacez `cdg1` par la région de votre projet : `fra1` (Francfort), `dub1` (Irlande), `lhr1` (Londres), `iad1` (États-Unis), puis **Commit changes**. |
| « Mot de passe oublié » : l'e-mail n'arrive jamais | Le service d'e-mail fourni par Supabase n'écrit qu'aux membres de votre projet Supabase. Pour les autres, voir la question suivante. |
| Débloquer un mot de passe sans e-mail | Dans le SQL Editor, en remplaçant l'adresse et le mot de passe : `update auth.users set encrypted_password = extensions.crypt('NouveauMotDePasse', extensions.gen_salt('bf')) where email = 'adresse@exemple.fr';` |
| La recette importée depuis un lien est vide | Certains sites ne publient pas leurs recettes dans un format lisible. Utilisez **Coller un texte**. |
| Le téléphone affiche l'ancienne version | Fermez complètement l'app (depuis le sélecteur d'apps) et rouvrez-la. |

### Demander de l'aide à Claude

1. Téléchargez le fichier [`AIDE-CLAUDE.md`](AIDE-CLAUDE.md) (bouton **Download raw file**).
2. Dans une nouvelle conversation avec Claude, joignez-le et écrivez en une fois : à quelle étape
   vous êtes, ce que vous voyez (une capture d'écran aide beaucoup), et ce que vous vouliez faire.

---

<details>
<summary>Pour les développeurs</summary>

Next.js 16 (App Router), React 19, Tailwind CSS 4, Supabase (Postgres, Auth, Realtime, RLS),
Vitest. Détails techniques et règles métier : [`CLAUDE.md`](CLAUDE.md).

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
npm test
```

</details>
