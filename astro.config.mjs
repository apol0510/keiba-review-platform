// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
    build: {
      // チャンクサイズ最適化
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          },
        },
      },
    },
  },
  // 圧縮を有効化
  compressHTML: true,
  // ビルド最適化
  build: {
    inlineStylesheets: 'auto',
    // アセットのインライン化閾値（4KB以下のものはインライン化）
    assetsInlineLimit: 4096,
  },
  // 画像最適化
  image: {
    domains: ['fonts.googleapis.com', 'fonts.gstatic.com'],
  },
  // プリフェッチ設定
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
});
