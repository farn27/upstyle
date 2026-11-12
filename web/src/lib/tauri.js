/**
 * Integrasi aplikasi desktop (Tauri) untuk halaman web.
 * Aman dipanggil di browser biasa — setiap fungsi punya cadangan.
 *
 * Perintah yang tersedia di aplikasi desktop (desktop/src-tauri/src/lib.rs):
 *   server_url, app_version, open_external, show_notification
 */

/** Apakah halaman sedang berjalan di dalam aplikasi desktop Bizgrow? */
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * @param {string} cmd
 * @param {Record<string, any>} [args]
 */
function invoke(cmd, args) {
  // @ts-ignore — disuntikkan oleh Tauri; tanpa paket @tauri-apps/api agar bundle web tetap ringan
  return window.__TAURI_INTERNALS__.invoke(cmd, args);
}

/**
 * Notifikasi sistem. Di browser: Notification API (minta izin bila perlu).
 * @param {string} title
 * @param {string} body
 */
export async function sendNotification(title, body) {
  if (isTauri()) return invoke('show_notification', { title, body });
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') new Notification(title, { body });
  else if (Notification.permission !== 'denied' && (await Notification.requestPermission()) === 'granted') new Notification(title, { body });
}

/**
 * Buka tautan di browser/aplikasi bawaan (desktop) atau tab baru (browser).
 * @param {string} url
 */
export async function openInBrowser(url) {
  if (isTauri()) return invoke('open_external', { url });
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Versi aplikasi desktop; string kosong di browser. */
export async function getAppVersion() {
  if (!isTauri()) return '';
  try { return await invoke('app_version'); } catch { return ''; }
}
