// src/lib/atelierScan/pose.js
// Motor de deteccion de articulaciones (33 landmarks) usando MediaPipe Tasks Vision.
// Corre 100% en el navegador con WebAssembly. Gratis, sin servidor, sin GPU obligatoria.
// El bundle de MediaPipe se carga por import dinámico en loadVision() para mayor robustez.

// Indices oficiales de MediaPipe Pose (33 puntos).
export const LM = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

// Conexiones del esqueleto para dibujar lineas.
export const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // brazos + hombros
  [11, 23], [12, 24], [23, 24],                     // torso
  [23, 25], [25, 27], [24, 26], [26, 28],           // piernas
  [27, 31], [28, 32], [27, 29], [28, 30],           // pies
];

let landmarker = null;
let VisionNS = null;

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

// Import dinamico limpio (evita problemas de nombres del bundle).
// El comentario @vite-ignore evita que Vite intente resolver la URL del CDN en build.
async function loadVision() {
  if (VisionNS) return VisionNS;
  VisionNS = await import(
    /* @vite-ignore */
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs"
  );
  return VisionNS;
}

/**
 * Carga el modelo de pose una sola vez.
 * @param {(msg: string) => void} [onProgress]
 */
export async function initPose(onProgress = () => {}) {
  if (landmarker) return landmarker;
  onProgress("Descargando runtime de visión…");
  const vision = await loadVision();
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM_ROOT);
  onProgress("Cargando modelo de pose…");
  landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
    runningMode: "IMAGE",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  }).catch(async (err) => {
    // Fallback a CPU si la GPU/WebGL no esta disponible.
    console.warn("GPU delegate falló, reintentando en CPU:", err);
    return vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
      runningMode: "IMAGE",
      numPoses: 1,
    });
  });
  return landmarker;
}

/**
 * Detecta la pose sobre un HTMLImageElement / Canvas ya cargado.
 * @param {HTMLImageElement|HTMLCanvasElement} imageEl
 * @returns {Promise<{landmarks: Array<{x:number,y:number,z:number,visibility:number}>|null}>}
 *  Coordenadas x,y normalizadas [0..1] respecto al tamaño de la imagen.
 */
export async function detectPose(imageEl) {
  if (!landmarker) await initPose();
  const result = landmarker.detect(imageEl);
  const landmarks = result?.landmarks?.[0] || null;
  return { landmarks, raw: result };
}

// Export de referencia para depurar el namespace desde consola.
export function _debugVisionNamespace() {
  return VisionNS;
}
