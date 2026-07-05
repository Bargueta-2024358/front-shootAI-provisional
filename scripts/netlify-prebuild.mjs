import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const RENDER_API_BASE = 'https://server-shootai.onrender.com/api'

const configPath = path.join(root, 'public', 'config.json')
fs.writeFileSync(
  configPath,
  `${JSON.stringify({ apiBaseUrl: RENDER_API_BASE }, null, 2)}\n`,
  'utf8'
)

const redirectsPath = path.join(root, 'public', '_redirects')
fs.mkdirSync(path.dirname(redirectsPath), { recursive: true })
fs.writeFileSync(
  redirectsPath,
  `/api/*  https://server-shootai.onrender.com/api/:splat  200\n/*  /index.html  200\n`,
  'utf8'
)

console.log(`API configurada: ${RENDER_API_BASE}`)
