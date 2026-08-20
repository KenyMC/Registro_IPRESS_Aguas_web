import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-cusco.jpg', 'logo-diresa.png', 'logo-pvcach.png', 'app-icon.png'],
      manifest: {
        name: 'Calidad Agua IPRESS',
        short_name: 'Agua IPRESS',
        description: 'Aplicativo de Monitoreo y Diagnóstico de Calidad de Agua IPRESS',
        theme_color: '#1a365d',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'app-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'app-icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'app-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: './',
})
