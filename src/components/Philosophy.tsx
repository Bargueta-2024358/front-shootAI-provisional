import { motion } from 'framer-motion'

export default function Philosophy() {
  return (
    <section id="filosofia" className="bg-black px-6 py-28 text-white md:py-40">
      <motion.div
        className="mx-auto max-w-4xl text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <p className="font-display text-[clamp(1.75rem,4vw,3rem)] leading-snug tracking-wide">
          Diseñamos para el cuerpo <em className="text-caramel">real</em>, no para el promedio.
          Cada sesión es una conversación entre la forma humana y la prenda.
        </p>
      </motion.div>
    </section>
  )
}
