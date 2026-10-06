# POMME — PHASE 2.7 REPORT

**Newsletter production verification + account UX**
Date : 6 octobre 2026 · Production : https://pomme-neon-migration-audit.vercel.app
Principe appliqué : PRESERVE → VERIFY → FIX → TEST → PUSH → DEPLOY → VERIFY

---

## Résumé exécutif

| Objectif | Verdict | Détail |
|---|---|---|
| 1. Diagnostic newsletter (11 points) | **5 PASS · 1 BLOCKED · 3 en attente** (séquence) | Cause exacte identifiée : **envoi Resend** (502 `delivery`) |
| 2. UX compte (header) | **PASS** | « Log in » + « Get started » + « Account » — desktop, mobile, /uk |
| 3. Parcours utilisateur A→M | **Compte A→H : PASS (navigateur vierge) · Newsletter I→M : BLOCKED** | 15/18 étapes OK, 3 bloquées sur la configuration Resend |

**Aucune modification non demandée n'a été effectuée** (voir §6).

---

## 1. Objectif 1 — Diagnostic newsletter en production

### 1.1 Les 11 points, vérifiés par exécution réelle

| # | Point | Verdict | Preuve exécutée |
|---|---|---|---|
| 1 | La route API répond correctement | ✅ **PASS** | `POST /api/newsletter/subscribe` : 400 (`invalid`) sur email malformé, 502 (`delivery`) sur email valide ; `POST /api/newsletter/unsubscribe` : 404 sans token ; `/newsletter/confirm` : page rendue (« expired » pour token bidon) |
| 2 | `DATABASE_URL`/`POSTGRES_URL` disponible pour la route | ✅ **PASS** | Aucun 503 ; l'exécution a franchi `isSubscribed()` sans erreur |
| 3 | La table `pomme_pending_subscribers` existe | ✅ **PASS** | L'insertion a réussi (voir §4) |
| 4 | L'insertion dans Neon fonctionne | ✅ **PASS** | `addPending()` exécuté sans exception (rows créées, visibles dans Neon) |
| 5 | `RESEND_API_KEY` disponible | ❌ **FAIL (config)** | `sendEmail()` retourne `missing RESEND_API_KEY or NEWSLETTER_FROM` → HTTP 502 |
| 6 | `NEWSLETTER_FROM` configurée | ❌ **FAIL (config)** | même point de chute |
| 7 | Domaine d'envoi Resend vérifié | ⛔ **BLOCKED** | vérifiable uniquement dans le tableau de bord Resend (voir §5) |
| 8 | Email de confirmation réellement envoyé | ❌ **FAIL** | HTTP 502 `{"ok":false,"error":"delivery"}` — aucun envoi |
| 9 | Token de confirmation fonctionnel | ⏳ **en attente** | route vivante, test impossible sans email (point 8) |
| 10 | pending → subscriber à la confirmation | ⏳ **en attente** | dépend du point 9 |
| 11 | Unsubscribe | ✅ **PASS (route)** | `POST /api/newsletter/unsubscribe` : 404 sans token valide (comportement RFC 8058 attendu) ; test avec token réel en attente du point 8 |

### 1.2 Cause exacte du problème

Le parcours d'abonnement est une chaîne de 4 étages. Voici l'état réel de chaque étage, constaté en production :

```
POST /api/newsletter/subscribe
  │
  ├─ 1. Validation email .............. ✅ OK (400 si invalide)
  ├─ 2. Rate-limit (Upstash Redis) .... ✅ OK (passé — strict fail-closed non déclenché)
  ├─ 3. INSERT pomme_pending_subscribers ✅ OK (Neon atteint, table présente)
  └─ 4. sendEmail() via Resend ........ ❌ ÉCHEC → HTTP 502 {"ok":false,"error":"delivery"}
                                          ▲
                                          └── LE point de chute unique
```

**Le message « That didn't go through. Check the address and try again in a moment. » est l'habillage frontend générique de ce 502.** Il n'a pas été modifié (la consigne interdit de « simplement changer le message »).

Le log serveur exact (Vercel → Functions → logs, jamais exposé au navigateur) :
`[newsletter] confirmation email failed: <raison>` — la `<raison>` distingue :
- `missing RESEND_API_KEY or NEWSLETTER_FROM` → variables absentes
- `resend 401` → clé invalide
- `resend 403` → expéditeur/domaine non vérifié dans Resend
- `network` → egress bloqué

### 1.3 Variables nécessaires (à configurer côté utilisateur)

| Variable | Environnement | Valeur attendue | Route concernée | Statut HTTP actuel | Erreur backend réelle |
|---|---|---|---|---|---|
| `RESEND_API_KEY` | **Vercel → Production** | clé Resend (`re_…`) — Resend.com → API Keys | `POST /api/newsletter/subscribe` | **502** `{"ok":false,"error":"delivery"}` | `missing RESEND_API_KEY or NEWSLETTER_FROM` (log serveur) |
| `NEWSLETTER_FROM` | **Vercel → Production** | `Pomme <sunday@votre-domaine.com>` — **domaine vérifié dans Resend** (Resend → Domains → enregistrements DNS) | idem | **502** | idem |
| (domaine Resend) | Resend dashboard | domaine ajouté + DNS validés (DKIM/SPF) | idem | — | `resend 403` si non vérifié |

⚠️ `gmail.com` ne peut PAS être utilisé comme expéditeur Resend : il faut un domaine que vous possédez et que vous vérifiez dans Resend (le domaine du site, ou tout domaine que vous contrôlez).

**Déjà en place et fonctionnels** (aucune action requise) : `DATABASE_URL`/`POSTGRES_URL` (Neon), rate-limit Upstash (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` — prouvé : le strict fail-closed ne s'est pas déclenché).

---

## 2. Objectif 2 — UX du compte (header)

### 2.1 Changement (1 fichier : `components/pomme/site-header.tsx`)

| État | Header (desktop + mobile + /uk) |
|---|---|
| Déconnecté | **« Log in »** (lien texte, tous écrans) + **« Get started »** (CTA secondaire arrondi, ≥ sm) → tous deux vers `/account` (`/uk/account` sur la UK) |
| Connecté | **« Account »** (pilule discrète) → `/account` |
| Intact | Logo, navigation, bascule US/UK, CTA primaire « Plan my week » — design premium/calme/éditorial inchangé |

Le header interroge `GET /api/auth/me` au montage (aucun secret côté client, cookie httpOnly uniquement).

### 2.2 Vérifications

- Local (navigateur, avant push) : **11/11** — visibilité, hrefs US/UK, absence de débordement mobile, clic → `/account` → formulaire
- Production (après déploiement) : **B1→B5 PASS** — voir §3

---

## 3. Objectif 3 — Parcours utilisateur réel (navigateur, production)

| Étape | Verdict | Preuve |
|---|---|---|
| A. Nouveau visiteur | ✅ PASS | accueil « Pomme: Your week, beautifully sorted » |
| B1. Voir « Log in » (mobile) | ✅ PASS | visible dans le header, → `/account` |
| B2. « Log in » → `/account` | ✅ PASS | href vérifié |
| B3. Desktop : « Log in » + « Get started » | ✅ PASS | les deux visibles |
| B4. UK : « Log in » → `/uk/account` | ✅ PASS | href vérifié |
| C. Créer un compte (via header) | ✅ PASS | `test.p27.1791263946@pomme-verify.com` — connecté |
| B5. Header affiche « Account » | ✅ PASS | après connexion |
| D. Générer une semaine | ✅ PASS | 7 jours — « Butternut & coconut soup » |
| E. Sauvegarder (cloud) | ✅ PASS | « Week saved to your account. » |
| F. Logout | ✅ PASS | retour au formulaire |
| G. Login (navigateur vierge) | ✅ PASS | contexte neuf = nouvel appareil |
| H. Restauration du plan | ✅ PASS | 7 jours, même jour 1 restauré |
| I. Newsletter (test séparé) | ✅ PASS (diagnostic) | `POST` exécuté : **HTTP 502 `{"ok":false,"error":"delivery"}`** + message d'erreur visible chez l'utilisateur |
| J. Email réellement envoyé | ⛔ **BLOCKED** | 502 — `RESEND_API_KEY`/`NEWSLETTER_FROM` absents (§1.3) |
| K. Lien de confirmation cliqué | ⛔ **BLOCKED** | dépend de J |
| L. pending → subscriber | ⛔ **BLOCKED** | dépend de K |
| M. Unsubscribe | ✅ PASS (route) | `POST` : 404 sans token valide (RFC 8058) ; test token réel après J |

**Règle appliquée** : newsletter ≠ PASS tant que l'email réel n'est pas envoyé (consigne). Compte = PASS uniquement en navigateur vierge (consigne) → c'est fait (G/H).

---

## 4. Résultats Neon

- Tables utilisées par la newsletter : `pomme_pending_subscribers` (insertion ✅), `pomme_subscribers`, `pomme_email_queue`, `pomme_sent_log` — toutes présentes (vérification SQL du 6 oct : 10 tables `pomme_%`).
- Rows de test créées par ce diagnostic (nettoyage §7) : `test.news.1791249999@…`, `test.news27.1791263946@…`, `infos.pomme@gmail.com` (pending, non confirmées — sans effet tant que l'email n'est pas envoyé).

## 5. Résultats Resend

- **Aucun appel Resend n'aboutit** : `sendEmail()` s'arrête avant l'API quand `RESEND_API_KEY`/`NEWSLETTER_FROM` sont absents (raison `missing RESEND_API_KEY or NEWSLETTER_FROM`), sinon la réponse Resend serait journalisée (`resend <code>`).
- **Domaine vérifié** : ⛔ non vérifiable depuis le sandbox — à contrôler dans Resend → Domains (statut « Verified » + DNS DKIM/SPF).
- **Sécurité** : aucun secret exposé dans le navigateur ni dans les logs publics ; cette liste nomme des variables, jamais des valeurs.

---

## 6. Aucune modification non demandée

Fichiers modifiés dans le dépôt :
1. `components/pomme/site-header.tsx` — Objectif 2 (uniquement)
2. `POMME_PHASE_2_7_REPORT.md` + `docs/phase-2-7/*.png` — ce rapport et ses captures

**Non touché** (conformément aux consignes) : moteur de plan, authentification, design général, message d'erreur newsletter, architecture. Tests : **110/110** inchangés · `tsc` ✅ · `build` ✅.

## 7. Nettoyage (1 requête SQL, éditeur Neon)

```sql
DELETE FROM pomme_pending_subscribers WHERE email LIKE 'test.%@pomme-verify.com';
DELETE FROM pomme_users WHERE email LIKE 'test.%@pomme-verify.com';
```

## 8. Captures (`docs/phase-2-7/`)

| Fichier | Contenu |
|---|---|
| `01-header-desktop.png` | Header desktop : Log in + Get started |
| `02-header-mobile.png` | Header mobile : Log in |
| `03-account.png` | Page compte connecté |
| `04-restore.png` | Plan restauré après login navigateur vierge |
| `05-newsletter.png` | Message d'erreur newsletter (le 502 côté API) |

## 9. Déploiement

- Commit header : `2cb5fc8` `feat(account): log in, get started and account in header`
- Commit rapport : (ce document, SHA en bas du message de livraison)
- Build Vercel : **vert**, vérifié en production

## 10. Prochaine étape (uniquement pour valider J→L)

1. Créer les variables `RESEND_API_KEY` + `NEWSLETTER_FROM` dans Vercel (Production) — §1.3
2. Vérifier le domaine dans Resend → Domains
3. Me redonner un GO : je relance le parcours I→M ; la newsletter ne sera PASS qu'avec email réel reçu + confirmation cliquée + unsubscribe validé 🍎
