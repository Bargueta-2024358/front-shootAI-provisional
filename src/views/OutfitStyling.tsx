import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { MOCK_RECOMMENDED_OUTFITS } from '../data/mockStyling'
import type { RecommendedOutfit } from '../types/styling'

// TODO: reemplazar MOCK_RECOMMENDED_OUTFITS con fetch al backend cuando esté listo
// (endpoint esperado: GET /api/outfit-styling/recommendations
//  → { outfits: { id, image, text, links: { label, url }[] }[] })

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

function getOutfitTitle(text: string): string {
  const first = text.split('.')[0].trim()
  const upper = first.toUpperCase()
  return upper.length > 30 ? `${upper.slice(0, 27)}...` : upper
}

interface OutfitCardProps {
  outfit: RecommendedOutfit
  index: number
}

function OutfitCard({ outfit, index }: OutfitCardProps) {
  const [expanded, setExpanded] = useState(false)
  const lookNum = String(index + 1).padStart(2, '0')
  const title = getOutfitTitle(outfit.text)
  const pieceCount = outfit.links.length

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      className="flex flex-col"
    >
      {/* Square image — catalog style */}
      <div className="relative aspect-square overflow-hidden bg-smoke">
        <img
          src={outfit.image}
          alt={outfit.text}
          className="h-full w-full object-cover object-top transition-transform duration-500 hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      {/* Info row */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-body text-[11px] tracking-[0.06em] uppercase text-black">
            {title}
          </p>
          <p className="mt-1 font-body text-xs text-charcoal">
            Look {lookNum}
            {pieceCount > 0 && (
              <span className="text-mid-gray"> · {pieceCount} {pieceCount === 1 ? 'pieza' : 'piezas'}</span>
            )}
          </p>
        </div>

        {pieceCount > 0 && (
          <button
            type="button"
            aria-label={expanded ? 'Ocultar piezas' : 'Ver piezas del look'}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="interactive shrink-0 flex h-6 w-6 items-center justify-center text-black transition-colors hover:text-caramel"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              aria-hidden
              className={`transition-transform duration-200 ${expanded ? 'rotate-45' : ''}`}
            >
              <path d="M7 2v10M2 7h10" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded pieces */}
      <AnimatePresence>
        {expanded && pieceCount > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex flex-col gap-1 overflow-hidden"
          >
            {outfit.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="interactive block truncate font-body text-[11px] text-charcoal underline-offset-2 transition-colors hover:text-caramel hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export default function OutfitStyling() {
  const navigate = useNavigate()
  const outfits = MOCK_RECOMMENDED_OUTFITS

  return (
    <>
      <Navbar />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">Módulo 04</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Outfit Styling
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Combinaciones curadas según tu silueta y contexto editorial, listas para la sesión.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <motion.div {...fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-black md:text-3xl">
                Outfits Recomendables
              </h2>
              <p className="mt-2 font-body text-sm text-charcoal">
                {outfits.length} {outfits.length === 1 ? 'look seleccionado' : 'looks seleccionados'} para tu sesión
              </p>
            </div>
            <div className="hidden h-px flex-1 max-w-xs bg-smoke sm:block" aria-hidden />
          </motion.div>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3">
            {outfits.map((outfit, i) => (
              <OutfitCard key={outfit.id} outfit={outfit} index={i} />
            ))}
          </div>

          {outfits.length === 0 && (
            <p className="mt-10 font-body text-sm text-charcoal">
              No hay outfits recomendados disponibles por el momento.
            </p>
          )}

          <div className="mt-20 flex justify-center">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="interactive border border-black px-8 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white focus-visible:border-caramel focus-visible:bg-caramel focus-visible:text-white"
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
