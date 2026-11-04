import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Vercel → adapter-auto.
// Docker (ADAPTER=node) & desktop Tauri (vite --config vite.config.desktop.js) → adapter-node (folder build/)
const useNodeAdapter =
  process.env.ADAPTER === 'node' ||
  process.argv.some((arg) => arg.includes('vite.config.desktop'));

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: useNodeAdapter ? adapterNode({ out: 'build', precompress: true }) : adapterAuto()
    // CSRF: pakai default SvelteKit (cek Origin form POST). Jangan dimatikan.
  },

  // Tambahkan blok onwarn ini
  onwarn: (warning, handler) => {
    // Abaikan semua warning accessibility (a11y)
    if (warning.code.startsWith('a11y_')) return;
    
    // Abaikan warning variabel export yang tidak terpakai
    if (warning.code === 'export_let_unused') return;

    // Tetap loloskan warning lain yang krusial
    handler(warning);
  }
};

export default config;
