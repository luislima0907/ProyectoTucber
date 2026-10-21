import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', rewrite: path => path.replace(/^\/api/, '') },
      '/search': { target: 'ws://localhost:3001', ws: true }
    }
  },
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name: 'Tucber',
        short_name: 'Tuc',
        description: 'Aplicacion de Uber',
        theme_color: '#087cbe',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
})