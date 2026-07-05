const path = require('node:path')
const serverless = require('serverless-http')

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
