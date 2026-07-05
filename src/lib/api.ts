let cachedApiBase: string | null = null
let configLoaded = false

function resolveApiBaseSync(): string {
  const configured = import.meta.env.VITE_API_URL as string | undefined

  if (
    configured &&
    !configured.includes('localhost') &&
    !configured.includes('127.0.0.1')
  ) {
    return configured.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api'
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
    const cfg = (await res.json()) as { apiBaseUrl?: string }
    if (
      cfg.apiBaseUrl &&
      !cfg.apiBaseUrl.includes('localhost') &&
      !cfg.apiBaseUrl.includes('127.0.0.1')
    ) {
      cachedApiBase = cfg.apiBaseUrl.replace(/\/$/, '')
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
  const json = await res.json()

  if (!res.ok) {
    throw new Error(json?.error?.message || 'Error en la solicitud')
  }

  return json.data as T
}
