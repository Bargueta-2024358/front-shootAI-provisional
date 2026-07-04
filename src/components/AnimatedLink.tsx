import { motion } from 'framer-motion'

interface AnimatedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  light?: boolean
}

export default function AnimatedLink({ href, children, className = '', light = false }: AnimatedLinkProps) {
  return (
    <a
      href={href}
      className={`interactive group relative inline-block font-display italic transition-colors duration-250 hover:text-caramel focus-visible:text-caramel focus-visible:outline-none ${light ? 'text-white' : 'text-black'} ${className}`}
    >
      {children}
      <motion.span
        className={`absolute -bottom-0.5 left-0 h-px w-full origin-center bg-current ${light ? 'bg-white group-hover:bg-caramel group-focus-visible:bg-caramel' : 'group-hover:bg-caramel group-focus-visible:bg-caramel'}`}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        whileFocus={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </a>
  )
}
