import { useEffect } from 'react'
import Lenis from 'lenis'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Philosophy from './components/Philosophy'
import EditorialSection from './components/EditorialSection'
import Gallery from './components/Gallery'
import Testimonial from './components/Testimonial'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'
import { editorialBlocks } from './data/content'

export default function App() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    let raf = 0

    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return (
    <>
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <Philosophy />
        {editorialBlocks.map((block) => (
          <EditorialSection key={block.id} {...block} />
        ))}
        <Gallery />
        <Testimonial />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
