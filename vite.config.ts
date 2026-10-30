import { templateCompilerOptions } from '@tresjs/core'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
  // The roll worker is lazy; warm its dependency before the first match opens.
  optimizeDeps: { include: ['@dimforge/rapier3d-compat'] },
})
