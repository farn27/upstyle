/**
 * Tauri integration helpers untuk SvelteKit.
 * Safe dipanggil di web biasa — semua fungsi ada fallback-nya.
 */

/** Cek apakah app berjalan di dalam Tauri desktop */
export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Invoke Tauri command — bypass Vite static analysis dengan dynamic string.
 * @param {string} cmd
 * @param {Record<string, any>} [args]
 */
async function tauriInvoke(cmd, args) {
  // Pakai string concat agar Vite tidak resolve sebagai static import
  const pkg = '@tauri-apps' + '/api/core';
  const { invoke } = await import(/* @vite-ignore */ pkg);
  return invoke(cmd, args);
}

/**
 * Import dari Tauri API — bypass Vite static analysis.
 * @param {string} mod - module path setelah '@tauri-apps/api/'
 */
async function tauriImport(mod) {
  const pkg = '@tauri-apps' + '/api/' + mod;
  return import(/* @vite-ignore */ pkg);
}

/**
 * Kirim native desktop notification.
 * Fallback ke browser Notification API kalau bukan Tauri.
 */
export async function sendNotification(title, body) {
  if (isTauri()) {
    return tauriInvoke('show_notification', { title, body });
  }
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification(title, { body });
    }
  }
}

/**
 * Buka URL di browser default sistem.
 * Di web biasa: buka tab baru.
 */
export async function openInBrowser(url) {
  if (isTauri()) {
    return tauriInvoke('open_in_browser', { url });
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Ambil versi aplikasi.
 * Di web biasa: kembalikan string kosong.
 */
export async function getAppVersion() {
  if (isTauri()) {
    return tauriInvoke('get_app_version');
  }
  return '';
}

/**
 * Ambil port server yang dipakai (production desktop).
 */
export async function getServerPort() {
  if (isTauri()) {
    return tauriInvoke('get_server_port');
  }
  return 5173;
}

/**
 * Listen ke event dari Tauri backend.
 * @param {string} event
 * @param {(payload: any) => void} handler
 * @returns {Promise<() => void>} unlisten function
 */
export async function listenTauriEvent(event, handler) {
  if (!isTauri()) return () => {};
  const { listen } = await tauriImport('event');
  return listen(event, (e) => handler(e.payload));
}
