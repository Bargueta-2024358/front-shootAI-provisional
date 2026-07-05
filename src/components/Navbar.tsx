import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { navLinks } from '../data/content'
import AnimatedLink from './AnimatedLink'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { profile } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const light = !scrolled

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${scrolled ? 'bg-white text-black shadow-sm' : 'bg-transparent text-white'}`}
      initial={false}
      animate={{ backgroundColor: scrolled ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0)' }}
    >
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link to="/" className="interactive font-display text-sm tracking-[0.35em] uppercase">
          Shoot AI
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <AnimatedLink
              key={link.href}
              href={link.href}
              light={light}
              className="text-xs tracking-[0.2em] uppercase not-italic"
            >
              {link.label}
            </AnimatedLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <details
            className="relative hidden md:block"
            open={menuOpen}
            onToggle={(e) => setMenuOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary
              className={`interactive list-none cursor-pointer font-display text-xs tracking-[0.15em] uppercase ${
                light ? 'text-white' : 'text-black'
              }`}
            >
              {profile?.displayName || 'Cuenta'}
            </summary>
            <div className="absolute right-0 top-full mt-3 min-w-[180px] border border-silver bg-white p-2 shadow-lg">
              <Link
                to="/profile"
                className="block px-3 py-2 font-body text-sm text-charcoal hover:bg-smoke"
              >
                Perfil
              </Link>
              <Link
                to="/favoritos"
                className="block px-3 py-2 font-body text-sm text-charcoal hover:bg-smoke"
              >
                Favoritos
              </Link>
            </div>
          </details>

          <a
            href="/#contacto"
            className={`interactive hidden border px-5 py-2.5 font-display text-xs tracking-[0.15em] uppercase transition-all duration-300 md:inline-block ${
              scrolled
                ? 'border-black text-black hover:border-caramel hover:bg-caramel hover:text-white focus-visible:border-caramel focus-visible:bg-caramel focus-visible:text-white'
                : 'border-white text-white hover:border-caramel hover:bg-caramel hover:text-white focus-visible:border-caramel focus-visible:bg-caramel focus-visible:text-white'
            }`}
          >
            Reservar sesión
          </a>

          <details className="relative md:hidden">
            <summary
              className={`interactive list-none cursor-pointer font-display text-xs tracking-[0.2em] uppercase ${light ? 'text-white' : 'text-black'}`}
            >
              Menú
            </summary>
            <div className="absolute right-0 top-full mt-3 min-w-[180px] border border-silver bg-white p-4 shadow-lg">
              {navLinks.map((link) => (
                <AnimatedLink
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm not-italic"
                >
                  {link.label}
                </AnimatedLink>
              ))}
              <Link to="/profile" className="block py-2 text-sm">
                Perfil
              </Link>
              <Link to="/favoritos" className="block py-2 text-sm">
                Favoritos
              </Link>
              <a
                href="/#contacto"
                className="interactive mt-2 block border border-black px-3 py-2 text-center font-display text-xs tracking-[0.15em] uppercase hover:border-caramel hover:bg-caramel hover:text-white"
              >
                Reservar sesión
              </a>
            </div>
          </details>
        </div>
      </div>
    </motion.header>
  )
}
