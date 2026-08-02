/**
 * Svelte config khusus untuk build desktop (Tauri).
 * Pakai adapter-node agar SvelteKit jadi standalone Node.js server
 * yang bisa di-spawn oleh Tauri saat app desktop dijalankan.
 *
 * Usage:
 *   SVELTE_CONFIG=svelte.config.desktop.js npm run build:desktop
 */
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter({
      // Output ke build/ (default), akan di-copy ke Tauri resources
      out: 'build',
      // Precompress assets untuk performa lebih baik
      precompress: true,
      // Env prefix tetap sama
      envPrefix: ''
    }),
    // Path prefix kosong karena diakses via localhost
    paths: {
      base: ''
    }
  },

  onwarn: (warning, handler) => {
    if (warning.code.startsWith('a11y_')) return;
    if (warning.code === 'export_let_unused') return;
    handler(warning);
  }
};

export default config;
