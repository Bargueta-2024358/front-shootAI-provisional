import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface HeroHalfProps {
  title: string
  href: string
  videoSrc: string
  side: 'left' | 'right'
}

function HeroHalf({ title, href, videoSrc }: HeroHalfProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
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
    ensureLoaded()
    if (prefersReducedMotion) return
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play()
      .then(() => setPlaying(true))
      .catch(() => {/* autoplay blocked */})
  }, [ensureLoaded, prefersReducedMotion])

  const handleLeave = useCallback(() => {
    setPlaying(false)
    videoRef.current?.pause()
  }, [])

  // Mobile: tap the panel to toggle play (no hover on touch)
  const handleMobileTap = useCallback((e: React.MouseEvent) => {
    if (window.innerWidth >= 768) return
    const t = e.target as HTMLElement
    if (t.closest('a')) return          // let the Link navigate
    ensureLoaded()
    const video = videoRef.current
    if (!video) return
    video.muted = true
    if (video.paused) {
      video.play()
        .then(() => setPlaying(true))
        .catch(() => {})
    } else {
      video.pause()
      setPlaying(false)
    }
  }, [ensureLoaded])

  return (
    <div
      className="group relative h-[50vh] w-full overflow-hidden md:h-screen md:w-1/2"
      style={{ background: 'linear-gradient(135deg, #1a1209 0%, #0d0d0d 60%, #1c1510 100%)' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      onClick={handleMobileTap}
      role="region"
      aria-label={title}
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-[250ms] ${
          playing && !prefersReducedMotion ? 'scale-105 opacity-100' : 'scale-100 opacity-0'
        }`}
        src={videoSrc}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden
      />

      <div className="absolute inset-0 bg-black/20 transition-colors duration-[250ms] group-hover:bg-black/10" />

      {/*
        Navigation block: white text at rest.
        On hover of THIS block → white background + caramel text (group/label).
      */}
      <Link
        to={href}
        className="interactive group/label absolute bottom-8 left-8 z-10 bg-transparent px-3 py-2
                   transition-all duration-300
                   hover:bg-white focus-visible:bg-white focus-visible:outline-none
                   md:bottom-12 md:left-12"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="font-display text-xs tracking-[0.3em] uppercase text-white
                     transition-colors duration-[250ms]
                     group-hover/label:text-[#7A5A40]
                     md:text-sm"
        >
          {title}
        </p>

        <span
          className="relative mt-1 inline-block font-display italic text-base text-white
                     transition-colors duration-[250ms]
                     group-hover/label:text-[#7A5A40]
                     md:text-lg"
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
        side="left"
      />
      <HeroHalf
        title="Live-Shoot"
        href="/live-shoot"
        videoSrc="/videos/live-shoot.mp4"
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
