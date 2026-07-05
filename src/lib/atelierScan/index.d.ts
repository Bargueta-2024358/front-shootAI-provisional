// Type declarations for the ATELIER SCAN pose engine (JS modules).

export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

export interface ImageSize {
  width: number
  height: number
}

export interface Layers {
  skeleton: boolean
  shape: boolean
  ratio: boolean
  symmetry: boolean
  limbs: boolean
  camera: boolean
  pose: boolean
  hud: boolean
}

export interface InsightRow {
  key: string
  value: string
  note: string
}

export interface CameraInfo {
  position: 'low' | 'high' | 'eye'
  angleDeg: number
  targetIndex: number
  label: string
  angleText: string
  originN: { x: number; y: number }
  targetN: { x: number; y: number }
}

export interface Insights {
  metrics: {
    shoulderHip: number
    weightShift: number
    legTorso: number
    stance: number
    shoulderTilt: number
    hipTilt: number
    elbowAngle: number
    armLen: number
    legLen: number
    torsoLen: number
    profile: string
    framing: string
  }
  insights: InsightRow[]
  diagnosis: {
    angle: string
    lens: string
    poseDynamic: string
  }
  shape: 'inverted' | 'A' | 'balanced'
  shapeLabel: string
  camera: CameraInfo
  poseSuggestions: string[]
  anchors: Record<string, { x: number; y: number }>
}

export declare const LM: Record<string, number>
export declare const POSE_CONNECTIONS: [number, number][]
export declare const CONFIG: Record<string, number>
export declare const DEFAULT_LAYERS: Layers

export declare function initPose(
  onProgress?: (msg: string) => void,
): Promise<unknown>

export declare function detectPose(
  imageEl: HTMLImageElement | HTMLCanvasElement,
): Promise<{ landmarks: Landmark[] | null; raw?: unknown }>

export declare function computeInsights(
  lm: Landmark[] | null,
  size: ImageSize,
): Insights | null

export declare function render(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  lm: Landmark[] | null,
  insights: Insights | null,
  layers?: Partial<Layers>,
): void
