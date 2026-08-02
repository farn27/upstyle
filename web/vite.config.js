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
        // Jangan force bundle lucide-svelte — biarkan sebagai external di SSR
        // agar Vite tidak timeout saat load ratusan icon sekaligus
        noExternal: []
    },
    // Tauri API hanya tersedia di runtime Tauri, bukan di browser biasa.
    // Tandai sebagai external agar Vite tidak mencoba bundle/resolve package ini.
    build: {
        rollupOptions: {
            external: (id) => id.startsWith('@tauri-apps/')
        }
    }
});
