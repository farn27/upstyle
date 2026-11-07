/**
 * Estimasi akumulasi penyusutan sampai tanggal tertentu (per bulan berjalan sejak perolehan).
 * - GARIS_LURUS  : (nilai perolehan − nilai sisa) / umur, merata tiap bulan
 * - SALDO_MENURUN: tarif 2 / umur per tahun (double-declining) atas nilai buku, tidak melewati nilai sisa
 * @param {{ nilaiPerolehan: number, nilaiSisa: number, umurEkonomis: number, metodePenyusutan?: string | null, tanggalPerolehan?: string | null }} a
 * @param {string} [sampai] YYYY-MM-DD (default: hari ini)
 */
export function hitungPenyusutan(a, sampai) {
	const perolehan = Number(a.nilaiPerolehan) || 0;
	const sisa = Math.min(Number(a.nilaiSisa) || 0, perolehan);
	const umurBulan = Math.max(1, Math.round((Number(a.umurEkonomis) || 1) * 12));
	const mulai = String(a.tanggalPerolehan || '').slice(0, 10);
	const akhir = (sampai || new Date().toISOString().slice(0, 10)).slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai) || mulai > akhir) return { akumulasi: 0, nilaiBuku: perolehan, perBulan: 0, bulanBerjalan: 0 };
	const [y1, m1, d1] = mulai.split('-').map(Number);
	const [y2, m2, d2] = akhir.split('-').map(Number);
	// penuh bulan yang sudah lewat sejak tanggal perolehan
	const bulanBerjalan = Math.max(0, Math.min(umurBulan, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0)));
	const dapatDisusutkan = perolehan - sisa;
	if (a.metodePenyusutan === 'SALDO_MENURUN') {
		// tarif tahunan 2 / umur atas nilai buku awal tahun, dibebankan merata per bulan
		const tarifTahunan = 2 / (umurBulan / 12);
		let buku = perolehan;
		let bukuAwalTahun = perolehan;
		for (let i = 0; i < bulanBerjalan; i++) {
			if (i % 12 === 0) bukuAwalTahun = buku;
			buku = Math.max(sisa, buku - (bukuAwalTahun * tarifTahunan) / 12);
		}
		const akumulasi = Math.round(perolehan - buku);
		return { akumulasi, nilaiBuku: perolehan - akumulasi, perBulan: Math.round((perolehan * tarifTahunan) / 12), bulanBerjalan };
	}
	const perBulan = dapatDisusutkan / umurBulan;
	const akumulasi = Math.round(Math.min(dapatDisusutkan, perBulan * bulanBerjalan));
	return { akumulasi, nilaiBuku: perolehan - akumulasi, perBulan: Math.round(perBulan), bulanBerjalan };
}
