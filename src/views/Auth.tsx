import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import {
  loadPendingRegistration,
  savePendingFromSignup,
} from '../lib/pendingRegistration'
import type { TargetGender } from '../types/auth'

type Mode = 'login' | 'signup'

const GENDER_OPTIONS: { value: TargetGender; label: string }[] = [
  { value: 'woman', label: 'Mujer' },
  { value: 'man', label: 'Hombre' },
  { value: 'unisex', label: 'Unisex' },
]

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, profileLoading, signIn, signUp, uploadBodyPhoto } =
    useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [gender, setGender] = useState<TargetGender>('unisex')
  const [bodyPhoto, setBodyPhoto] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/pre-shoot'

  useEffect(() => {
    const pending = loadPendingRegistration()
    if (pending) {
      setEmail(pending.email)
      setDisplayName(pending.displayName)
      setGender(pending.gender)
      setMode('login')
      setInfo(
        'Tienes un registro pendiente. Confirma tu correo e inicia sesión; completaremos tu perfil automáticamente.'
      )
    }
  }, [])

  useEffect(() => {
    if (user && profile?.bodyPhotoUrl && !profileLoading) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, profile, profileLoading, navigate, redirectTo])

  if (user && profile?.bodyPhotoUrl && !profileLoading) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    try {
      if (mode === 'login') {
        await signIn(email, password)
        return
      }

      if (!bodyPhoto) {
        throw new Error('Debes subir una foto de cuerpo completo para registrarte')
      }

      const result = await signUp({ email, password, displayName, gender })

      if (result.needsEmailConfirmation) {
        await savePendingFromSignup({
          email,
          displayName,
          gender,
          bodyPhoto,
        })
        setMode('login')
        setPassword('')
        setInfo(
          'Te enviamos un correo de confirmación. Ábrelo, confirma tu cuenta e inicia sesión con el mismo email y contraseña. Tu foto y datos se guardarán automáticamente al entrar.'
        )
        return
      }

      await uploadBodyPhoto(bodyPhoto)
      navigate('/pre-shoot')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  function handlePhotoChange(file: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setBodyPhoto(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-black pt-20">
        <div className="mx-auto max-w-lg px-6 py-16 md:py-24">
          <p className="font-display text-xs tracking-[0.4em] text-mid-gray uppercase">
            Cuenta
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
          <p className="mt-4 font-body text-sm text-charcoal">
            {mode === 'signup'
              ? 'Regístrate con una foto de cuerpo completo. Si tu correo requiere confirmación, la completaremos al iniciar sesión.'
              : 'Accede para continuar con Pre-Shoot, outfits y cámara.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
            {mode === 'signup' && (
              <label className="flex flex-col gap-2">
                <span className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
                  Nombre
                </span>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="border border-mid-gray/30 bg-white px-4 py-3 font-body text-sm text-charcoal focus:border-caramel focus:outline-none"
                />
              </label>
            )}

            <label className="flex flex-col gap-2">
              <span className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-mid-gray/30 bg-white px-4 py-3 font-body text-sm text-charcoal focus:border-caramel focus:outline-none"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray">
                Contraseña
              </span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-mid-gray/30 bg-white px-4 py-3 font-body text-sm text-charcoal focus:border-caramel focus:outline-none"
              />
            </label>

            {mode === 'signup' && (
              <>
                <div>
                  <p className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray mb-3">
                    Para quién
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

                <div>
                  <p className="font-display text-[10px] tracking-[0.3em] uppercase text-mid-gray mb-2">
                    Foto de cuerpo completo
                  </p>
                  <p className="mb-3 font-body text-xs text-charcoal/80">
                    Fondo claro, buena iluminación, de la cabeza a los pies. Esta foto define qué
                    ropa te favorece.
                  </p>
                  <label className="flex cursor-pointer flex-col items-center gap-3 border border-dashed border-silver bg-smoke/20 px-4 py-8 transition-colors hover:border-caramel">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange(e.target.files?.[0] ?? null)
                      }
                    />
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Vista previa"
                        className="max-h-64 w-full object-contain"
                      />
                    ) : (
                      <span className="font-body text-sm text-mid-gray">
                        Haz clic para seleccionar tu foto
                      </span>
                    )}
                  </label>
                </div>
              </>
            )}

            {info && (
              <p className="rounded-sm border border-caramel/30 bg-caramel/10 px-4 py-3 font-body text-sm text-[#EEDFC9]">
                {info}
              </p>
            )}

            {error && (
              <p className="font-body text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-caramel px-8 py-4 font-display text-xs tracking-[0.25em] uppercase text-white transition-colors hover:bg-caramel-dark disabled:opacity-50"
            >
              {loading
                ? 'Procesando…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-8 font-body text-sm text-charcoal">
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError(null)
                    setInfo(null)
                  }}
                  className="text-caramel underline"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                  }}
                  className="text-caramel underline"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>

          <Link
            to="/"
            className="mt-6 inline-block font-body text-xs text-mid-gray hover:text-caramel"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </>
  )
}
