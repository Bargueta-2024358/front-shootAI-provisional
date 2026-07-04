import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import AnimatedLink from './AnimatedLink'

interface EditorialSectionProps {
  id: string
  module: string
  title: string
  description: string
  image: string
  imageAlt: string
  reverse?: boolean
  anchor?: string
}

export default function EditorialSection({
  id,
  module,
  title,
  description,
  image,
  imageAlt,
  reverse = false,
  anchor,
}: EditorialSectionProps) {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['5%', '-5%'])

  return (
    <section
      ref={ref}
      id={anchor}
      className="scroll-mt-24 border-t border-smoke px-6 py-20 md:py-32"
    >
      <div
        className={`mx-auto flex max-w-[1400px] flex-col gap-10 md:gap-16 ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} md:items-center`}
      >
        <motion.div className="relative w-full overflow-hidden md:w-[60%]" style={{ y }}>
          <img
            src={image}
            alt={imageAlt}
            className="interactive aspect-[4/5] w-full object-cover md:aspect-[3/4]"
            loading="lazy"
          />
        </motion.div>

        <motion.div
          className="md:w-[40%]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
        >
          <p className="font-display text-xs tracking-[0.35em] text-mid-gray uppercase">{module}</p>
          <h2 className="mt-4 font-display text-3xl tracking-wide md:text-4xl">{title}</h2>
          <p className="mt-6 font-body text-base leading-relaxed text-charcoal md:text-lg">{description}</p>
          <AnimatedLink href={`#${id}`} className="mt-8 inline-block text-lg">
            Ver el proceso →
          </AnimatedLink>
        </motion.div>
      </div>
    </section>
  )
}
