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
import {
  getProfileDirect,
  updateProfileDirect,
  uploadBodyPhotoDirect,
} from '../lib/demoDb'
import { MOCK_USER } from '../lib/mockUser'
import type { TargetGender, UserProfile } from '../types/auth'

interface AuthContextValue {
  user: typeof MOCK_USER
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
      const direct = await getProfileDirect()
      setProfile(direct)
      return direct
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const updateProfile = useCallback(
    async (payload: { displayName?: string; gender?: TargetGender }) => {
      try {
        const data = await apiJson<UserProfile>('/profile', {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        setProfile(data)
        return data
      } catch {
        const data = await updateProfileDirect(payload)
        setProfile(data)
        return data
      }
    },
    []
  )

  const uploadBodyPhoto = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    try {
      const data = await apiJson<UserProfile>('/profile/body-photo', {
        method: 'POST',
        body: formData,
      })
      setProfile(data)
      return data
    } catch {
      const data = await uploadBodyPhotoDirect(file)
      setProfile(data)
      return data
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  const signIn = useCallback(async () => {
    await refreshProfile()
  }, [refreshProfile])

  const signUp = useCallback(async () => ({ needsEmailConfirmation: false }), [])

  const signOut = useCallback(async () => {
    await refreshProfile()
  }, [refreshProfile])

  const completePendingRegistration = useCallback(async () => false, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: MOCK_USER,
      session: null,
      profile,
      loading: false,
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
