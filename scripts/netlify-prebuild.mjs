import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const backendDir = path.join(root, '.backend')
const localBackend = path.join(root, '..', 'server-shootAI')
const backendRepo = 'https://github.com/xsiliezxr/server-shootai.git'

function prepareBackend() {
  if (fs.existsSync(backendDir)) {
    fs.rmSync(backendDir, { recursive: true, force: true })
  }

  if (fs.existsSync(localBackend)) {
    console.log(`Using local backend: ${localBackend}`)
    fs.cpSync(localBackend, backendDir, {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`),
    })
  } else {
    console.log(`Cloning backend: ${backendRepo}`)
    execSync(`git clone --depth 1 ${backendRepo} "${backendDir}"`, {
      stdio: 'inherit',
    })
  }

  console.log('Installing backend dependencies...')
  execSync('npm ci --omit=dev', { cwd: backendDir, stdio: 'inherit' })
}

prepareBackend()

const configPath = path.join(root, 'public', 'config.json')
fs.writeFileSync(
  configPath,
  `${JSON.stringify({ apiBaseUrl: '/api' }, null, 2)}\n`,
  'utf8'
)

const redirectsPath = path.join(root, 'public', '_redirects')
fs.mkdirSync(path.dirname(redirectsPath), { recursive: true })
fs.writeFileSync(redirectsPath, '/*    /index.html   200\n', 'utf8')

console.log('Netlify API: /api/* -> /.netlify/functions/api/:splat')
