/**
 * Profil kasir (POS) per jenis usaha — aman dipakai di browser maupun server.
 *
 * Setiap usaha punya kebutuhan kasir berbeda: resto butuh nomor meja, open bill, dan tiket dapur;
 * kedai minuman butuh nomor antrean; bengkel butuh plat nomor; laundry butuh tanggal ambil; klinik
 * butuh nama pasien. Profil adalah titik awal yang bisa diubah pemilik, dan pengaturannya disimpan
 * per unit (tabel pos_profil_unit). Unit yang belum punya profil tetap memakai perilaku kasir lama.
 */

export const JENIS_PESANAN = /** @type {const} */ (['DINE_IN', 'TAKEAWAY', 'DELIVERY']);
/** @type {Record<string, string>} */
export const LABEL_JENIS_PESANAN = { DINE_IN: 'Makan di tempat', TAKEAWAY: 'Bawa pulang', DELIVERY: 'Diantar' };
export const TIPE_ISIAN = /** @type {const} */ (['teks', 'angka', 'tanggal']);

/**
 * @typedef {{ kode: string, area: string, kursi: number }} Meja
 * @typedef {{ kode: string, nama: string, kategori: string[] }} Stasiun
 * @typedef {{ kunci: string, label: string, tipe: 'teks' | 'angka' | 'tanggal', wajib: boolean }} Isian
 * @typedef {{
 *   jenisPesanan: string[],
 *   meja: { aktif: boolean, daftar: Meja[] },
 *   openBill: boolean,
 *   labelBill: string,
 *   dapur: { aktif: boolean, stasiun: Stasiun[] },
 *   nomorAntrean: boolean,
 *   catatanItem: boolean,
 *   servis: { persen: number, hanyaDineIn: boolean },
 *   pajakResto: { aktif: boolean, persen: number, inklusif: boolean },
 *   isian: Isian[],
 *   istilah: { produk: string, pelanggan: string }
 * }} PengaturanPos
 */

/** Buat daftar meja bernomor 1..n untuk satu atau beberapa area (penomoran berlanjut antar-area). */
export function buatDaftarMeja(/** @type {number} */ jumlah, /** @type {string[]} */ area = ['Utama'], kursi = 4) {
	const n = Math.max(0, Math.min(300, Math.round(Number(jumlah) || 0)));
	const daftarArea = area.length ? area : ['Utama'];
	const per = Math.ceil(n / daftarArea.length) || 0;
	/** @type {Meja[]} */
	const hasil = [];
	for (let i = 0; i < n; i++) hasil.push({ kode: String(i + 1), area: daftarArea[Math.min(daftarArea.length - 1, Math.floor(i / per))], kursi });
	return hasil;
}

/** @type {PengaturanPos} */
const DASAR = {
	jenisPesanan: ['TAKEAWAY'],
	meja: { aktif: false, daftar: [] },
	openBill: false,
	labelBill: 'Bill',
	dapur: { aktif: false, stasiun: [] },
	nomorAntrean: false,
	catatanItem: false,
	servis: { persen: 0, hanyaDineIn: true },
	pajakResto: { aktif: false, persen: 10, inklusif: false },
	isian: [],
	istilah: { produk: 'Produk', pelanggan: 'Pelanggan' }
};

const isi = (/** @type {string} */ label, /** @type {Isian['tipe']} */ tipe = 'teks', wajib = false) => ({
	kunci: kunciDari(label),
	label,
	tipe,
	wajib
});

/**
 * @typedef {{ label: string, ikon: string, ringkas: string, fitur: Record<string, boolean>, pengaturan: Partial<PengaturanPos> }} Profil
 * @type {Record<string, Profil>}
 */
export const PROFIL_POS = {
	resto: {
		label: 'Restoran / Rumah Makan',
		ikon: '🍽️',
		ringkas: 'Denah meja, open bill (pesan dulu bayar nanti), tiket ke dapur & bar, service charge, pajak restoran.',
		fitur: { tableManagement: true, kitchenDisplay: true, showStock: false, lowStockAlert: false, barcodeScanner: false, autoFocusScanner: false },
		pengaturan: {
			jenisPesanan: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
			meja: { aktif: true, daftar: buatDaftarMeja(10, ['Dalam']) },
			openBill: true,
			labelBill: 'Meja',
			dapur: { aktif: true, stasiun: [{ kode: 'dapur', nama: 'Dapur', kategori: [] }, { kode: 'bar', nama: 'Bar Minuman', kategori: ['MINUMAN'] }] },
			catatanItem: true,
			istilah: { produk: 'Menu', pelanggan: 'Tamu' }
		}
	},
	kafe: {
		label: 'Kafe / Kedai Kopi',
		ikon: '☕',
		ringkas: 'Meja & open bill, pesanan ke bar dan dapur, nomor antrean, catatan racikan (less sugar, extra shot).',
		fitur: { tableManagement: true, kitchenDisplay: true, showStock: false, lowStockAlert: false, barcodeScanner: false, autoFocusScanner: false },
		pengaturan: {
			jenisPesanan: ['DINE_IN', 'TAKEAWAY', 'DELIVERY'],
			meja: { aktif: true, daftar: buatDaftarMeja(8, ['Dalam']) },
			openBill: true,
			labelBill: 'Meja',
			dapur: { aktif: true, stasiun: [{ kode: 'bar', nama: 'Bar', kategori: [] }, { kode: 'dapur', nama: 'Dapur', kategori: ['MAKANAN', 'PASTRY', 'SNACK'] }] },
			nomorAntrean: true,
			catatanItem: true,
			istilah: { produk: 'Menu', pelanggan: 'Tamu' }
		}
	},
	kedai: {
		label: 'Kedai Minuman / Jajanan (Booth)',
		ikon: '🧋',
		ringkas: 'Tanpa meja: bayar di depan, nomor antrean otomatis, tiket ke peracik, catatan level gula/es.',
		fitur: { tableManagement: false, kitchenDisplay: true, showStock: false, lowStockAlert: false, barcodeScanner: false, autoFocusScanner: false },
		pengaturan: {
			jenisPesanan: ['TAKEAWAY', 'DELIVERY'],
			dapur: { aktif: true, stasiun: [{ kode: 'racik', nama: 'Racik', kategori: [] }] },
			nomorAntrean: true,
			catatanItem: true,
			istilah: { produk: 'Menu', pelanggan: 'Pembeli' }
		}
	},
	bakery: {
		label: 'Toko Roti / Kue / Produksi Makanan',
		ikon: '🥐',
		ringkas: 'Jual langsung dengan stok, pesanan kue (pre-order) dengan tanggal ambil.',
		fitur: { tableManagement: false, kitchenDisplay: false, showStock: true, lowStockAlert: true },
		pengaturan: {
			jenisPesanan: ['TAKEAWAY', 'DELIVERY'],
			catatanItem: true,
			isian: [isi('Tanggal ambil', 'tanggal')],
			istilah: { produk: 'Produk', pelanggan: 'Pembeli' }
		}
	},
	katering: {
		label: 'Katering',
		ikon: '🍱',
		ringkas: 'Pesanan dengan tanggal acara, jumlah porsi, dan alamat kirim.',
		fitur: { tableManagement: false, kitchenDisplay: true, showStock: false, lowStockAlert: false },
		pengaturan: {
			jenisPesanan: ['DELIVERY', 'TAKEAWAY'],
			dapur: { aktif: true, stasiun: [{ kode: 'dapur', nama: 'Dapur', kategori: [] }] },
			catatanItem: true,
			isian: [isi('Tanggal acara', 'tanggal', true), isi('Alamat kirim'), isi('Jumlah porsi', 'angka')],
			istilah: { produk: 'Menu', pelanggan: 'Pemesan' }
		}
	},
	retail: {
		label: 'Toko / Retail',
		ikon: '🛒',
		ringkas: 'Scan barcode, stok tampil & peringatan stok tipis, transaksi cepat.',
		fitur: { tableManagement: false, kitchenDisplay: false, barcodeScanner: true, autoFocusScanner: true, showStock: true, lowStockAlert: true },
		pengaturan: { istilah: { produk: 'Barang', pelanggan: 'Pelanggan' } }
	},
	grosir: {
		label: 'Grosir / Distributor',
		ikon: '📦',
		ringkas: 'Barcode & stok, pesanan diantar dengan alamat kirim, ubah harga untuk pelanggan grosir.',
		fitur: { tableManagement: false, kitchenDisplay: false, barcodeScanner: true, showStock: true, lowStockAlert: true, openPrice: true },
		pengaturan: {
			jenisPesanan: ['TAKEAWAY', 'DELIVERY'],
			isian: [isi('Alamat kirim')],
			istilah: { produk: 'Barang', pelanggan: 'Pelanggan' }
		}
	},
	salon: {
		label: 'Salon / Barbershop / Spa',
		ikon: '💈',
		ringkas: 'Nomor antrean, pilih kapster/terapis, layanan & produk dalam satu nota.',
		fitur: { tableManagement: false, kitchenDisplay: false, appointmentBooking: true, showStock: false, lowStockAlert: false },
		pengaturan: {
			nomorAntrean: true,
			isian: [isi('Kapster / Terapis')],
			istilah: { produk: 'Layanan', pelanggan: 'Pelanggan' }
		}
	},
	klinik: {
		label: 'Klinik / Praktik',
		ikon: '🩺',
		ringkas: 'Nama pasien wajib, dokter/terapis, nomor antrean.',
		fitur: { tableManagement: false, kitchenDisplay: false, appointmentBooking: true, showStock: false, lowStockAlert: true },
		pengaturan: {
			nomorAntrean: true,
			isian: [isi('Nama pasien', 'teks', true), isi('Dokter / Terapis')],
			istilah: { produk: 'Layanan', pelanggan: 'Pasien' }
		}
	},
	bengkel: {
		label: 'Bengkel / Servis',
		ikon: '🔧',
		ringkas: 'Nota terbuka per kendaraan (tambah jasa & sparepart sambil dikerjakan), plat nomor, mekanik.',
		fitur: { tableManagement: false, kitchenDisplay: false, workOrderTracking: true, showStock: true, lowStockAlert: true, barcodeScanner: true },
		pengaturan: {
			openBill: true,
			labelBill: 'Kendaraan',
			isian: [isi('Plat nomor', 'teks', true), isi('Jenis kendaraan'), isi('Mekanik')],
			istilah: { produk: 'Jasa & Sparepart', pelanggan: 'Pelanggan' }
		}
	},
	laundry: {
		label: 'Laundry',
		ikon: '🧺',
		ringkas: 'Nomor nota antrean, tanggal ambil, berat cucian.',
		fitur: { tableManagement: false, kitchenDisplay: false, workOrderTracking: true, showStock: false, lowStockAlert: false },
		pengaturan: {
			jenisPesanan: ['TAKEAWAY', 'DELIVERY'],
			nomorAntrean: true,
			catatanItem: true,
			isian: [isi('Tanggal ambil', 'tanggal', true), isi('Berat (kg)', 'angka')],
			istilah: { produk: 'Layanan', pelanggan: 'Pelanggan' }
		}
	},
	jasa: {
		label: 'Jasa Umum',
		ikon: '🧰',
		ringkas: 'Nota jasa dengan nama petugas dan catatan pekerjaan.',
		fitur: { tableManagement: false, kitchenDisplay: false, showStock: false, lowStockAlert: false },
		pengaturan: {
			catatanItem: true,
			isian: [isi('Petugas')],
			istilah: { produk: 'Layanan', pelanggan: 'Klien' }
		}
	},
	umum: {
		label: 'Umum',
		ikon: '🏪',
		ringkas: 'Kasir standar: pilih barang, bayar, cetak struk.',
		fitur: {},
		pengaturan: {}
	}
};

export const DAFTAR_PROFIL = Object.keys(PROFIL_POS);

/** Kunci aman dari label isian (mis. "Plat nomor" → "plat_nomor") */
export function kunciDari(/** @type {string} */ label) {
	return (
		String(label || '')
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_|_$/g, '')
			.slice(0, 30) || 'isian'
	);
}

// ── Deteksi profil dari kategori usaha & uraian ──────────────────────────────

/** Kata kunci di nama/uraian usaha lebih spesifik daripada kategori (mis. "Es teh" berkategori resto → kedai). */
const POLA_TEKS = /** @type {[RegExp, string][]} */ ([
	[/\b(es ?teh|teh poci|boba|kopi susu literan|thai tea|booth|gerobak|kedai minum|jus|juice|minuman kekinian|seblak|cilok|takoyaki|martabak|gorengan)/i, 'kedai'],
	[/\b(kopi|coffee|cafe|kafe|coffeeshop|kedai kopi)/i, 'kafe'],
	[/\b(katering|catering|nasi box|nasi kotak|prasmanan)/i, 'katering'],
	[/\b(roti|bakery|kue|cake|pastry|donat|brownies)/i, 'bakery'],
	[/\b(resto|restoran|restaurant|rumah makan|warung makan|warteg|padang|bakso|mie ayam|soto|seafood|steak|ayam geprek|pecel|sate|lesehan|bistro|dine.?in)/i, 'resto'],
	[/\b(barber|salon|spa|pangkas|potong rambut|nail|lash|massage|pijat|refleksi)/i, 'salon'],
	[/\b(klinik|dokter|praktik|bidan|fisioterapi|dental|gigi)/i, 'klinik'],
	[/\b(bengkel|servis motor|service motor|servis mobil|tambal ban|cuci motor|cuci mobil|montir|ganti oli)/i, 'bengkel'],
	[/\b(laundry|binatu|cuci kiloan|dry clean)/i, 'laundry'],
	[/\b(grosir|distributor|agen|supplier|wholesale)/i, 'grosir'],
	[/\b(minimarket|kelontong|toko|butik|fashion|apotek|elektronik|atk|sembako)/i, 'retail']
]);

/** @type {[RegExp, string][]} */
const POLA_KATEGORI = [
	[/^FNB_RESTO$/, 'resto'],
	[/^FNB_(COFFEE|BAR)/, 'kafe'],
	[/^FNB_CATERING$/, 'katering'],
	[/^FNB_PRODUKSI$/, 'bakery'],
	[/^FNB/, 'kedai'],
	[/^(JASA_BARBER|HEALTH_AESTHETIC)$/, 'salon'],
	[/^HEALTH_/, 'klinik'],
	[/^RETAIL_PHARMACY$/, 'retail'],
	[/^JASA_LAUNDRY$/, 'laundry'],
	[/^(JASA_TEKNIK|AUTOMOTIVE)$/, 'bengkel'],
	[/^(RETAIL|MINIMARKET)/, 'retail'],
	[/^(WHOLESALER|MANUFA|AGRIBISNIS)/, 'grosir'],
	[/^(JASA|TECH|EDUCATION|TOURISM|MEDIA|CONSTRUCTION|PROPERTY|DIGITAL)/, 'jasa']
];

/**
 * Tebak profil dari kategori usaha + nama/uraian bebas (tanpa AI, tanpa token).
 * @param {string | null | undefined} kategori
 * @param {string} [teks] nama usaha dan/atau uraian
 * @returns {string}
 */
export function tebakProfil(kategori, teks = '') {
	const t = String(teks || '');
	if (t.trim()) for (const [pola, profil] of POLA_TEKS) if (pola.test(t)) return profil;
	const k = String(kategori || '').toUpperCase();
	for (const [pola, profil] of POLA_KATEGORI) if (pola.test(k)) return profil;
	return 'umum';
}

// ── Normalisasi & validasi pengaturan ────────────────────────────────────────

const teks = (/** @type {unknown} */ v, /** @type {number} */ n, cadangan = '') => {
	const s = String(v ?? '').replace(/[<>]/g, '').trim().slice(0, n);
	return s || cadangan;
};
const angka = (/** @type {unknown} */ v, /** @type {number} */ min, /** @type {number} */ max, /** @type {number} */ cadangan) => {
	const n = Number(v);
	return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : cadangan;
};
const bool = (/** @type {unknown} */ v, /** @type {boolean} */ cadangan) =>
	v === undefined || v === null ? cadangan : v === true || v === 'true' || v === 1 || v === '1' || v === 'on';

/** Salinan dalam objek polos */
const salin = (/** @type {any} */ o) => JSON.parse(JSON.stringify(o));

/** Pengaturan bawaan sebuah profil (lengkap). @param {string} profil @returns {PengaturanPos} */
export function pengaturanBawaan(profil) {
	const p = PROFIL_POS[profil] || PROFIL_POS.umum;
	return normalisasiPengaturan({ ...salin(DASAR), ...salin(p.pengaturan) }, profil);
}

/**
 * Rapikan pengaturan kiriman klien/AI: tipe benar, batas jumlah & panjang, kode unik.
 * Nilai yang tidak dikirim memakai bawaan profil.
 * @param {any} masuk
 * @param {string} profil
 * @returns {PengaturanPos}
 */
export function normalisasiPengaturan(masuk, profil) {
	const p = PROFIL_POS[profil] || PROFIL_POS.umum;
	/** @type {any} */
	const b = { ...salin(DASAR), ...salin(p.pengaturan) };
	const m = masuk && typeof masuk === 'object' ? masuk : {};

	const jenis = (Array.isArray(m.jenisPesanan) ? m.jenisPesanan : b.jenisPesanan)
		.map((/** @type {unknown} */ j) => String(j).toUpperCase())
		.filter((/** @type {string} */ j, /** @type {number} */ i, /** @type {string[]} */ a) => JENIS_PESANAN.includes(/** @type {any} */ (j)) && a.indexOf(j) === i);

	const mejaM = m.meja && typeof m.meja === 'object' ? m.meja : b.meja;
	const kodeMeja = new Set();
	/** @type {Meja[]} */
	const daftarMeja = [];
	for (const x of Array.isArray(mejaM.daftar) ? mejaM.daftar : []) {
		const kode = teks(x?.kode, 12);
		if (!kode || kodeMeja.has(kode.toLowerCase())) continue;
		kodeMeja.add(kode.toLowerCase());
		daftarMeja.push({ kode, area: teks(x?.area, 30, 'Utama'), kursi: angka(x?.kursi, 1, 50, 4) });
		if (daftarMeja.length >= 300) break;
	}

	const dapurM = m.dapur && typeof m.dapur === 'object' ? m.dapur : b.dapur;
	const kodeSt = new Set();
	/** @type {Stasiun[]} */
	const stasiun = [];
	for (const x of Array.isArray(dapurM.stasiun) ? dapurM.stasiun : []) {
		const nama = teks(x?.nama, 30);
		if (!nama) continue;
		let kode = kunciDari(x?.kode || nama).slice(0, 20);
		while (kodeSt.has(kode)) kode = `${kode}_2`.slice(0, 20);
		kodeSt.add(kode);
		const kategori = (Array.isArray(x?.kategori) ? x.kategori : [])
			.map((/** @type {unknown} */ k) => teks(k, 40).toUpperCase())
			.filter(Boolean)
			.slice(0, 20);
		stasiun.push({ kode, nama, kategori });
		if (stasiun.length >= 8) break;
	}

	const kunciIsian = new Set();
	/** @type {Isian[]} */
	const isian = [];
	for (const x of Array.isArray(m.isian) ? m.isian : b.isian) {
		const label = teks(x?.label, 30);
		if (!label) continue;
		let kunci = kunciDari(x?.kunci || label);
		while (kunciIsian.has(kunci)) kunci = `${kunci}_2`.slice(0, 30);
		kunciIsian.add(kunci);
		const tipe = TIPE_ISIAN.includes(x?.tipe) ? x.tipe : 'teks';
		isian.push({ kunci, label, tipe, wajib: bool(x?.wajib, false) });
		if (isian.length >= 8) break;
	}

	const servisM = m.servis && typeof m.servis === 'object' ? m.servis : b.servis;
	const pajakM = m.pajakResto && typeof m.pajakResto === 'object' ? m.pajakResto : b.pajakResto;
	const istilahM = m.istilah && typeof m.istilah === 'object' ? m.istilah : b.istilah;

	return {
		jenisPesanan: jenis.length ? jenis : ['TAKEAWAY'],
		meja: { aktif: bool(mejaM.aktif, false) && daftarMeja.length > 0, daftar: daftarMeja },
		openBill: bool(m.openBill, b.openBill),
		labelBill: teks(m.labelBill, 20, b.labelBill || 'Bill'),
		dapur: { aktif: bool(dapurM.aktif, false) && stasiun.length > 0, stasiun },
		nomorAntrean: bool(m.nomorAntrean, b.nomorAntrean),
		catatanItem: bool(m.catatanItem, b.catatanItem),
		servis: { persen: angka(servisM.persen, 0, 30, 0), hanyaDineIn: bool(servisM.hanyaDineIn, true) },
		pajakResto: { aktif: bool(pajakM.aktif, false), persen: angka(pajakM.persen, 0, 15, 10), inklusif: bool(pajakM.inklusif, false) },
		isian,
		istilah: { produk: teks(istilahM.produk, 20, 'Produk'), pelanggan: teks(istilahM.pelanggan, 20, 'Pelanggan') }
	};
}

/**
 * Saklar fitur POS (pos_feature_override) yang mengikuti profil + pengaturannya.
 * @param {string} profil @param {PengaturanPos} pengaturan
 * @returns {Record<string, boolean>}
 */
export function fiturDariProfil(profil, pengaturan) {
	const p = PROFIL_POS[profil] || PROFIL_POS.umum;
	return { ...p.fitur, tableManagement: Boolean(pengaturan.meja.aktif), kitchenDisplay: Boolean(pengaturan.dapur.aktif) };
}

// ── Hitungan biaya tambahan (dipakai layar kasir DAN server — hasil harus sama) ─

/**
 * Service charge & pajak restoran (PB1) dari nilai setelah diskon.
 * Servis dihitung dari dasar; pajak dari (dasar + servis), sesuai praktik PB1.
 * @param {number} dasar subtotal setelah diskon
 * @param {Pick<PengaturanPos, 'servis' | 'pajakResto'> | null | undefined} pengaturan
 * @param {string} [jenisPesanan]
 * @returns {{ servis: number, servisPersen: number, pajak: number, pajakPersen: number, pajakInklusif: boolean, total: number }}
 */
export function hitungBiayaTambahan(dasar, pengaturan, jenisPesanan) {
	const d = Math.max(0, Math.round(Number(dasar) || 0));
	const nol = { servis: 0, servisPersen: 0, pajak: 0, pajakPersen: 0, pajakInklusif: false, total: d };
	if (!pengaturan || d === 0) return nol;
	const sp = Number(pengaturan.servis?.persen) || 0;
	const kenaServis = sp > 0 && (!pengaturan.servis.hanyaDineIn || String(jenisPesanan || '').toUpperCase() === 'DINE_IN');
	const servis = kenaServis ? Math.round((d * sp) / 100) : 0;
	const pr = pengaturan.pajakResto;
	const pp = pr?.aktif ? Number(pr.persen) || 0 : 0;
	if (pp <= 0) return { ...nol, servis, servisPersen: kenaServis ? sp : 0, total: d + servis };
	const dpp = d + servis;
	if (pr.inklusif) {
		const pajak = Math.round((dpp * pp) / (100 + pp));
		return { servis, servisPersen: kenaServis ? sp : 0, pajak, pajakPersen: pp, pajakInklusif: true, total: dpp };
	}
	const pajak = Math.round((dpp * pp) / 100);
	return { servis, servisPersen: kenaServis ? sp : 0, pajak, pajakPersen: pp, pajakInklusif: false, total: dpp + pajak };
}

/**
 * Stasiun dapur untuk sebuah produk menurut nama kategorinya; tidak cocok → stasiun pertama.
 * @param {string | null | undefined} kategoriProduk
 * @param {Stasiun[]} stasiun
 */
export function stasiunUntuk(kategoriProduk, stasiun) {
	if (!stasiun.length) return null;
	const k = String(kategoriProduk || '').toUpperCase();
	if (k) {
		const cocok = stasiun.find((s) => s.kategori.some((x) => k === x || k.includes(x) || x.includes(k)));
		if (cocok) return cocok.kode;
	}
	return (stasiun.find((s) => s.kategori.length === 0) || stasiun[0]).kode;
}

/**
 * Periksa isian pesanan wajib. @returns {string | null} pesan galat
 * @param {Isian[]} isian @param {Record<string, unknown> | null | undefined} nilai
 */
export function cekIsianWajib(isian, nilai) {
	for (const f of isian) {
		if (f.wajib && !String(nilai?.[f.kunci] ?? '').trim()) return `${f.label} wajib diisi`;
	}
	return null;
}

/** Ringkas isian jadi teks catatan order: "Plat nomor: B 1234 CD · Mekanik: Andi" */
export function teksIsian(/** @type {Isian[]} */ isian, /** @type {Record<string, unknown> | null | undefined} */ nilai) {
	return isian
		.map((f) => {
			const v = String(nilai?.[f.kunci] ?? '').trim();
			return v ? `${f.label}: ${v.slice(0, 80)}` : '';
		})
		.filter(Boolean)
		.join(' · ');
}

// ── Pengaturan dari jawaban AI ──────────────────────────────────────────────

export const PROMPT_PROFIL_POS = `Kamu konsultan kasir (POS) untuk UMKM Indonesia. Dari uraian usaha, susun pengaturan kasir yang paling cocok.
Balas HANYA JSON tanpa teks lain, bentuk:
{"profil":"${DAFTAR_PROFIL.join('|')}","jumlahMeja":0,"area":["Dalam"],"stasiun":[{"nama":"Dapur","kategori":["MAKANAN"]}],"jenisPesanan":["DINE_IN","TAKEAWAY","DELIVERY"],"openBill":false,"nomorAntrean":false,"catatanItem":false,"servisPersen":0,"pajakResto":false,"isian":[{"label":"Plat nomor","tipe":"teks|angka|tanggal","wajib":true}],"istilahProduk":"Menu","istilahPelanggan":"Tamu"}
Aturan: jumlahMeja 0 bila tidak makan di tempat (maks 60). stasiun = tempat pesanan disiapkan (dapur, bar, racik, grill), kosongkan bila tidak ada. kategori stasiun = nama kategori menu yang disiapkan di sana (huruf besar).
servisPersen dan pajakResto hanya bila uraian menyebut service charge / pajak restoran (PB1). isian = data tambahan per pesanan yang khas usaha ini (maks 4). Jangan mengarang angka yang tidak tersirat.`;

/**
 * Gabungkan jawaban AI ke pengaturan bawaan profilnya. Nilai yang tidak sah diabaikan.
 * @param {any} j JSON dari AI
 * @param {string} cadangan profil hasil tebakan aturan bila AI tidak memberi profil sah
 * @returns {{ profil: string, pengaturan: PengaturanPos }}
 */
export function pengaturanDariAi(j, cadangan) {
	const profil = j && DAFTAR_PROFIL.includes(String(j.profil)) ? String(j.profil) : cadangan;
	const dasar = pengaturanBawaan(profil);
	if (!j || typeof j !== 'object') return { profil, pengaturan: dasar };
	/** @type {any} */
	const m = salin(dasar);
	const nMeja = Number(j.jumlahMeja);
	if (Number.isFinite(nMeja) && nMeja >= 0) {
		const area = (Array.isArray(j.area) ? j.area : []).map((/** @type {unknown} */ a) => teks(a, 30)).filter(Boolean).slice(0, 6);
		m.meja = { aktif: nMeja > 0, daftar: buatDaftarMeja(Math.min(60, nMeja), area.length ? area : ['Utama']) };
		if (nMeja > 0 && !m.jenisPesanan.includes('DINE_IN')) m.jenisPesanan.unshift('DINE_IN');
	}
	if (Array.isArray(j.stasiun)) m.dapur = { aktif: j.stasiun.length > 0, stasiun: j.stasiun };
	if (Array.isArray(j.jenisPesanan) && j.jenisPesanan.length) m.jenisPesanan = j.jenisPesanan;
	for (const k of ['openBill', 'nomorAntrean', 'catatanItem']) if (typeof j[k] === 'boolean') m[k] = j[k];
	const sp = Number(j.servisPersen);
	if (Number.isFinite(sp) && sp > 0) m.servis = { ...m.servis, persen: sp };
	if (j.pajakResto === true) m.pajakResto = { ...m.pajakResto, aktif: true };
	if (Array.isArray(j.isian)) m.isian = j.isian.slice(0, 4);
	if (j.istilahProduk) m.istilah.produk = j.istilahProduk;
	if (j.istilahPelanggan) m.istilah.pelanggan = j.istilahPelanggan;
	return { profil, pengaturan: normalisasiPengaturan(m, profil) };
}
