import type { AvatarData, GarmentItem, RecommendedOutfit } from '../types/styling'

export const MOCK_RECOMMENDED_OUTFITS: RecommendedOutfit[] = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
    text: 'Look editorial de estudio con blazer estructurado y pantalón de tiro alto. Ideal para sesiones con luz controlada.',
    links: [
      { label: 'Ver blazer', url: '#' },
      { label: 'Ver pantalón', url: '#' },
    ],
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80',
    text: 'Combinación monocromática en tonos neutros. Tejidos fluidos que favorecen la silueta y el movimiento.',
    links: [
      { label: 'Ver conjunto', url: '#' },
    ],
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
    text: 'Estilo exterior con capas ligeras y accesorios statement. Perfecto para sesiones en locación urbana.',
    links: [
      { label: 'Ver gabardina', url: '#' },
      { label: 'Ver accesorios', url: '#' },
    ],
  },
]

export const MOCK_AVATAR: AvatarData = {
  measurements: {
    height: 172,
    bust: 88,
    waist: 66,
    hips: 94,
    shoulders: 40,
  },
  silhouetteType: 'Reloj de arena',
  generatedAt: new Date().toISOString(),
}

export const GARMENT_CATALOG: GarmentItem[] = [
  {
    id: 'blazer',
    label: 'Blazer estructurado',
    category: 'abrigo',
    colors: [
      { hex: '#2C2C2C', name: 'Grafito' },
      { hex: '#6B4F3A', name: 'Caoba' },
      { hex: '#C8B8A2', name: 'Arena' },
    ],
    description: 'Hombros marcados, corte entallado.',
  },
  {
    id: 'camisa',
    label: 'Camisa de seda',
    category: 'superior',
    colors: [
      { hex: '#E8E0D5', name: 'Blanco roto' },
      { hex: '#C8B8A2', name: 'Arena' },
      { hex: '#2C2C2C', name: 'Grafito' },
    ],
    description: 'Caída fluida, cuello abierto.',
  },
  {
    id: 'pantalon',
    label: 'Pantalón tiro alto',
    category: 'inferior',
    colors: [
      { hex: '#2C2C2C', name: 'Grafito' },
      { hex: '#6B4F3A', name: 'Caoba' },
      { hex: '#1A1A1A', name: 'Negro' },
    ],
    description: 'Pierna recta, cintura alta.',
  },
  {
    id: 'vestido',
    label: 'Vestido midi',
    category: 'vestido',
    colors: [
      { hex: '#9C4B4B', name: 'Rojo lacado' },
      { hex: '#2C2C2C', name: 'Grafito' },
      { hex: '#C8B8A2', name: 'Arena' },
    ],
    description: 'Silueta entallada, largo midi.',
  },
  {
    id: 'gabardina',
    label: 'Gabardina ligera',
    category: 'abrigo',
    colors: [
      { hex: '#8B9A7B', name: 'Oliva' },
      { hex: '#C8B8A2', name: 'Arena' },
      { hex: '#E8E0D5', name: 'Marfil' },
    ],
    description: 'Capa exterior con movimiento.',
  },
  {
    id: 'top',
    label: 'Top ajustado',
    category: 'superior',
    colors: [
      { hex: '#1A1A1A', name: 'Negro' },
      { hex: '#E8E0D5', name: 'Marfil' },
      { hex: '#9C4B4B', name: 'Rojo' },
    ],
    description: 'Manga corta, corte ceñido.',
  },
]
