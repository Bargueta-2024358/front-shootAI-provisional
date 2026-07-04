import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useSpring } from 'framer-motion'
import AnimatedLink from './AnimatedLink'

interface HeroHalfProps {
  title: string
  href: string
  videoSrc: string
  side: 'left' | 'right'
  onHoverChange: (side: 'left' | 'right' | null) => void
}

function HeroHalf({ title, href, videoSrc, side, onHoverChange }: HeroHalfProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Preload video as soon as the component mounts
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
  }, [])

  const handleEnter = useCallback(() => {
    setHovered(true)
    onHoverChange(side)
    if (prefersReducedMotion) return
    const video = videoRef.current
    if (!video) return
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }, [onHoverChange, prefersReducedMotion, side])

  const handleLeave = useCallback(() => {
    setHovered(false)
    onHoverChange(null)
    const video = videoRef.current
    if (!video) return
    video.pause()
    setPlaying(false)
  }, [onHoverChange])

  const toggleMobile = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [])

  return (
    <div
      className="interactive group relative h-[50vh] w-full overflow-hidden md:h-screen md:w-1/2"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => {
        if (window.innerWidth < 768) toggleMobile()
      }}
      role="region"
      aria-label={title}
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-[250ms] ${hovered && !prefersReducedMotion ? 'scale-105 opacity-100 blur-0' : 'scale-100 opacity-80 blur-[1px]'}`}
        src={videoSrc}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />

      <div className="absolute inset-0 bg-black/30 transition-colors duration-[250ms] group-hover:bg-black/10" />

      <div className="absolute bottom-8 left-8 z-10 md:bottom-12 md:left-12">
        <p
          className={`font-display text-sm tracking-[0.35em] uppercase transition-colors duration-[250ms] md:text-base ${hovered ? 'text-caramel' : 'text-white'}`}
        >
          {title}
        </p>
        <AnimatedLink href={href} light className={`mt-2 text-lg md:text-xl ${hovered ? '!text-caramel' : ''}`}>
          Descubrir
        </AnimatedLink>
      </div>

      <button
        type="button"
        className="interactive absolute bottom-8 right-8 z-10 text-white/80 transition-colors hover:text-caramel focus-visible:text-caramel md:bottom-12 md:right-12"
        aria-label={playing ? 'Pausar video' : 'Reproducir video'}
        onClick={(e) => {
          e.stopPropagation()
          toggleMobile()
        }}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
            <rect x="3" y="2" width="4" height="14" rx="0.5" />
            <rect x="11" y="2" width="4" height="14" rx="0.5" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" aria-hidden>
            <path d="M4 2.5v13l11-6.5L4 2.5z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function Hero() {
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  const lineX = useSpring(
    typeof window !== 'undefined' ? window.innerWidth / 2 : 720,
    { stiffness: 150, damping: 22 },
  )

  // Track actual mouse X position within the hero
  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const onMove = (e: MouseEvent) => {
      lineX.set(e.clientX)
    }

    hero.addEventListener('mousemove', onMove)
    return () => hero.removeEventListener('mousemove', onMove)
  }, [lineX])

  const handleHoverChange = useCallback(
    (side: 'left' | 'right' | null) => {
      setActiveSide(side)
      if (!side) {
        lineX.set(window.innerWidth / 2)
      }
    },
    [lineX],
  )

  return (
    <section ref={heroRef} className="relative flex min-h-screen flex-col md:flex-row">
      <HeroHalf
        title="Pre-Shoot"
        href="#pre-shoot"
        videoSrc="/videos/pre-shoot.mp4"
        side="left"
        onHoverChange={handleHoverChange}
      />
      <HeroHalf
        title="Live-Shoot"
        href="#live-shoot"
        videoSrc="/videos/live-shoot.mp4"
        side="right"
        onHoverChange={handleHoverChange}
      />

      {/* Divider line that follows cursor */}
      <motion.div
        className="pointer-events-none absolute bottom-0 top-0 z-20 hidden w-px bg-caramel md:block"
        style={{ left: lineX, opacity: activeSide ? 1 : 0.5 }}
        aria-hidden
      />

      {/* Center logo */}
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div className="text-center text-white text-shadow-hero">
          <h1 className="font-display text-[clamp(3.5rem,12vw,9rem)] font-semibold leading-[0.85] tracking-[0.08em]">
            SHOOT
          </h1>
          <p className="font-display text-[clamp(3rem,10vw,7rem)] font-light italic leading-none tracking-[0.2em]">
            AI
          </p>
        </div>
      </div>
    </section>
  )
}
