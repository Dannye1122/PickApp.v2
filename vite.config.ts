import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const buildDate = new Date().toISOString().split('T')[0];
  const buildTime = new Date().toISOString();

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    define: {
      '__BUILD_DATE__': JSON.stringify(buildDate),
      '__BUILD_TIMESTAMP__': JSON.stringify(buildTime),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react', 'motion'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            capacitor: ['@capacitor/core', '@capacitor/preferences', '@capacitor/haptics']
          }
        }
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
