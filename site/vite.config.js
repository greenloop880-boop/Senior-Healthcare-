import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor chunks so browser can cache library code separately
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'query': ['@tanstack/react-query'],
        }
      }
    },
    // Warn if any chunk exceeds 500KB
    chunkSizeWarningLimit: 500,
  },
  // Only disable cache during development — keeps hot-reload fast
  server: {
    headers: {
      'Cache-Control': 'no-cache'
    }
  }
})
