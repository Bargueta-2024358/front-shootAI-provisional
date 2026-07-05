import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import ModuleNavBar from '../components/ModuleNavBar'
import { WaitingOverlay } from './Waiting'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'
import {
  loadPreShootState,
  savePreShootState,
  type TargetGender,
} from '../lib/sessionFlow'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UploadedFile {
  id: string
  file: File
  previewUrl: string | null // null for non-image files
}

interface CategoryResult {
  tags: string[]
}

const GENDER_OPTIONS: { value: TargetGender; label: string }[] = [
  { value: 'woman', label: 'Mujer' },
  { value: 'man', label: 'Hombre' },
  { value: 'unisex', label: 'Unisex' },
]

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

function syncPreShootSession(
  projectId: string,
  sessionGender: TargetGender,
  tags: string[],
  sessionNotes: string
) {
  savePreShootState({
    projectId,
    gender: sessionGender,
    tags,
    notes: sessionNotes,
  })
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

function AnalysisPanel({
  result,
  loading,
  projectId,
  onGoOutfits,
  onGoCamera,
}: {
  result: CategoryResult | null
  loading: boolean
  projectId: string | null
  onGoOutfits: () => void
  onGoCamera: () => void
}) {
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
              Paso 1 · Categorías de estilo
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-4 py-8">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-silver border-t-caramel" />
              <p className="font-body text-sm text-charcoal">Detectando categorías…</p>
            </div>
          )}

          {result && (
            <motion.div
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-10"
            >
              <motion.div variants={blockVariants}>
                <SectionLabel>Categorías detectadas</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {(result.tags ?? []).map((tag, i) => (
                    <motion.span
                      key={`${tag}-${i}`}
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 + i * 0.04 }}
                      className="rounded-sm border border-[#7A5A40]/30 bg-[#7A5A40]/10 px-3 py-1.5 font-body text-xs uppercase tracking-wide text-charcoal"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {projectId && (
                <motion.div variants={blockVariants} className="flex flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={onGoOutfits}
                    className="bg-[#A67B5B] px-10 py-4 font-display text-xs tracking-[0.25em] uppercase text-white transition-colors hover:bg-[#8B6449] focus-visible:bg-[#8B6449]"
                  >
                    Ir a outfits
                  </button>
                  <button
                    type="button"
                    onClick={onGoCamera}
                    className="border border-charcoal px-10 py-4 font-display text-xs tracking-[0.25em] uppercase text-charcoal transition-colors hover:border-caramel hover:text-caramel"
                  >
                    Ir a cámara
                  </button>
                </motion.div>
              )}
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
            Fotos de outfits de referencia (PNG, JPG, WEBP) o documentos (PDF, DOC, TXT). Las imágenes
            solo sirven para detectar categorías; tus outfits usarán ropa que te favorezca.
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
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [categoryResult, setCategoryResult] = useState<CategoryResult | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [gender, setGender] = useState<TargetGender>(
    profile?.gender === 'kids' ? 'unisex' : (profile?.gender ?? 'unisex')
  )

  useEffect(() => {
    if (profile?.gender && profile.gender !== 'kids') {
      setGender(profile.gender)
    }
  }, [profile?.gender])

  useEffect(() => {
    const saved = loadPreShootState()
    if (!saved) return
    setProjectId(saved.projectId)
    setGender(saved.gender)
    if (saved.tags.length > 0) {
      setCategoryResult({ tags: saved.tags })
    }
    if (saved.notes) {
      setNotes(saved.notes)
    }
  }, [])

  const goToOutfits = useCallback(() => {
    if (!projectId) return
    syncPreShootSession(
      projectId,
      gender,
      categoryResult?.tags ?? [],
      notes.trim()
    )
    navigate('/outfit-styling', { state: { projectId, gender } })
  }, [navigate, projectId, gender, categoryResult?.tags, notes])

  const goToCamera = useCallback(() => {
    if (!projectId) return
    syncPreShootSession(
      projectId,
      gender,
      categoryResult?.tags ?? [],
      notes.trim()
    )
    navigate('/live-shoot', { state: { projectId, gender } })
  }, [navigate, projectId, gender, categoryResult?.tags, notes])

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

  async function analyzeImages() {
    if (analyzing) return
    setAnalyzing(true)
    setAnalysisError(null)

    try {
      const formData = new FormData()
      if (notes.trim()) {
        formData.append('freeText', notes.trim())
      }
      for (const item of files) {
        if (isImageFile(item.file)) {
          formData.append('images', item.file)
        } else {
          formData.append('documents', item.file)
        }
      }

      const saveRes = await apiFetch('/requirements', {
        method: 'POST',
        body: formData,
      })
      const saveJson = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveJson?.error?.message || 'Error al guardar los requerimientos')
      }

      const projectIdFromSave = saveJson.data?.projectId
      if (!projectIdFromSave) {
        throw new Error('No se recibió projectId del servidor')
      }

      setProjectId(projectIdFromSave)

      const categoriesRes = await apiFetch(
        `/requirements/${projectIdFromSave}/categories`,
        {
          method: 'POST',
          body: JSON.stringify({ gender }),
        }
      )
      const categoriesJson = await categoriesRes.json()
      if (!categoriesRes.ok) {
        throw new Error(categoriesJson?.error?.message || 'Error al detectar categorías')
      }

      const data = categoriesJson.data
      const tags: string[] = data.tags || [
        ...(data.extractedCategories || []),
        ...(data.aestheticTags || []),
      ]

      setCategoryResult({ tags })
      savePreShootState({
        projectId: projectIdFromSave,
        gender,
        tags,
        notes: notes.trim(),
      })
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Error inesperado durante el análisis')
    } finally {
      setAnalyzing(false)
    }
  }

  const canAnalyze = files.length > 0 && !analyzing

  return (
    <>
      <Navbar />

      <WaitingOverlay
        isOpen={analyzing}
        autoDismiss={false}
        hideCancelButton
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
            Sube imágenes de outfits de referencia para detectar categorías de estilo. La ropa
            recomendada se adaptará a tu foto base y a lo que te favorece.
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
              ¿Qué deseas?
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
                  Ej: &quot;look casual para oficina&quot; o sube fotos de outfits de referencia para detectar su categoría…
                </span>
              )}
            </div>

            <div className="mt-8">
              <p className="font-display text-[10px] tracking-[0.38em] uppercase text-mid-gray mb-3">
                Para quién
              </p>
              <div className="flex flex-wrap gap-2">
                {GENDER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={`border px-4 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-colors ${
                      gender === option.value
                        ? 'border-caramel bg-caramel text-white'
                        : 'border-silver text-mid-gray hover:border-caramel hover:text-caramel'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Thin divider between sections */}
          <div className="border-t border-silver/40" />

          {/* ── File dropzone ── */}
          <section className="py-16 md:py-20">
            <div className="mb-8">
              <p className="font-display text-[10px] tracking-[0.38em] uppercase text-mid-gray">
                Imágenes de referencia (solo categorías)
              </p>
              <p className="mt-2 font-body text-sm text-charcoal/70">
                {files.length === 0
                  ? 'Sube fotos de outfits completos como referencia de estilo (ej. streetwear, formal, casual).'
                  : `${files.length} archivo${files.length > 1 ? 's' : ''} cargado${files.length > 1 ? 's' : ''}.`}
              </p>
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
                ) : categoryResult ? (
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
              {analysisError && (
                <p className="font-body text-xs text-red-600" role="alert">
                  {analysisError}
                </p>
              )}
            </div>
          </section>

          {/* Thin divider */}
          <div className="border-t border-silver/40" />

          {/* ── Categories panel ── */}
          <section className="py-16 md:py-20">
            {(analyzing || categoryResult) && (
              <AnalysisPanel
                result={categoryResult}
                loading={analyzing}
                projectId={projectId}
                onGoOutfits={goToOutfits}
                onGoCamera={goToCamera}
              />
            )}
          </section>

        </div>
      </main>

      {/* ── Module navigation (Part C) ── */}
      <ModuleNavBar current="pre-shoot" variant="inline" />
    </>
  )
}
