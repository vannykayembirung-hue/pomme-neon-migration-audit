/**
 * Phase 2 global smoke test — the mandated end-to-end scenario, running the
 * REAL modules (engine, auth service, merge, persistence) end to end:
 *
 * USER → AUTH → PREFERENCES → GENERATE PLAN → RECIPE → SWAP → GROCERY →
 * SAVE → REFRESH → LOGIN → RESTORE → MEMORY → NEXT PLAN
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../lib/pomme/auth.ts'
import {
  loadAccount,
  login,
  memoryUserRepo,
  saveAccount,
  signup,
} from '../lib/pomme/account.ts'
import {
  DEFAULT_PREFS,
  applySwap,
  findNextSeed,
  generatePlan,
  planSignature,
  type Prefs,
} from '../lib/pomme/plan.ts'
import { applySignal, EMPTY_MEMORY, type MemoryState } from '../lib/pomme/memory.ts'
import { defaultState, parsePersisted, type PommeState } from '../lib/pomme/persist.ts'
import { RECIPES } from '../lib/pomme/recipes.ts'

const SECRET = 'smoke-secret'

test('smoke: du signup au plan suivant, en passant par swap, grocery, cloud et mémoire', async () => {
  // ── USER + AUTH ──
  const repo = memoryUserRepo()
  const prefs: Prefs = { ...DEFAULT_PREFS, household: 4, avoid: ['fish'] }
  const local: PommeState = { ...defaultState('us'), prefs, seed: 0 }
  const created = await signup(repo, SECRET, 'smoke@example.com', 'smoke-password', {
    state: local,
    savedAt: 100,
  })
  assert.equal(created.ok, true)
  if (!created.ok) return
  assert.equal(verifySessionToken(created.token, SECRET), created.userId)
  assert.ok(await loadAccount(repo, created.token, SECRET))

  // ── PREFERENCES + GENERATE PLAN ──
  const state: PommeState = { ...local, planPrefs: prefs, seed: 7 }
  const plan = generatePlan(prefs, 'us', state.seed)
  assert.equal(plan.days.length, 7)
  assert.equal(plan.servings, 4)

  // ── RECIPE ──
  const meal = plan.days.find((d) => d.kind === 'meal')
  assert.ok(meal && meal.kind === 'meal')
  assert.ok(meal.recipe.ingredients.length >= 2 && meal.recipe.steps.length >= 2)
  assert.ok(meal.recipe.time > 0 && meal.recipe.costPerServingUsd > 0)

  // ── SWAP ──
  const replacement = RECIPES.find(
    (r) => r.id !== meal.recipe.id && !r.contains.some((a) => prefs.avoid.includes(a)),
  )!
  const swapped = applySwap(plan, meal.day, replacement.id, prefs, 'us')
  const after = swapped.days[meal.day]
  assert.equal(after.kind === 'meal' && after.recipe.id, replacement.id)
  // restrictions toujours vraies après swap
  assert.ok(!replacement.contains.includes('fish'))

  // ── GROCERY (recalculée depuis le plan swappé) ──
  const expected = new Map<string, number>()
  for (const d of swapped.days) {
    if (d.kind !== 'meal') continue
    const servings = prefs.household * (d.batch ? 2 : 1)
    for (const ing of d.recipe.ingredients) {
      expected.set(ing.key, (expected.get(ing.key) ?? 0) + ing.qtyPerServing * servings)
    }
  }
  const lines = swapped.basket.flatMap((g) => g.items).concat(swapped.staples)
  for (const [key, amount] of expected) {
    const line = lines.find((l) => l.key === key || l.key.startsWith(`${key}-`))
    assert.ok(line, `${key} manquant dans la grocery`)
    assert.ok(Math.abs(line.amount - amount) < 1e-9, `${key}: ${line.amount} ≠ ${amount}`)
  }

  // ── SAVE (cloud = source de vérité) ──
  const savedState: PommeState = { ...state, swaps: { [meal.day]: replacement.id } }
  const savedAt = Date.now() - 60_000 // realistic: parsePersisted rejects anything older than 90 days
  assert.equal(
    await saveAccount(repo, created.token, SECRET, { state: savedState, savedAt }),
    true,
  )

  // ── REFRESH (le localStorage survit au F5) ──
  const payload = JSON.stringify({ version: 1, ...savedState, savedAt })
  const afterF5 = parsePersisted(payload)
  assert.ok(afterF5, 'F5 doit relire la semaine')
  assert.equal(afterF5.seed, state.seed)
  assert.deepEqual(afterF5.swaps, savedState.swaps)

  // ── LOGIN (autre appareil) + RESTORE ──
  const relogin = await login(repo, SECRET, 'smoke@example.com', 'smoke-password', null)
  assert.equal(relogin.ok, true)
  if (!relogin.ok) return
  assert.equal(relogin.merged?.source, 'cloud')
  const restored = relogin.merged?.merged.state
  assert.equal(restored?.seed, state.seed)
  assert.deepEqual(restored?.swaps, savedState.swaps)
  assert.equal(restored?.prefs.household, 4)
  // mauvais mot de passe = jamais dedans
  assert.equal((await login(repo, SECRET, 'smoke@example.com', 'wrong-password', null)).ok, false)

  // ── MEMORY (le swap laisse une trace) ──
  let memory: MemoryState = EMPTY_MEMORY
  memory = applySignal(memory, meal.recipe, 'swapped_out')
  memory = applySignal(memory, replacement, 'swapped_in')
  assert.equal(memory.events, 2)
  // influence réelle mais sous contraintes: jamais de fish malgré la mémoire
  const fishLover: MemoryState = { scores: { 'tag:fish': 3 }, events: 9 }
  for (const d of generatePlan(prefs, 'us', 11, fishLover).days) {
    if (d.kind === 'meal') assert.ok(!d.recipe.contains.includes('fish'))
  }

  // ── NEXT PLAN (rework visible + grocery et mémoire cohérents) ──
  const previous = planSignature(generatePlan(prefs, 'us', restored?.seed ?? 7, memory))
  const nextSeed = findNextSeed(prefs, 'us', (restored?.seed ?? 7) + 1, previous, undefined, memory)
  const next = generatePlan(prefs, 'us', nextSeed, memory)
  assert.notEqual(planSignature(next), previous)
  assert.equal(next.budget, prefs.budget)
  assert.equal(JSON.stringify(next), JSON.stringify(generatePlan(prefs, 'us', nextSeed, memory)))

  // le token de session a expiré au bout de 30 jours: accès refusé, pas de trou
  assert.equal(await loadAccount(repo, created.token, SECRET, Date.now() + 31 * 24 * 3600 * 1000), null)
})

test('smoke: le secret de session est exigé (fail-closed) et le hash vérifié', () => {
  const token = createSessionToken('u1', SECRET)
  assert.equal(verifySessionToken(token, ''), null, 'sans secret: rien')
  assert.equal(verifyPassword('smoke-password', 'scrypt$aa$bb'), false)
})
