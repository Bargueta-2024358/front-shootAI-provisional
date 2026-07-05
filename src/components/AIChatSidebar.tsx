import { motion } from 'framer-motion'

// TODO: estos mensajes son de ejemplo (mock). Cuando el backend de
// IA esté conectado, este componente debe recibir los mensajes reales
// en tiempo real (ej. vía WebSocket o polling) analizando el feed de
// la cámara, y renderizarlos aquí dinámicamente en vez del array
// estático actual.

const MOCK_MESSAGES = [
  {
    id: 1,
    text: 'Estoy detectando buena iluminación natural en el encuadre.',
    time: 'hace unos segundos',
  },
  {
    id: 2,
    text: 'La pose actual favorece la silueta de la prenda superior.',
    time: 'hace 1 min',
  },
  {
    id: 3,
    text: 'Sugerencia: gira ligeramente el hombro derecho hacia la cámara para ganar profundidad.',
    time: 'hace 1 min',
  },
  {
    id: 4,
    text: 'El contraste de color entre prenda y fondo se ve equilibrado.',
    time: 'hace 2 min',
  },
  {
    id: 5,
    text: 'Prueba inclinar la cabeza levemente hacia la izquierda para dinamizar el plano.',
    time: 'hace 3 min',
  },
]

export default function AIChatSidebar() {
  return (
    <div className="flex h-full flex-col bg-black">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 px-5 py-4">
        <p className="font-display text-[10px] tracking-[0.35em] uppercase text-mid-gray">
          Asistente
        </p>
        <p className="mt-1 font-display text-base tracking-wide text-white">
          Shoot AI
        </p>
      </div>

      {/* Messages — scrollable */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 scrollbar-thin">
        {MOCK_MESSAGES.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 + i * 0.15 }}
            className="flex flex-col gap-1"
          >
            <div className="rounded-sm bg-white/8 px-4 py-3"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <p className="font-body text-sm leading-relaxed text-white/90">
                {msg.text}
              </p>
            </div>
            <p className="px-1 font-body text-[10px] text-white/30">
              {msg.time}
            </p>
          </motion.div>
        ))}

        {/* Typing indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 + MOCK_MESSAGES.length * 0.15 + 0.2 }}
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
            Analizando encuadre…
          </span>
        </motion.div>
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-white/10 px-5 py-3">
        <p className="font-body text-[10px] leading-relaxed text-white/25">
          Los mensajes se actualizarán automáticamente al conectar el análisis de IA en tiempo real.
        </p>
      </div>
    </div>
  )
}
