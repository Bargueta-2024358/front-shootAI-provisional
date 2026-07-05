export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

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

  return fetch(`${API_BASE}${path}`, {
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
