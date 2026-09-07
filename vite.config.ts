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
    hmr: false,
    headers: { 'Cache-Control': 'no-store' },
  },
  preview: {
    host: '0.0.0.0',
    port: 43179,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    headers: { 'Cache-Control': 'no-store' },
  },
})
