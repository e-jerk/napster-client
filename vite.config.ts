import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 43179,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    // Preview iframes proxy HTTP but often drop the HMR websocket, which
    // leaves the page stuck on a blank #app. Disable HMR in this setup.
    hmr: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 43179,
    strictPort: true,
    allowedHosts: true,
    cors: true,
  },
})
