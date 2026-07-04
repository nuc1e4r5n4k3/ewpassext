import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: 'build',
    rollupOptions: {
      input: {
        // The main entry is the popup, through index.html
        main: resolve(__dirname, 'index.html'),
        // Other entrypoints
        serviceworker: resolve(__dirname, 'src/serviceworker/index.ts'),
        keepalivetab: resolve(__dirname, 'src/keepalivetab/index.ts'),
        'scriptinjections/popuphook': resolve(
          __dirname,
          'src/scriptinjections/popuphook/index.ts'
        ),
        'scriptinjections/injectpassword': resolve(
          __dirname,
          'src/scriptinjections/injectpassword/index.ts'
        ),
      },
      output: {
        // [name].js is the default, but let's be explicit
        entryFileNames: '[name].js',
        // CRA-like output for chunks
        chunkFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/assets/[name]-[hash].[ext]',
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
