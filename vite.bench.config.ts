import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Spike-only: separate dep cache so benchmarking doesn't invalidate the main dev server's optimized deps.
export default defineConfig({
  base: '/',
  plugins: [react()],
  cacheDir: 'node_modules/.vite-bench',
  optimizeDeps: { include: ['@huggingface/transformers'] },
})
