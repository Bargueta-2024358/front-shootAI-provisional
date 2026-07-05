import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { waitingMessages } from '../data/content'

// TODO: cuando el backend esté listo, este componente se debe activar
// mientras se espera la respuesta real del procesamiento de imagen/IA,
// y cerrarse automáticamente (onComplete) cuando la respuesta llegue.
// En producción NO usar el timer fijo de 4 segundos — el cierre lo dispara
// la respuesta del backend, no un setTimeout.

const TOTAL_MS = 4000
// Distribute TOTAL_MS evenly across all messages
const MSG_INTERVAL_MS = Math.floor(TOTAL_MS / waitingMessages.length)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WaitingOverlayProps {
  /** Controls visibility when used as a programmatic modal. Defaults to true. */
  isOpen?: boolean
  /** Called automatically after TOTAL_MS ms, or immediately when user cancels. */
  onComplete?: () => void
  /** Hide the "Cancelar" back-button (useful when invoked from another view). */
  hideCancelButton?: boolean
}

// ---------------------------------------------------------------------------
// Dots indicator
// ---------------------------------------------------------------------------

function ThinkingDots() {
  return (
    <div className="flex items-center gap-[6px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-caramel"
          animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity, delay: i * 0.22 }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// WaitingOverlay — reusable component
// ---------------------------------------------------------------------------

export function WaitingOverlay({
  isOpen = true,
  onComplete,
  hideCancelButton = false,
}: WaitingOverlayProps) {
  const navigate = useNavigate()
  const [msgIndex, setMsgIndex] = useState(0)
  const completeFired = useRef(false)

  // Reset state whenever overlay opens
  useEffect(() => {
    if (isOpen) {
      setMsgIndex(0)
      completeFired.current = false
    }
  }, [isOpen])

  // Rotate messages at MSG_INTERVAL_MS cadence
  useEffect(() => {
    if (!isOpen) return
    const id = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % waitingMessages.length)
    }, MSG_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isOpen])

  // Auto-complete after exactly TOTAL_MS
  useEffect(() => {
    if (!isOpen) return
    const id = setTimeout(() => {
      if (completeFired.current) return
      completeFired.current = true
      if (onComplete) {
        // Invoked as modal — close and notify caller
        onComplete()
      }
      // If accessed via /espera route (no onComplete), loop back to start
      // by resetting index (the interval above keeps rotating already)
    }, TOTAL_MS)
    return () => clearTimeout(id)
  }, [isOpen, onComplete])

  const handleCancel = () => {
    completeFired.current = true
    if (onComplete) {
      onComplete()
    } else {
      navigate(-1)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="waiting-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8"
          style={{ backgroundColor: '#5C3D28' }}
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          aria-label="Procesando análisis"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,220,170,0.12) 0%, transparent 70%)',
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-center gap-8 text-center">
            {/* Spinning rings + dots */}
            <div className="relative flex items-center justify-center">
              <motion.span
                className="absolute h-20 w-20 rounded-full border border-caramel/25"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, ease: 'linear', repeat: Infinity }}
                aria-hidden
              />
              <motion.span
                className="absolute h-14 w-14 rounded-full border-t border-caramel/60"
                animate={{ rotate: -360 }}
                transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
                aria-hidden
              />
              <ThinkingDots />
            </div>

            {/* Rotating message */}
            <div className="relative h-16 w-full max-w-sm overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute inset-x-0 font-display text-lg italic leading-snug tracking-wide text-white md:text-xl"
                >
                  {waitingMessages[msgIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2" aria-hidden>
              {waitingMessages.map((_, i) => (
                <motion.span
                  key={i}
                  className="block h-1 rounded-full bg-white"
                  animate={{
                    width: i === msgIndex ? 20 : 6,
                    opacity: i === msgIndex ? 1 : 0.25,
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>

            {!hideCancelButton && (
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-4 font-display text-xs tracking-[0.25em] uppercase text-white/50 transition-colors hover:text-white focus-visible:text-white"
                onClick={handleCancel}
              >
                Cancelar
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Route view — /espera
// Loops indefinitely when accessed directly (no onComplete provided).
// In production this screen is triggered and dismissed by the backend.
// ---------------------------------------------------------------------------

export default function Waiting() {
  return <WaitingOverlay />
}
