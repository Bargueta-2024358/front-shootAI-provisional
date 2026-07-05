import { apiJson } from './api'
import {
  createFavoriteDirect,
  listFavoritesDirect,
  suggestFavoriteLabels,
} from './demoDb'
import type { FavoriteOutfit, OutfitGarment } from '../types/auth'

const LOCAL_FAVORITES_KEY = 'shootai:favorites:v1'

type FavoritePayload = {
  projectId?: string
  title?: string
  category?: string
  event?: string
  occasion?: string
  matchPercentage?: number
  garments?: OutfitGarment[]
}

function readLocalFavorites(): FavoriteOutfit[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_FAVORITES_KEY)
    return raw ? (JSON.parse(raw) as FavoriteOutfit[]) : []
  } catch {
    return []
  }
}

function writeLocalFavorites(favorites: FavoriteOutfit[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(favorites))
}

function createFavoriteLocal(payload: FavoritePayload): FavoriteOutfit {
  const favorite: FavoriteOutfit = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId: 'local',
    projectId: payload.projectId,
    title: payload.title || `Look ${payload.category || 'favorito'}`,
    category: payload.category || '',
    event: payload.event || '',
    occasion: payload.occasion || payload.category || '',
    matchPercentage: Number(payload.matchPercentage) || 0,
    garments: payload.garments || [],
    createdAt: new Date().toISOString(),
  }

  writeLocalFavorites([favorite, ...readLocalFavorites()])
  return favorite
}

function mergeFavorites(...groups: FavoriteOutfit[][]): FavoriteOutfit[] {
  const seen = new Set<string>()
  const result: FavoriteOutfit[] = []

  for (const favorite of groups.flat()) {
    const key = [
      favorite.id,
      favorite.projectId,
      favorite.title,
      favorite.category,
      favorite.garments?.map((g) => g.garmentId || g.name).join('|'),
    ].join(':')
    if (seen.has(key)) continue
    seen.add(key)
    result.push(favorite)
  }

  return result.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )
}

export async function listFavorites(): Promise<FavoriteOutfit[]> {
  const local = readLocalFavorites()
  try {
    return mergeFavorites(await apiJson<FavoriteOutfit[]>('/favorites'), local)
  } catch {
    try {
      return mergeFavorites(await listFavoritesDirect(), local)
    } catch {
      return local
    }
  }
}

export async function createFavorite(payload: FavoritePayload): Promise<FavoriteOutfit> {
  try {
    const favorite = await apiJson<FavoriteOutfit>('/favorites', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    writeLocalFavorites(mergeFavorites([favorite], readLocalFavorites()))
    return favorite
  } catch {
    try {
      const favorite = await createFavoriteDirect(payload)
      writeLocalFavorites(mergeFavorites([favorite], readLocalFavorites()))
      return favorite
    } catch {
      return createFavoriteLocal(payload)
    }
  }
}

export async function suggestFavoriteTheme(payload: {
  category: string
  event?: string
  garments?: OutfitGarment[]
}): Promise<{ occasion: string; theme: string }> {
  try {
    return await apiJson<{ occasion: string; theme: string }>(
      '/favorites/suggest-occasion',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
  } catch {
    return suggestFavoriteLabels(payload.category)
  }
}
