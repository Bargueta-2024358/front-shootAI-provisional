import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — always needed, cache well separately
          'vendor-react': ['react', 'react-dom'],
          // Router — shared across all views
          'vendor-router': ['react-router-dom'],
          // Framer Motion is large (~100KB gz); isolate so it can be cached
          // independently of app code changes
          'vendor-motion': ['framer-motion'],
          // Lenis smooth scroll — only used in Landing
          'vendor-lenis': ['lenis'],
        },
      },
    },
  },
})
