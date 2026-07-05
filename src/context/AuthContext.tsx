import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { apiJson } from '../lib/api'
import {
  clearPendingRegistration,
  dataUrlToFile,
  loadPendingRegistration,
} from '../lib/pendingRegistration'
import type { TargetGender, UserProfile } from '../types/auth'

interface SignUpResult {
  needsEmailConfirmation: boolean
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  accessToken: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (payload: {
    email: string
    password: string
    displayName: string
    gender: TargetGender
  }) => Promise<SignUpResult>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<UserProfile | null>
  updateProfile: (payload: {
    displayName?: string
    gender?: TargetGender
  }) => Promise<UserProfile>
  uploadBodyPhoto: (file: File) => Promise<UserProfile>
  completePendingRegistration: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function translateAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('email not confirmed')) {
    return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'
  }
  if (lower.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (lower.includes('user already registered')) {
    return 'Este email ya está registrado. Inicia sesión.'
  }
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const completingPendingRef = useRef(false)

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null)
      return null
    }

    setProfileLoading(true)
    try {
      const data = await apiJson<UserProfile>('/profile')
      setProfile(data)
      return data
    } catch {
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [session])

  const updateProfile = useCallback(
    async (payload: { displayName?: string; gender?: TargetGender }) => {
      const data = await apiJson<UserProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      setProfile(data)
      return data
    },
    []
  )

  const uploadBodyPhoto = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    const data = await apiJson<UserProfile>('/profile/body-photo', {
      method: 'POST',
      body: formData,
    })
    setProfile(data)
    return data
  }, [])

  const completePendingRegistration = useCallback(async () => {
    if (!session?.user || completingPendingRef.current) return false

    const pending = loadPendingRegistration()
    if (!pending) return false

    const userEmail = session.user.email?.trim().toLowerCase()
    if (!userEmail || userEmail !== pending.email) return false

    completingPendingRef.current = true
    try {
      await updateProfile({
        displayName: pending.displayName,
        gender: pending.gender,
      })

      const file = await dataUrlToFile(
        pending.bodyPhotoDataUrl,
        pending.bodyPhotoName
      )
      await uploadBodyPhoto(file)
      clearPendingRegistration()
      return true
    } finally {
      completingPendingRef.current = false
    }
  }, [session, updateProfile, uploadBodyPhoto])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }

    let cancelled = false

    async function bootstrapProfile() {
      await completePendingRegistration()
      if (!cancelled) {
        await refreshProfile()
      }
    }

    bootstrapProfile()
    return () => {
      cancelled = true
    }
  }, [session, completePendingRegistration, refreshProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
  }, [])

  const signUp = useCallback(
    async ({
      email,
      password,
      displayName,
      gender,
    }: {
      email: string
      password: string
      displayName: string
      gender: TargetGender
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      })
      if (error) throw new Error(translateAuthError(error.message))

      if (data.session) {
        await apiJson<UserProfile>('/profile', {
          method: 'PUT',
          body: JSON.stringify({ displayName, gender }),
        })
        return { needsEmailConfirmation: false }
      }

      return { needsEmailConfirmation: true }
    },
    []
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
    setProfile(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      profileLoading,
      accessToken: session?.access_token ?? null,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      uploadBodyPhoto,
      completePendingRegistration,
    }),
    [
      user,
      session,
      profile,
      loading,
      profileLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      uploadBodyPhoto,
      completePendingRegistration,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
