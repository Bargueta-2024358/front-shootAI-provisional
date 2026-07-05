import { apiJson } from './api'
import {
  createFavoriteDirect,
  listFavoritesDirect,
  suggestFavoriteLabels,
} from './demoDb'
import type { FavoriteOutfit, OutfitGarment } from '../types/auth'

export async function listFavorites(): Promise<FavoriteOutfit[]> {
  try {
    return await apiJson<FavoriteOutfit[]>('/favorites')
  } catch {
    return listFavoritesDirect()
  }
}

export async function createFavorite(payload: {
  projectId?: string
  title?: string
  category?: string
  event?: string
  occasion?: string
  matchPercentage?: number
  garments?: OutfitGarment[]
}): Promise<FavoriteOutfit> {
  try {
    return await apiJson<FavoriteOutfit>('/favorites', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch {
    return createFavoriteDirect(payload)
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
