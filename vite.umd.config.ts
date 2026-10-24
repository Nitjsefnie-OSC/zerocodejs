import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// CDN 向け UMD ビルド。UMD はコード分割できないため、
// 遅延ロード（dynamic import）をインライン化した単一ファイルを生成する。
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  plugins: [
    vue({
      customElement: true,
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('zcode-')
        }
      }
    })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ZeroCode',
      formats: ['umd'],
      fileName: () => 'zerocode.umd.js'
    },
    rollupOptions: {
      external: ['vue', 'jsdom'],
      output: {
        globals: {
          vue: 'Vue'
        },
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          if (assetInfo.name === 'zcode-cms.css') return 'zcode-cms.css';
          return assetInfo.name || '';
        }
      }
    },
    sourcemap: false,
    copyPublicDir: false,
    minify: 'esbuild',
    outDir: 'dist',
    emptyOutDir: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
