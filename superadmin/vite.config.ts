import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@/components/user': path.resolve(__dirname, 'src/attendee/components/user'),
        '@/lib': path.resolve(__dirname, 'src/attendee/lib'),
        '@': path.resolve(__dirname, 'src'),
        'next/link': path.resolve(__dirname, 'src/attendee/shims/next/link.tsx'),
        'next/navigation': path.resolve(__dirname, 'src/attendee/shims/next/navigation.ts'),
        'next/font/google': path.resolve(__dirname, 'src/attendee/shims/next/font/google.ts'),
        'next': path.resolve(__dirname, 'src/attendee/shims/next/index.ts'),
      },
    },
    define: {
      'process.env': {},
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/dist/**'],
      },
    },
  };
});