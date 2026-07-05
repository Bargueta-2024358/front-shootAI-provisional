export interface ColorSwatch {
  hex: string
  name: string
}

export interface GarmentRecommendation {
  label: string
  description: string
}

export interface AccessorySuggestion {
  label: string
  category: 'joyería' | 'bolso' | 'calzado' | 'cinturón' | 'otro'
  description: string
}

export interface SilhouetteAnalysis {
  type: string
  description: string
  matchPercentage: number
  strengths: string[]
  recommendations: GarmentRecommendation[]
  colorPalette: ColorSwatch[]
  accessories: AccessorySuggestion[]
}

export type EditorialContext =
  | 'estudio'
  | 'exterior'
  | 'pasarela'
  | 'editorial'
  | 'casual'

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
