import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

// TODO: integrar la lógica real de estilismo de outfit cuando el backend
// esté disponible. Este módulo deberá recibir la imagen del usuario y
// sugerir combinaciones de prendas, colores y accesorios en base al
// análisis de silueta y la paleta editorial detectada.

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

export default function OutfitStyling() {
  const navigate = useNavigate()

  return (
    <>
      <Navbar />

      {/* Dark header */}
      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Módulo 04
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Outfit Styling
          </h1>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto flex min-h-[60vh] max-w-[1400px] flex-col items-center justify-center px-6 py-20 md:px-10">
          <motion.div
            {...fadeUp}
            className="flex w-full max-w-2xl flex-col items-center gap-10 text-center"
          >
            {/* Icon */}
            <div className="flex h-20 w-20 items-center justify-center border border-silver">
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-mid-gray"
                aria-hidden
              >
                <path d="M13 4l-5 6v22h20V10l-5-6" strokeLinejoin="round" />
                <path d="M13 4c0 2.761 2.239 5 5 5s5-2.239 5-5" strokeLinejoin="round" />
                <path d="M12 18h12M12 23h8" strokeLinecap="round" />
              </svg>
            </div>

            {/* Copy */}
            <div className="flex flex-col gap-4">
              <p className="font-display text-2xl tracking-wide text-black md:text-3xl">
                Próximamente disponible
              </p>
              <p className="font-body text-base leading-relaxed text-charcoal">
                El módulo de outfit styling combinará el análisis de silueta con sugerencias
                de prendas, paletas y accesorios adaptadas al cuerpo real y al contexto editorial.
              </p>
            </div>

            {/* Decorative rule */}
            <div className="flex w-full items-center gap-4">
              <span className="h-px flex-1 bg-smoke" />
              <span className="font-display text-xs tracking-[0.35em] text-silver uppercase">
                En desarrollo
              </span>
              <span className="h-px flex-1 bg-smoke" />
            </div>

            {/* Back button */}
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="interactive border border-black px-8 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white focus-visible:border-caramel focus-visible:bg-caramel focus-visible:text-white"
              onClick={() => navigate('/live-shoot')}
            >
              Volver a Live-Shoot
            </motion.button>
          </motion.div>
        </div>
      </main>
    </>
  )
}
