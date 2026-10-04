# MIGRATION_NEON_AUDIT — POMME

Phase 0 — audit en lecture seule. Aucune ligne de code POMME n'a été modifiée.

Source auditée : `github.com/theoxbloodedit-boop1/Pomme` (branche par défaut, 1 commit `393f13a "Add files via upload"`).
Le dépôt ne contient **qu'un seul fichier** : `pomme-migrated.zip` (1,5 Mo). L'audit porte sur son contenu, extrait dans un dossier temporaire (137 fichiers hors `node_modules`).

---

## Constats critiques (à lire en premier)

| # | Constat | Statut |
|---|---|---|
| 1 | **Firebase n'existe pas dans ce code.** Aucune occurrence de `firebase`, `firestore`, `onAuthStateChanged`, `lib/firebase/`, ni de dépendance Firebase dans `package.json` / `pnpm-lock.yaml`. | [BLOCKED] — à confirmer par vous |
| 2 | **Aucune authentification utilisateur.** Il n'y a ni comptes, ni login, ni sessions. Le seul accès protégé est `/admin` (passphrase `ADMIN_TOKEN` + cookie haché). | Constat |
| 3 | **Neon est déjà utilisé côté serveur** (Drizzle + `pg`, `DATABASE_URL ?? POSTGRES_URL`) pour newsletter, événements, consentement, file d'emails. Le nom du zip (`pomme-migrated`) indique qu'une migration JSON → Postgres a déjà été faite. | [PARTIAL] |
| 4 | **Le dépôt GitHub ne contient pas le code source**, seulement le zip. Vercel ne peut pas builder ce dépôt tel quel. Soit le déploiement Vercel vient d'une autre source, soit il est cassé ou ancien. | [BLOCKED] |
| 5 | **L'intégration Neon n'est pas connectée à ce projet v0** (aucune variable d'environnement disponible). | [TODO] |
| 6 | `AUDIT.md` (dans le zip) est en partie **obsolète** : il dit que les données sont en fichiers JSON (§4) et mentionne un `proxy.ts` qui n'existe pas. Le code actuel utilise bien Postgres. | Constat |

**Conséquence :** la mission « migrer de Firebase vers Neon » ne correspond pas à ce code. La migration réelle consiste à :
**ajouter** l'authentification (Neon Auth / Better Auth) et **passer** l'état utilisateur de `localStorage` vers Neon, sur une base Neon déjà en place.
Si une autre version de POMME utilise Firebase, elle n'est pas dans ce dépôt.

---

## A. Architecture actuelle

- **Framework :** Next.js `16.3.3` (App Router), React 19, TypeScript `5.7.3`, Tailwind v4, shadcn (`@base-ui/react`).
- **Package manager :** pnpm (`packageManager: pnpm@12.3.4`, `pnpm-lock.yaml`).
- **Structure :**
  - `app/(us)/…` et `app/(uk)/uk/…` : groupes de routes par locale (layouts séparés, `lang` en-US / en-GB).
  - `app/(us)/(content)/…` : 3 pages SEO (mealime-alternative, platejoy-alternative, best-sunday-meal-planner-2026).
  - `app/(us)/admin` + `app/admin/api/{login,metrics}` : back-office protégé par passphrase.
  - `app/api/{events,consent,newsletter/*,cron/*}` : route handlers.
  - `app/(us)/newsletter/actions.ts`, `app/(us)/do-not-sell/actions.tsx` : server actions.
  - `app/sw.js/route.ts` : service worker (PWA, mode offline).
  - `components/pomme/*` : UI (hero, sunday-plan, paywall, pricing, pomme-learns…).
  - `lib/pomme/{plan,recipes,persist,features,content}.ts` : logique métier.
  - `lib/db/{index,schema}.ts` : Drizzle sur `pg.Pool` (Neon).
  - `lib/admin/*`, `lib/skills/*` : back-office, emails (Resend), file d'emails, « skills » cron.
  - `lib/redis.ts`, `lib/rate-limit.ts` : Upstash Redis (rate limiting).
  - `migrations/0001_init.sql` + `scripts/migrate.mjs` : migrations SQL idempotentes, suivies dans `pomme_migrations`.
- **Provider :** `components/pomme/pomme-provider.tsx` — contexte React + store externe (`useSyncExternalStore`) branché sur `localStorage`.
- **Middleware / proxy :** aucun.
- **Vercel :** `vercel.json` définit 3 crons (sunday-reminder, email-queue, skills). En-têtes de sécurité dans `next.config.mjs` (CSP en Report-Only, HSTS, nosniff, Permissions-Policy).
- **Tests :** `node:test` via `tsx` (`tests/persist.test.ts`, `tests/rate-limit.test.ts`, `tests/skills/skills.test.ts`) + Playwright e2e (`e2e/*`: consent, newsletter, a11y-pwa, locale-persistence).

### Génération de plan
- `generatePlan(prefs, locale, seed = 0): Plan` dans `lib/pomme/plan.ts`. **Pur et déterministe** : l'aléa vient de `jitter(id, seed)` (hash multiplicatif), aucun `Math.random`.
- Le plan **n'est jamais stocké** : il est recalculé dans le provider (`useMemo`) à partir de `planPrefs ?? prefs`, `locale` et `seed` (rien n'est affiché si `seed === 0`).
- `generate()` incrémente `seed` et copie `prefs` vers `planPrefs`. `applyWeekNote()` passe une note libre (`parseWeekNote`) en préférences.
- Le **basket (liste de courses)** est calculé dans `generatePlan` : ingrédients agrégés par `key`, groupés par rayon (`AISLE_ORDER`), avec les produits de base (staples) à part. Il n'y a **pas de quantités** : seulement un compteur `meals` par ingrédient.
- **Swap :** bouton UI seulement → `openPaywall('swap')`. Aucune logique de swap.
- **Pricing / paywall :** `paywall.tsx`, `pricing.tsx`, affichés selon `NEXT_PUBLIC_FEATURE_PAYWALL_VISIBLE`. Aucun paiement (« This preview doesn't take payments yet »). Pas de Stripe.

### Persistance actuelle
| Donnée | Où | Clé / table |
|---|---|---|
| État utilisateur `{locale, prefs, planPrefs, seed}` | **localStorage** | `pomme:v1` (version 1, expiration 90 j, validé par `parsePersisted`) |
| Plan offline | localStorage (lecture) | `components/pomme/offline-plan.tsx` |
| Abonnés newsletter | Neon | `pomme_subscribers`, `pomme_pending_subscribers` |
| Événements (analytics internes) | Neon | `pomme_events` (`type, locale, detail`, sans user) |
| Choix de consentement | Neon | `pomme_consent_choices` |
| File d'emails / journal d'envois | Neon | `pomme_email_queue`, `pomme_sent_log` |
| Rate limiting | Upstash Redis | — |

### Variables d'environnement référencées
Serveur : `DATABASE_URL`, `POSTGRES_URL`, `UPSTASH_REDIS_REST_URL/TOKEN` (ou `KV_REST_API_URL/TOKEN`), `ADMIN_TOKEN`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_API_URL`, `NEWSLETTER_FROM`, `POMME_POSTAL_ADDRESS`, `FOUNDER_EMAIL`, `FEATURE_ORPHAN_CAPTURE`, `POMME_DATA_DIR` (script legacy).
Client (`NEXT_PUBLIC_*`) : `GA_ID`, `META_PIXEL_ID`, `TIKTOK_PIXEL_ID`, `BUILD_ID`, `FEATURE_{PAYWALL_VISIBLE,NEWSLETTER_CAPTURE,STATS_DASHBOARD,GROCERY_IMPORT_PAPRIKA,GROCERY_IMPORT_RECIPEIO}`.
Aucun secret n'est exposé côté client.

---

## B. Ce qui fonctionne (d'après le code ; non exécuté ici)

- Génération de plan déterministe + basket par rayon. [PASS en lecture du code ; non testé dans un navigateur ici]
- Persistance anonyme `localStorage` avec validation, expiration et migration de locale (`localiseState`). Couverte par des tests unitaires.
- Routage US/UK, hreflang, sitemap, pages SEO, PWA / offline.
- Newsletter double opt-in (Resend), file d'emails, crons, back-office admin, consentement RGPD/CCPA, rate limiting.
- Accès Neon côté serveur uniquement (`lib/db` n'est jamais importé par du code client).

Note : je n'ai lancé ni `pnpm install`, ni le build, ni les tests pendant cette phase (lecture seule demandée). `AUDIT.md` annonce « build OK, tsc propre, 8/8 tests » : **non vérifié par moi**.

## C. Ce qui dépend de Firebase

**Rien.** Aucun fichier, import, dépendance ni variable d'environnement Firebase.

## D. Ce qui dépend du localStorage

- `lib/pomme/persist.ts` — `createPommeStore` (load / persist / reset, synchro entre onglets via l'événement `storage`).
- `components/pomme/pomme-provider.tsx` — consomme le store (état complet de l'utilisateur).
- `components/pomme/offline-plan.tsx` — lit `pomme:v1` pour la page offline.
- `e2e/locale-persistence.spec.ts` — tests e2e qui s'appuient sur cette clé.

## E. Ce qui devra être migré / créé

1. **Authentification** (à créer, pas à migrer) : Neon Auth (Better Auth géré par Neon), email + mot de passe, sessions, déconnexion, protection des routes.
2. **État utilisateur** `prefs / planPrefs / seed / locale` → tables `user_preferences` + `weekly_plans` (on stocke `prefs + seed + locale + plan_version` ; le plan est régénéré de façon déterministe et peut aussi être figé en snapshot dans `weekly_plan_meals`).
3. **Fusion au login** localStorage ↔ Neon via `savedAt` / `updated_at` (aucun écrasement silencieux de la version la plus récente).
4. **Nouveau schéma** (préfixe `pomme_` pour rester cohérent avec l'existant) : users (gérée par Neon Auth), user_preferences, weekly_plans, weekly_plan_meals, recipes, recipe_ingredients, grocery_lists, grocery_items, meal_swaps, memory_patterns, analytics_events, subscriptions, subscription_events (ces deux dernières vides, prévues pour Stripe).
5. **Recettes** : aujourd'hui codées en dur dans `lib/pomme/recipes.ts`. Il faut les seeder dans `recipes` / `recipe_ingredients` **sans** changer la source utilisée par `generatePlan` (sinon le déterminisme est en danger).
6. **Analytics** : `pomme_events` existe déjà (anonyme). Il faut ajouter `analytics_events(user_id nullable, event_name, properties jsonb)` ou étendre l'existant, sans casser `/admin/metrics`.
7. **Couche d'accès** `lib/pomme/data/{auth,users,preferences,weeklyPlans,memory,groceries,swaps}.ts` (server-only), appelée via server actions / route handlers, avec `userId` toujours tiré de la session.

## F. Risques

| Risque | Gravité | Atténuation |
|---|---|---|
| Le code déployé sur Vercel n'est pas celui du dépôt (le dépôt ne contient qu'un zip) | **Élevée** | Confirmer la source de production avant toute modification ; commiter le code décompressé sur une branche dédiée |
| Une autre version de POMME avec Firebase existe ailleurs | **Élevée** | Confirmation de votre part |
| Le déterminisme de `generatePlan` peut casser si les recettes deviennent dynamiques (ordre, ids) | Élevée | Garder `recipes.ts` comme source de vérité ; ajouter un test de snapshot `(prefs, locale, seed) → plan` avant toute modification |
| Le plan dépend de `locale` (prix, libellés), pas seulement de `prefs + seed` | Moyenne | Stocker `locale` avec chaque plan |
| Les données utilisateur se mélangent sans RLS (Better Auth / Drizzle) | Élevée | Filtrer chaque requête par `session.user.id` ; tests A/B d'isolation |
| Pool `pg` avec `max: 5` en serverless : risque d'épuisement des connexions | Moyenne | Utiliser l'URL Neon *pooled* (`-pooler`) |
| `ssl: { rejectUnauthorized: false }` | Faible | Passer à une vérification TLS stricte (Neon a des certificats valides) |
| Le layout lit les headers, donc tout est rendu dynamiquement | Faible | Inchangé par la migration |
| Cookies de session dans l'iframe de preview v0 | Moyenne | `sameSite: 'none', secure: true` en dev, origines de confiance |
| CSP Report-Only : `connect-src` devra inclure l'endpoint Neon Auth si appelé depuis le client | Faible | Ajouter l'origine le moment venu |

## G. Plan de migration (proposé, non exécuté)

1. **Prérequis** : décompresser le code dans le dépôt (branche `neon-migration`), connecter l'intégration Neon **existante** au projet v0, vérifier que `pnpm build` et `pnpm test` passent **avant** toute modification (état de référence).
2. **Test de non-régression** : snapshot de `generatePlan` sur plusieurs triplets `(prefs, locale, seed)`.
3. **Migration SQL `0002_user_data.sql`** (additive, idempotente) : nouvelles tables, aucune modification des tables `pomme_*` existantes.
4. **Neon Auth** : vérifier son activation dans la console Neon, puis intégrer le client officiel et ajouter des pages login / signup minimales réutilisant les composants existants.
5. **Couche `lib/pomme/data/*`** server-only, avec l'utilisateur toujours résolu depuis la session.
6. **Provider** : visiteur anonyme → localStorage (inchangé) ; utilisateur connecté → synchro Neon avec localStorage comme cache, et fusion au login par timestamp.
7. **Feature flag** `POMME_BACKEND=local|neon` (serveur) pour un retour arrière immédiat.
8. **Tests 1 à 13** (unitaires + e2e Playwright), puis build, puis Preview Vercel, puis Production.
9. Analytics `user_id`, fondations pattern memory / swap / quantités pour les courses (structure seulement), tables Stripe vides.

## H. Fichiers qui seront modifiés (prévision)

- `components/pomme/pomme-provider.tsx` — ajout de la synchro Neon pour un utilisateur connecté (comportement anonyme inchangé).
- `lib/pomme/persist.ts` — ajout d'une fonction de fusion (logique existante conservée).
- `lib/db/schema.ts` — ajout des nouvelles tables.
- `lib/db/index.ts` — TLS strict, URL pooled.
- `package.json` — dépendance du client Neon Auth, script de test étendu.
- `next.config.mjs` — `connect-src` si nécessaire.
- `components/pomme/site-header.tsx` — bouton connexion / compte (minimal, style existant).

Nouveaux fichiers : `migrations/0002_user_data.sql`, `lib/pomme/data/*`, `lib/auth*`, `app/api/auth/[...path]/route.ts` (selon le SDK Neon Auth), pages auth, `tests/plan-determinism.test.ts`, `tests/data-isolation.test.ts`, `e2e/auth-persistence.spec.ts`, `NEON_MIGRATION_REPORT.md`.

## I. Fichiers qui ne doivent pas être touchés

- `lib/pomme/plan.ts` (`generatePlan`, `jitter`, `parseWeekNote`) et `lib/pomme/recipes.ts`.
- `lib/pomme/content.ts`, `components/pomme/{hero,pricing,paywall,closing,faq,sunday-ritual,pomme-learns}.tsx` (design, textes marketing, pricing).
- `app/(us)/(content)/*` (pages SEO), `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/sw.js/route.ts`.
- `migrations/0001_init.sql` (déjà appliquée ; on ne réécrit jamais une migration appliquée).
- `lib/admin/*`, `lib/skills/*`, `app/api/cron/*`, `vercel.json`, consentement (`lib/consent.ts`, `components/consent/*`).

---

## Ce que j'ai besoin de vous avant la Phase 1

1. **Firebase** : confirmez-vous que ce zip est bien la version de POMME en production ? Ou existe-t-il une autre version (avec Firebase) à me fournir ?
2. **Code source** : m'autorisez-vous à décompresser le zip dans le dépôt (branche dédiée) pour en faire la base de travail ?
3. **Neon** : connectez l'intégration Neon à ce projet v0 en choisissant votre projet Neon **existant**. Indiquez-moi aussi si Neon Auth est déjà activé dans la console Neon (Projet → Auth).
