import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface AnimatedLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  light?: boolean
}

const sharedClass = (light: boolean, className: string) =>
  `interactive group relative inline-block font-display italic transition-colors duration-[250ms] hover:text-caramel focus-visible:text-caramel focus-visible:outline-none ${light ? 'text-white' : 'text-black'} ${className}`

const underline = (light: boolean) => (
  <motion.span
    className={`absolute -bottom-0.5 left-0 h-px w-full origin-center bg-current ${light ? 'bg-white group-hover:bg-caramel group-focus-visible:bg-caramel' : 'group-hover:bg-caramel group-focus-visible:bg-caramel'}`}
    initial={{ scaleX: 0 }}
    whileHover={{ scaleX: 1 }}
    whileFocus={{ scaleX: 1 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  />
)

export default function AnimatedLink({ href, children, className = '', light = false }: AnimatedLinkProps) {
  // Internal routes (start with "/") use React Router Link to avoid full-page reload
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={sharedClass(light, className)}>
        {children}
        {underline(light)}
      </Link>
    )
  }

  // External URLs or same-page anchors (#...) use a normal <a>
  return (
    <a href={href} className={sharedClass(light, className)}>
      {children}
      {underline(light)}
    </a>
  )
}
