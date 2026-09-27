import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'next/link': path.resolve(__dirname, 'shims/next/link.tsx'),
        'next/navigation': path.resolve(__dirname, 'shims/next/navigation.ts'),
        'next/font/google': path.resolve(__dirname, 'shims/next/font/google.ts'),
      },
    },
    define: {
      'process.env': {},
    },
    server: {
      port: 3003,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
