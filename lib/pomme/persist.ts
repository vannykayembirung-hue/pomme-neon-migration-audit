import { BUDGET_RANGE, DEFAULT_BUDGET, DEFAULT_PREFS, type Prefs } from './plan'
import type { Locale } from './recipes'

export const STORAGE_KEY = 'pomme:v1'
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

export type PommeState = {
  locale: Locale
  prefs: Prefs
  planPrefs: Prefs | null
  seed: number
  /** day index → recipe id: swaps applied to the current week. */
  swaps: Record<number, string>
}

export type Persisted = PommeState & { version: 1; savedAt: number }

export function defaultState(locale: Locale): PommeState {
  return { locale, prefs: { ...DEFAULT_PREFS, budget: DEFAULT_BUDGET[locale] }, planPrefs: null, seed: 0, swaps: {} }
}

export function convertBudget(value: number, to: Locale) {
  const range = BUDGET_RANGE[to]
  const converted = to === 'uk' ? value * 0.78 : value / 0.78
  const rounded = Math.round(converted / range.step) * range.step
  return Math.min(range.max, Math.max(range.min, rounded))
}

export function localiseState(state: PommeState, to: Locale): PommeState {
  if (state.locale === to) return state
  return {
    ...state,
    locale: to,
    prefs: { ...state.prefs, budget: convertBudget(state.prefs.budget, to) },
    planPrefs: state.planPrefs ? { ...state.planPrefs, budget: convertBudget(state.planPrefs.budget, to) } : null,
  }
}

function isPrefs(v: unknown): v is Prefs {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  return (
    typeof p.household === 'number' &&
    Array.isArray(p.days) &&
    p.days.length === 7 &&
    typeof p.cookTime === 'number' &&
    typeof p.budget === 'number' &&
    typeof p.mood === 'string' &&
    Array.isArray(p.avoid)
  )
}

function parseSwaps(v: unknown): Record<number, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<number, string> = {}
  for (const [day, recipeId] of Object.entries(v as Record<string, unknown>)) {
    const d = Number(day)
    if (Number.isInteger(d) && d >= 0 && d <= 6 && typeof recipeId === 'string' && recipeId.length > 0 && recipeId.length < 64) {
      out[d] = recipeId
    }
  }
  return out
}

export function parsePersisted(raw: string | null, now = Date.now()): PommeState | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<Persisted>
    if (data.version !== 1) return null
    if (typeof data.savedAt !== 'number' || now - data.savedAt > MAX_AGE_MS) return null
    if (data.locale !== 'us' && data.locale !== 'uk') return null
    if (!isPrefs(data.prefs)) return null
    if (typeof data.seed !== 'number' || data.seed < 0) return null
    return {
      locale: data.locale,
      prefs: data.prefs,
      planPrefs: isPrefs(data.planPrefs) ? data.planPrefs : null,
      seed: data.seed,
      swaps: parseSwaps(data.swaps),
    }
  } catch {
    return null
  }
}

/** Small external store so React 19 can hydrate persisted state via useSyncExternalStore without a flash. */
export function createPommeStore(defaultLocale: Locale) {
  const fallback = defaultState(defaultLocale)
  let current: PommeState = fallback
  let loaded = false
  const listeners = new Set<() => void>()

  const emit = () => listeners.forEach((l) => l())

  function load() {
    loaded = true
    try {
      const saved = parsePersisted(window.localStorage.getItem(STORAGE_KEY))
      // The URL decides the locale ("/" is US, "/uk" is UK); saved preferences are kept but re-expressed in its currency.
      if (saved) current = saved.locale === defaultLocale ? saved : localiseState(saved, defaultLocale)
    } catch {
      // storage blocked: stay on defaults
    }
  }

  function persist() {
    try {
      const payload: Persisted = { version: 1, ...current, savedAt: Date.now() }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // storage full or blocked: the session still works
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      const onStorage = (e: StorageEvent) => {
        if (e.key !== STORAGE_KEY) return
        loaded = false
        current = fallback
        load()
        emit()
      }
      window.addEventListener('storage', onStorage)
      return () => {
        listeners.delete(listener)
        window.removeEventListener('storage', onStorage)
      }
    },
    getSnapshot(): PommeState {
      if (!loaded && typeof window !== 'undefined') load()
      return current
    },
    getServerSnapshot(): PommeState {
      return fallback
    },
    update(fn: (s: PommeState) => PommeState) {
      if (!loaded) load()
      current = fn(current)
      persist()
      emit()
    },
    reset() {
      current = fallback
      loaded = true
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
      emit()
    },
  }
}
