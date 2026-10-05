/**
 * Phase 2.5 — login merge: localStorage (anonymous) + cloud (account).
 * Explicit, documented strategy — user data is never silently overwritten:
 *
 *   only local            → local wins                    (source: 'local')
 *   only cloud            → cloud wins                    (source: 'cloud')
 *   both, local newer     → local wins                    (source: 'local-newer')
 *   both, cloud newer     → cloud wins                    (source: 'cloud-newer')
 *   both, same timestamp  → cloud wins (server = truth)   (source: 'tie-cloud')
 *
 * The losing side is never lost without a trace: the caller receives `source`
 * so the UI can say what happened.
 */
import type { PommeState } from './persist'

export type StampedState = { state: PommeState; savedAt: number }

export type MergeResult = {
  merged: StampedState
  source: 'local' | 'cloud' | 'local-newer' | 'cloud-newer' | 'tie-cloud'
  /** The other side's timestamp when both existed — useful for audit/debug. */
  discardedSavedAt: number | null
}

export function mergeLocalAndCloud(local: StampedState | null, cloud: StampedState | null): MergeResult | null {
  if (!local && !cloud) return null
  if (local && !cloud) {
    return { merged: local, source: 'local', discardedSavedAt: null }
  }
  if (!local && cloud) {
    return { merged: cloud, source: 'cloud', discardedSavedAt: null }
  }
  const l = local as StampedState
  const c = cloud as StampedState
  if (l.savedAt > c.savedAt) {
    return { merged: l, source: 'local-newer', discardedSavedAt: c.savedAt }
  }
  if (c.savedAt > l.savedAt) {
    return { merged: c, source: 'cloud-newer', discardedSavedAt: l.savedAt }
  }
  return { merged: c, source: 'tie-cloud', discardedSavedAt: l.savedAt }
}
