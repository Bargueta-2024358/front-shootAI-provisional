import type { TargetGender } from '../types/auth'

const STORAGE_KEY = 'shootai:pendingRegistration'

export interface PendingRegistration {
  email: string
  displayName: string
  gender: TargetGender
  bodyPhotoDataUrl: string
  bodyPhotoName: string
}

export function savePendingRegistration(data: PendingRegistration) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadPendingRegistration(): PendingRegistration | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingRegistration
  } catch {
    return null
  }
}

export function clearPendingRegistration() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la foto'))
    reader.readAsDataURL(file)
  })
}

export async function dataUrlToFile(
  dataUrl: string,
  filename: string
): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

export async function savePendingFromSignup(input: {
  email: string
  displayName: string
  gender: TargetGender
  bodyPhoto: File
}) {
  const bodyPhotoDataUrl = await fileToDataUrl(input.bodyPhoto)
  savePendingRegistration({
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName,
    gender: input.gender,
    bodyPhotoDataUrl,
    bodyPhotoName: input.bodyPhoto.name || 'body-photo.jpg',
  })
}
