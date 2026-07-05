export interface OutfitLink {
  label: string
  url: string
}

export interface RecommendedOutfit {
  id: string
  image: string
  text: string
  links: OutfitLink[]
}

export interface ColorSwatch {
  hex: string
  name: string
}


export interface ScanMeasurements {
  height: number
  bust: number
  waist: number
  hips: number
  shoulders: number
}

export interface AvatarData {
  measurements: ScanMeasurements
  silhouetteType: string
  generatedAt: string
}

export type GarmentCategory = 'superior' | 'inferior' | 'abrigo' | 'vestido'

export interface GarmentItem {
  id: string
  label: string
  category: GarmentCategory
  colors: ColorSwatch[]
  description: string
}
