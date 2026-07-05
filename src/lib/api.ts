function resolveApiBase(): string {
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

export const API_BASE = resolveApiBase()

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

  return fetch(`${API_BASE}${normalizedPath}`, {
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
