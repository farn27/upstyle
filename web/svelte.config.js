import adapter from '@sveltejs/adapter-auto'; // Atau adapter lain (vercel/node) yang kamu pakai
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    csrf: {
      checkOrigin: false
    }
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
