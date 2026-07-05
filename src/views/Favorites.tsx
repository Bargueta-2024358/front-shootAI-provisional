import { useEffect, useMemo, useState } from 'react'
import Navbar from '../components/Navbar'
import { listFavorites } from '../lib/favoritesApi'
import type { FavoriteOutfit } from '../types/auth'

export default function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteOutfit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [occasionFilter, setOccasionFilter] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await listFavorites()
        if (!cancelled) setFavorites(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar favoritos')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(
    () => [...new Set(favorites.map((f) => f.category).filter(Boolean))],
    [favorites]
  )
  const events = useMemo(
    () => [...new Set(favorites.map((f) => f.event).filter(Boolean))],
    [favorites]
  )
  const occasions = useMemo(
    () => [...new Set(favorites.map((f) => f.occasion).filter(Boolean))],
    [favorites]
  )

  const filtered = useMemo(
    () =>
      favorites.filter((f) => {
        if (categoryFilter && f.category !== categoryFilter) return false
        if (eventFilter && f.event !== eventFilter) return false
        if (occasionFilter && f.occasion !== occasionFilter) return false
        return true
      }),
    [favorites, categoryFilter, eventFilter, occasionFilter]
  )

  return (
    <>
      <Navbar />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Galería
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,4rem)] font-semibold text-white">
            Outfits favoritos
          </h1>
          <p className="mt-4 max-w-xl font-body text-sm text-charcoal">
            Tus looks guardados, organizados por categoría, evento u ocasión.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10">
          <div className="flex flex-wrap gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-silver px-3 py-2 font-body text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="border border-silver px-3 py-2 font-body text-sm"
            >
              <option value="">Todos los eventos</option>
              {events.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
            <select
              value={occasionFilter}
              onChange={(e) => setOccasionFilter(e.target.value)}
              className="border border-silver px-3 py-2 font-body text-sm"
            >
              <option value="">Todas las ocasiones</option>
              {occasions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <p className="mt-10 font-body text-sm text-charcoal">Cargando…</p>
          )}
          {error && (
            <p className="mt-10 font-body text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="mt-10 font-body text-sm italic text-mid-gray">
              Aún no tienes outfits favoritos guardados.
            </p>
          )}

          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((favorite) => (
              <article
                key={favorite.id}
                className="overflow-hidden rounded-sm border border-silver/40 shadow-lg shadow-black/5"
              >
                <div className="flex gap-1 overflow-x-auto bg-smoke p-2">
                  {(favorite.garments ?? []).slice(0, 4).map((g, i) => (
                    <div key={`${favorite.id}-${i}`} className="h-28 w-24 flex-shrink-0 bg-white">
                      {g.imageUrl ? (
                        <img
                          src={g.imageUrl}
                          alt={g.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-mid-gray">
                          —
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-5">
                  <p className="font-display text-sm uppercase tracking-wide text-black">
                    {favorite.title || 'Outfit favorito'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {favorite.category && (
                      <span className="rounded-sm bg-caramel/10 px-2 py-1 font-body text-[10px] uppercase text-caramel-dark">
                        {favorite.category}
                      </span>
                    )}
                    {favorite.event && (
                      <span className="rounded-sm bg-smoke px-2 py-1 font-body text-[10px] uppercase text-charcoal">
                        {favorite.event}
                      </span>
                    )}
                    {favorite.occasion && (
                      <span className="rounded-sm bg-black/5 px-2 py-1 font-body text-[10px] uppercase text-charcoal">
                        {favorite.occasion}
                      </span>
                    )}
                  </div>
                  {favorite.matchPercentage > 0 && (
                    <p className="mt-3 font-body text-xs text-mid-gray">
                      Match {favorite.matchPercentage}%
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
