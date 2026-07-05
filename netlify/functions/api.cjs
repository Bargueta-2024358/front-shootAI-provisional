const path = require('node:path')
const serverless = require('serverless-http')

const runtimeDefaults = {
  SUPABASE_URL: 'https://qoukpzswuqihnzqhupkq.supabase.co',
  SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWtwenN3dXFpaG56cWh1cGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTUzNDksImV4cCI6MjA5ODc3MTM0OX0.t3Gx-l91DcoYrptYvPUuNbEti4JSIeCizhxMgCZYgLo',
  SUPABASE_CATALOG_URL: 'https://qgbkaykyzybeorpfkjxf.supabase.co',
  SUPABASE_CATALOG_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmtheWt5enliZW9ycGZranhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTc0NTAsImV4cCI6MjA5ODc3MzQ1MH0.PnGAODzXIPsinhmp6kRjuf6rl30bXgzuiPwgg-9P7E0',
  DEMO_EMPRESA_ID: '520d6f4f-7dec-4821-9b17-2f54e35772fd',
  CLOUDINARY_CLOUD_NAME: 'djvw8p0hn',
  CLOUDINARY_API_KEY: '924946488326563',
  CLOUDINARY_API_SECRET: '4maMZaHyOn2WP34rJ7dqySld0ws',
}

for (const [key, value] of Object.entries(runtimeDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

const backendRoot = path.join(__dirname, '../../.backend')
const connectDB = require(path.join(backendRoot, 'src/config/db'))
const app = require(path.join(backendRoot, 'src/app'))

let dbReady = null

const ensureDb = () => {
  if (!dbReady) {
    dbReady = connectDB().catch((err) => {
      console.error('DB connect warning:', err.message)
    })
  }
  return dbReady
}

const expressHandler = serverless(app)

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false
  await ensureDb()

  const rawPath = event.rawPath || event.path || '/'
  let apiPath = rawPath

  if (rawPath.startsWith('/.netlify/functions/api')) {
    const suffix = rawPath.slice('/.netlify/functions/api'.length) || '/'
    apiPath = `/api${suffix.startsWith('/') ? suffix : `/${suffix}`}`
  } else if (!rawPath.startsWith('/api')) {
    apiPath = `/api${rawPath.startsWith('/') ? rawPath : `/${rawPath}`}`
  }

  event.path = apiPath
  if (event.rawPath) event.rawPath = apiPath

  return expressHandler(event, context)
}
