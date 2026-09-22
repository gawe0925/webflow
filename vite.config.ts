import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 當在本地執行 npm run dev 時，將 /api 請求轉發給 Vercel，避免 404
      '/api': {
        target: process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});