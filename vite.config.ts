import { defineConfig } from 'vite'

export default defineConfig({
  // itch.io はサブパス配信のため相対パス必須
  base: './',
  build: {
    target: 'es2022',
  },
})
