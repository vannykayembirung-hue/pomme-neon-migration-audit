import { applySwaps, generatePlan, type Plan, type Prefs } from './plan'
import type { MemoryState } from './memory'
import type { Locale } from './recipes'

/**
 * The displayed week is a pure function of the generation snapshot (prefs +
 * seed + frozen memory) plus the user's explicit swaps. Live learning memory is
 * never consulted here: a swap updates memory for FUTURE weeks only, so
 * "Everything else on your week stays exactly as it is" is structurally true.
 */
export function derivePlan(state: {
  planPrefs: Prefs | null
  prefs: Prefs
  seed: number
  locale: Locale
  swaps: Record<number, string>
  planMemory: MemoryState | null
}): Plan | null {
  if (state.seed <= 0) return null
  const base = state.planPrefs ?? state.prefs
  return applySwaps(
    generatePlan(base, state.locale, state.seed, state.planMemory ?? undefined),
    state.swaps,
    base,
    state.locale,
  )
}
