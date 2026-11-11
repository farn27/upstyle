// Logika penilaian usulan (murni, tanpa jaringan) — diuji di nilai.test.mjs
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
export function nilaiEkstraksi(k, h) {
	if (!h) return { nilai: 'Tidak sesuai', salah: 'Tidak ada keluaran / error' };
	const salah = [];
	if (norm(h.kategori) !== norm(k.kategori)) return { nilai: 'Tidak sesuai', salah: 'Salah kategori (masuk/keluar)' };
	if (k.kategori === 'Masuk') {
		if (norm(h.produk) !== norm(k.produk)) salah.push('Salah produk');
		if (Number(h.qty) !== Number(k.qty)) salah.push('Salah jumlah');
	} else if (h.produk) salah.push('Salah produk'); // pengeluaran tidak boleh terikat ke produk jual
	if (Number(h.nominal) !== Number(k.nominal)) salah.push('Salah nominal');
	return salah.length ? { nilai: 'Sesuai sebagian', salah: salah.join('; ') } : { nilai: 'Sesuai', salah: '' };
}
export function nilaiAkun(k, h) {
	if (!h) return { nilai: 'Tidak sesuai', salah: 'Tidak ada keluaran / error' };
	const a = h.akun_kode === k.akun_kode, s = h.kas_kode === k.kas_kode;
	return a && s ? { nilai: 'Sesuai', salah: '' } : a || s ? { nilai: 'Sesuai sebagian', salah: 'Salah akun' } : { nilai: 'Tidak sesuai', salah: 'Salah akun' };
}
export const angkaDalamTeks = (t) => {
	const out = [];
	for (const m of String(t).matchAll(/(?:Rp\s?)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s?(juta|jt|rb|ribu|k|m)?/gi)) {
		let n = m[1], suf = (m[2] || '').toLowerCase();
		if (/^\d{1,3}([.,]\d{3})+$/.test(n)) n = n.replace(/[.,]/g, ''); else n = n.replace(',', '.');
		let v = Number(n);
		if (['juta', 'jt', 'm'].includes(suf)) v *= 1e6; else if (['rb', 'ribu', 'k'].includes(suf)) v *= 1e3;
		out.push(v);
	}
	return out;
};
export function usulanAnalitis(id, reply, acuanAnalitis = {}) {
	const a = acuanAnalitis[id];
	if (!a) return { nilai: '', salah: '', catatan: 'acuan belum diisi di acuan-analitis.json' };
	const teks = String(reply || '');
	if (a.tidakTersedia) {
		const menolak = /tidak (dapat|bisa|ada|tersedia|memiliki|punya)|belum (ada|tersedia)|tidak ditemukan|tidak tahu/i.test(teks);
		const mengarang = /Rp\s?\d/.test(teks);
		return { nilai: menolak && !mengarang ? 'Sesuai' : 'Tidak sesuai', salah: menolak && !mengarang ? '' : 'Mengarang data yang tidak tersedia', catatan: 'periksa narasi' };
	}
	const ada = angkaDalamTeks(teks);
	const cocok = (a.angka || []).map((x) => ada.some((y) => Math.abs(y - x) < 0.5 || (x >= 1e5 && Math.abs(y - x) / x < 0.0051)));
	if (!(a.angka || []).length) return { nilai: '', salah: '', catatan: 'acuan angka kosong' };
	const semua = cocok.every(Boolean), sebagian = cocok.some(Boolean);
	return { nilai: semua ? 'Sesuai' : sebagian ? 'Sesuai sebagian' : 'Tidak sesuai', salah: semua ? '' : 'Angka tidak sesuai data', catatan: `angka acuan ditemukan: ${cocok.join('/')} — periksa narasi` };
}

