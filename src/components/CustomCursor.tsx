import { useEffect, useState } from 'react'

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hovering, setHovering] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    if (prefersReducedMotion || coarsePointer) return

    // Use refs for values read inside the RAF loop and event handlers
    // so we never need to put them in the dependency array and the
    // effect only runs ONCE for the lifetime of the component.
    const target = { x: 0, y: 0 }
    const visibleRef = { current: false }
    let raf = 0

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX
      target.y = e.clientY
      if (!visibleRef.current) {
        visibleRef.current = true
        setVisible(true)
      }
    }

    // Hide when the pointer physically leaves the browser viewport
    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && !(e as MouseEvent & { toElement?: Element }).toElement) {
        setVisible(false)
        visibleRef.current = false
      }
    }

    // Show again as soon as the pointer re-enters the viewport
    const onMouseEnterDoc = () => {
      if (visibleRef.current) return
      visibleRef.current = true
      setVisible(true)
    }

    // Determine hovering state by checking the deepest element under cursor.
    // Works on <video> because e.target is the video itself, and
    // .closest('.interactive') traverses up to the wrapping div.
    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement
      setHovering(Boolean(el?.closest?.('.interactive')))
    }

    const loop = () => {
      setPos((prev) => ({
        x: prev.x + (target.x - prev.x) * 0.18,
        y: prev.y + (target.y - prev.y) * 0.18,
      }))
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseover', onOver, { passive: true })
    document.addEventListener('mouseout', onMouseOut, { passive: true })
    document.addEventListener('mouseenter', onMouseEnterDoc, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onMouseOut)
      document.removeEventListener('mouseenter', onMouseEnterDoc)
      cancelAnimationFrame(raf)
    }
  }, []) // Empty deps — effect runs exactly once, no listener churn

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
        transition: 'opacity 0.2s ease',
        willChange: 'transform',
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
