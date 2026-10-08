import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {},
      manifest: {
        name: 'AZYRUS',
        short_name: 'AZYRUS',
        description: 'Seu aplicativo pessoal',
        theme_color: '#0C1019',
        background_color: '#0C1019',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
});