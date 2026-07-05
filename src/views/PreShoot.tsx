import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { WaitingOverlay } from './Waiting'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImageFile {
  id: string
  file: File
  previewUrl: string
}

interface AnalysisResult {
  recommendations: { label: string; description: string }[]
  matchPercentage: number
  colorPalette: { hex: string; name: string }[]
}

// ---------------------------------------------------------------------------
// Mock data
// TODO: reemplazar con llamada a la API del backend cuando esté disponible
// (endpoint esperado: POST /api/preshoot/analyze con la imagen,
// debe devolver { recommendations, matchPercentage, colorPalette })
// ---------------------------------------------------------------------------

const MOCK_RECOMMENDATIONS = [
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

// TODO: paleta de color real → reemplazar con análisis de color dominante
// de la imagen cuando el backend esté disponible.
const MOCK_PALETTES: { colors: { hex: string; name: string }[]; matchPercentage: number }[] = [
  {
    matchPercentage: 87,
    colors: [
      { hex: '#2C2C2C', name: 'Grafito editorial' },
      { hex: '#C8B8A2', name: 'Arena cálida' },
      { hex: '#E8E0D5', name: 'Blanco roto' },
      { hex: '#6B4F3A', name: 'Caoba profundo' },
    ],
  },
  {
    matchPercentage: 82,
    colors: [
      { hex: '#3D4A5C', name: 'Pizarra nórdica' },
      { hex: '#B8C4D0', name: 'Niebla ártica' },
      { hex: '#8BA3B0', name: 'Cobre helado' },
      { hex: '#F0F4F7', name: 'Blanco glacial' },
    ],
  },
  {
    matchPercentage: 91,
    colors: [
      { hex: '#C4704A', name: 'Terracota viva' },
      { hex: '#D4944A', name: 'Azafrán editorial' },
      { hex: '#F2DDB0', name: 'Crema solar' },
      { hex: '#8B5030', name: 'Tierra siena' },
    ],
  },
  {
    matchPercentage: 79,
    colors: [
      { hex: '#1A1A1A', name: 'Negro absoluto' },
      { hex: '#A82837', name: 'Carmesí editorial' },
      { hex: '#F8F5EE', name: 'Marfil puro' },
      { hex: '#9E6B3A', name: 'Cobre bruñido' },
    ],
  },
]

// ---------------------------------------------------------------------------
// AnalysisPanel
// ---------------------------------------------------------------------------

interface AnalysisPanelProps {
  result: AnalysisResult | null
  loading: boolean
}

function AnalysisPanel({ result, loading }: AnalysisPanelProps) {
  return (
    <AnimatePresence>
      {(loading || result) && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex flex-col gap-6"
        >
          <div className="border-t border-silver pt-6">
            <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
              Análisis de sesión
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-silver border-t-caramel" />
              <p className="font-body text-sm text-charcoal">Analizando imágenes…</p>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              {/* Match percentage — dark card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-sm p-5"
                style={{ backgroundColor: '#7A5A40' }}
              >
                <p className="font-display text-xs tracking-[0.3em] uppercase text-white/60 mb-3">
                  Compatibilidad de silueta
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-display text-5xl font-semibold text-white leading-none">
                    {result.matchPercentage}
                    <span className="text-2xl text-[#EEDFC9]">%</span>
                  </span>
                  <span className="font-body text-sm text-white/70 mb-1">de match</span>
                </div>
                <div className="mt-4 h-1 w-full rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.matchPercentage}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
                  />
                </div>
              </motion.div>

              {/* Recommendations — dark cards */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-3">
                  Recomendación de prendas
                </p>
                <div className="flex flex-col gap-3">
                  {result.recommendations.map((rec, i) => (
                    <motion.div
                      key={rec.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.25 + i * 0.1 }}
                      className="rounded-sm p-5"
                      style={{ backgroundColor: '#7A5A40' }}
                    >
                      <div className="flex gap-3 items-start">
                        <span className="font-display text-xs text-[#EEDFC9] select-none mt-0.5 shrink-0">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="font-display text-sm font-medium text-white">{rec.label}</p>
                          <p className="mt-1 font-body text-sm leading-relaxed text-white/75">
                            {rec.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Color palette */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-4">
                  Paleta de color sugerida
                </p>
                <div className="flex flex-wrap gap-3">
                  {result.colorPalette.map((color, i) => (
                    <motion.div
                      key={color.hex}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35, delay: 0.35 + i * 0.07 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className="h-12 w-12 rounded-sm shadow-sm ring-1 ring-silver/40"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                      />
                      <p className="font-body text-[10px] text-charcoal text-center max-w-[56px] leading-tight">
                        {color.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// ImageDropzone
// ---------------------------------------------------------------------------

interface ImageDropzoneProps {
  images: ImageFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}

function ImageDropzone({ images, onAdd, onRemove }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const filterImages = (files: FileList | File[]) =>
    Array.from(files).filter((f) => f.type.startsWith('image/'))

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const valid = filterImages(e.dataTransfer.files)
      if (valid.length) onAdd(valid)
    },
    [onAdd],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const valid = filterImages(e.target.files)
    if (valid.length) onAdd(valid)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de imágenes. Arrastra o haz clic para seleccionar."
        className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 border border-dashed transition-colors duration-200 ${
          dragging
            ? 'border-caramel bg-caramel/5'
            : 'border-silver bg-smoke/40 hover:border-charcoal hover:bg-smoke/70'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleChange}
          aria-hidden
        />
        <svg
          className={`transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-mid-gray'}`}
          width="36" height="36" viewBox="0 0 36 36"
          fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden
        >
          <rect x="3" y="7" width="30" height="22" rx="2" />
          <circle cx="13" cy="16" r="3" />
          <path d="M3 25l8-6 6 5 5-4 11 8" />
        </svg>
        <div className="text-center px-6">
          <p className="font-display text-sm tracking-wide text-black">
            {dragging ? 'Suelta las imágenes aquí' : 'Arrastra imágenes o haz clic para seleccionar'}
          </p>
          <p className="mt-1 font-body text-xs text-charcoal">
            PNG, JPG, WEBP — múltiples archivos permitidos
          </p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {images.length > 0 && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4">
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  className="group relative aspect-square overflow-hidden bg-smoke"
                >
                  <img
                    src={img.previewUrl}
                    alt={img.file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30" />
                  <button
                    type="button"
                    aria-label={`Eliminar ${img.file.name}`}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-caramel focus-visible:opacity-100"
                    onClick={() => onRemove(img.id)}
                  >
                    <span className="text-xs leading-none">×</span>
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PreShoot view
// ---------------------------------------------------------------------------

export default function PreShoot() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  // BOTÓN PROVISIONAL - eliminar cuando el flujo real de espera esté
  // conectado al backend y se dispare automáticamente al procesar la imagen.
  const [showWaiting, setShowWaiting] = useState(false)

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = useCallback((files: File[]) => {
    const newImages: ImageFile[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setImages((prev) => [...prev, ...newImages])
    triggerAnalysis()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((img) => img.id !== id)
      if (next.length === 0) setAnalysisResult(null)
      return next
    })
  }, [])

  // TODO: reemplazar con llamada a la API del backend cuando esté disponible
  // (endpoint esperado: POST /api/preshoot/analyze con la imagen,
  // debe devolver { recommendations, matchPercentage, colorPalette })
  function analyzeImages() {
    setAnalyzing(true)
    setAnalysisResult(null)
    setTimeout(() => {
      // TODO: paleta aleatoria → reemplazar por análisis real de color dominante
      const picked = MOCK_PALETTES[Math.floor(Math.random() * MOCK_PALETTES.length)]
      setAnalyzing(false)
      setAnalysisResult({
        recommendations: MOCK_RECOMMENDATIONS,
        matchPercentage: picked.matchPercentage,
        colorPalette: picked.colors,
      })
    }, 1800)
  }

  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function triggerAnalysis() {
    if (analysisTimer.current) clearTimeout(analysisTimer.current)
    analysisTimer.current = setTimeout(() => analyzeImages(), 300)
  }

  return (
    <>
      <Navbar />

      {/* BOTÓN PROVISIONAL - eliminar cuando el flujo real de espera esté
          conectado al backend y se dispare automáticamente al procesar la imagen. */}
      <WaitingOverlay
        isOpen={showWaiting}
        onComplete={() => setShowWaiting(false)}
        hideCancelButton={false}
      />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Módulo 01
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Pre-Shoot
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Sube imágenes de referencia para que el sistema analice siluetas, recomiende prendas
            y genere una paleta editorial personalizada antes de la sesión.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-16 lg:items-start">

            {/* Left — Dropzone */}
            <div className="w-full lg:w-[55%] xl:w-[60%]">
              <div className="mb-6">
                <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                  Imágenes de referencia
                </p>
                <p className="mt-2 font-body text-sm text-charcoal">
                  {images.length === 0
                    ? 'Aún no has subido imágenes.'
                    : `${images.length} imagen${images.length > 1 ? 'es' : ''} cargada${images.length > 1 ? 's' : ''}.`}
                </p>
              </div>

              <ImageDropzone images={images} onAdd={handleAdd} onRemove={handleRemove} />

              {/* BOTÓN PROVISIONAL - eliminar cuando el flujo real de espera esté
                  conectado al backend y se dispare automáticamente al procesar la imagen. */}
              <button
                type="button"
                className="mt-6 border border-silver px-4 py-2 font-display text-[10px] tracking-[0.2em] uppercase text-mid-gray transition-colors hover:border-caramel hover:text-caramel"
                onClick={() => setShowWaiting(true)}
              >
                Ver pantalla de espera (demo)
              </button>
            </div>

            {/* Right — Analysis panel */}
            <div className="w-full lg:w-[45%] xl:w-[40%] lg:sticky lg:top-28">
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-silver py-16 text-center">
                  <svg className="text-silver" width="32" height="32" viewBox="0 0 32 32"
                    fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <circle cx="16" cy="16" r="13" />
                    <path d="M16 10v6M16 20v2" strokeLinecap="round" />
                  </svg>
                  <p className="font-display text-sm text-mid-gray">
                    El análisis aparecerá aquí<br />una vez subas imágenes
                  </p>
                </div>
              ) : (
                <AnalysisPanel result={analysisResult} loading={analyzing} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
