import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import ModuleNavBar from '../components/ModuleNavBar'
import { WaitingOverlay } from './Waiting'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedFile {
  id: string
  file: File
  previewUrl: string | null // null for non-image files
}

interface AnalysisResult {
  recommendations: { label: string; description: string }[]
  matchPercentage: number
  colorPalette: { hex: string; name: string }[]
}

// ---------------------------------------------------------------------------
// File type helpers
// ---------------------------------------------------------------------------

const ACCEPTED_DOC_TYPES = new Set([
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
])

const isImageFile = (f: File) => f.type.startsWith('image/')
const isDocFile   = (f: File) => ACCEPTED_DOC_TYPES.has(f.type)
const isAccepted  = (f: File) => isImageFile(f) || isDocFile(f)

// TODO: cuando el backend esté disponible, los archivos de documento
// (PDF/DOC/TXT) se usarán para extraer texto/contexto adicional para
// el análisis de estilismo, no solo las imágenes.

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
  {
    label: 'Zapato de cuero minimalista',
    description: 'Aporta continuidad de línea sin competir con la prenda principal, ancla el look al suelo editorial.',
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
// Framer Motion variants — stagger reveal for analysis section
// ---------------------------------------------------------------------------

const sectionVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
}

const blockVariants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const cardVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 },
  }),
}

// ---------------------------------------------------------------------------
// Document icon (inline SVG)
// ---------------------------------------------------------------------------

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="26" height="32" viewBox="0 0 28 34"
      fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M4 2h14l6 6v24H4V2z" />
      <path d="M18 2v6h6" strokeLinejoin="round" />
      <line x1="8" y1="14" x2="20" y2="14" />
      <line x1="8" y1="19" x2="20" y2="19" />
      <line x1="8" y1="24" x2="15" y2="24" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Section label — unified style used across all analysis blocks
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[10px] tracking-[0.38em] uppercase text-mid-gray mb-4">
      {children}
    </p>
  )
}

// ---------------------------------------------------------------------------
// AnalysisPanel
// ---------------------------------------------------------------------------

function AnalysisPanel({ result, loading }: { result: AnalysisResult | null; loading: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {(loading || result) && (
        <motion.div
          key="analysis-panel"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Divider + heading */}
          <div className="mb-10 border-t border-silver/50 pt-8">
            <p className="font-display text-[10px] tracking-[0.45em] uppercase text-mid-gray">
              Análisis de sesión
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-4 py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-silver border-t-caramel" />
              <p className="font-body text-sm text-charcoal">Analizando archivos…</p>
            </div>
          )}

          {result && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-10"
            >
              {/* ── 1. Compatibilidad de silueta ── */}
              <motion.div variants={blockVariants}>
                <SectionLabel>Compatibilidad de silueta</SectionLabel>
                <div
                  className="rounded-sm p-6 shadow-lg shadow-black/10"
                  style={{ backgroundColor: '#7A5A40' }}
                >
                  <div className="flex items-end gap-3">
                    <span className="font-display text-6xl font-semibold text-white leading-none">
                      {result.matchPercentage}
                      <span className="text-3xl text-[#EEDFC9]">%</span>
                    </span>
                    <span className="font-body text-sm text-white/70 mb-1.5">de match</span>
                  </div>
                  <div className="mt-5 h-[3px] w-full rounded-full bg-white/20 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${result.matchPercentage}%` }}
                      transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* ── 2. Recomendación de prendas — horizontal scroll ── */}
              <motion.div variants={blockVariants}>
                <SectionLabel>Recomendación de prendas</SectionLabel>
                <div className="overflow-x-auto overflow-y-hidden scroll-caramel-x pb-3">
                  <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                    {result.recommendations.map((rec, i) => (
                      <motion.div
                        key={rec.label}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className="w-[270px] flex-shrink-0 rounded-sm p-5 shadow-lg shadow-black/10 transition-transform duration-300 hover:scale-[1.02]"
                        style={{ backgroundColor: '#7A5A40' }}
                      >
                        <span className="font-display text-xs text-[#EEDFC9] select-none">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-2 font-display text-sm font-medium text-white">{rec.label}</p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-white/75">
                          {rec.description}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* ── 3. Paleta de color sugerida ── */}
              <motion.div variants={blockVariants}>
                <SectionLabel>Paleta de color sugerida</SectionLabel>
                <div className="flex flex-wrap gap-4">
                  {result.colorPalette.map((color, i) => (
                    <motion.div
                      key={color.hex}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.38, ease: 'easeOut', delay: 0.1 + i * 0.07 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className="h-16 w-16 rounded-md shadow-md ring-1 ring-black/8"
                        style={{ backgroundColor: color.hex }}
                        title={color.hex}
                      />
                      <p className="font-body text-[10px] text-charcoal text-center max-w-[68px] leading-tight">
                        {color.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// FileDropzone
// ---------------------------------------------------------------------------

interface FileDropzoneProps {
  files: UploadedFile[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
}

function FileDropzone({ files, onAdd, onRemove }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const filterAccepted = (list: FileList | File[]) => Array.from(list).filter(isAccepted)

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const valid = filterAccepted(e.dataTransfer.files)
      if (valid.length) onAdd(valid)
    },
    [onAdd],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const valid = filterAccepted(e.target.files)
    if (valid.length) onAdd(valid)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga. Arrastra o haz clic para seleccionar imágenes o documentos."
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-5 border border-dashed transition-all duration-200 ${
          dragging
            ? 'border-caramel bg-caramel/5'
            : 'border-silver bg-smoke/30 hover:border-charcoal/60 hover:bg-smoke/60'
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
          accept="image/*,.txt,.doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          multiple
          className="sr-only"
          onChange={handleChange}
          aria-hidden
        />

        {/* Animated icon */}
        <motion.div
          animate={{ scale: dragging ? 1.12 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <svg
            className={`transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-mid-gray'}`}
            width="38" height="38" viewBox="0 0 36 36"
            fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden
          >
            <rect x="3" y="7" width="30" height="22" rx="2" />
            <circle cx="13" cy="16" r="3" />
            <path d="M3 25l8-6 6 5 5-4 11 8" />
          </svg>
        </motion.div>

        <div className="text-center px-8">
          <p className={`font-display text-sm tracking-wide transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-black'}`}>
            {dragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
          </p>
          <p className="mt-1.5 font-body text-xs text-charcoal/70">
            Imágenes (PNG, JPG, WEBP), documentos (PDF, DOC, DOCX, TXT) — múltiples archivos permitidos
          </p>
        </div>
      </div>

      {/* Thumbnail grid */}
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
              {files.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  className="group relative aspect-square overflow-hidden bg-smoke"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 bg-smoke">
                      <DocIcon className="text-mid-gray" />
                      <p className="w-full truncate text-center font-body text-[8px] text-charcoal leading-tight px-1">
                        {item.file.name}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25" />
                  <button
                    type="button"
                    aria-label={`Eliminar ${item.file.name}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-caramel focus-visible:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id) }}
                  >
                    <span className="text-[10px] leading-none">×</span>
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
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showWaiting, setShowWaiting] = useState(false)

  // TODO: este texto se debe enviar junto con las imágenes/documentos
  // al backend como contexto adicional para el análisis de estilismo.
  const [notes, setNotes] = useState('')

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = useCallback((incoming: File[]) => {
    const newFiles: UploadedFile[] = incoming.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null,
    }))
    // Part A: do NOT auto-trigger analysis on file add
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      const next = prev.filter((f) => f.id !== id)
      // Part A: keep previous analysis result visible even after removing files
      return next
    })
  }, [])

  // Part A: analysis is triggered ONLY by the "Analizar" button
  // TODO: reemplazar con llamada a la API del backend cuando esté disponible
  // (endpoint esperado: POST /api/preshoot/analyze con la imagen,
  // debe devolver { recommendations, matchPercentage, colorPalette })
  function analyzeImages() {
    if (analyzing) return
    setAnalyzing(true)
    setTimeout(() => {
      const picked = MOCK_PALETTES[Math.floor(Math.random() * MOCK_PALETTES.length)]
      setAnalyzing(false)
      setAnalysisResult({
        recommendations: MOCK_RECOMMENDATIONS,
        matchPercentage: picked.matchPercentage,
        colorPalette: picked.colors,
      })
    }, 1400)
  }

  const canAnalyze = files.length > 0 && !analyzing

  return (
    <>
      <Navbar />

      {/* BOTÓN PROVISIONAL — eliminar cuando el flujo real de espera esté
          conectado al backend y se dispare automáticamente al procesar la imagen. */}
      <WaitingOverlay
        isOpen={showWaiting}
        onComplete={() => setShowWaiting(false)}
        hideCancelButton={false}
      />

      {/* ── Dark header ── */}
      <div className="relative overflow-hidden bg-black pt-20">
        {/* Decorative "01" behind the title */}
        <span
          className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 select-none font-display font-semibold leading-none text-white"
          style={{ fontSize: 'clamp(8rem, 20vw, 18rem)', opacity: 0.04 }}
          aria-hidden
        >
          01
        </span>

        <div className="relative mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-[10px] tracking-[0.45em] text-mid-gray uppercase">
            Módulo 01
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Pre-Shoot
          </h1>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-charcoal">
            Sube imágenes y documentos de referencia para que el sistema analice siluetas,
            recomiende prendas y genere una paleta editorial personalizada antes de la sesión.
          </p>
        </div>

        {/* Subtle bottom divider */}
        <div className="border-b border-mid-gray/20" />
      </div>

      {/* ── White content area ── */}
      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">

          {/* ── Notes textarea ── */}
          <section className="py-16 md:py-20">
            <p className="font-display text-[10px] tracking-[0.38em] uppercase text-mid-gray mb-4">
              Notas de contexto
            </p>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className={`w-full resize-none border border-mid-gray/30 bg-white px-5 py-4 font-body text-sm text-charcoal transition-colors duration-200 focus:border-caramel focus:outline-none ${
                  notes === '' ? 'text-center' : 'text-left'
                }`}
                style={notes === '' ? { paddingTop: '2.75rem' } : {}}
              />
              {notes === '' && (
                <span
                  className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center font-body text-sm italic text-mid-gray/50"
                  aria-hidden
                >
                  Escribe…
                </span>
              )}
            </div>
          </section>

          {/* Thin divider between sections */}
          <div className="border-t border-silver/40" />

          {/* ── File dropzone ── */}
          <section className="py-16 md:py-20">
            <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="font-display text-[10px] tracking-[0.38em] uppercase text-mid-gray">
                  Archivos de referencia
                </p>
                <p className="mt-2 font-body text-sm text-charcoal/70">
                  {files.length === 0
                    ? 'Aún no has subido archivos.'
                    : `${files.length} archivo${files.length > 1 ? 's' : ''} cargado${files.length > 1 ? 's' : ''}.`}
                </p>
              </div>
              {/* BOTÓN PROVISIONAL */}
              <button
                type="button"
                className="border border-silver px-4 py-2 font-display text-[9px] tracking-[0.2em] uppercase text-mid-gray/70 transition-colors hover:border-caramel hover:text-caramel"
                onClick={() => setShowWaiting(true)}
              >
                Ver pantalla de espera (demo)
              </button>
            </div>

            <FileDropzone files={files} onAdd={handleAdd} onRemove={handleRemove} />

            {/* ── Analizar button (Part A) ── */}
            <div className="mt-8 flex items-center gap-4">
              <button
                type="button"
                disabled={!canAnalyze}
                onClick={analyzeImages}
                className={`flex items-center gap-3 px-10 py-4 font-display text-xs tracking-[0.25em] uppercase text-white transition-all duration-200 focus-visible:outline-none ${
                  canAnalyze
                    ? 'bg-[#A67B5B] hover:bg-[#8B6449] focus-visible:bg-[#8B6449]'
                    : 'cursor-not-allowed bg-[#A67B5B] opacity-35'
                }`}
              >
                {analyzing ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Analizando…
                  </>
                ) : analysisResult ? (
                  'Analizar de nuevo'
                ) : (
                  'Analizar'
                )}
              </button>

              {files.length === 0 && (
                <p className="font-body text-xs text-mid-gray/60 italic">
                  Sube al menos un archivo para habilitar el análisis
                </p>
              )}
            </div>
          </section>

          {/* Thin divider */}
          <div className="border-t border-silver/40" />

          {/* ── Analysis panel ── */}
          <section className="py-16 md:py-20">
            <AnimatePresence mode="wait">
              {!analyzing && !analysisResult ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-4 border border-dashed border-silver/60 py-20 text-center"
                >
                  <svg className="text-silver/70" width="34" height="34" viewBox="0 0 32 32"
                    fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <circle cx="16" cy="16" r="13" />
                    <path d="M16 10v6M16 20v2" strokeLinecap="round" />
                  </svg>
                  <p className="font-display text-sm text-mid-gray">
                    El análisis aparecerá aquí<br />una vez presiones "Analizar"
                  </p>
                </motion.div>
              ) : (
                <AnalysisPanel result={analysisResult} loading={analyzing} />
              )}
            </AnimatePresence>
          </section>

        </div>
      </main>

      {/* ── Module navigation (Part C) ── */}
      <ModuleNavBar current="pre-shoot" variant="inline" />
    </>
  )
}
