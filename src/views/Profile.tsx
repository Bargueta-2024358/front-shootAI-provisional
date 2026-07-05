import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import type { TargetGender } from '../types/auth'

const GENDER_OPTIONS: { value: TargetGender; label: string }[] = [
  { value: 'woman', label: 'Mujer' },
  { value: 'man', label: 'Hombre' },
  { value: 'unisex', label: 'Unisex' },
]

export default function Profile() {
  const location = useLocation()
  const { profile, updateProfile, uploadBodyPhoto, profileLoading } = useAuth()
  const requireBodyPhoto = Boolean(
    (location.state as { requireBodyPhoto?: boolean } | null)?.requireBodyPhoto
  )

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [gender, setGender] = useState<TargetGender>(profile?.gender ?? 'unisex')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setGender(profile.gender)
    }
  }, [profile])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateProfile({ displayName, gender })
      setMessage('Perfil actualizado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      await uploadBodyPhoto(file)
      setMessage('Foto base actualizada y validada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir foto')
    } finally {
      setUploading(false)
    }
  }

  const attrs = profile?.bodyAttributes

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-black pt-20">
        <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Mi perfil
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">
            Tu referencia personal
          </h1>

          {requireBodyPhoto && !profile?.bodyPhotoUrl && (
            <p className="mt-4 rounded-sm border border-caramel/40 bg-caramel/10 px-4 py-3 font-body text-sm text-[#EEDFC9]">
              Sube una foto de cuerpo completo para continuar con Pre-Shoot y outfits.
            </p>
          )}

          {profileLoading && (
            <p className="mt-6 font-body text-sm text-charcoal">Cargando perfil…</p>
          )}

          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <p className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray mb-3">
                Foto base
              </p>
              {profile?.bodyPhotoUrl ? (
                <img
                  src={profile.bodyPhotoUrl}
                  alt="Foto de cuerpo completo"
                  className="aspect-[3/4] w-full object-cover object-top bg-smoke"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-smoke/20 font-body text-sm text-mid-gray">
                  Sin foto
                </div>
              )}

              <label className="mt-4 inline-block cursor-pointer border border-caramel px-4 py-2 font-display text-[10px] tracking-[0.2em] uppercase text-caramel hover:bg-caramel hover:text-white">
                {uploading ? 'Validando…' : 'Actualizar foto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handlePhotoUpload(file)
                  }}
                />
              </label>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
                  Nombre
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border border-mid-gray/30 bg-white px-4 py-3 font-body text-sm text-charcoal focus:border-caramel focus:outline-none"
                />
              </label>

              <div>
                <p className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray mb-3">
                  Género
                </p>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setGender(option.value)}
                      className={`border px-4 py-2 font-display text-[10px] tracking-[0.2em] uppercase transition-colors ${
                        gender === option.value
                          ? 'border-caramel bg-caramel text-white'
                          : 'border-silver text-mid-gray hover:border-caramel hover:text-caramel'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {attrs && Object.keys(attrs).length > 0 && (
                <div className="rounded-sm border border-silver/30 bg-white/5 p-4">
                  <p className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray mb-3">
                    Atributos detectados
                  </p>
                  {attrs.bodyType && (
                    <p className="font-body text-sm text-white/80">
                      Tipo de cuerpo: {attrs.bodyType}
                    </p>
                  )}
                  {attrs.skinTone && (
                    <p className="mt-1 font-body text-sm text-white/80">
                      Tono de piel: {attrs.skinTone}
                    </p>
                  )}
                  {attrs.recommendedColors && attrs.recommendedColors.length > 0 && (
                    <p className="mt-2 font-body text-sm text-white/80">
                      Colores recomendados: {attrs.recommendedColors.join(', ')}
                    </p>
                  )}
                  {attrs.recommendedFits && attrs.recommendedFits.length > 0 && (
                    <p className="mt-1 font-body text-sm text-white/80">
                      Fits recomendados: {attrs.recommendedFits.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {message && (
                <p className="font-body text-sm text-green-400">{message}</p>
              )}
              {error && (
                <p className="font-body text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="bg-caramel px-6 py-3 font-display text-xs tracking-[0.25em] uppercase text-white hover:bg-caramel-dark disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
