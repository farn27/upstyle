/**
 * Kalkulator harga jual otomatis berdasarkan HPP
 */

export function hitungMarkup(hpp, persen) {
  if (!hpp || !persen) return 0;
  return Math.round(hpp + (hpp * persen / 100));
}

export function hitungMargin(hpp, persen) {
  if (!hpp || !persen) return 0;
  const denom = 1 - persen / 100;
  if (denom <= 0) return 0;
  return Math.round(hpp / denom);
}

/**
 * Format Rupiah untuk display
 */
export function formatRupiah(angka) {
  if (!angka && angka !== 0) return 'Rp 0';
  return 'Rp ' + Number(angka).toLocaleString('id-ID');
}
