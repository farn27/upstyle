/**
 * Vite config khusus untuk build desktop (Tauri).
 * Tanpa compression plugin (tidak perlu untuk serve lokal).
 * Tanpa visualizer (tidak perlu di desktop build).
 */
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  ssr: {
    noExternal: ['lucide-svelte']
  },
  // Tauri butuh fixed port untuk dev
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1'
  }
});
