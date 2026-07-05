import { supabase } from './supabase'
import { MOCK_USER_ID } from './mockUser'
import type { FavoriteOutfit, TargetGender, UserProfile } from '../types/auth'

interface AppUserRow {
  id: string
  email: string
  display_name: string
  gender: TargetGender
  body_photo_url: string
  body_photo_public_id: string
  body_attributes: UserProfile['bodyAttributes']
  created_at?: string
  updated_at?: string
}

interface FavoriteRow {
  id: string
  user_id: string
  project_id: string | null
  title: string
  category: string
  event: string
  occasion: string
  match_percentage: number
  garments: FavoriteOutfit['garments']
  created_at: string
}

const mapProfile = (row: AppUserRow): UserProfile => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name || '',
  gender: row.gender || 'man',
  bodyPhotoUrl: row.body_photo_url || '',
  bodyPhotoPublicId: row.body_photo_public_id || '',
  bodyAttributes: row.body_attributes || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapFavorite = (row: FavoriteRow): FavoriteOutfit => ({
  id: row.id,
  userId: row.user_id,
  projectId: row.project_id,
  title: row.title || '',
  category: row.category || '',
  event: row.event || '',
  occasion: row.occasion || '',
  matchPercentage: row.match_percentage || 0,
  garments: row.garments || [],
  createdAt: row.created_at,
})

export async function getProfileDirect(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('app_user')
    .select('*')
    .eq('id', MOCK_USER_ID)
    .maybeSingle()

  if (error || !data) return null
  return mapProfile(data as AppUserRow)
}

export async function updateProfileDirect(payload: {
  displayName?: string
  gender?: TargetGender
}): Promise<UserProfile> {
  const patch: Record<string, string> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.displayName !== undefined) patch.display_name = payload.displayName
  if (payload.gender !== undefined) patch.gender = payload.gender

  const { data, error } = await supabase
    .from('app_user')
    .update(patch)
    .eq('id', MOCK_USER_ID)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo actualizar el perfil')
  }

  return mapProfile(data as AppUserRow)
}

export async function uploadBodyPhotoDirect(file: File): Promise<UserProfile> {
  const objectPath = `shootai/body-photos/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')}`

  const { error: uploadError } = await supabase.storage
    .from('shootai-assets')
    .upload(objectPath, file, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: publicData } = supabase.storage
    .from('shootai-assets')
    .getPublicUrl(objectPath)

  const { data, error } = await supabase
    .from('app_user')
    .update({
      body_photo_url: publicData.publicUrl,
      body_photo_public_id: objectPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', MOCK_USER_ID)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar la foto')
  }

  return mapProfile(data as AppUserRow)
}

export async function listFavoritesDirect(): Promise<FavoriteOutfit[]> {
  const { data, error } = await supabase
    .from('favorite_outfit')
    .select('*')
    .eq('user_id', MOCK_USER_ID)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map((row) => mapFavorite(row as FavoriteRow))
}

export async function createFavoriteDirect(payload: {
  projectId?: string
  title?: string
  category?: string
  event?: string
  occasion?: string
  matchPercentage?: number
  garments?: FavoriteOutfit['garments']
}): Promise<FavoriteOutfit> {
  const { data, error } = await supabase
    .from('favorite_outfit')
    .insert({
      user_id: MOCK_USER_ID,
      project_id: payload.projectId || null,
      title: payload.title || '',
      category: payload.category || '',
      event: payload.event || '',
      occasion: payload.occasion || '',
      match_percentage: Number(payload.matchPercentage) || 0,
      garments: payload.garments || [],
    })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo guardar el favorito')
  }

  return mapFavorite(data as FavoriteRow)
}

export function suggestFavoriteLabels(category: string) {
  const normalized = category || 'casual'
  return {
    theme: `Look ${normalized}`,
    occasion: normalized.charAt(0).toUpperCase() + normalized.slice(1),
  }
}
