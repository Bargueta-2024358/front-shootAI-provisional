import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const DEFAULT_BACKEND_URL = 'https://server-shootai.onrender.com'

const DEFAULTS = {
  VITE_API_URL: 'http://localhost:3000/api',
  VITE_BACKEND_URL: DEFAULT_BACKEND_URL,
  VITE_SUPABASE_URL: 'https://qoukpzswuqihnzqhupkq.supabase.co',
  VITE_SUPABASE_ANON_KEY:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvdWtwenN3dXFpaG56cWh1cGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTUzNDksImV4cCI6MjA5ODc3MTM0OX0.t3Gx-l91DcoYrptYvPUuNbEti4JSIeCizhxMgCZYgLo',
}

export default defineConfig(({ mode }) => {
  const envDir = fileURLToPath(new URL('.', import.meta.url))
  const env = loadEnv(mode, envDir, '')

  const backendUrl =
    env.VITE_BACKEND_URL ||
    env.BACKEND_URL ||
    (mode === 'production' ? DEFAULT_BACKEND_URL : '')

  const productionApiUrl = backendUrl
    ? `${backendUrl.replace(/\/$/, '')}/api`
    : '/api'

  const viteEnv = {
    VITE_API_URL:
      env.VITE_API_URL ||
      (mode === 'production' ? productionApiUrl : DEFAULTS.VITE_API_URL),
    VITE_BACKEND_URL: backendUrl || DEFAULTS.VITE_BACKEND_URL,
    VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || DEFAULTS.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      env.VITE_SUPABASE_ANON_KEY || DEFAULTS.VITE_SUPABASE_ANON_KEY,
  }

  return {
    envDir,
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(viteEnv.VITE_API_URL),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(viteEnv.VITE_BACKEND_URL),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(viteEnv.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        viteEnv.VITE_SUPABASE_ANON_KEY
      ),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-router': ['react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-lenis': ['lenis'],
          },
        },
      },
    },
  }
})
