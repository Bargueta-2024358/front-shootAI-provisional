import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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

interface OutfitCardProps {
  outfit: RecommendedOutfit
  index: number
}

function OutfitCard({ outfit, index }: OutfitCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="flex flex-col border border-silver bg-white"
    >
      <div className="aspect-[3/4] overflow-hidden bg-smoke">
        <img
          src={outfit.image}
          alt={outfit.text}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-col gap-4 p-5">
        <p className="font-body text-sm leading-relaxed text-charcoal">{outfit.text}</p>

        {outfit.links.length > 0 && (
          <ul className="flex flex-col gap-2 border-t border-smoke pt-4">
            {outfit.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="interactive font-display text-xs tracking-[0.15em] uppercase text-black underline-offset-4 transition-colors hover:text-caramel hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
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
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <motion.h2
            {...fadeUp}
            className="font-display text-2xl tracking-wide text-black md:text-3xl"
          >
            Outfits Recomendables
          </motion.h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.map((outfit, i) => (
              <OutfitCard key={outfit.id} outfit={outfit} index={i} />
            ))}
          </div>

          {outfits.length === 0 && (
            <p className="mt-10 font-body text-sm text-charcoal">
              No hay outfits recomendados disponibles por el momento.
            </p>
          )}

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
