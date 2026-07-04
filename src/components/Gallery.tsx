import { motion } from 'framer-motion'
import { galleryItems } from '../data/content'

export default function Gallery() {
  return (
    <section className="bg-smoke px-2 py-20 md:px-4 md:py-28">
      <div className="mx-auto max-w-[1400px]">
        <motion.h2
          className="mb-12 px-4 font-display text-3xl tracking-wide md:mb-16 md:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Galería editorial
        </motion.h2>

        <div
          className="grid auto-rows-[180px] grid-cols-2 gap-2 md:auto-rows-[240px] md:grid-cols-4 md:gap-3"
          style={{
            gridTemplateAreas: `
              "a a b c"
              "a a d e"
            `,
          }}
        >
          {galleryItems.map((item, i) => (
            <motion.figure
              key={item.id}
              className="interactive group relative overflow-hidden"
              style={{ gridArea: item.area }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <img src={item.src} alt={item.caption} className="h-full w-full object-cover" loading="lazy" />
              <figcaption className="absolute bottom-4 left-4 font-display text-sm italic text-caramel opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                {item.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
