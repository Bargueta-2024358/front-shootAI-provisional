import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function readBackendUrl() {
  const fromEnv = (process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || '').trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')

  const urlFile = path.join(root, 'backend.url')
  if (fs.existsSync(urlFile)) {
    const fromFile = fs.readFileSync(urlFile, 'utf8').trim()
    if (fromFile && !fromFile.startsWith('#')) {
      return fromFile.replace(/\/$/, '')
    }
  }

  return ''
}

const backendUrl = readBackendUrl()
const spaFallback = '/*    /index.html   200'
const lines = []

if (backendUrl) {
  lines.push(`/api/*  ${backendUrl}/api/:splat  200`)
  console.log(`Netlify proxy: /api/* -> ${backendUrl}/api/:splat`)

  const configPath = path.join(root, 'public', 'config.json')
  fs.writeFileSync(
    configPath,
    JSON.stringify({ apiBaseUrl: '/api', backendUrl }, null, 2) + '\n',
    'utf8'
  )
} else {
  console.warn(
    'BACKEND_URL not set — profile/favoritos usan Supabase directo. Para outfits, define BACKEND_URL en Netlify o crea backend.url'
  )
}

lines.push(spaFallback)

const redirectsPath = path.join(root, 'public', '_redirects')
fs.mkdirSync(path.dirname(redirectsPath), { recursive: true })
fs.writeFileSync(redirectsPath, lines.join('\n') + '\n', 'utf8')
