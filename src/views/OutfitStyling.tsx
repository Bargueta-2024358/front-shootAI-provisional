import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { WaitingOverlay } from './Waiting'
import { buildStylingAnalysis, EDITORIAL_CONTEXTS } from '../data/mockStyling'
import type { EditorialContext, SilhouetteAnalysis } from '../types/styling'

// TODO: integrar la lógica real de estilismo de outfit cuando el backend
// esté disponible. Este módulo deberá recibir la imagen del usuario y
// sugerir combinaciones de prendas, colores y accesorios en base al
// análisis de silueta y la paleta editorial detectada.

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

const ACCESSORY_ICONS: Record<string, string> = {
  joyería: '◆',
  bolso: '▣',
  calzado: '◈',
  cinturón: '◎',
  otro: '◇',
}

// ---------------------------------------------------------------------------
// ImageDropzone
// ---------------------------------------------------------------------------

interface ImageFile {
  id: string
  file: File
  previewUrl: string
}

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

  return (
    <div className="flex flex-col gap-6">
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de imágenes corporales."
        className={`interactive relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 border border-dashed transition-colors duration-200 ${
          dragging
            ? 'border-caramel bg-caramel/5'
            : 'border-silver bg-smoke/40 hover:border-charcoal hover:bg-smoke/70'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (!e.target.files) return
            const valid = filterImages(e.target.files)
            if (valid.length) onAdd(valid)
            e.target.value = ''
          }}
          aria-hidden
        />

        <svg
          className={`transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-mid-gray'}`}
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <rect x="3" y="7" width="30" height="22" rx="2" />
          <circle cx="13" cy="16" r="3" />
          <path d="M3 25l8-6 6 5 5-4 11 8" />
        </svg>

        <div className="text-center px-6">
          <p className="font-display text-sm tracking-wide text-black">
            {dragging ? 'Suelta la imagen aquí' : 'Sube una foto corporal o de referencia'}
          </p>
          <p className="mt-1 font-body text-xs text-charcoal">PNG, JPG, WEBP</p>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group relative aspect-square overflow-hidden bg-smoke"
                >
                  <img
                    src={img.previewUrl}
                    alt={img.file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    aria-label={`Eliminar ${img.file.name}`}
                    className="interactive absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-caramel focus-visible:opacity-100"
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
// ContextSelector
// ---------------------------------------------------------------------------

interface ContextSelectorProps {
  selected: EditorialContext
  onChange: (ctx: EditorialContext) => void
}

function ContextSelector({ selected, onChange }: ContextSelectorProps) {
  return (
    <div>
      <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-3">
        Contexto editorial
      </p>
      <div className="flex flex-wrap gap-2">
        {EDITORIAL_CONTEXTS.map((ctx) => (
          <button
            key={ctx.id}
            type="button"
            aria-pressed={selected === ctx.id}
            title={ctx.description}
            className={`interactive border px-3 py-2 font-body text-xs transition-all duration-200 ${
              selected === ctx.id
                ? 'border-caramel bg-caramel/10 text-black'
                : 'border-silver text-charcoal hover:border-charcoal'
            }`}
            onClick={() => onChange(ctx.id)}
          >
            {ctx.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StylingAnalysisPanel
// ---------------------------------------------------------------------------

interface StylingAnalysisPanelProps {
  result: SilhouetteAnalysis | null
  loading: boolean
}

function StylingAnalysisPanel({ result, loading }: StylingAnalysisPanelProps) {
  return (
    <AnimatePresence>
      {(loading || result) && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="flex flex-col gap-8"
        >
          <div className="border-t border-silver pt-6">
            <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
              Análisis de estilismo
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-3">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-silver border-t-caramel" />
              <p className="font-body text-sm text-charcoal">Analizando silueta y contexto…</p>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-10"
            >
              {/* Silhouette type */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-3">
                  Tipo de silueta
                </p>
                <p className="font-display text-2xl font-semibold text-black">{result.type}</p>
                <p className="mt-2 font-body text-sm leading-relaxed text-charcoal">
                  {result.description}
                </p>
              </div>

              {/* Match percentage */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-3">
                  Compatibilidad editorial
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-display text-5xl font-semibold text-black leading-none">
                    {result.matchPercentage}
                    <span className="text-2xl text-caramel">%</span>
                  </span>
                  <span className="font-body text-sm text-charcoal mb-1">de match</span>
                </div>
                <div className="mt-3 h-1 w-full rounded-full bg-smoke overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-caramel"
                    initial={{ width: 0 }}
                    animate={{ width: `${result.matchPercentage}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>

              {/* Strengths */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-3">
                  Fortalezas detectadas
                </p>
                <ul className="flex flex-col gap-2">
                  {result.strengths.map((s, i) => (
                    <motion.li
                      key={s}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.06 }}
                      className="flex items-start gap-2 font-body text-sm text-charcoal"
                    >
                      <span className="mt-1 text-caramel text-[8px]">●</span>
                      {s}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-4">
                  Sugerencia de prendas
                </p>
                <ul className="flex flex-col gap-4">
                  {result.recommendations.map((rec, i) => (
                    <motion.li
                      key={rec.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                      className="flex gap-4 border-b border-smoke pb-4 last:border-b-0 last:pb-0"
                    >
                      <span className="mt-1 font-display text-xs text-caramel select-none">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="font-display text-sm font-medium text-black">{rec.label}</p>
                        <p className="mt-1 font-body text-sm leading-relaxed text-charcoal">
                          {rec.description}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Color palette */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-4">
                  Paleta editorial sugerida
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

              {/* Accessories */}
              <div>
                <p className="font-display text-xs tracking-[0.3em] uppercase text-mid-gray mb-4">
                  Accesorios recomendados
                </p>
                <ul className="flex flex-col gap-3">
                  {result.accessories.map((acc, i) => (
                    <motion.li
                      key={acc.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.07 }}
                      className="flex gap-3 border border-smoke p-3"
                    >
                      <span className="font-display text-sm text-caramel select-none mt-0.5">
                        {ACCESSORY_ICONS[acc.category] ?? '◇'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-medium text-black">{acc.label}</p>
                          <span className="font-body text-[10px] tracking-wide uppercase text-mid-gray">
                            {acc.category}
                          </span>
                        </div>
                        <p className="mt-1 font-body text-xs leading-relaxed text-charcoal">
                          {acc.description}
                        </p>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// OutfitStyling view
// ---------------------------------------------------------------------------

export default function OutfitStyling() {
  const navigate = useNavigate()
  const [images, setImages] = useState<ImageFile[]>([])
  const [context, setContext] = useState<EditorialContext>('estudio')
  const [analysis, setAnalysis] = useState<SilhouetteAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  const analysisTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runAnalysis = useCallback((ctx: EditorialContext) => {
    setAnalyzing(true)
    setShowOverlay(true)
    setAnalysis(null)
    setTimeout(() => {
      setAnalyzing(false)
      setShowOverlay(false)
      setAnalysis(buildStylingAnalysis(ctx))
    }, 2800)
  }, [])

  const triggerAnalysis = useCallback(
    (ctx: EditorialContext) => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current)
      analysisTimer.current = setTimeout(() => runAnalysis(ctx), 300)
    },
    [runAnalysis],
  )

  const handleAdd = useCallback(
    (files: File[]) => {
      const newImages: ImageFile[] = files.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      setImages((prev) => [...prev, ...newImages])
      triggerAnalysis(context)
    },
    [context, triggerAnalysis],
  )

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === id)
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((img) => img.id !== id)
      if (next.length === 0) setAnalysis(null)
      return next
    })
  }, [])

  const handleContextChange = (ctx: EditorialContext) => {
    setContext(ctx)
    if (images.length > 0) triggerAnalysis(ctx)
  }

  return (
    <>
      <Navbar />
      <WaitingOverlay
        isOpen={showOverlay}
        hideCancelButton
        onComplete={() => setShowOverlay(false)}
      />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">Módulo 04</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Outfit Styling
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Combina el análisis de silueta con sugerencias de prendas, paletas y accesorios
            adaptadas a tu cuerpo y al contexto editorial de la sesión.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-16 lg:items-start">
            {/* Left — Upload + context */}
            <div className="w-full lg:w-[55%] xl:w-[60%]">
              <div className="mb-6">
                <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                  Imagen corporal
                </p>
                <p className="mt-2 font-body text-sm text-charcoal">
                  {images.length === 0
                    ? 'Sube una foto para iniciar el análisis de silueta.'
                    : `${images.length} imagen${images.length > 1 ? 'es' : ''} cargada${images.length > 1 ? 's' : ''}.`}
                </p>
              </div>

              <ImageDropzone images={images} onAdd={handleAdd} onRemove={handleRemove} />

              <div className="mt-8">
                <ContextSelector selected={context} onChange={handleContextChange} />
              </div>

              {images.length === 0 && (
                <motion.div {...fadeUp} className="mt-8">
                  <button
                    type="button"
                    className="interactive border border-black px-6 py-3 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white"
                    onClick={() => {
                      triggerAnalysis(context)
                    }}
                  >
                    Analizar con imagen de demo
                  </button>
                </motion.div>
              )}
            </div>

            {/* Right — Analysis */}
            <div className="w-full lg:w-[45%] xl:w-[40%] lg:sticky lg:top-28">
              {images.length === 0 && !analysis && !analyzing ? (
                <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-silver py-16 text-center">
                  <svg
                    className="text-silver"
                    width="32"
                    height="32"
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <path d="M13 4l-5 6v22h20V10l-5-6" strokeLinejoin="round" />
                    <path d="M13 4c0 2.761 2.239 5 5 5s5-2.239 5-5" strokeLinejoin="round" />
                  </svg>
                  <p className="font-display text-sm text-mid-gray">
                    El análisis de estilismo aparecerá aquí
                    <br />
                    una vez subas una imagen
                  </p>
                </div>
              ) : (
                <StylingAnalysisPanel result={analysis} loading={analyzing} />
              )}
            </div>
          </div>

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
