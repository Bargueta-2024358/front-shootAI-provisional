import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiJson } from '../lib/api'
import type { TargetGender, UserProfile } from '../types/auth'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextValue {
  user: AuthUser | null
  session: null
  profile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  accessToken: null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (payload: {
    email: string
    password: string
    displayName: string
    gender: TargetGender
  }) => Promise<{ needsEmailConfirmation: boolean }>
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
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
  }, [])

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

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const signIn = useCallback(async () => {
    const profileData = await refreshProfile()
    if (!profileData) {
      throw new Error(
        'No se pudo autenticar con datos reales. Verifica que el backend esté disponible.'
      )
    }
  }, [refreshProfile])

  const signUp = useCallback(
    async (payload: {
      email: string
      password: string
      displayName: string
      gender: TargetGender
    }) => {
      await apiJson<UserProfile>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: payload.displayName,
          gender: payload.gender,
          email: payload.email,
        }),
      })
      await refreshProfile()
      return { needsEmailConfirmation: false }
    },
    [refreshProfile]
  )

  const signOut = useCallback(async () => {
    setProfile(null)
  }, [])

  const completePendingRegistration = useCallback(async () => false, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile ? { id: profile.id, email: profile.email } : null,
      session: null,
      profile,
      loading: profileLoading,
      profileLoading,
      accessToken: null,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateProfile,
      uploadBodyPhoto,
      completePendingRegistration,
    }),
    [
      profile,
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
