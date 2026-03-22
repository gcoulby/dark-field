import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dark-field/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
  },
})
