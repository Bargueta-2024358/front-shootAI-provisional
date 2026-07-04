import { navLinks } from '../data/content'

export default function Footer() {
  return (
    <footer id="contacto" className="bg-smoke px-6 py-16 md:py-20">
      <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-3">
        <div>
          <p className="font-display text-xs tracking-[0.35em] uppercase">Navegación</p>
          <ul className="mt-4 space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="interactive font-body text-sm text-charcoal transition-colors hover:text-caramel focus-visible:text-caramel"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-display text-xs tracking-[0.35em] uppercase">Legal</p>
          <ul className="mt-4 space-y-2 font-body text-sm text-charcoal">
            <li>
              <a href="#" className="interactive hover:text-caramel focus-visible:text-caramel">
                Aviso legal
              </a>
            </li>
            <li>
              <a href="#" className="interactive hover:text-caramel focus-visible:text-caramel">
                Privacidad
              </a>
            </li>
            <li>
              <a href="#" className="interactive hover:text-caramel focus-visible:text-caramel">
                Cookies
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-xs tracking-[0.35em] uppercase">Newsletter</p>
          <p className="mt-4 font-body text-sm text-charcoal">
            Recibe novedades sobre moda digital y nuevas funciones.
          </p>
          <form className="mt-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="tu@email.com"
              aria-label="Email para newsletter"
              className="interactive w-full border-b border-charcoal bg-transparent py-2 font-body text-sm outline-none transition-colors focus:border-caramel"
            />
          </form>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-[1400px] border-t border-silver pt-8">
        <p className="font-body text-xs tracking-wide text-mid-gray">
          Instagram — LinkedIn — Behance
        </p>
        <p className="mt-2 font-display text-xs tracking-[0.2em] uppercase">© 2026 Shoot AI</p>
      </div>
    </footer>
  )
}
