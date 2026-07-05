import type { OutfitsByCategory } from '../types/auth'

export const SESSION_PROJECT_KEY = 'shootai:projectId'
export const SESSION_GENDER_KEY = 'shootai:gender'
export const SESSION_PRESHOOT_KEY = 'shootai:preshootState'
export const SESSION_OUTFITS_KEY = 'shootai:outfitsCache'
export const SESSION_SAVED_FAVORITES_KEY = 'shootai:savedFavoriteKeys'

export type TargetGender = 'man' | 'woman' | 'unisex'

export interface PreShootSessionState {
  projectId: string
  gender: TargetGender
  tags: string[]
  notes: string
}

export interface OutfitsCache {
  projectId: string
  gender: TargetGender
  outfitsByCategory: OutfitsByCategory[]
  matchPercentage: number | null
  savedAt: string
}

export function persistFlowSession(projectId: string, gender: TargetGender) {
  sessionStorage.setItem(SESSION_PROJECT_KEY, projectId)
  sessionStorage.setItem(SESSION_GENDER_KEY, gender)
}

export function savePreShootState(state: PreShootSessionState) {
  sessionStorage.setItem(SESSION_PRESHOOT_KEY, JSON.stringify(state))
  persistFlowSession(state.projectId, state.gender)
}

export function loadPreShootState(): PreShootSessionState | null {
  const raw = sessionStorage.getItem(SESSION_PRESHOOT_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PreShootSessionState
  } catch {
    return null
  }
}

export function saveOutfitsCache(cache: OutfitsCache) {
  sessionStorage.setItem(SESSION_OUTFITS_KEY, JSON.stringify(cache))
}

export function clearOutfitsCache() {
  sessionStorage.removeItem(SESSION_OUTFITS_KEY)
}

export function loadOutfitsCache(
  projectId: string,
  gender?: TargetGender
): OutfitsCache | null {
  const raw = sessionStorage.getItem(SESSION_OUTFITS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as OutfitsCache
    if (parsed.projectId !== projectId) return null
    if (gender && parsed.gender !== gender) return null
    return parsed
  } catch {
    return null
  }
}

export function loadSavedFavoriteKeys(): Set<string> {
  const raw = sessionStorage.getItem(SESSION_SAVED_FAVORITES_KEY)
  if (!raw) return new Set()
  try {
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function markFavoriteSaved(key: string) {
  const keys = loadSavedFavoriteKeys()
  keys.add(key)
  sessionStorage.setItem(
    SESSION_SAVED_FAVORITES_KEY,
    JSON.stringify([...keys])
  )
}

export function favoriteKey(projectId: string, outfitId: string) {
  return `${projectId}:${outfitId}`
}

export function clearShootSession() {
  sessionStorage.removeItem(SESSION_PROJECT_KEY)
  sessionStorage.removeItem(SESSION_GENDER_KEY)
  sessionStorage.removeItem(SESSION_PRESHOOT_KEY)
  sessionStorage.removeItem(SESSION_OUTFITS_KEY)
  sessionStorage.removeItem(SESSION_SAVED_FAVORITES_KEY)
}

export function resolveFlowState(locationState?: {
  projectId?: string
  gender?: TargetGender
}) {
  const projectId =
    locationState?.projectId ||
    sessionStorage.getItem(SESSION_PROJECT_KEY) ||
    undefined
  const gender =
    (locationState?.gender ||
      sessionStorage.getItem(SESSION_GENDER_KEY) ||
      'man') as TargetGender

  if (projectId) {
    persistFlowSession(projectId, gender)
  }

  return { projectId, gender }
}
