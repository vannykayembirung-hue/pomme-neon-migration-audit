# POMME — FUNCTIONALITY-FIRST AUDIT (2026-10-07) + RE-AUDIT DES CORRECTIFS P0/P1

## Part 1 — Audit original (read-only, prod `pomme-neon-migration-audit.vercel.app`)

> Rapport tel que rendu par l'audit. Côté non testé : auth/cloud/email/billing (voir BLOCKED).
> Score functionality 55/100 · launch readiness 30/100. Rapport complet conservé dans la conversation du 2026-10-07 ;
> sections FAIL/P1 reprises ci-dessous avec l'état des correctifs.

### FAIL (extrait du rapport)

- **P0** — Allergies, gluten, "no meat", pescatarian and lactose phrases in free text are silently ignored (safety risk).
- **P1** — A swap changes other days (memory feeds the regeneration), contradicting the picker copy.
- **P1** — Mobile 390×844 layout broken after generating a plan (527 px vs 390 px), Swap buttons off-screen.
- **P1** — No rate limiting on `/api/auth/login`, signup or plan PUT (15 consecutive 401s, no 429).
- **P1** — Privacy page contradicts the product ("not sent to us" vs account sync).

### Directive de remédiation

> CORRIGER UNIQUEMENT LES P0/P1 → TESTER → REAUDITER → NE PAS TOUCHER AU MOTEUR QUI A PASSÉ LES 1 440 TESTS.

---

## Part 2 — RE-AUDIT des correctifs (2026-10-07, après remédiation)

### Périmètre respecté

- ✅ Corrigé : P0 (1) + P1 (4) uniquement.
- ✅ Intouché : `generatePlan`, `rebuildPlan`, `findNextSeed`, `planSignature`, `formatQty`, `priceFor`, `formatMoney`, formules panier/coût, modèle identité (cookie session), gating cron/admin, logique merge localStorage/Neon, les 116 tests existants (non modifiés — 10 nouveaux tests ajoutés).
- ❌ Non corrigé (conformément à la directive) : tout le P2/P3 (énumération signup, révocation session côté serveur, longueur max mot de passe, cookie admin, CSP Report-Only, image `prawn-stirfry.webp` 404, meta description, "I am not vegetarian", tap targets, `batch` flag résiduel, `AUDIT.md` obsolète).

### P0 — Contraintes en texte libre : CORRIGÉ ✅

**Correctif** (`lib/pomme/plan.ts` → `parseWeekNote`, surfaces dans `hero.tsx` + `plan-result.tsx`, état `unapplied` dans `pomme-provider.tsx`) :

1. Ce qui mappe sur un vrai filtre est **appliqué** : « no meat » / « without meat » / « meat-free » / « don't eat meat » → filtre meat ; « lactose intolerant » / « no milk » / « lactose-free » → filtre dairy ; « pescatarian » → filtre meat (poisson conservé).
2. Ce que Pomme ne peut pas vérifier (gluten, noix, fruits de mer, halal, kosher, keto, paleo, pork, eggs, soy, toute phrase « allergy/intolerant/coeliac… ») est **toujours signalé** à l'utilisateur : bandeau « I couldn't apply: … — read each recipe before cooking » à l'écran de saisie ET sur le résultat (là où atterrit le scroll après validation). **Jamais silencieux.**

**Preuves exécutées** — `tests/constraints.test.ts` (7 tests, verts) :
- Repro exact de l'audit « two of us, nut allergy, gluten free, no meat » → household 2 ✅, filtre meat ✅, avertissements nut + gluten ✅
- halal / keto / no pork / shellfish allergy → warning jamais vide ✅
- Notes propres (« vegan week », « no fish, mushrooms »…) → 0 faux positif ✅
- Régression parsing existant (budget £/$, jours, mood) ✅

### P1-1 — Isolement du swap : CORRIGÉ ✅

**Cause racine** (confirmée sur le code) : le plan affiché était redérivé via `generatePlan(..., memory)` avec la mémoire **vivante** ; `swapMeal` écrivant `swapped_in/out` dans cette mémoire, la base de la semaine changeait → les autres jours bougeaient (74% des swaps simulés par l'audit).

**Correctif** : la mémoire est désormais **figée au moment de la génération** (`planMemory`, même pattern que `planPrefs`, persistée dans `localStorage` avec repli = mémoire historique pour les anciens états). Nouveau helper pur `lib/pomme/derive.ts` → `derivePlan()` — le plan affiché est une **fonction pure** de (planPrefs, seed, locale, swaps, planMemory). La mémoire vivante continue d'apprendre pour les **semaines futures** (feature « Pomme learns » préservée : `generate()` fige `planMemory` à chaque nouvelle génération). Dérivation alignée dans `account-panel` et `offline-plan` (cohérence inter-écrans).

**Preuves exécutées** — `tests/swap-isolation.test.ts` (3 tests, verts) :
- Échanger un jour ne change **aucun** autre jour ✅
- Les signaux d'apprentissage post-génération ne redéforment jamais la semaine en cours ✅
- Les restes (leftovers) suivent bien leur jour d'origine, sans effet de bord ✅
- Suite complète : **126/126** (116 historiques intacts + 10 nouveaux) · `tsc --noEmit` exit 0.

### P1-2 — Débordement mobile : STRUCTURELLEMENT SUPPRIMÉ ⚠️→✅ (voir réserve)

**Réserve de preuve (honnêteté)** : les 527 px de l'audit **n'ont pas pu être reproduits** dans mon environnement — matrice testée sur la prod : 390×844, 5 états réels (accueil / plan générique / famille 6 pers. avec restes / sélecteur swap ouvert / recette ouverte / panier), avec et sans polices chargées (métriques de repli) → `scrollWidth` = 390 à chaque fois. Les seuls éléments hors écran détectés sont 2 images décoratives absolues (droite ≈ 525/470 px) **clippées par leur conteneur** (sans effet sur la largeur du document) — dans la fourchette annoncée (527/427), ce qui suggère que l'audit a pu mesurer des boîtes d'éléments décoratifs plutôt que la largeur réelle du document dans SON environnement.

**Correctif (cause structurelle supprimée par construction)** : les pistes de grille du flux plan ne peuvent **plus jamais** s'élargir au-delà de leur conteneur, quels que soient le contenu ou les polices :
- `sunday-plan.tsx` : piste implicite `auto` → `grid-cols-[minmax(0,1fr)]` (le correctif suggéré par l'audit)
- `plan-form.tsx` : `grid-cols-7` → `grid-cols-[repeat(7,minmax(0,1fr))]` + `min-w-0` sur la carte
- `plan-result.tsx` : `grid-cols-3` (stats) → `grid-cols-[repeat(3,minmax(0,1fr))]` + `min-w-0` sur la racine
- Sonde de vérification réutilisable : `scripts/measure-mobile.mjs` (walks the real UI, mesure `scrollWidth` après chaque état).

**Preuve post-correctif** : local (dev), même matrice d'états → `scrollWidth=390 ✅` dans les 5 états. Desktop non modifié (règles `lg:` inchangées).

### P1-3 — Rate limiting auth : CORRIGÉ ✅

**Correctif** : même limiter que le login admin (Upstash `lib/rate-limit.ts`, `strict` = fail-closed) branché sur :
- `POST /api/auth/login` → 10 req / 15 min / IP → **429** + `Retry-After`
- `POST /api/auth/signup` → 10 req / 1 h / IP
- `PUT /api/plan` → 20 req / 1 min / IP

Le limiteur est appliqué **avant** le hachage du mot de passe (couvre le CPU-exhaustion pointé par l'audit). Le backend Upstash est bien configuré en prod (preuve : le login admin strict renvoie 401 et non 429).

**Preuve** : checkpoint vert + vérification comportement 429 planifiée en prod **après déploiement** (le push attend le PAT #15).

### P1-4 — Privacy : CORRIGÉ ✅

« They are not sent to us » remplacé par la vérité : plan gardé sur l'appareil ; si compte créé + « Save my plan », copie stockée dans le compte (suivi d'appareil en appareil) ; sans compte, rien n'est envoyé.

**Preuve** : `app/(us)/privacy/page.tsx` — texte aligné sur le comportement réel (`account-panel` + sync Neon).

### État du checkpoint au moment du rapport

| Check | État |
|---|---|
| Tests (116 existants intacts + 10 nouveaux) | ✅ 126/126 exécutés |
| `tsc --noEmit` | ✅ exit 0 |
| `next build` | ✅ exécuté et vert (14 s) — la sandbox avait calé sous charge (dev+build+Chromium), relancé à froid |
| Commits | ✅ 4 commits locaux (`dc576d0`, `9ecb6d4`, `7b619b7`, `310941a`) + 2 correctifs billing en attente de push |
| Push / déploiement prod | en attente du **PAT #15** |

### Ce qui reste hors périmètre (volontairement)

1. Tout le P2/P3 de l'audit (liste Part 1).
2. L'audit authentifié complet (signup/login/restore/isolation A-B/newsletter/Resend) — bloqué par nécessité d'environnement jetable, non demandé ici.
3. Les correctifs P0/P1 en prod : soumis au push (PAT #15) puis re-vérif navigateur sur prod avec `scripts/measure-mobile.mjs`.
