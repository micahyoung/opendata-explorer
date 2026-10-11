import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  worker: { format: 'es' },
  // Pre-bundle up front: discovering it lazily from the worker made the dev server answer 504 until the dep cache was rebuilt.
  optimizeDeps: { include: ['@huggingface/transformers'] },
})
