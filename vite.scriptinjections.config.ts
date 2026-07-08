import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'build',
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, 'src/scriptinjections/contentscript/index.ts'), 
            name: 'InjectedScript',
            formats: ['iife'],
            fileName: () => 'contentscript.js',
        }
    }
});
