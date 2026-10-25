import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
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
    outDir: 'dist-pages',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        docs: resolve(__dirname, 'docs.html'),
        docsTutorial: resolve(__dirname, 'docs-tutorial.html'),
        docsTemplate: resolve(__dirname, 'docs-template.html'),
        docsApi: resolve(__dirname, 'docs-api.html'),
        docsBackend: resolve(__dirname, 'docs-backend.html'),
        testDev: resolve(__dirname, 'test-dev.html'),
        testCms: resolve(__dirname, 'test-cms.html'),
        testPub: resolve(__dirname, 'test-pub.html'),
        testSsr: resolve(__dirname, 'test-ssr.html'),
        testLightDom: resolve(__dirname, 'test-light-dom.html'),
        testStudio: resolve(__dirname, 'test-studio.html')
      }
    }
  }
});
