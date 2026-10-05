/**
 * Phase 2.6 — Pomme learns (deterministic behavioural memory).
 * Mandated cases: swap updates memory / keep strengthens / skip weakens /
 * memory influences scoring / memory NEVER violates avoid / determinism kept.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EMPTY_MEMORY,
  MEMORY_MAX,
  applySignal,
  memoryBonus,
  parseMemory,
  recipePatterns,
  type MemoryState,
} from '../lib/pomme/memory.ts'
import { DEFAULT_PREFS, generatePlan, type Prefs } from '../lib/pomme/plan.ts'
import { RECIPES, type Recipe } from '../lib/pomme/recipes.ts'

const fishRecipe = RECIPES.find((r) => r.contains.includes('fish'))!
const quickFresh = RECIPES.find((r) => r.time <= 20 && r.moods.includes('fresh'))!

const maxed = (patterns: string[], events = 10): MemoryState => {
  const scores: Record<string, number> = {}
  for (const p of patterns) scores[p] = 3
  return { scores, events }
}

// ── 1. swap enregistré → mémoire mise à jour ─────────────────────────────────

test('2.6a swap: sortant pénalisé, entrant renforcé', () => {
  let memory = EMPTY_MEMORY
  memory = applySignal(memory, fishRecipe, 'swapped_out')
  memory = applySignal(memory, quickFresh, 'swapped_in')
  assert.equal(memory.events, 2)
  // motifs propres au sortant: baisse · motifs propres à l'entrant: montée
  const outPatterns = recipePatterns(fishRecipe)
  const inPatterns = recipePatterns(quickFresh)
  for (const p of outPatterns.filter((x) => !inPatterns.includes(x))) {
    assert.ok((memory.scores[p] ?? 0) < 0, `${p} devrait baisser`)
  }
  for (const p of inPatterns.filter((x) => !outPatterns.includes(x))) {
    assert.ok((memory.scores[p] ?? 0) > 0, `${p} devrait monter`)
  }
  // un motif partagé par les deux reste neutre (−0.5 +0.5)
  for (const p of outPatterns.filter((x) => inPatterns.includes(x))) {
    assert.ok(Math.abs(memory.scores[p] ?? 0) < 1e-9, `${p} partagé devrait rester neutre`)
  }
})

// ── 2. keep → préférence renforcée ──────────────────────────────────────────

test('2.6b keep: les repas conservés montent (et liked davantage)', () => {
  let kept = applySignal(EMPTY_MEMORY, quickFresh, 'kept')
  let liked = applySignal(EMPTY_MEMORY, quickFresh, 'liked')
  assert.ok(kept.events === 1 && liked.events === 1)
  for (const p of recipePatterns(quickFresh)) {
    assert.ok((kept.scores[p] ?? 0) > 0)
    assert.ok((liked.scores[p] ?? 0) > (kept.scores[p] ?? 0), 'liked > kept')
  }
  // borné: jamais au-delà de ±3 par motif
  for (let i = 0; i < 20; i++) kept = applySignal(kept, quickFresh, 'liked')
  for (const p of recipePatterns(quickFresh)) assert.equal(kept.scores[p], 3)
})

// ── 3. skip → préférence diminuée ──────────────────────────────────────────

test('2.6c skip/disliked: les repas écartés descendent (bornés)', () => {
  let memory = EMPTY_MEMORY
  memory = applySignal(memory, quickFresh, 'skipped')
  for (const p of recipePatterns(quickFresh)) assert.ok((memory.scores[p] ?? 0) < 0)
  for (let i = 0; i < 20; i++) memory = applySignal(memory, quickFresh, 'disliked')
  for (const p of recipePatterns(quickFresh)) assert.equal(memory.scores[p], -3)
})

// ── 4. memory → influence le scoring ────────────────────────────────────────

test('2.6d influence: bonus borné, et oriente réellement les choix', () => {
  // le bonus est une préférence: strictement plafonné
  const strong = maxed(recipePatterns(quickFresh))
  assert.ok(Math.abs(memoryBonus(strong, quickFresh)) <= MEMORY_MAX)
  assert.equal(memoryBonus(EMPTY_MEMORY, quickFresh), 0)
  assert.equal(memoryBonus(null, quickFresh), 0)

  // influence réelle sur les choix: avec un mood neutre (« easy »: aucun repas
  // ne l'a), un boost « fresh » doit faire choisir plus de plats fresh.
  const neutral: Prefs = { ...DEFAULT_PREFS, mood: 'easy' }
  const boost: MemoryState = { scores: { 'mood:fresh': 3 }, events: 5 }
  let withMemory = 0
  let withoutMemory = 0
  for (let seed = 1; seed <= 25; seed++) {
    for (const d of generatePlan(neutral, 'us', seed, boost).days) {
      if (d.kind === 'meal' && d.recipe.moods.includes('fresh')) withMemory++
    }
    for (const d of generatePlan(neutral, 'us', seed).days) {
      if (d.kind === 'meal' && d.recipe.moods.includes('fresh')) withoutMemory++
    }
  }
  assert.ok(
    withMemory > withoutMemory,
    `la mémoire doit influencer le scoring (avec: ${withMemory}, sans: ${withoutMemory})`,
  )
})

// ── 5. memory → ne viole JAMAIS avoid ───────────────────────────────────────

test('2.6e hiérarchie: une préférence apprise ne franchit jamais une exclusion', () => {
  const fishLover: MemoryState = { scores: { 'tag:fish': 3, 'mood:cosy': 3 }, events: 30 }
  const prefs: Prefs = { ...DEFAULT_PREFS, avoid: ['fish'] }
  for (let seed = 1; seed <= 12; seed++) {
    const plan = generatePlan(prefs, 'us', seed, fishLover)
    for (const d of plan.days) {
      if (d.kind !== 'meal' && d.kind !== 'leftovers') continue
      assert.ok(!d.recipe.contains.includes('fish'), `fish a fuité malgré avoid (seed ${seed})`)
    }
  }
})

// ── 6. memory → ne casse pas le déterminisme ────────────────────────────────

test('2.6f déterminisme: (prefs, locale, seed, memory) → plan identique', () => {
  const boost: MemoryState = { scores: { 'tag:fish': 2 }, events: 4 }
  for (const seed of [1, 3, 9]) {
    const a = JSON.stringify(generatePlan(DEFAULT_PREFS, 'uk', seed, boost))
    const b = JSON.stringify(generatePlan(DEFAULT_PREFS, 'uk', seed, boost))
    assert.equal(a, b)
  }
  // sans mémoire: comportement strictement inchangé (rétrocompatible)
  for (const seed of [1, 3, 9]) {
    const plain = JSON.stringify(generatePlan(DEFAULT_PREFS, 'us', seed))
    const empty = JSON.stringify(generatePlan(DEFAULT_PREFS, 'us', seed, EMPTY_MEMORY))
    assert.equal(plain, empty, 'EMPTY_MEMORY doit être un no-op strict')
  }
  // parseMemory tolérant
  assert.deepEqual(parseMemory(undefined), EMPTY_MEMORY)
  assert.deepEqual(parseMemory({ scores: { 'tag:fish': 99 }, events: -2 }).scores['tag:fish'], 3)
})
