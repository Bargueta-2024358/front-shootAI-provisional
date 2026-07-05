import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'
import { WaitingOverlay } from './Waiting'
import { GARMENT_CATALOG, MOCK_AVATAR } from '../data/mockStyling'
import type { AvatarData, GarmentCategory, GarmentItem } from '../types/styling'

// TODO: integrar la lógica real de simulación de modelo cuando el backend
// esté disponible. Este módulo deberá recibir las medidas/escaneo 3D del
// usuario y renderizar un avatar digital sobre el que se puedan previsualizar
// prendas en tiempo real.

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' },
}

const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  superior: 'Superior',
  inferior: 'Inferior',
  abrigo: 'Abrigo',
  vestido: 'Vestido',
}

// ---------------------------------------------------------------------------
// ScanUpload
// ---------------------------------------------------------------------------

interface ScanUploadProps {
  onScanComplete: () => void
  hasAvatar: boolean
}

function ScanUpload({ onScanComplete, hasAvatar }: ScanUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid = Array.from(files).some(
        (f) =>
          f.type.startsWith('image/') ||
          f.name.endsWith('.obj') ||
          f.name.endsWith('.glb') ||
          f.name.endsWith('.gltf'),
      )
      if (valid) onScanComplete()
    },
    [onScanComplete],
  )

  if (hasAvatar) return null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Zona de carga de escaneo 3D. Arrastra o haz clic para seleccionar."
      className={`interactive relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-5 border border-dashed transition-colors duration-200 ${
        dragging
          ? 'border-caramel bg-caramel/5'
          : 'border-silver bg-smoke/40 hover:border-charcoal hover:bg-smoke/70'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFiles(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.obj,.glb,.gltf"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
        aria-hidden
      />

      <svg
        className={`transition-colors duration-200 ${dragging ? 'text-caramel' : 'text-mid-gray'}`}
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <ellipse cx="24" cy="14" rx="7" ry="7.5" />
        <path d="M8 42c0-9.57 7.163-16 16-16s16 6.43 16 16" strokeLinecap="round" />
        <path d="M32 24l5 5-5 5M16 24l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="px-6 text-center">
        <p className="font-display text-sm tracking-wide text-black">
          {dragging ? 'Suelta el escaneo aquí' : 'Sube tu escaneo 3D o foto corporal'}
        </p>
        <p className="mt-2 font-body text-xs text-charcoal">
          OBJ, GLB, GLTF, PNG, JPG — generaremos tu avatar digital
        </p>
      </div>

      <button
        type="button"
        className="interactive border border-black px-6 py-3 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white"
        onClick={(e) => {
          e.stopPropagation()
          onScanComplete()
        }}
      >
        Usar medidas de demo
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AvatarViewer — editorial fashion mannequin with garment layers
// ---------------------------------------------------------------------------

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const clamp = (v: number) => Math.min(255, Math.max(0, v))
  const r = clamp((n >> 16) + amount)
  const g = clamp(((n >> 8) & 0xff) + amount)
  const b = clamp((n & 0xff) + amount)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

interface AvatarViewerProps {
  avatar: AvatarData
  topGarment: GarmentItem | null
  bottomGarment: GarmentItem | null
  outerGarment: GarmentItem | null
  dressGarment: GarmentItem | null
  topColor: string
  bottomColor: string
  outerColor: string
  dressColor: string
  rotation: number
}

function AvatarViewer({
  avatar,
  topGarment,
  bottomGarment,
  outerGarment,
  dressGarment,
  topColor,
  bottomColor,
  outerColor,
  dressColor,
  rotation,
}: AvatarViewerProps) {
  const isDress = dressGarment !== null
  const deg = Math.round(((rotation % 360) + 360) % 360)
  const sideView = deg === 90 || deg === 270

  return (
    <div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 85%, #E8E0D8 0%, #F5F2EE 45%, #FAFAFA 100%)',
      }}
    >
      {/* Studio horizon line */}
      <div
        className="pointer-events-none absolute inset-x-0"
        style={{ top: '72%', height: 1, background: 'linear-gradient(90deg, transparent, #CCCCCC55, transparent)' }}
        aria-hidden
      />

      <p className="absolute left-4 top-4 z-10 font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
        Vista {deg}°
      </p>

      <motion.div
        className="relative h-[88%] w-[72%]"
        style={{ perspective: 900, transformStyle: 'preserve-3d' }}
        animate={{ rotateY: rotation, scaleX: sideView ? 0.42 : 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 22 }}
      >
        <svg
          viewBox="0 0 240 480"
          className="h-full w-full drop-shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          aria-label="Avatar digital con previsualización de prendas"
        >
          <defs>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F0DFCF" />
              <stop offset="55%" stopColor="#E2C4AA" />
              <stop offset="100%" stopColor="#C9A88E" />
            </linearGradient>
            <linearGradient id="skinShadow" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4A3728" />
              <stop offset="100%" stopColor="#2C1F14" />
            </linearGradient>
            <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Floor shadow */}
          <ellipse cx="120" cy="462" rx="52" ry="10" fill="url(#floorShadow)" />

          {/* Hair back volume */}
          <path
            d="M88 78 Q120 52 152 78 Q158 95 154 118 Q120 108 86 118 Q82 95 88 78"
            fill="url(#hairGrad)"
            opacity="0.85"
          />

          {/* Legs — skin */}
          {!isDress && (
            <>
              <path
                d="M102 318 Q98 360 96 420 Q96 448 100 452 Q104 448 104 420 Q102 360 106 318 Z"
                fill="url(#skinGrad)"
              />
              <path
                d="M134 318 Q138 360 140 420 Q140 448 136 452 Q132 448 132 420 Q134 360 130 318 Z"
                fill="url(#skinGrad)"
              />
              {/* Calf definition */}
              <path d="M97 380 Q100 385 103 380" stroke="#C9A88E" strokeWidth="1" fill="none" opacity="0.5" />
              <path d="M137 380 Q140 385 143 380" stroke="#C9A88E" strokeWidth="1" fill="none" opacity="0.5" />
            </>
          )}

          {/* Bottom garment — wide-leg silhouette */}
          {!isDress && bottomGarment && (
            <>
              <path
                d="M88 268 Q120 278 152 268 L158 318 Q120 328 82 318 Z"
                fill={shadeHex(bottomColor, -18)}
              />
              <path
                d="M82 318 Q84 370 88 418 Q92 438 100 440 Q108 438 112 418 Q116 370 118 318 Q120 328 120 328 Q120 328 120 318 L158 318 Q156 370 152 418 Q148 438 140 440 Q132 438 128 418 Q124 370 122 318 Q100 328 82 318 Z"
                fill={bottomColor}
              />
              <path
                d="M100 278 L104 318 M120 278 L116 318"
                stroke={shadeHex(bottomColor, -30)}
                strokeWidth="0.8"
                opacity="0.4"
              />
              {/* Waistband */}
              <path
                d="M88 268 Q120 274 152 268"
                stroke={shadeHex(bottomColor, 20)}
                strokeWidth="2"
                fill="none"
                opacity="0.6"
              />
            </>
          )}

          {/* Dress — A-line editorial cut */}
          {isDress && dressGarment && (
            <>
              <path
                d="M78 148 Q120 158 162 148 L178 340 Q120 368 62 340 Z"
                fill={shadeHex(dressColor, -20)}
              />
              <path
                d="M78 148 Q120 158 162 148 L172 340 Q120 360 68 340 Z"
                fill={dressColor}
              />
              {/* Waist seam */}
              <path
                d="M86 220 Q120 228 154 220"
                stroke={shadeHex(dressColor, 25)}
                strokeWidth="1.2"
                fill="none"
                opacity="0.5"
              />
              {/* Neckline */}
              <path
                d="M96 148 Q120 162 144 148"
                stroke={shadeHex(dressColor, 30)}
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
            </>
          )}

          {/* Torso — hourglass base */}
          <path
            d="M88 158 Q120 148 152 158 L158 268 Q120 282 82 268 Z"
            fill="url(#skinGrad)"
          />
          <path
            d="M88 158 Q120 148 152 158 L158 268 Q120 282 82 268 Z"
            fill="url(#skinShadow)"
          />

          {/* Top garment — fitted bodice */}
          {!isDress && topGarment && (
            <>
              <path
                d="M84 158 Q120 148 156 158 L160 248 Q120 262 80 248 Z"
                fill={shadeHex(topColor, -15)}
              />
              <path
                d="M84 158 Q120 148 156 158 L158 248 Q120 260 82 248 Z"
                fill={topColor}
              />
              {/* Neckline */}
              <path
                d="M98 158 Q120 172 142 158"
                stroke={shadeHex(topColor, 25)}
                strokeWidth="1.5"
                fill="none"
                opacity="0.7"
              />
              {/* Center seam */}
              <line
                x1="120" y1="168" x2="120" y2="248"
                stroke={shadeHex(topColor, -25)}
                strokeWidth="0.6"
                opacity="0.35"
              />
              {/* Shoulder pads hint */}
              <ellipse cx="84" cy="162" rx="8" ry="5" fill={shadeHex(topColor, 10)} opacity="0.5" />
              <ellipse cx="156" cy="162" rx="8" ry="5" fill={shadeHex(topColor, 10)} opacity="0.5" />
            </>
          )}

          {/* Outer garment — structured blazer/coat */}
          {outerGarment && (
            <>
              <path
                d="M72 142 Q120 128 168 142 L178 278 Q120 294 62 278 Z"
                fill={shadeHex(outerColor, -22)}
              />
              <path
                d="M72 142 Q120 128 168 142 L174 278 Q120 292 66 278 Z"
                fill={outerColor}
                opacity="0.92"
              />
              {/* Lapels */}
              <path
                d="M96 142 L108 210 L120 195 L132 210 L144 142"
                fill={shadeHex(outerColor, -12)}
                opacity="0.7"
              />
              {/* Buttons */}
              {[200, 222, 244].map((y) => (
                <circle key={y} cx="120" cy={y} r="2.5" fill={shadeHex(outerColor, 30)} opacity="0.8" />
              ))}
              {/* Side pockets */}
              <path d="M78 230 Q82 240 78 250" stroke={shadeHex(outerColor, -30)} strokeWidth="1" fill="none" opacity="0.4" />
              <path d="M162 230 Q158 240 162 250" stroke={shadeHex(outerColor, -30)} strokeWidth="1" fill="none" opacity="0.4" />
            </>
          )}

          {/* Arms */}
          <path
            d="M72 168 Q58 195 54 240 Q52 258 58 268 Q64 272 70 260 Q74 220 82 178 Z"
            fill="url(#skinGrad)"
          />
          <path
            d="M168 168 Q182 195 186 240 Q188 258 182 268 Q176 272 170 260 Q166 220 158 178 Z"
            fill="url(#skinGrad)"
          />
          {/* Hands */}
          <ellipse cx="58" cy="272" rx="7" ry="5" fill="url(#skinGrad)" />
          <ellipse cx="182" cy="272" rx="7" ry="5" fill="url(#skinGrad)" />

          {/* Neck & collarbone */}
          <rect x="110" y="132" width="20" height="22" rx="6" fill="url(#skinGrad)" />
          <path
            d="M108 152 Q120 158 132 152"
            stroke="#C9A88E"
            strokeWidth="0.8"
            fill="none"
            opacity="0.5"
          />

          {/* Head */}
          <ellipse cx="120" cy="98" rx="26" ry="30" fill="url(#skinGrad)" />

          {/* Face — minimal editorial features */}
          <ellipse cx="112" cy="96" rx="3" ry="2" fill="#3D2B1F" opacity="0.35" />
          <ellipse cx="128" cy="96" rx="3" ry="2" fill="#3D2B1F" opacity="0.35" />
          <path
            d="M116 108 Q120 112 124 108"
            stroke="#C4956A"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* Cheekbone highlight */}
          <ellipse cx="108" cy="104" rx="6" ry="3" fill="#FFF" opacity="0.08" />
          <ellipse cx="132" cy="104" rx="6" ry="3" fill="#FFF" opacity="0.08" />

          {/* Hair — sleek editorial bun */}
          <path
            d="M92 82 Q120 58 148 82 Q156 98 150 118 Q120 112 90 118 Q84 98 92 82"
            fill="url(#hairGrad)"
          />
          <ellipse cx="120" cy="68" rx="14" ry="12" fill="url(#hairGrad)" />
          <path
            d="M108 72 Q120 64 132 72"
            stroke="#6B5344"
            strokeWidth="1"
            fill="none"
            opacity="0.4"
          />

          {/* Subtle studio spotlight on figure */}
          <ellipse cx="120" cy="240" rx="70" ry="180" fill="#FFF" opacity="0.04" filter="url(#softBlur)" />
        </svg>
      </motion.div>

      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 rounded-sm bg-white/95 px-3 py-2 shadow-md ring-1 ring-silver/30 backdrop-blur-sm">
        <p className="font-display text-[10px] tracking-[0.25em] uppercase text-mid-gray">
          {avatar.silhouetteType}
        </p>
        <p className="font-body text-[10px] text-charcoal">
          {avatar.measurements.height} cm · {avatar.measurements.bust}/{avatar.measurements.waist}/{avatar.measurements.hips}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GarmentPicker
// ---------------------------------------------------------------------------

interface GarmentPickerProps {
  selectedTop: string | null
  selectedBottom: string | null
  selectedOuter: string | null
  selectedDress: string | null
  topColor: string
  bottomColor: string
  outerColor: string
  dressColor: string
  onSelectTop: (id: string | null) => void
  onSelectBottom: (id: string | null) => void
  onSelectOuter: (id: string | null) => void
  onSelectDress: (id: string | null) => void
  onColorChange: (category: GarmentCategory, hex: string) => void
}

function GarmentPicker({
  selectedTop,
  selectedBottom,
  selectedOuter,
  selectedDress,
  topColor,
  bottomColor,
  outerColor,
  dressColor,
  onSelectTop,
  onSelectBottom,
  onSelectOuter,
  onSelectDress,
  onColorChange,
}: GarmentPickerProps) {
  const categories: {
    key: GarmentCategory
    selected: string | null
    color: string
    onSelect: (id: string | null) => void
  }[] = [
    { key: 'superior', selected: selectedTop, color: topColor, onSelect: onSelectTop },
    { key: 'inferior', selected: selectedBottom, color: bottomColor, onSelect: onSelectBottom },
    { key: 'abrigo', selected: selectedOuter, color: outerColor, onSelect: onSelectOuter },
    { key: 'vestido', selected: selectedDress, color: dressColor, onSelect: onSelectDress },
  ]

  return (
    <div className="flex flex-col gap-8">
      {categories.map(({ key, selected, color, onSelect }) => {
        const items = GARMENT_CATALOG.filter((g) => g.category === key)
        const activeItem = items.find((g) => g.id === selected)

        return (
          <div key={key}>
            <p className="mb-3 font-display text-xs tracking-[0.3em] uppercase text-mid-gray">
              {CATEGORY_LABELS[key]}
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected === item.id}
                  className={`interactive border px-3 py-2 font-body text-xs transition-all duration-200 ${
                    selected === item.id
                      ? 'border-caramel bg-caramel/10 text-black'
                      : 'border-silver text-charcoal hover:border-charcoal'
                  }`}
                  onClick={() => {
                    if (key === 'vestido') {
                      onSelectDress(selected === item.id ? null : item.id)
                      if (selected !== item.id) {
                        onSelectTop(null)
                        onSelectBottom(null)
                      }
                    } else {
                      onSelect(selected === item.id ? null : item.id)
                      if (key !== 'abrigo') onSelectDress(null)
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeItem && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 flex items-center gap-3"
              >
                <p className="mr-1 font-body text-[10px] text-charcoal">Color:</p>
                {activeItem.colors.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    aria-label={c.name}
                    aria-pressed={color === c.hex}
                    className={`h-7 w-7 rounded-sm ring-1 transition-all duration-200 ${
                      color === c.hex ? 'scale-110 ring-2 ring-caramel' : 'ring-silver/40 hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => onColorChange(key, c.hex)}
                  />
                ))}
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ModelSimulator view
// ---------------------------------------------------------------------------

export default function ModelSimulator() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [avatar, setAvatar] = useState<AvatarData | null>(null)
  const [rotation, setRotation] = useState(0)

  const [selectedTop, setSelectedTop] = useState<string | null>('camisa')
  const [selectedBottom, setSelectedBottom] = useState<string | null>('pantalon')
  const [selectedOuter, setSelectedOuter] = useState<string | null>(null)
  const [selectedDress, setSelectedDress] = useState<string | null>(null)

  const [topColor, setTopColor] = useState('#E8E0D5')
  const [bottomColor, setBottomColor] = useState('#2C2C2C')
  const [outerColor, setOuterColor] = useState('#6B4F3A')
  const [dressColor, setDressColor] = useState('#9C4B4B')

  const handleScanComplete = useCallback(() => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      setAvatar(MOCK_AVATAR)
    }, 3000)
  }, [])

  const handleColorChange = (category: GarmentCategory, hex: string) => {
    if (category === 'superior') setTopColor(hex)
    else if (category === 'inferior') setBottomColor(hex)
    else if (category === 'abrigo') setOuterColor(hex)
    else setDressColor(hex)
  }

  const getGarment = (id: string | null) =>
    id ? GARMENT_CATALOG.find((g) => g.id === id) ?? null : null

  return (
    <>
      <Navbar />
      <WaitingOverlay isOpen={scanning} hideCancelButton />

      <div className="bg-black pt-20">
        <div className="mx-auto max-w-[1400px] px-6 pb-14 pt-16 md:px-10 md:pt-20">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">Módulo 03</p>
          <h1 className="mt-3 font-display text-[clamp(2.8rem,6vw,5rem)] font-semibold leading-[0.9] tracking-wide text-white">
            Model Simulator
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-charcoal">
            Genera un avatar digital a partir del escaneo 3D y previsualiza prendas en tiempo real
            antes de la sesión.
          </p>
        </div>
      </div>

      <main className="bg-white">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 md:py-20">
          <AnimatePresence mode="wait">
            {!avatar ? (
              <motion.div key="upload" {...fadeUp}>
                <ScanUpload onScanComplete={handleScanComplete} hasAvatar={false} />
              </motion.div>
            ) : (
              <motion.div
                key="simulator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-12 lg:flex-row lg:gap-16"
              >
                <div className="w-full lg:w-[55%]">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                      Avatar digital
                    </p>
                    <div className="flex gap-2">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          aria-label={`Rotar a ${deg} grados`}
                          className={`interactive h-8 w-8 border font-display text-[10px] transition-all duration-200 ${
                            Math.round(((rotation % 360) + 360) % 360) === deg
                              ? 'border-caramel bg-caramel text-white'
                              : 'border-silver text-charcoal hover:border-charcoal'
                          }`}
                          onClick={() => setRotation(deg)}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="relative overflow-hidden shadow-2xl ring-1 ring-black/8"
                    style={{ aspectRatio: '3 / 4' }}
                  >
                    <AvatarViewer
                      avatar={avatar}
                      topGarment={getGarment(selectedTop)}
                      bottomGarment={getGarment(selectedBottom)}
                      outerGarment={getGarment(selectedOuter)}
                      dressGarment={getGarment(selectedDress)}
                      topColor={topColor}
                      bottomColor={bottomColor}
                      outerColor={outerColor}
                      dressColor={dressColor}
                      rotation={rotation}
                    />
                  </div>

                  <button
                    type="button"
                    className="interactive mt-4 font-body text-xs text-charcoal underline-offset-2 hover:text-caramel hover:underline"
                    onClick={() => {
                      setAvatar(null)
                      setRotation(0)
                    }}
                  >
                    Cargar nuevo escaneo
                  </button>
                </div>

                <div className="w-full lg:w-[45%] lg:sticky lg:top-28">
                  <div className="mb-6 border-t border-silver pt-6">
                    <p className="font-display text-xs tracking-[0.35em] uppercase text-mid-gray">
                      Previsualización de prendas
                    </p>
                    <p className="mt-2 font-body text-sm text-charcoal">
                      Selecciona prendas y colores para ver cómo quedan sobre tu avatar.
                    </p>
                  </div>

                  <GarmentPicker
                    selectedTop={selectedTop}
                    selectedBottom={selectedBottom}
                    selectedOuter={selectedOuter}
                    selectedDress={selectedDress}
                    topColor={topColor}
                    bottomColor={bottomColor}
                    outerColor={outerColor}
                    dressColor={dressColor}
                    onSelectTop={setSelectedTop}
                    onSelectBottom={setSelectedBottom}
                    onSelectOuter={setSelectedOuter}
                    onSelectDress={setSelectedDress}
                    onColorChange={handleColorChange}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-16 flex justify-center">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="interactive border border-black px-8 py-4 font-display text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:border-caramel hover:bg-caramel hover:text-white"
              onClick={() => navigate('/live-shoot')}
            >
              Volver a Live-Shoot
            </motion.button>
          </div>
        </div>
      </main>
    </>
  )
}
