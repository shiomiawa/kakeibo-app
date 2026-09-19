import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 開発時は /api へのリクエストをバックエンド（Express）へ中継する。
// これによりブラウザからはAPIキーを一切扱わずに済む。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
