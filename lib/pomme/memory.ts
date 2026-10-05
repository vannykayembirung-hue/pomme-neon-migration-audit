/**
 * Phase 2.6 — Pomme learns: a deterministic, explainable behavioural memory.
 * No fake AI: every learned number is a bounded score per visible pattern.
 *
 * Hierarchy guaranteed by construction:
 *   1-4. hard filters (avoid / diet / time) run BEFORE scoring,
 *   5-6. explicit prefs (mood +3, cost ±) outweigh the memory bonus,
 *   7.   memory only tips the ranking among already-eligible candidates.
 * The bonus is clamped to ±MEMORY_MAX so a learned preference can never become
 * a rule: "no chicken" always beats "Pomme noticed you like chicken".
 */
import type { Recipe } from './recipes'

export type MemoryEvent = 'kept' | 'swapped_in' | 'swapped_out' | 'skipped' | 'liked' | 'disliked'

export type MemoryState = {
  /** pattern key → score, e.g. "mood:cosy", "tag:fish", "time:quick", "budget:gentle". */
  scores: Record<string, number>
  /** total signals recorded — makes growth observable/testable. */
  events: number
}

export const EMPTY_MEMORY: MemoryState = { scores: {}, events: 0 }

const WEIGHTS: Record<MemoryEvent, number> = {
  kept: 0.25,
  swapped_in: 0.5,
  swapped_out: -0.5,
  skipped: -0.25,
  liked: 1,
  disliked: -1,
}

const SCORE_CLAMP = 3
/** Hard ceiling for the whole bonus: preference, never a rule. */
export const MEMORY_MAX = 0.75

/** The explainable patterns a recipe participates in. */
export function recipePatterns(recipe: Recipe): string[] {
  const patterns = [
    ...recipe.moods.map((m) => `mood:${m}`),
    ...recipe.contains.map((t) => `tag:${t}`),
    recipe.time <= 20 ? 'time:quick' : recipe.time <= 30 ? 'time:mid' : 'time:slow',
    recipe.costPerServingUsd <= 2 ? 'budget:gentle' : 'budget:plenty',
  ]
  return [...new Set(patterns)]
}

/** Pure: records one behavioural signal. */
export function applySignal(state: MemoryState, recipe: Recipe, event: MemoryEvent): MemoryState {
  const delta = WEIGHTS[event]
  const scores = { ...state.scores }
  for (const pattern of recipePatterns(recipe)) {
    const next = (scores[pattern] ?? 0) + delta
    scores[pattern] = Math.max(-SCORE_CLAMP, Math.min(SCORE_CLAMP, next))
  }
  return { scores, events: state.events + 1 }
}

/** Bounded ranking bonus — only ever used AFTER hard filters. */
export function memoryBonus(state: MemoryState | null | undefined, recipe: Recipe): number {
  if (!state || state.events === 0) return 0
  let bonus = 0
  for (const pattern of recipePatterns(recipe)) bonus += state.scores[pattern] ?? 0
  return Math.max(-MEMORY_MAX, Math.min(MEMORY_MAX, bonus))
}

/** Tolerant parse for persisted data (missing/corrupt → empty memory). */
export function parseMemory(value: unknown): MemoryState {
  if (!value || typeof value !== 'object') return EMPTY_MEMORY
  const raw = (value as { scores?: unknown; events?: unknown }).scores
  const scores: Record<string, number> = {}
  if (raw && typeof raw === 'object') {
    for (const [key, score] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof score === 'number' && Number.isFinite(score) && key.length < 64) {
        scores[key] = Math.max(-SCORE_CLAMP, Math.min(SCORE_CLAMP, score))
      }
    }
  }
  const events = (value as { events?: unknown }).events
  return { scores, events: typeof events === 'number' && events >= 0 ? events : 0 }
}
