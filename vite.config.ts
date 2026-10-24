import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

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
    }),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts', 'src/__tests__/**/*']
    })
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'cms-entry': resolve(__dirname, 'src/cms-entry.ts')
      },
      formats: ['es'],
      fileName: (_format, entryName) =>
        entryName === 'index' ? 'zerocode.es.js' : 'zerocode-cms.es.js'
    },
    rollupOptions: {
      external: ['vue', 'jsdom'], // Vueは使用者側で提供、jsdomはサーバーサイドでのみ使用
      output: {
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'style.css';
          if (assetInfo.name === 'zcode-cms.css') return 'zcode-cms.css';
          return assetInfo.name || '';
        }
      }
    },
    sourcemap: false,
    copyPublicDir: false,
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['monaco-editor', '@monaco-editor/loader']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
