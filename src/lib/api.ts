const DEFAULT_BACKEND_URL = 'https://server-shootai.onrender.com'

let cachedApiBase: string | null = null
let configLoaded = false

function normalizeBase(url: string): string {
  return url.replace(/\/$/, '')
}

function backendToApiBase(backendUrl: string): string {
  return `${normalizeBase(backendUrl)}/api`
}

function resolveApiBaseSync(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined
  const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined

  if (
    configured &&
    configured !== '/api' &&
    !configured.includes('localhost') &&
    !configured.includes('127.0.0.1')
  ) {
    return normalizeBase(configured)
  }

  if (
    backendUrl &&
    !backendUrl.includes('localhost') &&
    !backendUrl.includes('127.0.0.1')
  ) {
    return backendToApiBase(backendUrl)
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return backendToApiBase(DEFAULT_BACKEND_URL)
    }
  }

  return 'http://localhost:3000/api'
}

async function loadRuntimeConfig() {
  if (configLoaded || typeof window === 'undefined') return
  configLoaded = true

  try {
    const res = await fetch('/config.json', { cache: 'no-store' })
    if (!res.ok) return
    const cfg = (await res.json()) as {
      apiBaseUrl?: string
      backendUrl?: string
    }

    if (
      cfg.apiBaseUrl &&
      cfg.apiBaseUrl !== '/api' &&
      !cfg.apiBaseUrl.includes('localhost') &&
      !cfg.apiBaseUrl.includes('127.0.0.1')
    ) {
      cachedApiBase = normalizeBase(cfg.apiBaseUrl)
      return
    }

    if (
      cfg.backendUrl &&
      !cfg.backendUrl.includes('localhost') &&
      !cfg.backendUrl.includes('127.0.0.1')
    ) {
      cachedApiBase = backendToApiBase(cfg.backendUrl)
    }
  } catch {
    // ignore — fall back to build-time resolution
  }
}

export async function getApiBase(): Promise<string> {
  if (cachedApiBase) return cachedApiBase
  await loadRuntimeConfig()
  if (cachedApiBase) return cachedApiBase
  cachedApiBase = resolveApiBaseSync()
  return cachedApiBase
}

export const API_BASE = resolveApiBaseSync()

export async function parseApiJson(res: Response): Promise<{
  success?: boolean
  data?: unknown
  error?: { message?: string }
}> {
  const text = await res.text()
  const trimmed = text.trimStart()

  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<!')
  ) {
    throw new Error(
      'El backend no respondió (se recibió HTML). Verifica que el servidor esté desplegado y accesible.'
    )
  }

  if (!trimmed) {
    throw new Error(`Respuesta vacía del servidor (HTTP ${res.status})`)
  }

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    throw new Error(
      trimmed.slice(0, 160) ||
        `El backend respondió con texto plano (HTTP ${res.status}). ¿Está desplegado?`
    )
  }

  try {
    return JSON.parse(text) as {
      success?: boolean
      data?: unknown
      error?: { message?: string }
    }
  } catch {
    throw new Error(
      trimmed.slice(0, 160) || `Respuesta inválida del servidor (HTTP ${res.status})`
    )
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const base = await getApiBase()

  return fetch(`${base}${normalizedPath}`, {
    ...options,
    headers,
  })
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, options)
  const json = await parseApiJson(res)

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Error en la solicitud')
  }

  return json.data as T
}
