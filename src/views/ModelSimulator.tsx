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
// AvatarViewer — SVG avatar with garment layers
// ---------------------------------------------------------------------------

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

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-smoke/30">
      <p className="absolute left-4 top-4 font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
        Vista {Math.round(((rotation % 360) + 360) % 360)}°
      </p>

      <motion.div
        className="relative h-[85%] w-[70%]"
        style={{ perspective: 800 }}
        animate={{ rotateY: rotation }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        <svg
          viewBox="0 0 200 420"
          className="h-full w-full"
          aria-label="Avatar digital con previsualización de prendas"
        >
          <ellipse cx="100" cy="405" rx="45" ry="8" fill="#000" opacity="0.08" />

          {!isDress && (
            <>
              <rect x="78" y="280" width="18" height="115" rx="4" fill="#D4C4B0" />
              <rect x="104" y="280" width="18" height="115" rx="4" fill="#D4C4B0" />
            </>
          )}

          {!isDress && bottomGarment && (
            <path
              d="M72 230 Q100 245 128 230 L132 295 Q100 305 68 295 Z"
              fill={bottomColor}
              opacity="0.95"
            />
          )}

          {isDress && dressGarment && (
            <path
              d="M68 130 Q100 140 132 130 L145 310 Q100 330 55 310 Z"
              fill={dressColor}
              opacity="0.95"
            />
          )}

          <ellipse cx="100" cy="200" rx="32" ry="45" fill="#D4C4B0" />

          {!isDress && topGarment && (
            <>
              <ellipse cx="100" cy="175" rx="36" ry="28" fill={topColor} opacity="0.95" />
              <rect x="72" y="175" width="56" height="60" rx="4" fill={topColor} opacity="0.95" />
            </>
          )}

          {outerGarment && (
            <path
              d="M58 125 Q100 115 142 125 L150 260 Q100 275 50 260 Z"
              fill={outerColor}
              opacity="0.85"
            />
          )}

          <ellipse cx="58" cy="195" rx="12" ry="35" fill="#D4C4B0" transform="rotate(8 58 195)" />
          <ellipse cx="142" cy="195" rx="12" ry="35" fill="#D4C4B0" transform="rotate(-8 142 195)" />

          <rect x="92" y="118" width="16" height="18" rx="4" fill="#D4C4B0" />

          <ellipse cx="100" cy="95" rx="22" ry="26" fill="#D4C4B0" />

          <path
            d="M78 88 Q100 65 122 88 Q120 75 100 70 Q80 75 78 88"
            fill="#3D2B1F"
            opacity="0.7"
          />
        </svg>
      </motion.div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-1 rounded-sm bg-white/90 px-3 py-2 shadow-sm ring-1 ring-silver/40">
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
                    className="relative overflow-hidden border border-black/10 shadow-lg"
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
