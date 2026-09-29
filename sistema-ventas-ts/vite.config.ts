import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

const API_PUERTO = Number(process.env.PUERTO_API ?? 3000)

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: 'public',
  server: {
    port: Number(process.env.PUERTO_WEB ?? 5173),
    // En desarrollo el front (Vite, 5173) habla con la API Express (3000).
    proxy: {
      '/api': {
        target: `http://localhost:${API_PUERTO}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
})
