import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  // La clave de API está restringida al referer http://127.0.0.1:5500/*,
  // por eso dev y preview se sirven en esa dirección exacta.
  server: {
    host: '127.0.0.1',
    port: 5500,
    strictPort: true
  },
  preview: {
    host: '127.0.0.1',
    port: 5500,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
