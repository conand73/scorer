import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/scorer/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Scorer - Table Tennis Score Tracker',
        short_name: 'Scorer',
        description: 'Fast, tactile score tracking for table tennis matches',
        theme_color: '#0f0f1a',
        background_color: '#0f0f1a',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'fullscreen', 'standalone'],
        orientation: 'landscape',
        scope: '/scorer/',
        start_url: '/scorer/',
        id: '/scorer/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        screenshots: [],
        categories: ['sports', 'utilities'],
        prefer_related_applications: false,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/scorer/index.html',
        navigateFallbackAllowlist: [/^\/scorer\//],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
