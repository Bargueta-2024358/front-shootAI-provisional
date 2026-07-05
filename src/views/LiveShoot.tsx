import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import AIChatSidebar from '../components/AIChatSidebar'
import ModuleNavBar from '../components/ModuleNavBar'

// Navbar height in px — keep in sync with h-20 in Navbar.tsx
const NAVBAR_H = 80

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

    // Cleanup: stop all tracks so the camera light turns off when leaving the view
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const isError = status === 'denied' || status === 'unavailable'

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`h-full w-full object-cover transition-opacity duration-500 ${
          status === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
        aria-label="Feed de cámara en tiempo real"
      />

      {/* Loading */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-charcoal border-t-caramel" />
          <p className="font-body text-xs tracking-wide text-mid-gray">Iniciando cámara…</p>
        </div>
      )}

      {/* Error — centered within the video area, not the full viewport */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <svg className="text-charcoal" width="40" height="40" viewBox="0 0 40 40"
            fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <circle cx="20" cy="20" r="17" />
            <path d="M14 14l12 12M26 14L14 26" strokeLinecap="round" />
          </svg>
          <p className="font-display text-sm tracking-wide text-white">
            {status === 'denied' ? 'Permiso de cámara denegado.' : 'No se pudo acceder a la cámara.'}
          </p>
          <p className="font-body text-xs leading-relaxed text-charcoal max-w-xs">
            {status === 'denied'
              ? 'Verifica los permisos en la configuración de tu navegador y recarga la página.'
              : 'Asegúrate de que hay una cámara conectada y disponible.'}
          </p>
        </div>
      )}

      {/* Live indicator */}
      {status === 'active' && (
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2" aria-label="Cámara activa">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-caramel opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-caramel" />
          </span>
          <span className="font-display text-[10px] tracking-[0.3em] uppercase text-white/80">
            En vivo
          </span>
        </div>
      )}

      {/* Title overlay — bottom-left with gradient */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-6 pb-16 pt-24 md:px-8 md:pb-20"
        aria-hidden
      >
        <p className="font-display text-2xl font-semibold tracking-wide text-white text-shadow-hero md:text-3xl">
          Live-Shoot
        </p>
        <p className="mt-1 font-display text-[10px] tracking-[0.35em] uppercase text-white/60">
          Módulo 02
        </p>
      </div>

      {/* Navigation buttons — overlay strip at the very bottom */}
      <ModuleNavBar current="live-shoot" variant="overlay" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveShoot view
// ---------------------------------------------------------------------------

export default function LiveShoot() {
  return (
    <>
      <Navbar />

      {/*
        Full-height studio layout:
        - pt-20 pushes content below the fixed navbar (h-20 = 80px)
        - h-screen ensures the entire viewport is used
        - flex-col on mobile → flex-row on desktop
      */}
      <main
        className="flex flex-col bg-black md:flex-row"
        style={{ height: `calc(100vh - ${NAVBAR_H}px)`, marginTop: NAVBAR_H }}
      >
        {/* Camera area — 75% width desktop, full + 60vh mobile */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative h-[60vh] w-full shrink-0 md:h-full md:flex-1"
        >
          <CameraFeed />
        </motion.div>

        {/* AI Chat Sidebar — 25% desktop, auto-height mobile */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="w-full border-t border-white/10 md:h-full md:w-[320px] md:shrink-0 md:border-l md:border-t-0 lg:w-[360px]"
          style={{ maxHeight: `calc(100vh - ${NAVBAR_H}px)` }}
        >
          <AIChatSidebar />
        </motion.div>
      </main>
    </>
  )
}
