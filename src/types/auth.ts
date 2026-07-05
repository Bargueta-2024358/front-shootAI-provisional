export type TargetGender = 'man' | 'woman' | 'unisex' | 'kids'

export interface BodyAttributes {
  bodyType?: string
  proportions?: Record<string, string>
  skinTone?: string
  recommendedColors?: string[]
  recommendedFits?: string[]
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  gender: TargetGender
  bodyPhotoUrl: string
  bodyPhotoPublicId?: string
  bodyAttributes: BodyAttributes
  createdAt?: string
  updatedAt?: string
}

export interface OutfitGarment {
  slot: string
  name: string
  brand: string
  type: string
  imageUrl: string
  productUrl: string
  score: number
}

export interface Outfit {
  id: string
  score: number
  garments: OutfitGarment[]
}

export interface OutfitsByCategory {
  category: string
  matchPercentage: number
  outfits: Outfit[]
}

export interface FavoriteOutfit {
  id: string
  userId: string
  projectId?: string | null
  title: string
  category: string
  event: string
  occasion: string
  matchPercentage: number
  garments: OutfitGarment[]
  createdAt: string
}
