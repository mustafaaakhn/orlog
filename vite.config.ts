import { templateCompilerOptions } from '@tresjs/core'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { attachRoomServer } from './server/rooms'

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions }), {
    name: 'orlog-rooms',
    configureServer(server) {
      if (server.httpServer) attachRoomServer(server.httpServer)
    },
  }],
  // The roll worker is lazy; warm its dependency before the first match opens.
  optimizeDeps: { include: ['@dimforge/rapier3d-compat'] },
})
