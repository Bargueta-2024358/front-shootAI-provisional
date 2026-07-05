import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

// ---------------------------------------------------------------------------
// ModuleNavBar — shared navigation strip between modules.
// Pass `current` to hide the button for the active view.
// `variant="overlay"` → absolute dark strip for LiveShoot camera overlay.
// `variant="inline"`  → regular bottom nav bar for PreShoot / other views.
// ---------------------------------------------------------------------------

export type ModuleKey = 'pre-shoot' | 'live-shoot' | 'model-simulator' | 'outfit-styling'

const ALL_MODULES: { label: string; to: string; key: ModuleKey }[] = [
  { label: 'Model Simulator', to: '/model-simulator', key: 'model-simulator' },
  { label: 'Outfit Styling',  to: '/outfit-styling',  key: 'outfit-styling'  },
  { label: 'Live-Shoot',      to: '/live-shoot',      key: 'live-shoot'      },
  { label: 'Pre-Shoot',       to: '/pre-shoot',       key: 'pre-shoot'       },
]

interface ModuleNavBarProps {
  current: ModuleKey
  variant?: 'overlay' | 'inline'
}

export default function ModuleNavBar({ current, variant = 'inline' }: ModuleNavBarProps) {
  const navigate = useNavigate()
  const buttons = ALL_MODULES.filter((m) => m.key !== current)

  if (variant === 'overlay') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="absolute inset-x-0 bottom-0 z-20 flex backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(17,17,17,0.55)' }}
      >
        {buttons.map((btn) => (
          <button
            key={btn.to}
            type="button"
            onClick={() => navigate(btn.to)}
            className="flex-1 border-r border-white/10 py-3 font-display text-[10px] tracking-[0.18em] uppercase text-white/70 transition-colors duration-200 last:border-r-0 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white"
          >
            {btn.label}
          </button>
        ))}
      </motion.div>
    )
  }

  // inline variant — used in PreShoot and other light-background views
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.25 }}
      className="flex border-t border-silver/60"
    >
      {buttons.map((btn) => (
        <button
          key={btn.to}
          type="button"
          onClick={() => navigate(btn.to)}
          className="flex-1 border-r border-silver/60 py-4 font-display text-[10px] tracking-[0.18em] uppercase text-mid-gray transition-colors duration-200 last:border-r-0 hover:bg-smoke hover:text-black focus-visible:bg-smoke focus-visible:text-black focus-visible:outline-none"
        >
          {btn.label}
        </button>
      ))}
    </motion.div>
  )
}
