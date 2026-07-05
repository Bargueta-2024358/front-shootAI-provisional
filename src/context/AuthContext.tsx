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
const LOCAL_PROFILE_KEY = 'shootai:profile:v1'

function readLocalProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch {
    return null
  }
}

function writeLocalProfile(profile: UserProfile | null) {
  if (typeof window === 'undefined' || !profile) return
  window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile))
}

function mergeProfiles(
  primary: UserProfile | null,
  fallback: UserProfile | null
): UserProfile | null {
  if (!primary) return fallback
  if (!fallback) return primary

  return {
    ...fallback,
    ...primary,
    bodyPhotoUrl: primary.bodyPhotoUrl || fallback.bodyPhotoUrl || '',
    bodyPhotoPublicId: primary.bodyPhotoPublicId || fallback.bodyPhotoPublicId,
    bodyAttributes:
      Object.keys(primary.bodyAttributes || {}).length > 0
        ? primary.bodyAttributes
        : fallback.bodyAttributes || {},
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true)
    try {
      const data = await apiJson<UserProfile>('/profile')
      let direct: UserProfile | null = null
      if (!data.bodyPhotoUrl) {
        try {
          direct = await getProfileDirect()
        } catch {
          direct = null
        }
      }
      const merged = mergeProfiles(data, mergeProfiles(direct, readLocalProfile()))
      writeLocalProfile(merged)
      setProfile(merged)
      return merged
    } catch {
      let direct: UserProfile | null = null
      try {
        direct = await getProfileDirect()
      } catch {
        direct = null
      }
      const merged = mergeProfiles(direct, readLocalProfile())
      writeLocalProfile(merged)
      setProfile(merged)
      return merged
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
        const merged = mergeProfiles(data, readLocalProfile())
        writeLocalProfile(merged)
        setProfile(merged)
        return merged as UserProfile
      } catch {
        const data = await updateProfileDirect(payload)
        const merged = mergeProfiles(data, readLocalProfile())
        writeLocalProfile(merged)
        setProfile(merged)
        return merged as UserProfile
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
      writeLocalProfile(data)
      setProfile(data)
      return data
    } catch {
      try {
        const data = await uploadBodyPhotoDirect(file)
        writeLocalProfile(data)
        setProfile(data)
        return data
      } catch {
        const fallback = mergeProfiles(
          {
            id: MOCK_USER.id,
            email: MOCK_USER.email,
            displayName: profile?.displayName || 'Juan Perez',
            gender: profile?.gender || 'man',
            bodyPhotoUrl: await fileToDataUrl(file),
            bodyPhotoPublicId: `local-${Date.now()}`,
            bodyAttributes: profile?.bodyAttributes || {},
            updatedAt: new Date().toISOString(),
          },
          readLocalProfile()
        ) as UserProfile
        writeLocalProfile(fallback)
        setProfile(fallback)
        return fallback
      }
    }
  }, [profile])

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
