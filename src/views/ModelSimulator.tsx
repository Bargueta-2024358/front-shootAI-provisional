import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

// TODO: integrar la lógica real de simulación de modelo cuando el backend
// esté disponible. Este módulo deberá recibir las medidas/escaneo 3D del
// usuario y renderizar un avatar digital sobre el que se puedan previsualizar
// prendas en tiempo real.

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

export default function ModelSimulator() {
  const navigate = useNavigate()

  return (
    <>
      <Navbar />

      {/* Dark header */}
      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Módulo 03
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Model Simulator
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
                <ellipse cx="18" cy="10" rx="5" ry="5.5" />
                <path d="M6 32c0-7.18 5.373-12 12-12s12 4.82 12 12" strokeLinecap="round" />
                <path d="M25 18l4 4-4 4M11 18l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Copy */}
            <div className="flex flex-col gap-4">
              <p className="font-display text-2xl tracking-wide text-black md:text-3xl">
                Próximamente disponible
              </p>
              <p className="font-body text-base leading-relaxed text-charcoal">
                El simulador de modelos generará un avatar digital a partir del escaneo 3D
                y permitirá previsualizar prendas en tiempo real antes de la sesión.
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
