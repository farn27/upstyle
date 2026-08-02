/**
 * Rupiah formatting utilities — dipakai di seluruh sistem
 * Konsisten: selalu pakai Intl.NumberFormat dengan locale 'id-ID'
 */

const fmt = new Intl.NumberFormat('id-ID', { style: 'decimal', maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Format angka jadi Rupiah: Rp 1.500.000
 * @param {number|string|null|undefined} value
 * @param {boolean} showSymbol - tampilkan "Rp" prefix (default true)
 */
export function formatRupiah(value, showSymbol = true) {
  const num = Number(value) || 0;
  const formatted = fmt.format(num);
  return showSymbol ? `Rp ${formatted}` : formatted;
}

/**
 * Format dengan desimal: Rp 1.500.000,50
 */
export function formatRupiahDec(value) {
  const num = Number(value) || 0;
  return `Rp ${fmtDec.format(num)}`;
}

/**
 * Format singkat untuk chart labels: 1,5jt / 500rb / 1,2M
 */
export function formatRupiahShort(value) {
  const num = Number(value) || 0;
  if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)}M`;
  if (num >= 1_000_000) return `Rp ${(num / 1_000_000).toFixed(1)}jt`;
  if (num >= 1_000) return `Rp ${(num / 1_000).toFixed(0)}rb`;
  return `Rp ${num}`;
}

/**
 * Parse string Rupiah kembali ke number: "Rp 1.500.000" → 1500000
 */
export function parseRupiah(value) {
  if (!value) return 0;
  return Number(String(value).replace(/[^0-9]/g, '')) || 0;
}

/**
 * Format persen: 12,5%
 */
export function formatPersen(value, decimals = 1) {
  const num = Number(value) || 0;
  return `${num.toFixed(decimals)}%`;
}

/**
 * Shorthand alias
 */
export const idr = formatRupiah;
export const idrShort = formatRupiahShort;
