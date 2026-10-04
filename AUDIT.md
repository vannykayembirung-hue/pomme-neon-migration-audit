# Pomme audit

Audit of the imported zip (before changes), then status per phase. Nothing here is a measured Lighthouse number: no Lighthouse run was possible in this environment.

## 1. Findings on the original code
- Tree: `app/` (layout, page, icons, og, robots, sitemap), `components/pomme/*` (+ `sunday-plan/`), `components/ui/button.tsx`, `lib/pomme/{content,plan,recipes}.ts`, `public/images/{hero-apple,leaf}.png` and 10 recipe PNGs.
- Comments / TODO / FIXME: none. User-visible "preview" copy: `components/pomme/paywall.tsx:134` "This preview doesn't take payments yet." (kept).
- `dangerouslySetInnerHTML`: 1, JSON-LD (kept, now in `components/pomme/home.tsx`). No new ones.
- `console.log`: 0 (one deliberate `console.warn` in the dev-only newsletter fallback).
- State-mutating effects: original provider effect set locale from `navigator.language` on mount (removed: locale now comes from the route / persisted state). `paywall.tsx` effect has a deps array.
- Env vars originally: `VERCEL_PROJECT_PRODUCTION_URL`, `NODE_ENV`. New ones are listed below.
- Images: 10 recipe PNGs of 1.7-2.2 MB each (about 19 MB) plus `hero-apple.png` 1.2 MB and `leaf.png` 856 KB.
- Contrast: cream on apple is 4.54:1 (passes). The hero notification card used `cream/80` and `cream/85` on apple, 3.4:1 and 3.6:1 (fail). Fixed to full cream.
- Privacy: `@vercel/analytics` loaded unconditionally in production, which broke invariant 5. Now only after analytics consent.

## 2. After changes (measured)
- Recipe images: 10 WebP files, 64-119 KB each, total 952 KB (limit 2.5 MB). Hero apple 56 KB, leaf 17 KB. Max edge 1024 px.
- `pnpm build` succeeds; `tsc` clean; `pnpm test` 8/8 pass.
- Verified with curl on a production build: `<html lang>` is `en-GB` for `/uk` and for `Accept-Language: en-GB`, `en-US` otherwise; hreflang links and sitemap alternates present; no GA / Meta / TikTok script in served HTML; wrong admin passphrase returns 401 with a generic message; correct passphrase sets an `HttpOnly; Secure; SameSite=strict` 24h cookie; the three SEO pages, offline, privacy and do-not-sell return 200.
- Not verified (no browser available): visual diff, Lighthouse, axe-core, PWA install, GA4 network behaviour after Accept/Reject, real email round trip, localStorage survive-refresh in a browser.
- Lighthouse mobile estimate: the 20 MB image problem is gone, so Performance should improve markedly; treat as an estimate until you run it.

## 3. Phase map
| Item | Status |
|---|---|
| P1.1 persistence | Done: `lib/pomme/persist.ts`, `useSyncExternalStore` in provider, "Reset my week" in footer. Unit-tested for corrupt / old / wrong-version data. |
| P1.2 images | Done. `priority` stays only on the hero image: the plan result is below the fold, so `priority` there would hurt LCP. |
| P1.3 routing | Done: `/uk`, `proxy.ts` sets locale, layout `lang`, hreflang, sitemap. Side effect: all routes now render dynamically because the layout reads headers. |
| P1.4 PWA | Done with one change: service worker is served at `/sw.js` by a route handler with `NEXT_PUBLIC_BUILD_ID` / commit SHA in the cache name, instead of a renamed `sw-v1.js`. Not tested on a device. |
| P1.5 SEO pages | Done (3 pages, `generateMetadata`, UTM CTA). Copy makes no factual claims about competitors; review it. |
| P2.1 flags | Done: `lib/pomme/features.ts`. Paywall subtitle "Preview pricing" added. Import flags exist but nothing consumes them yet. |
| P2.2 admin | Done at `/admin`. "Unique returning users" is deliberately NOT built: it needs a persistent anonymous ID, which conflicts with the consent rules. |
| P2.3 newsletter | Done: double opt-in, Resend, confirm + unsubscribe routes. Needs env vars below. |
| P2.4 consent | Done: banner (default reject), gated GA4 / Meta / TikTok / Vercel Analytics. The consent cookie itself is JS-readable (it must be) so not `httpOnly`. |
| P2.5 social/share | Done. Social handles are placeholders. |
| P3.1-P3.3 | Done: welcome queue, cron routes, `vercel.json`, 4 skills with tests. |
| Phase 4 | Deferred as specified (Stripe live, native apps, B2B, fundraising). |

## 4. Known limits and decisions
- Data is stored in JSON files. On Vercel the filesystem is ephemeral (`/tmp`), so subscribers and events are lost between deploys / cold starts. Swap for Vercel KV or Postgres before relying on it, or before launch if you send real mail.
- CSP is `Content-Security-Policy-Report-Only` because Next's inline scripts need nonces before it can be enforced.
- Erasure is `POST /admin/api/metrics?action=forget&email=...` (admin cookie required), not GET, because it changes data.
- Vercel Cron on the Hobby plan is limited to daily jobs; the Sunday job runs weekly so it is fine. The welcome queue runs daily at 08:00 UTC, so "1 minute after confirmation" only holds if you call `/api/cron/email-queue` more often.
- `/` serves UK defaults when `Accept-Language` starts with en-GB or en-IE, as requested; this means one URL shows different defaults, which search engines may dislike.

## 5. Environment variables
`ADMIN_TOKEN`, `RESEND_API_KEY`, `NEWSLETTER_FROM`, `POMME_POSTAL_ADDRESS`, `CRON_SECRET`, `FOUNDER_EMAIL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `NEXT_PUBLIC_FEATURE_*` (PAYWALL_VISIBLE, NEWSLETTER_CAPTURE, STATS_DASHBOARD, GROCERY_IMPORT_PAPRIKA, GROCERY_IMPORT_RECIPEIO), `FEATURE_ORPHAN_CAPTURE`, `NEXT_PUBLIC_BUILD_ID`, `POMME_DATA_DIR` (optional).
