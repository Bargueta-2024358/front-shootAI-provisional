import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import {
  initPose,
  detectPose,
  computeInsights,
  render,
  DEFAULT_LAYERS,
} from '../lib/atelierScan'
import type { Insights, Landmark, Layers } from '../lib/atelierScan'

// Motor ATELIER SCAN portado a React: detección de pose (MediaPipe) + insights
// editoriales + overlay dibujado sobre la foto. Reemplaza al simulador mock de
// avatar/prendas. Requiere internet la primera vez para descargar el modelo del CDN.

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

const SCAN_MS = 1600 // duración mínima visible del escaneo

type Status = 'loading' | 'ready' | 'error' | 'analyzing'

const LAYER_LABELS: { key: keyof Layers; label: string }[] = [
  { key: 'skeleton', label: 'Esqueleto y nodos' },
  { key: 'shape', label: 'Forma corporal' },
  { key: 'ratio', label: 'Líneas hombro/cadera' },
  { key: 'symmetry', label: 'Línea de simetría' },
  { key: 'limbs', label: 'Etiquetas de extremidades' },
  { key: 'camera', label: 'Ángulo de cámara' },
  { key: 'pose', label: 'Sugerencias de pose' },
  { key: 'hud', label: 'Recuadro de diagnóstico' },
]

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---------------------------------------------------------------------------
// ScanUpload — dropzone editorial (solo imágenes)
// ---------------------------------------------------------------------------

interface ScanUploadProps {
  onImage: (file: File) => void
  disabled: boolean
}

function ScanUpload({ onImage, disabled }: ScanUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const img = Array.from(files).find((f) => f.type.startsWith('image/'))
      if (img) onImage(img)
    },
    [onImage],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Zona de carga de foto. Arrastra o haz clic para seleccionar."
      aria-disabled={disabled}
      className={`interactive relative flex min-h-[280px] flex-col items-center justify-center gap-5 border border-dashed transition-colors duration-200 ${
        disabled
          ? 'cursor-not-allowed border-silver bg-smoke/40 opacity-60'
          : dragging
            ? 'cursor-pointer border-caramel bg-caramel/5'
            : 'cursor-pointer border-silver bg-smoke/40 hover:border-charcoal hover:bg-smoke/70'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
        aria-hidden
      />

      <svg
        className={`transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-mid-gray'}`}
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <ellipse cx="24" cy="14" rx="7" ry="7.5" />
        <path d="M8 42c0-9.57 7.163-16 16-16s16 6.43 16 16" strokeLinecap="round" />
        <path d="M32 24l5 5-5 5M16 24l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="px-6 text-center">
        <p className="font-display text-sm tracking-wide text-black">
          {dragging ? 'Suelta la foto aquí' : 'Sube la foto del modelo'}
        </p>
        <p className="mt-2 font-body text-xs text-charcoal">
          JPG o PNG — detectaremos la pose y el diagnóstico de composición
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LayerToggle — switch editorial
// ---------------------------------------------------------------------------

interface LayerToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function LayerToggle({ label, checked, onChange }: LayerToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="interactive flex items-center gap-3 text-left"
    >
      <span
        className={`relative h-5 w-9 flex-none rounded-full transition-colors duration-200 ${
          checked ? 'bg-caramel' : 'bg-silver'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="font-body text-xs text-charcoal">{label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// InsightsPanel — lista de diagnóstico editorial
// ---------------------------------------------------------------------------

function InsightsPanel({ insights }: { insights: Insights | null }) {
  if (!insights) {
    return (
      <p className="font-body text-sm text-charcoal">
        No se detectó una pose completa. La imagen se muestra sin overlay; prueba otra foto de cuerpo entero.
      </p>
    )
  }

  const { metrics: m, diagnosis: d, camera: cam } = insights

  return (
    <div className="flex flex-col gap-3">
      {insights.insights.map((row) => (
        <div key={row.key} className="border border-silver px-4 py-3">
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-mid-gray">
            {row.key}
          </p>
          <p className="mt-1 font-body text-sm text-black">
            {row.value} <span className="text-caramel">· {row.note}</span>
          </p>
        </div>
      ))}

      <div className="border border-silver px-4 py-3">
        <p className="font-display text-[10px] tracking-[0.25em] uppercase text-mid-gray">
          Métricas crudas
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            `H/C ${m.shoulderHip}`,
            `P/T ${m.legTorso}`,
            `offset ${m.weightShift}`,
            `apertura ${m.stance}`,
            `hombros ${m.shoulderTilt}°`,
            `codo ${m.elbowAngle}°`,
            m.profile,
            m.framing,
          ].map((chip) => (
            <span
              key={chip}
              className="border border-silver px-2 py-1 font-body text-[10px] text-charcoal"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="border border-silver px-4 py-3">
        <p className="font-display text-[10px] tracking-[0.25em] uppercase text-mid-gray">
          Ángulo de cámara
        </p>
        <p className="mt-1 font-body text-sm text-black">{cam ? cam.label : d.angle}</p>
        <p className="mt-0.5 font-body text-xs text-caramel">{d.lens}</p>
      </div>

      {insights.poseSuggestions.length > 0 && (
        <div className="border border-silver px-4 py-3">
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-mid-gray">
            Sugerencias de pose
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {insights.poseSuggestions.map((p) => (
              <li key={p} className="flex gap-2 font-body text-xs leading-relaxed text-charcoal">
                <span className="text-caramel">—</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ModelSimulator view
// ---------------------------------------------------------------------------

export default function ModelSimulator() {
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const landmarksRef = useRef<Landmark[] | null>(null)
  const insightsRef = useRef<Insights | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const [status, setStatus] = useState<Status>('loading')
  const [statusText, setStatusText] = useState('Cargando modelo…')
  const [hasImage, setHasImage] = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [poseFound, setPoseFound] = useState(false)
  const [layers, setLayers] = useState<Layers>({ ...DEFAULT_LAYERS })

  // --- Carga del modelo al montar ---
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await initPose((msg) => {
          if (!cancelled) {
            setStatus('loading')
            setStatusText(msg)
          }
        })
        if (!cancelled) {
          setStatus('ready')
          setStatusText('Modelo listo · sube una foto')
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setStatus('error')
          setStatusText('Error cargando el modelo (revisa tu conexión)')
        }
      }
    })()
    return () => {
      cancelled = true
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    render(ctx, img, landmarksRef.current, insightsRef.current, layers)
  }, [layers])

  // Redibuja cuando cambian los toggles de capas.
  useEffect(() => {
    if (poseFound) redraw()
  }, [layers, poseFound, redraw])

  const analyzeImage = useCallback(async (img: HTMLImageElement) => {
    imageRef.current = img
    setHasImage(true)
    setStatus('analyzing')
    setStatusText('Analizando…')

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) render(ctx, img, null, null, {} as Partial<Layers>)

    try {
      const [{ landmarks }] = await Promise.all([detectPose(img), delay(SCAN_MS)])
      landmarksRef.current = landmarks

      if (!landmarks) {
        insightsRef.current = null
        setInsights(null)
        setPoseFound(false)
        if (ctx && canvas) render(ctx, img, null, null, {} as Partial<Layers>)
        setStatus('error')
        setStatusText('No se detectó un cuerpo completo. Prueba otra foto.')
        return
      }

      const result = computeInsights(landmarks, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
      insightsRef.current = result
      setInsights(result)
      setPoseFound(true)
      if (ctx) render(ctx, img, landmarks, result, layers)
      setStatus('ready')
      setStatusText('Análisis completo')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setStatusText('Error durante el análisis')
    }
  }, [layers])

  const handleImage = useCallback(
    (file: File) => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => analyzeImage(img)
      img.onerror = () => {
        setStatus('error')
        setStatusText('No se pudo cargar la imagen.')
      }
      img.src = url
    },
    [analyzeImage],
  )

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return
    redraw()
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `shoot-ai-pose-${Date.now()}.png`
    a.click()
  }, [redraw])

  const handleReanalyze = useCallback(() => {
    if (imageRef.current) analyzeImage(imageRef.current)
  }, [analyzeImage])

  const handleReset = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    imageRef.current = null
    landmarksRef.current = null
    insightsRef.current = null
    setInsights(null)
    setPoseFound(false)
    setHasImage(false)
    if (status !== 'error') {
      setStatus('ready')
      setStatusText('Modelo listo · sube una foto')
    }
  }, [status])

  const statusDot =
    status === 'ready'
      ? 'bg-caramel'
      : status === 'error'
        ? 'bg-[#9C4B4B]'
        : 'bg-mid-gray'

  const analyzing = status === 'analyzing'

  return (
    <>
      <Navbar />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">Módulo 03</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Model Simulator
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Sube la foto del modelo y el motor detecta la pose, calcula proporciones e insights de
            composición y los dibuja como overlay editorial listo para exportar.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <AnimatePresence mode="wait">
            {!hasImage ? (
              <motion.div key="upload" {...fadeUp}>
                <div className="mb-4 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden />
                  <p className="font-body text-xs text-charcoal">{statusText}</p>
                </div>
                <ScanUpload onImage={handleImage} disabled={status === 'loading'} />
              </motion.div>
            ) : (
              <motion.div
                key="analyzer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-12 lg:flex-row lg:gap-16"
              >
                {/* Viewport */}
                <div className="w-full lg:w-[55%]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                      Análisis de pose
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden />
                      <p className="font-body text-xs text-charcoal">{statusText}</p>
                    </div>
                  </div>

                  <div
                    className="relative overflow-hidden bg-smoke/60 shadow-2xl ring-1 ring-black/8"
                    style={{ aspectRatio: '3 / 4' }}
                  >
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 m-auto h-full w-full object-contain"
                      aria-label="Foto del modelo con overlay de pose e insights"
                    />

                    <AnimatePresence>
                      {analyzing && (
                        <motion.div
                          key="scanning"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 overflow-hidden bg-black/20"
                        >
                          <motion.div
                            className="absolute inset-x-0 h-24"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(166,123,91,0) 0%, rgba(166,123,91,0.18) 70%, rgba(166,123,91,0.32) 100%)',
                              borderBottom: '2px solid #A67B5B',
                            }}
                            initial={{ top: '-10%' }}
                            animate={{ top: ['-10%', '100%'] }}
                            transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <p className="border border-caramel/60 bg-white/85 px-4 py-2 font-display text-[10px] tracking-[0.3em] uppercase text-caramel">
                              Analizando cuerpo…
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      disabled={!hasImage || analyzing}
                      className="interactive border border-black px-6 py-3 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={handleExport}
                    >
                      Exportar PNG
                    </button>
                    <button
                      type="button"
                      disabled={!hasImage || analyzing}
                      className="interactive border border-silver px-6 py-3 font-display text-xs tracking-[0.2em] uppercase text-charcoal transition-all duration-300 hover:border-charcoal disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={handleReanalyze}
                    >
                      Re-analizar
                    </button>
                    <button
                      type="button"
                      className="interactive font-body text-xs text-charcoal underline-offset-2 hover:text-caramel hover:underline"
                      onClick={handleReset}
                    >
                      Cargar nueva foto
                    </button>
                  </div>
                </div>

                {/* Panel de capas + insights */}
                <div className="w-full lg:w-[45%] lg:sticky lg:top-28 lg:self-start">
                  <div className="mb-6 border-t border-silver pt-6">
                    <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                      Capas del overlay
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {LAYER_LABELS.map(({ key, label }) => (
                        <LayerToggle
                          key={key}
                          label={label}
                          checked={layers[key]}
                          onChange={(checked) =>
                            setLayers((prev) => ({ ...prev, [key]: checked }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 border-t border-silver pt-6">
                    <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                      Diagnóstico
                    </p>
                    <p className="mt-2 font-body text-sm text-charcoal">
                      Métricas de proporción, encuadre y recomendaciones de pose.
                    </p>
                  </div>

                  <InsightsPanel insights={insights} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-16 flex justify-center">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="interactive border border-black px-8 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white"
              onClick={() => navigate('/live-shoot')}
            >
              Volver a Live-Shoot
            </motion.button>
          </div>
        </div>
      </main>
    </>
  )
}
