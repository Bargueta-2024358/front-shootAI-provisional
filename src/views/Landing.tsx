import { useEffect } from 'react'
import Lenis from 'lenis'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import Footer from '../components/Footer'

export default function Landing() {
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
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </>
  )
}
