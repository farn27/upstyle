import { writable } from 'svelte/store';

export const notifications = writable([]); 
export const showRedDot = writable(false);
export const toastPesan = writable(""); 

export function addNotif(pesan) {
  const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  
  notifications.update(n => [{ pesan, waktu, is_new: true }, ...n].slice(0, 5));
  showRedDot.set(true); // Titik merah menyala

  toastPesan.set(pesan);
  setTimeout(() => toastPesan.set(""), 3000);
}

// FUNGSI BARU: Panggil ini saat lonceng diklik
export function clearRedDot() {
  showRedDot.set(false);
}