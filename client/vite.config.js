import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  build: {
    target: 'esnext',
    emptyOutDir: true
  },
  envPrefix: 'APP_',
  optimizeDeps: {
    // Disable checking parent directories for packages
    entries: [
      'src/**/*.{js,jsx,ts,tsx}'
    ]
  }
}) 