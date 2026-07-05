import { apiJson } from './api'
import type { FavoriteOutfit, OutfitGarment } from '../types/auth'

type FavoritePayload = {
  projectId?: string
  title?: string
  category?: string
  event?: string
  occasion?: string
  matchPercentage?: number
  garments?: OutfitGarment[]
}

export async function listFavorites(): Promise<FavoriteOutfit[]> {
  return apiJson<FavoriteOutfit[]>('/favorites')
}

export async function createFavorite(payload: FavoritePayload): Promise<FavoriteOutfit> {
  return apiJson<FavoriteOutfit>('/favorites', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function suggestFavoriteTheme(payload: {
  category: string
  event?: string
  garments?: OutfitGarment[]
}): Promise<{ occasion: string; theme: string }> {
  return apiJson<{ occasion: string; theme: string }>('/favorites/suggest-occasion', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
