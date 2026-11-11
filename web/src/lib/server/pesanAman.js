/**
 * Pesan galat yang aman ditampilkan ke pengguna.
 *
 * Banyak endpoint dulu mengirim err.message apa adanya. Untuk galat bisnis (stok kurang, periode
 * tutup buku, kategori tidak ditemukan) itu berguna, tetapi galat teknis (kueri SQL gagal, koneksi,
 * TypeError) ikut terkirim beserta isi kueri / nama tabel / jalur berkas. Fungsi ini meloloskan pesan
 * yang tampak seperti pesan bisnis dan mengganti pesan teknis dengan pesan umum.
 */
const POLA_TEKNIS = /failed query|sql|er_[a-z_]+|errno|econn|etimedout|enotfound|socket hang up|cannot read|cannot set|undefined|null|is not a function|is not defined|unexpected token|json|stack|\bat\s+\S+\s*\(|select |insert |update |delete from|duplicate entry|foreign key|constraint|syntax|drizzle|mysql|redis|upstash|groq|fetch failed|timeout|aborted|\.js:\d+|node_modules|internal/i;

/**
 * @param {unknown} err
 * @param {string} [cadangan]
 * @returns {string}
 */
export function pesanAman(err, cadangan = 'Terjadi kesalahan pada server. Coba lagi.') {
	if (!(err instanceof Error)) return typeof err === 'string' && err && !POLA_TEKNIS.test(err) ? err.slice(0, 200) : cadangan;
	const nama = err.name || '';
	// Kelas galat bisnis milik aplikasi: pesannya memang untuk pengguna
	if (/^(TransaksiError|PosError|MasterDataError|TokoError|UnitError|PengadaanError|GroqError)$/.test(nama)) {
		return err.message.slice(0, 300);
	}
	const m = String(err.message || '');
	if (!m || m.length > 200 || POLA_TEKNIS.test(m)) return cadangan;
	return m;
}
