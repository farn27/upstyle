/**
 * Logika murni chat AI (tanpa basis data): deteksi topik, periode waktu, jenis pesan, perapian riwayat,
 * dan penyaringan tautan. Dipisah dari routes/api/chat/+server.js supaya bisa diuji.
 *
 * Perbaikan dibanding deteksi lama (chatIntent.detectIntent):
 *  - pola memakai batas kata: dulu "sp" pada "mie goreng spesial" terbaca KPI/SP karyawan,
 *    "mobil" pada "mobile" terbaca aset, "kas" pada "kasir" terbaca keuangan, "log" pada "katalog" terbaca audit;
 *  - satu pesan boleh punya beberapa topik ("omzet dan stok menipis" → keuangan + produk);
 *  - pertanyaan susulan pendek ("kenapa?", "kalau bulan lalu?") memakai topik pesan sebelumnya.
 */

const WIB_MS = 7 * 60 * 60 * 1000;
const HARI_MS = 86_400_000;

/** @typedef {{ key: string, pola: RegExp }} Topik */

/** Urutan = prioritas bila dibatasi. Semua pola memakai batas kata. */
/** @type {Topik[]} */
export const TOPIK = [
	{ key: 'keuangan', pola: /\b(omzet|omset|pemasukan|pendapatan|pengeluaran|biaya|beban|laba|rugi|untung|profit|keuangan|kas|saldo|uang|cash\s?flow|arus\s?kas|boros|hemat|margin|modal|keuntungan|penghasilan)\b/ },
	{ key: 'produk', pola: /\b(stok|stock|produk|barang|menu|item|laris|terlaris|laku|paling\s+laku|habis|menipis|dead\s?stock|persediaan|inventori|porsi|cup|terjual)\b/ },
	{ key: 'kasir', pola: /\b(kasir|pos|struk|order|pesanan|metode\s+bayar|qris|shift)\b/ },
	{ key: 'tren', pola: /\b(tren|trend|grafik|chart|perkembangan|naik|turun|bandingkan|banding|dibanding(kan)?|perbandingan|meningkat|menurun|pertumbuhan)\b/ },
	{ key: 'riwayat', pola: /\b(transaksi|riwayat|catatan|mutasi)\b/ },
	{ key: 'piutang', pola: /\b(piutang|hutang|utang|tagihan|jatuh\s+tempo|invoice|faktur|bon|kasbon)\b/ },
	{ key: 'karyawan', pola: /\b(karyawan|pegawai|staf|staff|sdm|absen|absensi|hadir|kehadiran|cuti|lembur|payroll|gaji|gajian)\b/ },
	{ key: 'kpi', pola: /\b(kpi|penilaian\s+kinerja|kinerja\s+karyawan|performa\s+karyawan)\b/ },
	{ key: 'penggajian', pola: /\b(komponen\s+gaji|tunjangan|potongan\s+gaji|slip\s+gaji|bpjs)\b/ },
	{ key: 'pelanggan', pola: /\b(pelanggan|customer|klien|kontak|prospek|crm|deal|pipeline|langganan)\b/ },
	{ key: 'sales', pola: /\b(quotation|penawaran|sales\s+order|target\s+(sales|penjualan)|komisi)\b/ },
	{ key: 'marketing', pola: /\b(kampanye|campaign|iklan|ads|leads?|landing\s+page|voucher|diskon|promo|roas|marketing|pemasaran)\b/ },
	{ key: 'cs', pola: /\b(tiket|ticket|keluhan|komplain|helpdesk|layanan\s+pelanggan|customer\s+service)\b/ },
	{ key: 'ecommerce', pola: /\b(toko\s+online|e-?commerce|storefront|marketplace|shopee|tokopedia|katalog\s+online)\b/ },
	{ key: 'pengadaan', pola: /\b(supplier|pemasok|vendor|po|purchase\s+order|pembelian|restock|kulakan|belanja\s+bahan)\b/ },
	{ key: 'aset', pola: /\b(aset|asset|penyusutan|kendaraan|mesin|peralatan)\b/ },
	{ key: 'pajak', pola: /\b(pajak|ppn|pph|npwp)\b/ },
	{ key: 'anggaran', pola: /\b(anggaran|budget)\b/ },
	{ key: 'approval', pola: /\b(persetujuan|approval|reimburse|disetujui)\b/ },
	{ key: 'gudang', pola: /\b(gudang|opname|stok\s+opname|selisih\s+stok)\b/ },
	{ key: 'akuntansi', pola: /\b(coa|bagan\s+akun|chart\s+of\s+accounts?|jurnal|buku\s+besar|neraca)\b/ },
	{ key: 'tutup_buku', pola: /\b(tutup\s+buku|closing|kunci\s+periode)\b/ },
	{ key: 'audit', pola: /\b(log|audit|jejak|aktivitas\s+(akun|pengguna|sistem)|siapa\s+yang\s+(hapus|menghapus|ubah|mengubah))\b/ },
	{ key: 'bantuan', pola: /\b(cara|caranya|langkah|tutorial|panduan|fitur|dimana|di\s+mana|letak|halaman|menu\s+apa|bisa\s+apa)\b/ }
];

/**
 * Topik pesan, urut prioritas, maksimal `maks`.
 * @param {string} teks
 * @param {number} [maks]
 * @returns {string[]}
 */
export function deteksiTopik(teks, maks = 3) {
	const t = String(teks || '').toLowerCase();
	const hasil = TOPIK.filter(({ pola }) => pola.test(t)).map(({ key }) => key);
	// "cara tambah produk" = pertanyaan bantuan, bukan permintaan data produk
	if (hasil.includes('bantuan') && /\b(cara|caranya|langkah|tutorial|panduan)\b/.test(t)) return ['bantuan'];
	return hasil.slice(0, maks);
}

// ─── Jenis pesan ────────────────────────────────────────────────────────────

const POLA_SAPAAN = /^(halo+|hai+|hi+|hello|hey|pagi|siang|sore|malam|selamat\s+(pagi|siang|sore|malam)|assalamu.?alaikum|permisi|terima\s*kasih|makasih|makasi|thanks?|thx|ok(e|ey|ay)?|sip|siap|mantap|baik|good|nice|wah|wkwk+|haha+|test|tes)\b(\s+(ya|yaa|kak|banyak|bang|min|deh|dong|sekali|bro|sis|juga|semua))*[\s!.,?🙏😊👍]*$/i;

/**
 * Sapaan / basa-basi singkat: tidak butuh data usaha sama sekali.
 * @param {string} teks
 */
export function sapaan(teks) {
	const t = String(teks || '').trim();
	return t.length <= 40 && POLA_SAPAAN.test(t);
}

const POLA_TANYA = /\?\s*$|^(berapa|apa|apakah|kapan|siapa|bagaimana|gimana|kenapa|mengapa|knp|mana|cek|lihat|tampilkan|tunjukkan|tunjukin|daftar|ringkas|rangkum|rekap|jelaskan|analisa|analisis|bandingkan|ada\s+berapa|ada\s+apa|boleh|bisa|tolong\s+(cek|lihat|analisis|jelaskan|rangkum|tampilkan|bandingkan))\b|\b(berapa|apa\s+saja|apa\s+aja|yang\s+mana|ada\s+berapa|gimana|bagaimana|kenapa|mengapa|kah)\b/i;

/**
 * Kalimat tanya / permintaan informasi (bukan perintah mencatat).
 * @param {string} teks
 */
export function kalimatTanya(teks) {
	return POLA_TANYA.test(String(teks || '').trim());
}

const KATA_TRANSAKSI = /\b(catat|catatkan|input|masukkan|tambah(kan)?\s+transaksi|beli|membeli|bayar|bayarin|belanja|jual|menjual|jualan|terjual|laku|dapat|dapet|terima|menerima|diterima|keluar|masuk|setor|tarik|transfer|kirim|borong|restock|kulakan|sewa|gaji|gajian|upah|ongkir|ongkos|cicil|lunas|pelunasan|dp)\b/i;
const ADA_UANG = /(rp\.?\s*\d|\d[\d.,]*\s*(rb|ribu|k|jt|juta|rban|ribuan)\b|\b\d{4,}\b|\b\d{1,3}(\.\d{3})+\b)/i;
const JUAL_BARANG = /\b(jual|terjual|laku)\s+\d+\s+\S+/i;

/**
 * Perintah mencatat transaksi: tidak berbentuk pertanyaan, memuat kata transaksi, dan memuat nominal
 * (atau "jual 2 <produk>" — nominal diambil dari harga produk).
 * @param {string} teks
 */
export function perintahTransaksi(teks) {
	const t = String(teks || '').trim();
	if (!t || kalimatTanya(t)) return false;
	if (!KATA_TRANSAKSI.test(t)) return false;
	return ADA_UANG.test(t) || JUAL_BARANG.test(t);
}

/**
 * Jumlah nominal uang dalam kalimat ("beli gula 50rb dan es batu 20rb" → 2).
 * @param {string} teks
 */
export function jumlahNominal(teks) {
	const cocok = String(teks || '').match(/(rp\.?\s*\d[\d.,]*|\d[\d.,]*\s*(rb|ribu|k|jt|juta)\b|\b\d{1,3}(\.\d{3})+\b|\b\d{4,}\b)/gi);
	return cocok ? cocok.length : 0;
}

/**
 * Perintah memori ("ingat bahwa …", "simpan preferensi …"). "catat …" hanya memori bila jelas
 * menyebut memori/preferensi — "catat pengeluaran listrik 200rb" adalah transaksi.
 * @param {string} teks
 * @returns {string | null} fakta yang diminta disimpan
 */
export function perintahIngat(teks) {
	const t = String(teks || '').trim();
	const m = t.match(/^(?:tolong\s+)?(?:ingat(?:kan|lah)?(?:\s+ya)?|(?:catat|simpan)\s+(?:memori|preferensi|fakta|bahwa))\s*(?:memori|bahwa|fakta|preferensi)?\s*[:,-]?\s*(.+)/i);
	if (!m) return null;
	// "ingatkan saya bayar listrik 200rb" tetap bukan memori angka; biar penjaga di aiMemory yang menolak
	return m[1].trim() || null;
}

// ─── Periode waktu ──────────────────────────────────────────────────────────

const NAMA_BULAN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
const SINGKAT_BULAN = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
const LABEL_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** @param {number} y @param {number} m0 @param {number} d */
const tgl = (y, m0, d) => new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);

/**
 * Kalender WIB dari sebuah waktu.
 * @param {Date} [sekarang]
 */
export function kalender(sekarang = new Date()) {
	const w = new Date(sekarang.getTime() + WIB_MS);
	const y = w.getUTCFullYear();
	const m0 = w.getUTCMonth();
	const d = w.getUTCDate();
	const hariIni = tgl(y, m0, d);
	const besok = tgl(y, m0, d + 1);
	const kemarin = tgl(y, m0, d - 1);
	const senin = tgl(y, m0, d - ((w.getUTCDay() + 6) % 7));
	return { y, m0, d, hariIni, besok, kemarin, senin, awalBulan: tgl(y, m0, 1), jam: w.toISOString().slice(11, 16), hariKe: w.getUTCDay() };
}

/** @typedef {{ label: string, mulai: string, akhir: string }} Periode  — akhir eksklusif, format YYYY-MM-DD */

/**
 * Periode waktu yang disebut dalam pesan (bisa lebih dari satu untuk perbandingan).
 * @param {string} teks
 * @param {Date} [sekarang]
 * @returns {Periode[]}
 */
export function periodeDariTeks(teks, sekarang = new Date()) {
	const t = String(teks || '').toLowerCase();
	const k = kalender(sekarang);
	/** @type {{ pos: number, p: Periode }[]} */
	const ketemu = [];
	/** @param {RegExp} pola @param {(m: RegExpExecArray) => Periode | null} buat */
	const cari = (pola, buat) => {
		const re = new RegExp(pola.source, 'gi');
		let m;
		while ((m = re.exec(t))) {
			const p = buat(m);
			if (p) ketemu.push({ pos: m.index, p });
		}
	};

	cari(/\bhari\s+ini\b|\bhr\s+ini\b|\btadi\b/, () => ({ label: `hari ini (${k.hariIni})`, mulai: k.hariIni, akhir: k.besok }));
	cari(/\bkemarin\b|\bkmrn\b|\bkemaren\b/, () => ({ label: `kemarin (${k.kemarin})`, mulai: k.kemarin, akhir: k.hariIni }));
	cari(/\bminggu\s+ini\b|\bpekan\s+ini\b/, () => ({ label: `minggu ini (${k.senin} s/d ${k.hariIni})`, mulai: k.senin, akhir: k.besok }));
	cari(/\bminggu\s+(lalu|kemarin)\b|\bpekan\s+lalu\b/, () => {
		const a = tgl(k.y, k.m0, Number(k.senin.slice(8)) - 7);
		return { label: `minggu lalu (${a} s/d ${tgl(k.y, k.m0, Number(k.senin.slice(8)) - 1)})`, mulai: a, akhir: k.senin };
	});
	cari(/\b(\d{1,3})\s*hari\s*(terakhir|belakangan|ke\s*belakang)\b/, (m) => {
		const n = Math.min(Math.max(Number(m[1]), 1), 366);
		const a = tgl(k.y, k.m0, k.d - (n - 1));
		return { label: `${n} hari terakhir (${a} s/d ${k.hariIni})`, mulai: a, akhir: k.besok };
	});
	cari(/\bbulan\s+ini\b|\bbln\s+ini\b/, () => ({ label: `bulan ini (${LABEL_BULAN[k.m0]} ${k.y}, s/d ${k.hariIni})`, mulai: k.awalBulan, akhir: k.besok }));
	cari(/\bbulan\s+(lalu|kemarin|sebelumnya)\b|\bbln\s+lalu\b/, () => {
		const a = tgl(k.y, k.m0 - 1, 1);
		const d = new Date(`${a}T00:00:00Z`);
		return { label: `bulan lalu (${LABEL_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()})`, mulai: a, akhir: k.awalBulan };
	});
	cari(/\b(\d{1,2})\s*bulan\s*(terakhir|belakangan)\b/, (m) => {
		const n = Math.min(Math.max(Number(m[1]), 1), 24);
		const a = tgl(k.y, k.m0 - (n - 1), 1);
		return { label: `${n} bulan terakhir (${a} s/d ${k.hariIni})`, mulai: a, akhir: k.besok };
	});
	cari(/\btahun\s+ini\b|\bthn\s+ini\b/, () => ({ label: `tahun ini (${k.y})`, mulai: tgl(k.y, 0, 1), akhir: k.besok }));
	cari(/\btahun\s+lalu\b|\bthn\s+lalu\b/, () => ({ label: `tahun lalu (${k.y - 1})`, mulai: tgl(k.y - 1, 0, 1), akhir: tgl(k.y, 0, 1) }));
	const polaBulan = new RegExp(`\\b(${[...NAMA_BULAN, ...SINGKAT_BULAN.filter((s) => s !== 'mei')].join('|')})\\b(?:\\s+(20\\d{2}))?`);
	cari(polaBulan, (m) => {
		let i = NAMA_BULAN.indexOf(m[1]);
		if (i === -1) i = SINGKAT_BULAN.indexOf(m[1]);
		if (i === -1) return null;
		// "sep" / "jan" sebagai kata biasa jarang; tetap butuh konteks angka/omzet — diterima apa adanya
		let y = m[2] ? Number(m[2]) : k.y;
		if (!m[2] && i > k.m0) y -= 1; // "Desember" saat November → Desember tahun lalu
		return { label: `${LABEL_BULAN[i]} ${y}`, mulai: tgl(y, i, 1), akhir: tgl(y, i + 1, 1) };
	});

	ketemu.sort((a, b) => a.pos - b.pos);
	/** @type {Periode[]} */
	const unik = [];
	for (const { p } of ketemu) if (!unik.some((u) => u.mulai === p.mulai && u.akhir === p.akhir)) unik.push(p);
	return unik.slice(0, 3);
}

// ─── Riwayat percakapan ─────────────────────────────────────────────────────

/**
 * Rapikan riwayat dari klien: buang pesan saat ini yang ikut terkirim (web & Android menyertakannya →
 * dulu pertanyaan terkirim dua kali ke model), batasi jumlah & panjang, buang widget panjang.
 * @param {unknown} riwayat
 * @param {string} pesan
 * @param {{ maksPesan?: number, maksUser?: number, maksAsisten?: number }} [opsi]
 * @returns {{ role: 'user' | 'assistant', content: string }[]}
 */
export function rapikanRiwayat(riwayat, pesan, opsi = {}) {
	const { maksPesan = 6, maksUser = 300, maksAsisten = 280 } = opsi;
	const daftar = Array.isArray(riwayat) ? riwayat : [];
	/** @type {{ role: 'user' | 'assistant', content: string }[]} */
	const bersih = [];
	for (const h of daftar) {
		if (!h || typeof h !== 'object') continue;
		const role = /** @type {any} */ (h).role === 'user' ? 'user' : 'assistant';
		let isi = String(/** @type {any} */ (h).content ?? '').trim();
		if (!isi) continue;
		if (role === 'assistant') {
			isi = isi
				.replace(/:::[a-z]+\{[\s\S]*?\}:::/gi, '')
				.replace(/```[\s\S]*?```/g, '')
				.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
				.replace(/\n{2,}/g, '\n')
				.trim();
			if (isi.length > maksAsisten) isi = isi.slice(0, maksAsisten) + '…';
		} else if (isi.length > maksUser) isi = isi.slice(0, maksUser) + '…';
		if (isi) bersih.push({ role, content: isi });
	}
	// Pesan saat ini sudah dikirim terpisah
	const p = String(pesan || '').trim();
	while (bersih.length && bersih[bersih.length - 1].role === 'user' && bersih[bersih.length - 1].content.replace(/…$/, '') === p.slice(0, maksUser)) bersih.pop();
	// Jangan mulai dengan jawaban asisten yang terpotong konteksnya
	const hasil = bersih.slice(-maksPesan);
	while (hasil.length && hasil[0].role === 'assistant') hasil.shift();
	return hasil;
}

/**
 * Pertanyaan susulan pendek tanpa topik ("kenapa?", "kalau bulan lalu?", "yang kedua?") → pakai topik
 * pesan pengguna sebelumnya.
 * @param {string} pesan
 * @param {{ role: string, content: string }[]} riwayat  hasil rapikanRiwayat
 * @returns {string[]}
 */
export function topikSusulan(pesan, riwayat) {
	const t = String(pesan || '').trim();
	if (t.split(/\s+/).length > 8) return [];
	for (let i = riwayat.length - 1; i >= 0; i--) {
		if (riwayat[i].role !== 'user') continue;
		const tp = deteksiTopik(riwayat[i].content);
		if (tp.length) return tp;
	}
	return [];
}

// ─── Tautan halaman ─────────────────────────────────────────────────────────

/** Halaman unit yang benar-benar ada (relatif terhadap /finance/{slug}) beserta topiknya. */
export const HALAMAN_UNIT = [
	{ label: 'Dasbor', sub: '', topik: ['keuangan', 'tren'] },
	{ label: 'Catat Transaksi', sub: '/entry', topik: ['riwayat', 'keuangan'] },
	{ label: 'Riwayat Transaksi', sub: '/history', topik: ['riwayat', 'keuangan'] },
	{ label: 'Laporan Keuangan', sub: '/laporan', topik: ['keuangan', 'tren', 'akuntansi'] },
	{ label: 'Kasir', sub: '/pos', topik: ['kasir'] },
	{ label: 'Laporan Kasir', sub: '/pos/reports', topik: ['kasir', 'produk'] },
	{ label: 'Produk & Stok', sub: '/produk', topik: ['produk', 'gudang'] },
	{ label: 'Tambah Produk', sub: '/produk/add', topik: ['bantuan'] },
	{ label: 'Stok Opname', sub: '/produk/stok-opname', topik: ['gudang'] },
	{ label: 'Shift Kasir', sub: '/pos/shift', topik: ['kasir'] },
	{ label: 'Voucher', sub: '/pos/voucher', topik: ['marketing'] },
	{ label: 'Tambah Karyawan', sub: '/hr/add', topik: ['bantuan'] },
	{ label: 'Absensi', sub: '/hr/absensi', topik: ['karyawan'] },
	{ label: 'Penggajian', sub: '/hr/payroll', topik: ['penggajian'] },
	{ label: 'Piutang', sub: '/piutang', topik: ['piutang'] },
	{ label: 'Hutang', sub: '/hutang', topik: ['piutang'] },
	{ label: 'Jurnal Umum', sub: '/jurnal-umum', topik: ['akuntansi'] },
	{ label: 'Buku Besar', sub: '/buku-besar', topik: ['akuntansi'] },
	{ label: 'Master Data', sub: '/master-data', topik: ['akuntansi', 'pajak', 'aset', 'anggaran', 'tutup_buku'] },
	{ label: 'Pengadaan', sub: '/pengadaan', topik: ['pengadaan'] },
	{ label: 'SDM', sub: '/hr', topik: ['karyawan', 'kpi', 'penggajian', 'approval'] },
	{ label: 'CRM', sub: '/crm', topik: ['pelanggan', 'sales', 'marketing'] },
	{ label: 'Layanan Pelanggan', sub: '/cs', topik: ['cs'] },
	{ label: 'Pengaturan Unit', sub: '/settings', topik: ['bantuan'] }
];

/**
 * Daftar halaman yang relevan dengan topik (hemat token: tidak semua halaman dikirim).
 * @param {string | null} slug
 * @param {string[]} topik
 * @param {number} [maks]
 */
export function halamanRelevan(slug, topik, maks = 4) {
	if (!slug) return [{ label: 'Pilih Unit Bisnis', path: '/finance' }];
	const INTI = ['', '/entry', '/history', '/laporan', '/pos', '/produk', '/produk/add', '/hr', '/hr/add', '/crm'];
	const semua = topik.includes('bantuan') ? HALAMAN_UNIT.filter((h) => INTI.includes(h.sub)) : HALAMAN_UNIT.filter((h) => h.topik.some((x) => topik.includes(x)));
	const pilih = (semua.length ? semua : HALAMAN_UNIT.slice(0, 3)).slice(0, topik.includes('bantuan') ? INTI.length : maks);
	return pilih.map((h) => ({ label: h.label, path: `/finance/${slug}${h.sub}` }));
}

/**
 * Hapus tautan internal yang tidak ada (model kadang mengarang URL) — teksnya tetap, tautannya dibuang.
 * Tautan eksternal (https://…) juga dibuang agar tidak mengarahkan pengguna ke situs tak dikenal.
 * @param {string} balasan
 * @param {string | null} slug
 */
export function saringTautan(balasan, slug) {
	const sah = new Set(['/finance', '/', '/help', '/settings', '/notification', ...(slug ? HALAMAN_UNIT.map((h) => `/finance/${slug}${h.sub}`) : [])]);
	return String(balasan || '').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (utuh, label, url) => {
		const path = String(url).split(/[?#]/)[0].replace(/\/$/, '') || '/';
		return sah.has(path) ? utuh : label;
	});
}

/**
 * Label hari Indonesia.
 * @param {number} i  0 = Minggu
 */
export const namaHari = (i) => ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][i] || '';
