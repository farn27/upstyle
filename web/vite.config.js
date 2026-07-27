import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({ 
    plugins: [
        tailwindcss(), 
        sveltekit(),
        compression({ algorithm: 'brotliCompress' }),
        visualizer({ emitFile: true, filename: 'stats.html' })
    ],
    ssr: {
        noExternal: ['lucide-svelte']
    }
});
