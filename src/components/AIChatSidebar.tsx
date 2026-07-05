import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CoachMessage, CoachStatus } from '../lib/usePoseCoach'

interface AIChatSidebarProps {
  messages: CoachMessage[]
  status: CoachStatus
  cameraActive: boolean
}

function relativeTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 5) return 'ahora mismo'
  if (s < 60) return `hace ${s} s`
  const m = Math.floor(s / 60)
  return `hace ${m} min`
}

const STATUS_HINT: Record<CoachStatus, string> = {
  loading: 'Cargando el modelo de IA…',
  ready: 'Activa la cámara para comenzar el análisis.',
  analyzing: 'Analizando tu pose en tiempo real…',
  'no-pose': 'No detecto tu cuerpo. Encuádrate de pecho a cadera.',
  error: 'No se pudo cargar el modelo (revisa tu conexión).',
}

export default function AIChatSidebar({
  messages,
  status,
  cameraActive,
}: AIChatSidebarProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const showTyping = cameraActive && (status === 'analyzing' || status === 'no-pose')
  const isEmpty = messages.length === 0

  const dotColor =
    status === 'analyzing'
      ? 'bg-caramel'
      : status === 'error'
        ? 'bg-[#9C4B4B]'
        : status === 'loading'
          ? 'bg-mid-gray'
          : 'bg-white/40'

  return (
    <div className="flex h-full flex-col bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <p className="font-display text-[10px] tracking-[0.35em] uppercase text-mid-gray">
          Asistente
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} aria-hidden />
          <p className="font-display text-base tracking-wide text-white">Shoot AI</p>
        </div>
      </div>

      {/* Messages — scrollable */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 scrollbar-thin">
        {isEmpty && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            {status === 'loading' && (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-caramel" />
            )}
            <p className="font-body text-xs leading-relaxed text-white/40">
              {STATUS_HINT[status]}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col gap-1"
            >
              <div
                className={`rounded-sm px-4 py-3 ${
                  msg.kind === 'diagnosis'
                    ? 'border-l-2 border-caramel bg-caramel/10'
                    : 'bg-white/[0.06]'
                }`}
              >
                {msg.kind === 'diagnosis' && (
                  <p className="mb-1 font-display text-[9px] tracking-[0.3em] uppercase text-caramel">
                    Diagnóstico
                  </p>
                )}
                <p className="font-body text-sm leading-relaxed text-white/90">
                  {msg.text}
                </p>
              </div>
              <p className="px-1 font-body text-[10px] text-white/30">
                {relativeTime(msg.ts)}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing / analyzing indicator */}
        {showTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1.5 px-4 py-3"
            aria-label="Analizando…"
          >
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-caramel"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
            <span className="ml-1 font-body text-[10px] text-white/40">
              {status === 'no-pose' ? 'Buscando tu silueta…' : 'Analizando encuadre…'}
            </span>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-white/10 px-5 py-3">
        <p className="font-body text-[10px] leading-relaxed text-white/25">
          Sugerencias generadas en tiempo real analizando tu pose con IA.
        </p>
      </div>
    </div>
  )
}
