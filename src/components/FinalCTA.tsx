import AnimatedLink from './AnimatedLink'

export default function FinalCTA() {
  return (
    <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
      <img
        src="https://images.unsplash.com/photo-1558171813-4c088753af8f?auto=format&fit=crop&w=1600&q=80"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative z-10 px-6 text-center text-white">
        <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-tight tracking-wide">
          Tu próxima sesión empieza aquí
        </h2>
        <AnimatedLink href="#contacto" light className="mt-8 inline-block text-xl">
          Reservar una sesión →
        </AnimatedLink>
      </div>
    </section>
  )
}
