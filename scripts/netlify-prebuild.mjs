import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const backendUrl = (process.env.BACKEND_URL || process.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

const spaFallback = '/*    /index.html   200'
const lines = []

if (backendUrl) {
  lines.push(`/api/*  ${backendUrl}/api/:splat  200`)
  console.log(`Netlify proxy: /api/* -> ${backendUrl}/api/:splat`)
} else {
  console.warn(
    'BACKEND_URL not set — Netlify will NOT proxy /api. Set BACKEND_URL in Netlify env (e.g. https://server-shootai.onrender.com).'
  )
}

lines.push(spaFallback)

const redirectsPath = path.join(root, 'public', '_redirects')
fs.mkdirSync(path.dirname(redirectsPath), { recursive: true })
fs.writeFileSync(redirectsPath, lines.join('\n') + '\n', 'utf8')
