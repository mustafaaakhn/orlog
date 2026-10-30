import { templateCompilerOptions } from '@tresjs/core'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { attachRoomServer } from './server/rooms'

export default defineConfig({
  server: {
    fs: {
      // Keep Vite's default sensitive-file exclusions when adding the archive.
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/local-archive/**'],
    },
  },
  plugins: [vue({ ...templateCompilerOptions }), {
    name: 'orlog-rooms',
    configureServer(server) {
      if (server.httpServer) attachRoomServer(server.httpServer)
    },
  }],
  // The roll worker is lazy; warm its dependency before the first match opens.
  optimizeDeps: { include: ['@dimforge/rapier3d-compat'] },
})
