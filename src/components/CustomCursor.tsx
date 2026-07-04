import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    if (prefersReducedMotion || coarsePointer) return

    let raf = 0
    let target = { x: 0, y: 0 }

    const onMove = (e: MouseEvent) => {
      target = { x: e.clientX, y: e.clientY }
      if (!visible) setVisible(true)
    }

    const loop = () => {
      setPos((prev) => ({
        x: prev.x + (target.x - prev.x) * 0.18,
        y: prev.y + (target.y - prev.y) * 0.18,
      }))
      raf = requestAnimationFrame(loop)
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      setHovering(Boolean(target.closest('.interactive')))
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [visible])

  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarsePointer =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  if (prefersReducedMotion || coarsePointer) return null

  return (
    <div
      className="pointer-events-none fixed z-[9999] mix-blend-difference"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
        transform: 'translate(-50%, -50%)',
      }}
      aria-hidden
    >
      <div
        className={`rounded-full border transition-all duration-300 ${
          hovering
            ? 'h-10 w-10 border-caramel bg-transparent'
            : 'h-2 w-2 border-white bg-white'
        }`}
      />
    </div>
  )
}
