// src/lib/usePoseCoach.ts
// Hook de coaching de pose en TIEMPO REAL para el Live-Shoot.
// Reutiliza el motor ATELIER SCAN (MediaPipe + insights editoriales) portado en
// ./atelierScan, pero en vez de una foto estática analiza el <video> de la cámara
// de forma continua: dibuja el esqueleto como overlay y va emitiendo sugerencias
// de pose como mensajes de chat en vivo.

import { useEffect, useRef, useState } from 'react'
import {
  initPose,
  detectPose,
  computeInsights,
  POSE_CONNECTIONS,
  LM,
} from './atelierScan'
import type { Insights, Landmark } from './atelierScan'

export type CoachStatus =
  | 'loading' // descargando/cargando el modelo
  | 'ready' // modelo listo, cámara aún no activa
  | 'analyzing' // detectando pose sobre el feed
  | 'no-pose' // cámara activa pero sin cuerpo detectado
  | 'error' // fallo al cargar el modelo

export type CoachMessageKind = 'suggestion' | 'diagnosis'

export interface CoachMessage {
  id: number
  text: string
  kind: CoachMessageKind
  ts: number
}

interface UsePoseCoachOptions {
  videoRef: React.RefObject<HTMLVideoElement>
  overlayRef: React.RefObject<HTMLCanvasElement>
  /** Cuando true, corre el bucle de detección sobre el video. */
  active: boolean
  /** Mínimo de ms entre detecciones (throttle). Menor = más fluido, más CPU. */
  intervalMs?: number
  /** Máximo de mensajes conservados en el feed. */
  maxMessages?: number
}

interface UsePoseCoachResult {
  status: CoachStatus
  messages: CoachMessage[]
  insights: Insights | null
}

const JOINTS = [
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW,
  LM.LEFT_WRIST, LM.RIGHT_WRIST, LM.LEFT_HIP, LM.RIGHT_HIP,
  LM.LEFT_KNEE, LM.RIGHT_KNEE, LM.LEFT_ANKLE, LM.RIGHT_ANKLE,
]

// Paleta editorial (alineada con tailwind.config.js).
const CARAMEL = '#A67B5B'

/**
 * Dibuja el esqueleto sobre un canvas transparente encima del <video>.
 * El video usa object-cover, así que replicamos el mapeo "cover" para que los
 * landmarks (normalizados al frame de la cámara) caigan sobre los píxeles
 * visibles reales.
 */
function drawOverlay(
  canvas: HTMLCanvasElement | null,
  video: HTMLVideoElement,
  landmarks: Landmark[],
): void {
  if (!canvas) return
  const cw = canvas.clientWidth
  const ch = canvas.clientHeight
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!cw || !ch || !vw || !vh) return

  const dpr = window.devicePixelRatio || 1
  const targetW = Math.round(cw * dpr)
  const targetH = Math.round(ch * dpr)
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW
    canvas.height = targetH
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cw, ch)

  // Mapeo object-cover: escala al máximo lado y centra (recorta el sobrante).
  const scale = Math.max(cw / vw, ch / vh)
  const dw = vw * scale
  const dh = vh * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2
  const P = (i: number) => ({
    x: ox + landmarks[i].x * dw,
    y: oy + landmarks[i].y * dh,
    v: landmarks[i].visibility ?? 1,
  })

  // Líneas del esqueleto con glow.
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(166,123,91,0.9)'
  ctx.lineWidth = 3
  ctx.shadowColor = 'rgba(166,123,91,0.8)'
  ctx.shadowBlur = 8
  for (const [a, b] of POSE_CONNECTIONS) {
    const pa = P(a)
    const pb = P(b)
    if (pa.v < 0.3 || pb.v < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  // Nodos en articulaciones clave.
  for (const j of JOINTS) {
    const p = P(j)
    if (p.v < 0.3) continue
    ctx.beginPath()
    ctx.fillStyle = CARAMEL
    ctx.shadowBlur = 6
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.shadowBlur = 0
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 3
  }
}

function clearOverlay(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

/** Construye los mensajes de chat a partir de los insights de una pose. */
function buildMessages(ins: Insights): { text: string; kind: CoachMessageKind }[] {
  const out: { text: string; kind: CoachMessageKind }[] = []
  out.push({
    kind: 'diagnosis',
    text: `${ins.shapeLabel}. Encuadre ${ins.metrics.framing.toLowerCase()} · ${ins.diagnosis.lens}.`,
  })
  for (const s of ins.poseSuggestions ?? []) {
    out.push({ kind: 'suggestion', text: s })
  }
  return out
}

export function usePoseCoach({
  videoRef,
  overlayRef,
  active,
  intervalMs = 500,
  maxMessages = 8,
}: UsePoseCoachOptions): UsePoseCoachResult {
  const [status, setStatus] = useState<CoachStatus>('loading')
  const [messages, setMessages] = useState<CoachMessage[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)

  const idRef = useRef(0)
  const lastSigRef = useRef('')

  // --- Carga del modelo una sola vez ---
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    initPose()
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch((err) => {
        console.error('usePoseCoach: fallo al cargar el modelo', err)
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // --- Bucle de detección en tiempo real ---
  useEffect(() => {
    if (!active) return
    let stopped = false
    let rafId = 0
    let lastDetect = 0
    let busy = false

    const pump = async () => {
      if (stopped) return
      const video = videoRef.current
      const now = performance.now()
      const ready = video && video.readyState >= 2 && video.videoWidth > 0

      if (ready && !busy && now - lastDetect >= intervalMs) {
        lastDetect = now
        busy = true
        try {
          const { landmarks } = await detectPose(video)
          if (!stopped) {
            if (landmarks) {
              const size = { width: video.videoWidth, height: video.videoHeight }
              const result = computeInsights(landmarks, size)
              drawOverlay(overlayRef.current, video, landmarks)
              setStatus('analyzing')
              setInsights(result)
              if (result) pushIfNew(result)
            } else {
              clearOverlay(overlayRef.current)
              setStatus('no-pose')
            }
          }
        } catch (err) {
          // Detección transitoria fallida: ignorar y reintentar en el siguiente frame.
          console.debug('usePoseCoach: detección fallida', err)
        } finally {
          busy = false
        }
      }

      rafId = requestAnimationFrame(pump)
    }

    const pushIfNew = (result: Insights) => {
      const primary = result.poseSuggestions?.[0] ?? ''
      const sig = `${result.shape}|${result.metrics.framing}|${primary}`
      if (sig === lastSigRef.current) return
      lastSigRef.current = sig

      const candidates = buildMessages(result)
      setMessages((prev) => {
        const recent = new Set(prev.slice(-4).map((m) => m.text))
        const fresh = candidates.filter((c) => !recent.has(c.text))
        if (fresh.length === 0) return prev
        const added: CoachMessage[] = fresh.map((c) => ({
          id: (idRef.current += 1),
          text: c.text,
          kind: c.kind,
          ts: Date.now(),
        }))
        return [...prev, ...added].slice(-maxMessages)
      })
    }

    rafId = requestAnimationFrame(pump)

    return () => {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      clearOverlay(overlayRef.current)
      lastSigRef.current = ''
      setStatus((s) => (s === 'error' || s === 'loading' ? s : 'ready'))
    }
  }, [active, intervalMs, maxMessages, videoRef, overlayRef])

  return { status, messages, insights }
}
