import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,
    port: 43179,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 43179,
    strictPort: true,
  },
})
