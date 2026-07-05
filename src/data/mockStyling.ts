import type {
  AccessorySuggestion,
  AvatarData,
  ColorSwatch,
  EditorialContext,
  GarmentItem,
  GarmentRecommendation,
  SilhouetteAnalysis,
} from '../types/styling'

export const EDITORIAL_CONTEXTS: { id: EditorialContext; label: string; description: string }[] = [
  { id: 'estudio', label: 'Estudio', description: 'Luz controlada, fondo neutro y poses editoriales clásicas.' },
  { id: 'exterior', label: 'Exterior', description: 'Luz natural, texturas urbanas y movimiento orgánico.' },
  { id: 'pasarela', label: 'Pasarela', description: 'Siluetas dramáticas, volumen y presencia escénica.' },
  { id: 'editorial', label: 'Editorial', description: 'Narrativa visual, capas y contraste cromático.' },
  { id: 'casual', label: 'Casual', description: 'Comodidad editorial con actitud relajada y auténtica.' },
]

const BASE_PALETTE: ColorSwatch[] = [
  { hex: '#2C2C2C', name: 'Grafito editorial' },
  { hex: '#C8B8A2', name: 'Arena cálida' },
  { hex: '#E8E0D5', name: 'Blanco roto' },
  { hex: '#6B4F3A', name: 'Caoba profundo' },
]

const BASE_RECOMMENDATIONS: GarmentRecommendation[] = [
  {
    label: 'Blazer estructurado',
    description: 'Silueta de hombros marcados para equilibrar las proporciones y proyectar autoridad editorial.',
  },
  {
    label: 'Pantalón de tiro alto',
    description: 'Alarga visualmente la figura y crea una línea limpia que favorece el plano medio.',
  },
  {
    label: 'Tejido fluido monocromático',
    description: 'Reduce la fragmentación visual y permite que la pose y la luz sean los protagonistas.',
  },
]

const BASE_ACCESSORIES: AccessorySuggestion[] = [
  {
    label: 'Collar geométrico dorado',
    category: 'joyería',
    description: 'Aporta un punto focal en el escote sin competir con la silueta del cuerpo.',
  },
  {
    label: 'Bolso estructurado mediano',
    category: 'bolso',
    description: 'Complementa la línea vertical del outfit y añade peso visual equilibrado.',
  },
  {
    label: 'Mule de tacón bajo',
    category: 'calzado',
    description: 'Alarga la pierna sin sacrificar comodidad durante la sesión prolongada.',
  },
  {
    label: 'Cinturón fino de cuero',
    category: 'cinturón',
    description: 'Define la cintura y refuerza la proporción áurea detectada en el análisis.',
  },
]

const CONTEXT_MODIFIERS: Record<
  EditorialContext,
  { extraRec: GarmentRecommendation; extraAccessory: AccessorySuggestion; paletteShift: ColorSwatch }
> = {
  estudio: {
    extraRec: {
      label: 'Camisa de seda neutra',
      description: 'Refleja la luz del estudio con suavidad y mantiene la paleta monocromática.',
    },
    extraAccessory: {
      label: 'Aretes de perla minimalistas',
      category: 'joyería',
      description: 'Brillan bajo luz artificial sin crear sombras duras en el rostro.',
    },
    paletteShift: { hex: '#F5F0EB', name: 'Marfil estudio' },
  },
  exterior: {
    extraRec: {
      label: 'Gabardina ligera',
      description: 'Añade movimiento y capas que interactúan con el viento y la luz natural.',
    },
    extraAccessory: {
      label: 'Gafas de sol oversize',
      category: 'otro',
      description: 'Protege la mirada y aporta actitud editorial en exteriores urbanos.',
    },
    paletteShift: { hex: '#8B9A7B', name: 'Verde oliva' },
  },
  pasarela: {
    extraRec: {
      label: 'Vestido asimétrico de volumen',
      description: 'Maximiza la presencia escénica y crea silueta icónica bajo focos.',
    },
    extraAccessory: {
      label: 'Tacones de plataforma',
      category: 'calzado',
      description: 'Elevan la figura y amplifican la postura dominante en pasarela.',
    },
    paletteShift: { hex: '#1A1A1A', name: 'Negro absoluto' },
  },
  editorial: {
    extraRec: {
      label: 'Capa de lino superpuesta',
      description: 'Genera profundidad narrativa y juego de transparencias en la composición.',
    },
    extraAccessory: {
      label: 'Anillo statement',
      category: 'joyería',
      description: 'Detalle escultórico que enriquece la narrativa visual del plano detalle.',
    },
    paletteShift: { hex: '#9C4B4B', name: 'Rojo lacado' },
  },
  casual: {
    extraRec: {
      label: 'Pantalón wide-leg relajado',
      description: 'Comodidad editorial con caída natural que favorece poses espontáneas.',
    },
    extraAccessory: {
      label: 'Sneaker de diseño',
      category: 'calzado',
      description: 'Contraste urbano que ancla el look en la estética street-editorial.',
    },
    paletteShift: { hex: '#D4C4B0', name: 'Beige suave' },
  },
}

export function buildStylingAnalysis(context: EditorialContext): SilhouetteAnalysis {
  const mod = CONTEXT_MODIFIERS[context]
  return {
    type: 'Reloj de arena',
    description:
      'Proporciones equilibradas entre hombros y caderas con cintura definida. Ideal para prendas que marquen la silueta sin añadir volumen innecesario.',
    matchPercentage: 87,
    strengths: [
      'Cintura naturalmente definida',
      'Proporción hombro-cadera equilibrada',
      'Línea vertical favorable para planos completos',
    ],
    recommendations: [...BASE_RECOMMENDATIONS, mod.extraRec],
    colorPalette: [...BASE_PALETTE.slice(0, 3), mod.paletteShift],
    accessories: [...BASE_ACCESSORIES, mod.extraAccessory],
  }
}

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
