import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

function gitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'dev'
  }
}

const transformersVersion = JSON.parse(readFileSync('node_modules/@huggingface/transformers/package.json', 'utf8')).version

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  worker: { format: 'es' },
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit()),
    __BUILT_AT__: JSON.stringify(new Date().toISOString()),
    __TRANSFORMERS_VERSION__: JSON.stringify(transformersVersion),
  },
  // Pre-bundle up front: discovering it lazily from the worker made the dev server answer 504 until the dep cache was rebuilt.
  optimizeDeps: { include: ['@huggingface/transformers'] },
})
