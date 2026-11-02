import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    base: './',
    plugins: [vue(), tailwindcss()],
    resolve: {
        dedupe: ['vue', '@aaix/laravel-islands'],
        alias: {
            '@aaix/laravel-islands-gallery/vue': fileURLToPath(new URL('../resources/js/vue/index.js', import.meta.url)),
        },
    },
    server: {
        fs: { allow: ['..'] },
    },
});
