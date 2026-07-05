import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'

// ---------------------------------------------------------------------------
// CameraFeed
// ---------------------------------------------------------------------------

type CameraStatus = 'idle' | 'loading' | 'active' | 'denied' | 'unavailable'

function CameraFeed() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraStatus>('loading')

  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setStatus('active')
      } catch (err) {
        const error = err as DOMException
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setStatus('denied')
        } else {
          setStatus('unavailable')
        }
      }
    }

    startCamera()

    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const isError = status === 'denied' || status === 'unavailable'

  return (
    <div className="relative h-full w-full bg-black">
      {/* Live feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`h-full w-full object-cover transition-opacity duration-500 ${status === 'active' ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Feed de cámara en tiempo real"
      />

      {/* Loading state */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-charcoal border-t-caramel" />
          <p className="font-body text-xs tracking-wide text-mid-gray">
            Iniciando cámara…
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <svg
            className="text-charcoal"
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <circle cx="20" cy="20" r="17" />
            <path d="M14 14l12 12M26 14L14 26" strokeLinecap="round" />
          </svg>
          <p className="font-display text-sm tracking-wide text-white">
            {status === 'denied'
              ? 'Permiso de cámara denegado.'
              : 'No se pudo acceder a la cámara.'}
          </p>
          <p className="font-body text-xs leading-relaxed text-charcoal">
            {status === 'denied'
              ? 'Verifica los permisos en la configuración de tu navegador y recarga la página.'
              : 'Asegúrate de que hay una cámara conectada y disponible.'}
          </p>
        </div>
      )}

      {/* Live indicator (only when active) */}
      {status === 'active' && (
        <div className="absolute left-4 top-4 flex items-center gap-2" aria-label="Cámara activa">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caramel opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-caramel" />
          </span>
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-white/80">
            En vivo
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// NavButton
// ---------------------------------------------------------------------------

interface NavButtonProps {
  label: string
  to: string
  delay?: number
}

function NavButton({ label, to, delay = 0 }: NavButtonProps) {
  const navigate = useNavigate()
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className="interactive flex-1 border border-black px-6 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white focus-visible:border-caramel focus-visible:bg-caramel focus-visible:text-white"
      onClick={() => navigate(to)}
    >
      {label}
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// LiveShoot view
// ---------------------------------------------------------------------------

export default function LiveShoot() {
  return (
    <>
      <Navbar />

      {/* Dark header */}
      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-10 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Módulo 02
          </p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Live-Shoot
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Visualiza la sesión en tiempo real directamente desde la cámara conectada.
            Navega a los módulos de análisis desde los controles inferiores.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center px-6 py-16 md:px-10 md:py-20">

          {/* Camera square */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative w-full max-w-[min(90vh,900px)] overflow-hidden border border-black/10 shadow-2xl"
            style={{ aspectRatio: '1 / 1' }}
          >
            {/* "Live-Shoot" overlay title */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-8 pb-8 pt-20"
              aria-hidden
            >
              <p className="font-display text-[clamp(1.5rem,4vw,2.8rem)] font-semibold tracking-wide text-white text-shadow-hero">
                Live-Shoot
              </p>
            </div>

            <CameraFeed />
          </motion.div>

          {/* Navigation buttons */}
          <div className="mt-8 flex w-full max-w-[min(90vh,900px)] flex-col gap-3 sm:flex-row">
            <NavButton label="Model Simulator" to="/model-simulator" delay={0.15} />
            <NavButton label="Outfit Styling"  to="/outfit-styling"  delay={0.22} />
            <NavButton label="Pre-Shoot"       to="/pre-shoot"       delay={0.29} />
          </div>
        </div>
      </main>
    </>
  )
}
