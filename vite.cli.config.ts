import { defineConfig } from 'vite';
import { resolve } from 'path';

// npx zerocodejs build-parts などのコマンド（Node 用。Node 標準のモジュールだけを使う）
export default defineConfig({
  build: {
    ssr: resolve(__dirname, 'src/cli/index.ts'),
    target: 'node20',
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    minify: false,
    rollupOptions: {
      output: { format: 'es', entryFileNames: 'cli.mjs' }
    }
  }
});
