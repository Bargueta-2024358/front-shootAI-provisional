import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import { WaitingOverlay } from './Waiting'
import { apiJson } from '../lib/api'
import { createFavorite, suggestFavoriteTheme } from '../lib/favoritesApi'
import {
  clearShootSession,
  favoriteKey,
  loadOutfitsCache,
  loadSavedFavoriteKeys,
  markFavoriteSaved,
  resolveFlowState,
  saveOutfitsCache,
} from '../lib/sessionFlow'
import type { Outfit, OutfitsByCategory } from '../types/auth'

interface FlowState {
  projectId?: string
  gender?: 'man' | 'woman' | 'unisex'
}

interface SaveModalState {
  outfit: Outfit
  category: string
  matchPercentage: number
}

const SLOT_LABELS: Record<string, string> = {
  top: 'Arriba',
  bottom: 'Abajo',
  footwear: 'Zapatos',
  outerwear: 'Abrigo',
  accessory: 'Accesorio',
  dress: 'Vestido',
}

type FlowGender = 'man' | 'woman' | 'unisex'

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

function normalizeOutfitsResponse(data: {
  outfitsByCategory?: OutfitsByCategory[]
  outfits?: Outfit[]
  matchPercentage?: number | null
}): { groups: OutfitsByCategory[]; matchPercentage: number | null } {
  const groups = data.outfitsByCategory || []
  if (groups.length > 0) {
    return { groups, matchPercentage: data.matchPercentage ?? null }
  }

  if (data.outfits && data.outfits.length > 0) {
    return {
      groups: [
        {
          category: 'recomendados',
          matchPercentage: data.matchPercentage ?? 0,
          outfits: data.outfits,
        },
      ],
      matchPercentage: data.matchPercentage ?? null,
    }
  }

  return { groups: [], matchPercentage: data.matchPercentage ?? null }
}

function OutfitCarousel({
  outfit,
  outfitIndex,
  isSaved,
  onSave,
}: {
  outfit: Outfit
  outfitIndex: number
  isSaved: boolean
  onSave: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: outfitIndex * 0.08 }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <p className="font-display text-sm tracking-[0.25em] uppercase text-black">
          Look {String(outfitIndex + 1).padStart(2, '0')}
        </p>
        <div className="flex items-center gap-4">
          <p className="font-body text-xs text-mid-gray">Score {outfit.score}</p>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaved}
            className={`border px-4 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-colors ${
              isSaved
                ? 'border-green-600 text-green-700 cursor-default'
                : 'border-caramel text-caramel hover:bg-caramel hover:text-white'
            }`}
          >
            {isSaved ? 'En favoritos' : 'Guardar favorito'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-hidden scroll-caramel-x pb-3">
        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
          {(outfit.garments ?? []).map((garment, i) => (
            <a
              key={`${outfit.id}-${garment.slot}-${i}`}
              href={garment.productUrl || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="w-[270px] flex-shrink-0 overflow-hidden rounded-sm shadow-lg shadow-black/10 transition-transform duration-300 hover:scale-[1.02]"
              style={{ backgroundColor: '#7A5A40' }}
            >
              {garment.imageUrl ? (
                <img
                  src={garment.imageUrl}
                  alt={garment.name}
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center bg-white/10">
                  <span className="font-display text-xs text-white/40">IMG</span>
                </div>
              )}
              <div className="p-5">
                <span className="font-display text-xs text-[#EEDFC9] select-none">
                  {SLOT_LABELS[garment.slot] || garment.slot}
                </span>
                <p className="mt-2 font-display text-sm font-medium text-white">
                  {garment.name}
                </p>
                <p className="mt-1 font-body text-xs uppercase tracking-wide text-white/60">
                  {garment.brand} · {garment.type}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function SaveFavoriteModal({
  state,
  projectId,
  onClose,
  onSaved,
}: {
  state: SaveModalState
  projectId: string
  onClose: () => void
  onSaved: (outfitId: string) => void
}) {
  const [title, setTitle] = useState('')
  const [event, setEvent] = useState('')
  const [occasion, setOccasion] = useState('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSuggestions() {
      setLoadingSuggestions(true)
      try {
        const data = await suggestFavoriteTheme({
          category: state.category,
          event: event || undefined,
          garments: state.outfit.garments,
        })
        if (!cancelled) {
          setTitle(data.theme || `Look ${state.category}`)
          setOccasion(data.occasion || state.category || 'Ocasion casual')
        }
      } catch {
        if (!cancelled) {
          setTitle(`Look ${state.category}`)
          setOccasion(state.category || 'Ocasion casual')
        }
      } finally {
        if (!cancelled) setLoadingSuggestions(false)
      }
    }

    loadSuggestions()
    return () => {
      cancelled = true
    }
  }, [state.category, state.outfit.garments, event])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await createFavorite({
        projectId,
        title,
        category: state.category,
        event,
        occasion,
        matchPercentage: state.matchPercentage,
        garments: state.outfit.garments,
      })
      onSaved(state.outfit.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-white p-6 shadow-xl">
        <h3 className="font-display text-xl text-black">Guardar outfit favorito</h3>
        <p className="mt-2 font-body text-sm text-charcoal">
          Categoría: <strong>{state.category}</strong>
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-mid-gray">
              Temática / título {loadingSuggestions ? '(sugerida por IA…)' : '(editable)'}
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border border-silver px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-mid-gray">
              Evento
            </span>
            <input
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              placeholder="Ej: Boda, entrevista, fin de semana"
              className="border border-silver px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-display text-[10px] tracking-[0.2em] uppercase text-mid-gray">
              Ocasión {loadingSuggestions ? '(sugerida por IA…)' : '(editable)'}
            </span>
            <input
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="border border-silver px-3 py-2 font-body text-sm"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 font-body text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-silver px-4 py-3 font-display text-xs tracking-[0.2em] uppercase"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || loadingSuggestions}
            onClick={handleSave}
            className="flex-1 bg-caramel px-4 py-3 font-display text-xs tracking-[0.2em] uppercase text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OutfitStyling() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId, gender } = resolveFlowState(
    (location.state as FlowState | null) ?? undefined
  )
  const effectiveGender: FlowGender =
    gender === 'woman' ? 'woman' : gender === 'unisex' ? 'unisex' : 'man'

  const [outfitsByCategory, setOutfitsByCategory] = useState<OutfitsByCategory[]>([])
  const [matchPercentage, setMatchPercentage] = useState<number | null>(null)
  const [loading, setLoading] = useState(Boolean(projectId))
  const [error, setError] = useState<string | null>(null)
  const [saveModal, setSaveModal] = useState<SaveModalState | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState(() => loadSavedFavoriteKeys())
  const [fromCache, setFromCache] = useState(false)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const totalOutfits = outfitsByCategory.reduce(
    (sum, group) => sum + group.outfits.length,
    0
  )

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      setError('No hay proyecto activo. Vuelve a Pre-Shoot y analiza tus referencias.')
      return
    }

    let cancelled = false
    const activeProjectId = projectId

    async function loadOutfits() {
      setError(null)

      if (refreshNonce === 0) {
        const cached = loadOutfitsCache(activeProjectId, effectiveGender)
        if (cached) {
          setOutfitsByCategory(cached.outfitsByCategory)
          setMatchPercentage(cached.matchPercentage)
          setFromCache(true)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      setFromCache(false)

      try {
        const data = await apiJson<Record<string, unknown>>(
          `/requirements/${activeProjectId}/process`,
          {
            method: 'POST',
            body: JSON.stringify({ limit: 8, gender: effectiveGender }),
          }
        )

        if (cancelled) return

        let { groups, matchPercentage: matchPct } = normalizeOutfitsResponse(data || {})
        if (groups.length === 0 && effectiveGender !== 'unisex') {
          const relaxed = await apiJson<Record<string, unknown>>(
            `/requirements/${activeProjectId}/process`,
            {
              method: 'POST',
              body: JSON.stringify({ limit: 8, gender: 'unisex' }),
            }
          )
          if (cancelled) return
          const normalizedRelaxed = normalizeOutfitsResponse(relaxed || {})
          groups = normalizedRelaxed.groups
          matchPct = normalizedRelaxed.matchPercentage
        }

        if (groups.length === 0) {
          setOutfitsByCategory([])
          setMatchPercentage(0)
          setError('El backend no devolvió outfits para este proyecto.')
          return
        }

        setOutfitsByCategory(groups)
        setMatchPercentage(matchPct)

        saveOutfitsCache({
          projectId: activeProjectId,
          gender: effectiveGender,
          outfitsByCategory: groups,
          matchPercentage: matchPct,
          savedAt: new Date().toISOString(),
        })
      } catch (err) {
        if (!cancelled) {
          setOutfitsByCategory([])
          setMatchPercentage(0)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar los outfits desde el backend.'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadOutfits()
    return () => {
      cancelled = true
    }
  }, [projectId, effectiveGender, refreshNonce])

  const goToCamera = () => {
    if (projectId) {
      navigate('/live-shoot', { state: { projectId, gender: effectiveGender } })
    }
  }

  const goBackToCategories = () => {
    navigate('/pre-shoot')
  }

  const handleRegenerate = () => {
    setSavedMessage(null)
    setRefreshNonce((n) => n + 1)
  }

  const handleClearSession = () => {
    clearShootSession()
    navigate('/pre-shoot')
  }

  const handleFavoriteSaved = (outfitId: string) => {
    if (!projectId) return
    markFavoriteSaved(favoriteKey(projectId, outfitId))
    setSavedKeys(loadSavedFavoriteKeys())
    setSavedMessage('Outfit guardado en favoritos')
  }

  const isOutfitSaved = (outfitId: string) =>
    projectId ? savedKeys.has(favoriteKey(projectId, outfitId)) : false

  return (
    <>
      <Navbar />

      <WaitingOverlay isOpen={loading} autoDismiss={false} hideCancelButton />

      {saveModal && projectId && (
        <SaveFavoriteModal
          state={saveModal}
          projectId={projectId}
          onClose={() => setSaveModal(null)}
          onSaved={handleFavoriteSaved}
        />
      )}

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">Módulo 02</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Outfit Styling
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Paso 2 · Outfits completos por categoría, personalizados según tu foto base.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-black md:text-3xl">
                Outfits recomendados
              </h2>
              <p className="mt-2 font-body text-sm text-charcoal">
                {totalOutfits}{' '}
                {totalOutfits === 1 ? 'look seleccionado' : 'looks seleccionados'}
                {outfitsByCategory.length > 1
                  ? ` en ${outfitsByCategory.length} categorías`
                  : ''}
                {fromCache && totalOutfits > 0 && (
                  <span className="text-mid-gray"> · restaurado de tu sesión</span>
                )}
              </p>
            </div>
            {matchPercentage != null && (
              <div
                className="rounded-sm px-6 py-4 shadow-lg shadow-black/10"
                style={{ backgroundColor: '#7A5A40' }}
              >
                <p className="font-display text-3xl font-semibold text-white leading-none">
                  {matchPercentage}
                  <span className="text-lg text-[#EEDFC9]">%</span>
                </p>
                <p className="mt-1 font-body text-xs text-white/70">de match</p>
              </div>
            )}
          </motion.div>

          {savedMessage && (
            <p className="mt-6 font-body text-sm text-green-700">{savedMessage}</p>
          )}

          {error && (
            <p className="mt-6 font-body text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-10 flex flex-col gap-16">
            {outfitsByCategory.length === 0 && !loading && !error && (
              <p className="font-body text-sm text-charcoal italic">
                No se encontraron outfits completos con los criterios actuales.
              </p>
            )}

            {outfitsByCategory.map((group) => (
              <section key={group.category}>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-silver/40 pb-4">
                  <div>
                    <p className="font-display text-[10px] tracking-[0.35em] uppercase text-mid-gray">
                      Categoría
                    </p>
                    <h3 className="mt-1 font-display text-2xl capitalize text-black">
                      {group.category}
                    </h3>
                  </div>
                  <p className="font-body text-sm text-charcoal">
                    Match {group.matchPercentage}% · {group.outfits.length} looks
                  </p>
                </div>

                <div className="flex flex-col gap-12">
                  {group.outfits.map((outfit, outfitIndex) => (
                    <OutfitCarousel
                      key={outfit.id}
                      outfit={outfit}
                      outfitIndex={outfitIndex}
                      isSaved={isOutfitSaved(outfit.id)}
                      onSave={() =>
                        setSaveModal({
                          outfit,
                          category: group.category,
                          matchPercentage: group.matchPercentage,
                        })
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-20 flex flex-wrap justify-center gap-4">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="border border-silver px-8 py-4 font-display text-xs tracking-[0.25em] uppercase text-black transition-colors hover:border-black"
              onClick={goBackToCategories}
            >
              Volver a categorías
            </motion.button>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="border border-caramel px-8 py-4 font-display text-xs tracking-[0.25em] uppercase text-caramel transition-colors hover:bg-caramel hover:text-white"
              onClick={handleRegenerate}
              disabled={loading}
            >
              Regenerar outfits
            </motion.button>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-[#A67B5B] px-10 py-4 font-display text-xs tracking-[0.25em] uppercase text-white transition-colors hover:bg-[#8B6449]"
              onClick={goToCamera}
            >
              Ir a cámara
            </motion.button>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="border border-red-300 px-8 py-4 font-display text-xs tracking-[0.25em] uppercase text-red-700 transition-colors hover:bg-red-50"
              onClick={handleClearSession}
            >
              Limpiar sesión
            </motion.button>
          </div>
        </div>
      </main>
    </>
  )
}
