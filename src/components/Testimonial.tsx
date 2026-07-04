import { motion } from 'framer-motion'

export default function Testimonial() {
  return (
    <section className="px-6 py-24 md:py-32">
      <motion.blockquote
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <p className="font-display text-2xl italic leading-relaxed md:text-3xl">
          «Por primera vez pudimos previsualizar la colección completa sobre cuerpos reales antes del primer día de
          rodaje. Shoot AI cambió nuestra forma de producir.»
        </p>
        <footer className="mt-8 font-display text-xs tracking-[0.35em] text-mid-gray uppercase">
          — Elena Vargas, Directora creativa
        </footer>
      </motion.blockquote>
    </section>
  )
}
