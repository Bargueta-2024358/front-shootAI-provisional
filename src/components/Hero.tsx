import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface HeroHalfProps {
  title: string
  href: string
  videoSrc: string
  posterSrc: string
  side: 'left' | 'right'
}

function HeroHalf({ title, href, videoSrc, posterSrc }: HeroHalfProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [hovered, setHovered] = useState(false)
  const fullyLoaded = useRef(false)
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const ensureLoaded = useCallback(() => {
    const video = videoRef.current
    if (!video || fullyLoaded.current) return
    fullyLoaded.current = true
    video.preload = 'auto'
    video.load()
  }, [])

  const handleEnter = useCallback(() => {
    setHovered(true)
    ensureLoaded()
    if (prefersReducedMotion) return
    const video = videoRef.current
    if (!video) return
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }, [ensureLoaded, prefersReducedMotion])

  const handleLeave = useCallback(() => {
    setHovered(false)
    const video = videoRef.current
    if (!video) return
    video.pause()
    setPlaying(false)
  }, [])

  const toggleMobile = useCallback(() => {
    ensureLoaded()
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [ensureLoaded])

  return (
    <div
      className="interactive group relative h-[50vh] w-full overflow-hidden md:h-screen md:w-1/2"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onClick={(e) => {
        // On mobile, only toggle video when tapping the raw panel area —
        // not when the tap lands on a <a>/<button> (they handle themselves).
        if (window.innerWidth < 768) {
          const t = e.target as HTMLElement
          if (!t.closest('a') && !t.closest('button')) toggleMobile()
        }
      }}
      role="region"
      aria-label={title}
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-[250ms] ${
          hovered && !prefersReducedMotion ? 'scale-105 opacity-100 blur-0' : 'scale-100 opacity-80 blur-[1px]'
        }`}
        src={videoSrc}
        poster={posterSrc}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      />

      <div className="absolute inset-0 bg-black/30 transition-colors duration-[250ms] group-hover:bg-black/10" />

      {/*
        Single navigable block: Link wraps both title and "Descubrir".
        - border-transparent by default (same width) → no layout jump on hover.
        - hover/focus-visible: caramel border outline.
        - stopPropagation prevents the outer div's onClick from firing
          when this link is tapped on mobile.
      */}
      <Link
        to={href}
        className="interactive group/label absolute bottom-8 left-8 z-10 border border-transparent px-3 py-2 transition-all duration-300 hover:border-caramel focus-visible:border-caramel focus-visible:outline-none md:bottom-12 md:left-12"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className={`font-display text-xs tracking-[0.3em] uppercase transition-colors duration-[250ms] md:text-sm ${
            hovered ? 'text-caramel' : 'text-white'
          }`}
        >
          {title}
        </p>

        {/* "Descubrir" with animated underline on hover */}
        <span
          className={`relative mt-1 inline-block font-display italic text-base transition-colors duration-[250ms] md:text-lg ${
            hovered ? 'text-caramel' : 'text-white'
          }`}
        >
          Descubrir
          <motion.span
            className="absolute -bottom-0.5 left-0 h-px w-full origin-left bg-current"
            initial={{ scaleX: 0 }}
            whileHover={{ scaleX: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            aria-hidden
          />
        </span>
      </Link>

      {/* Play/pause button — stopPropagation prevents outer div onClick */}
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
  return (
    <section className="relative flex min-h-screen flex-col md:flex-row">
      <HeroHalf
        title="Pre-Shoot"
        href="/pre-shoot"
        videoSrc="/videos/pre-shoot.mp4"
        posterSrc="/videos/pre-shoot-poster.jpg"
        side="left"
      />
      <HeroHalf
        title="Live-Shoot"
        href="/live-shoot"
        videoSrc="/videos/live-shoot.mp4"
        posterSrc="/videos/live-shoot-poster.jpg"
        side="right"
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
