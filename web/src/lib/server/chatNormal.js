/**
 * Pembersih ketikan untuk chat AI — tanpa model, 0 token.
 *
 * Pemilik UMKM mengetik cepat di HP: singkatan ("brp", "kmrn", "pndptn"), salah ketik ("pendaptaan",
 * "pengluaran", "novmber"), huruf berulang ("omzeeet"), kata dempet ("tanggal11", "11nov"), dan angka dalam
 * kata ("empat ratus ribu"). Modul ini merapikannya supaya aturan (periode, perintah catat, topik, jawaban
 * instan) tetap paham. Bila maksud tetap tidak tertebak, `tebakMaksud` memberi pilihan untuk ditanyakan balik.
 */

/** Singkatan & bahasa chat → kata baku (dicocokkan per kata utuh). */
const SINGKATAN = {
	brp: 'berapa', brpa: 'berapa', brapa: 'berapa', berap: 'berapa', berepa: 'berapa', brape: 'berapa',
	kmrn: 'kemarin', kmarin: 'kemarin', kemaren: 'kemarin', kmaren: 'kemarin', kemrin: 'kemarin',
	hr: 'hari', hri: 'hari', bln: 'bulan', bulam: 'bulan', mgg: 'minggu', mingu: 'minggu', thn: 'tahun', th: 'tahun',
	tgl: 'tanggal', tggl: 'tanggal', tangal: 'tanggal', tnggl: 'tanggal',
	pndptn: 'pendapatan', pdptn: 'pendapatan', pendptn: 'pendapatan', pendpt: 'pendapatan', pndapatan: 'pendapatan',
	pmsukan: 'pemasukan', pmskn: 'pemasukan', pemasukkan: 'pemasukan',
	pngluaran: 'pengeluaran', pngeluaran: 'pengeluaran', pengluaran: 'pengeluaran', pengeluran: 'pengeluaran', pngl: 'pengeluaran',
	pnjualan: 'penjualan', penjulan: 'penjualan', pnjln: 'penjualan', jualan: 'penjualan',
	omset: 'omzet', omsed: 'omzet', omzed: 'omzet', omst: 'omzet', omzt: 'omzet',
	stock: 'stok', stck: 'stok', setok: 'stok', stk: 'stok',
	trx: 'transaksi', trans: 'transaksi', transaks: 'transaksi', tranksaksi: 'transaksi',
	ctt: 'catat', cttn: 'catatan', ctat: 'catat', ctet: 'catat',
	byr: 'bayar', bayr: 'bayar', blnj: 'belanja', blanja: 'belanja', blnja: 'belanja', bli: 'beli',
	brg: 'barang', hrg: 'harga', jml: 'jumlah', ttl: 'total', tot: 'total', lpran: 'laporan',
	untg: 'untung', utg: 'hutang', ptg: 'piutang', krywn: 'karyawan', plggn: 'pelanggan', supp: 'supplier', suplier: 'supplier',
	gmn: 'gimana', gmna: 'gimana', gimn: 'gimana', knp: 'kenapa', knpa: 'kenapa', npa: 'kenapa',
	gak: 'tidak', ga: 'tidak', gk: 'tidak', nggak: 'tidak', ngga: 'tidak', enggak: 'tidak', tdk: 'tidak',
	udh: 'sudah', udah: 'sudah', sdh: 'sudah', blm: 'belum', blom: 'belum',
	yg: 'yang', dgn: 'dengan', utk: 'untuk', dr: 'dari', sm: 'sama', aj: 'aja', jg: 'juga', lg: 'lagi',
	tlg: 'tolong', tolongin: 'tolong', liat: 'lihat', lht: 'lihat', cekin: 'cek', tampilin: 'tampilkan',
	skrg: 'sekarang', skrng: 'sekarang', skg: 'sekarang', hrini: 'hari ini', hariini: 'hari ini',
	peb: 'feb', pebruari: 'februari', nopember: 'november', nop: 'nov', agt: 'agu', agst: 'agu'
};

/** Kata kunci domain yang boleh menjadi hasil koreksi salah ketik (≥5 huruf supaya aman). */
const KOSAKATA = [
	'pendapatan', 'pemasukan', 'pengeluaran', 'penjualan', 'penghasilan', 'keuntungan', 'kerugian', 'omzet', 'saldo',
	'kemarin', 'tanggal', 'berapa', 'minggu', 'sekarang', 'laporan', 'riwayat', 'transaksi', 'catatan', 'catatkan',
	'produk', 'persediaan', 'restock', 'terlaris', 'menipis', 'kesehatan', 'analisis', 'bandingkan', 'perbandingan',
	'belanja', 'pembelian', 'karyawan', 'pelanggan', 'supplier', 'piutang', 'hutang', 'tagihan', 'keuangan',
	'tampilkan', 'tunjukkan', 'kenapa', 'bagaimana', 'januari', 'februari', 'agustus', 'september', 'oktober',
	'november', 'desember', 'pengingat', 'grafik', 'rata-rata'
];

/** Kata umum yang TIDAK boleh "dikoreksi" walau mirip kata kunci. */
const KATA_UMUM = new Set(
	`ini itu yang dan atau untuk dari ke di sama saya aku kamu kak bang mau minta tolong lihat cek catat jual beli bayar
	sudah belum kenapa gimana apa siapa kapan mana total semua hanya juga lagi dong deh ya nih tuh kok sih banget sekali
	lebih kurang naik turun besar kecil sedang baru lama pagi siang sore malam kopi teh gula susu es nasi ayam mie roti air
	cup gelas porsi botol bungkus pcs buah kg gram liter harga jumlah uang kas bank tunai transfer qris hari bulan tahun
	bukan bisa buat ada tidak sudah masuk keluar laku laris habis stok rugi laba untung modal sewa gaji listrik bensin
	pembeli pemasok pesanan pesan menu toko usaha unit cabang bebas makan minum jalan barang tempat kerja kemarin besok
	lusa tadi nanti minggu kemudian selama sampai hingga mulai tanggal berapa`.split(/\s+/)
);

const ANGKA_KATA = { nol: 0, satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11 };
const PENGALI = { puluh: 10, belas: 10, ratus: 100, ribu: 1_000, rb: 1_000, juta: 1_000_000, jt: 1_000_000, miliar: 1_000_000_000 };

/**
 * Jarak Damerau-Levenshtein (penyisipan, penghapusan, penggantian, pertukaran huruf bersebelahan).
 * @param {string} a
 * @param {string} b
 */
export function jarakEdit(a, b) {
	const m = a.length;
	const n = b.length;
	if (Math.abs(m - n) > 2) return 3;
	/** @type {number[][]} */
	const d = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + biaya);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
		}
	}
	return d[m][n];
}

/**
 * Kata kunci terdekat untuk satu kata yang salah ketik, atau null.
 * @param {string} kata
 */
export function koreksiKata(kata) {
	if (kata.length < 5 || KATA_UMUM.has(kata) || KOSAKATA.includes(kata) || /\d/.test(kata)) return null;
	let terbaik = null;
	let jarakTerbaik = 9;
	for (const v of KOSAKATA) {
		if (v[0] !== kata[0]) continue;
		const batas = v.length >= 8 ? 2 : 1;
		const j = jarakEdit(kata, v);
		if (j <= batas && j < jarakTerbaik) {
			terbaik = v;
			jarakTerbaik = j;
		}
	}
	return terbaik;
}

/**
 * "empat ratus ribu" → "400000", "dua juta lima ratus ribu" → "2500000", "setengah juta" → "500000".
 * @param {string} teks
 */
export function angkaDariKata(teks) {
	const KATA = /^(nol|satu|se|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|puluh|belas|ratus|ribu|juta|miliar|seratus|seribu|sejuta|setengah)$/;
	const token = teks.split(/(\s+)/);
	/** @type {string[]} */
	const keluar = [];
	let i = 0;
	while (i < token.length) {
		if (!KATA.test(token[i]?.toLowerCase() || '')) {
			keluar.push(token[i]);
			i++;
			continue;
		}
		// kumpulkan deret kata bilangan (diselingi spasi)
		/** @type {string[]} */
		const deret = [];
		let j = i;
		while (j < token.length && (KATA.test(token[j]?.toLowerCase() || '') || (/^\s+$/.test(token[j]) && KATA.test(token[j + 1]?.toLowerCase() || '')))) {
			if (!/^\s+$/.test(token[j])) deret.push(token[j].toLowerCase());
			j++;
		}
		const nilai = hitungDeret(deret);
		if (nilai == null || (deret.length === 1 && /^(se|setengah)$/.test(deret[0]))) {
			keluar.push(...token.slice(i, j));
		} else {
			keluar.push(String(nilai));
		}
		i = j;
	}
	return keluar.join('');
}

/**
 * Nilai deret kata bilangan: angka satuan → `kecil`, puluh/belas/ratus menggabung ke `grup`,
 * ribu/juta/miliar mengalikan grup ke `total`.
 * @param {string[]} deret
 */
function hitungDeret(deret) {
	let total = 0;
	let grup = 0;
	let kecil = 0;
	let ada = false;
	const kata = deret.flatMap((w) => (w === 'seratus' ? ['se', 'ratus'] : w === 'seribu' ? ['se', 'ribu'] : w === 'sejuta' ? ['se', 'juta'] : [w]));
	for (const x of kata) {
		if (x === 'setengah') {
			kecil = 0.5;
			ada = true;
		} else if (x in ANGKA_KATA) {
			kecil = ANGKA_KATA[/** @type {keyof typeof ANGKA_KATA} */ (x)];
			ada = true;
		} else if (x === 'belas') {
			grup += kecil + 10;
			kecil = 0;
		} else if (x === 'puluh') {
			grup += (kecil || 1) * 10;
			kecil = 0;
		} else if (x === 'ratus') {
			grup += (kecil || 1) * 100;
			kecil = 0;
		} else if (x === 'ribu' || x === 'juta' || x === 'miliar') {
			total += (grup + kecil || 1) * PENGALI[x];
			grup = 0;
			kecil = 0;
		} else return null;
	}
	return ada ? Math.round(total + grup + kecil) : null;
}

const BULAN_POLA = '(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|sep|okt|nov|des)';

/**
 * Rapikan ketikan. `koreksi` mencatat kata yang diubah (untuk ditampilkan "saya baca sebagai …").
 * @param {string} teksAsli
 * @returns {{ teks: string, koreksi: { dari: string, ke: string }[] }}
 */
export function normalisasi(teksAsli) {
	/** @type {{ dari: string, ke: string }[]} */
	const koreksi = [];
	let t = String(teksAsli || '').toLowerCase().replace(/\s+/g, ' ').trim();
	// huruf berulang ≥3 → 1 ("omzeeet", "pendapataaan")
	t = t.replace(/([a-z])\1{2,}/g, '$1');
	// kata dempet dengan angka: "tanggal11" → "tanggal 11", "11nov" → "11 nov", "3hari" → "3 hari"
	t = t.replace(/\b([a-z]{3,})(\d)/g, '$1 $2');
	t = t.replace(new RegExp(`(\\d)(${BULAN_POLA}|hari|bulan|minggu|tahun)\\b`, 'g'), '$1 $2');
	// angka dalam kata
	const sebelumAngka = t;
	t = angkaDariKata(t);
	if (t !== sebelumAngka) koreksi.push({ dari: 'angka dalam kata', ke: 'angka' });
	// per kata: singkatan lalu salah ketik
	t = t
		.split(' ')
		.map((kata) => {
			const inti = kata.replace(/^[^a-z0-9]+|[^a-z0-9-]+$/g, '');
			if (!inti) return kata;
			const ganti = Object.prototype.hasOwnProperty.call(SINGKATAN, inti) ? SINGKATAN[/** @type {keyof typeof SINGKATAN} */ (inti)] : koreksiKata(inti);
			if (!ganti || ganti === inti) return kata;
			koreksi.push({ dari: inti, ke: ganti });
			return kata.replace(inti, ganti);
		})
		.join(' ');
	return { teks: t, koreksi };
}

/* ─────────────────────────── Tebak maksud untuk tanya balik ─────────────────────────── */

const MAKSUD = [
	{ kunci: ['omzet', 'pendapatan', 'pemasukan', 'penjualan', 'penghasilan', 'laku', 'untung'], pilihan: 'Berapa omzet hari ini?' },
	{ kunci: ['pengeluaran', 'biaya', 'belanja', 'keluar', 'beban'], pilihan: 'Pengeluaran bulan ini berapa?' },
	{ kunci: ['catat', 'catatkan', 'input', 'tambah', 'masukkan', 'transaksi'], pilihan: 'Cara mencatat transaksi lewat chat' },
	{ kunci: ['stok', 'habis', 'menipis', 'restock', 'persediaan', 'barang'], pilihan: 'Apa saja yang perlu di-restock?' },
	{ kunci: ['terlaris', 'laris', 'favorit', 'produk', 'menu'], pilihan: 'Produk terlaris bulan ini' },
	{ kunci: ['kesehatan', 'sehat', 'kondisi', 'analisis', 'evaluasi'], pilihan: 'Cek kesehatan usaha' },
	{ kunci: ['riwayat', 'laporan', 'mutasi', 'rekap', 'catatan'], pilihan: 'Lihat riwayat transaksi' },
	{ kunci: ['saldo', 'kas', 'uang', 'modal'], pilihan: 'Berapa saldo kas sekarang?' }
];
const BAWAAN = ['Berapa omzet hari ini?', 'Cara mencatat transaksi lewat chat', 'Apa saja yang perlu di-restock?', 'Cek kesehatan usaha'];

/**
 * Pilihan maksud yang paling mirip dengan kata-kata di pesan (2–4 opsi).
 * @param {string} teks  sebaiknya sudah dinormalisasi
 */
export function tebakMaksud(teks) {
	const kata = String(teks || '').toLowerCase().split(/[^a-z]+/).filter((k) => k.length >= 3);
	const skor = MAKSUD.map((m) => {
		let s = 0;
		for (const k of kata) {
			for (const c of m.kunci) {
				const mirip = 1 - jarakEdit(k, c) / Math.max(k.length, c.length);
				if (mirip > s) s = mirip;
			}
		}
		return { pilihan: m.pilihan, s };
	})
		.filter((x) => x.s >= 0.6)
		.sort((a, b) => b.s - a.s)
		.map((x) => x.pilihan);
	return [...new Set([...skor, ...BAWAAN])].slice(0, 4);
}

/**
 * Pesan yang hampir pasti tidak dipahami: pendek dan sebagian besar katanya tidak dikenal.
 * @param {string} teksNormal
 */
export function tidakDikenali(teksNormal) {
	const kata = String(teksNormal || '').toLowerCase().split(/\s+/).filter(Boolean);
	if (!kata.length || kata.length > 6) return false;
	const dikenal = kata.filter((k) => /\d/.test(k) || KATA_UMUM.has(k) || KOSAKATA.includes(k) || Object.values(SINGKATAN).includes(k));
	return dikenal.length / kata.length < 0.5;
}

/**
 * Pilihan dari jawaban model: baris terakhir "PILIHAN: a | b | c" → daftar opsi, dan teks tanpa baris itu.
 * @param {string} balasan
 */
export function ambilPilihan(balasan) {
	const m = /\n?\s*PILIHAN\s*:\s*(.+)\s*$/i.exec(String(balasan || ''));
	if (!m) return { teks: balasan, pilihan: /** @type {string[]} */ ([]) };
	const pilihan = m[1]
		.split('|')
		.map((s) => s.replace(/^[\s"'*-]+|[\s"'*]+$/g, '').trim())
		.filter((s) => s.length >= 2 && s.length <= 80)
		.slice(0, 4);
	return { teks: String(balasan).slice(0, m.index).trim(), pilihan };
}
