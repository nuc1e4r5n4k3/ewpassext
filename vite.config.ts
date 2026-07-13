import { resolve } from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    publicDir: 'public',
    build: {
        outDir: 'build',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                serviceworker: resolve(__dirname, 'src/serviceworker/index.ts'),
            },
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: 'static/js/[name]-[hash].js',
                assetFileNames: 'static/assets/[name]-[hash].[ext]',
            },
        },
    },
    test: {
        environment: 'happy-dom',
    },
});
