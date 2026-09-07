import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  base: './',
  server: {
    host: true,
    port: 43179,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 43179,
    strictPort: true,
    allowedHosts: true,
  },
})
