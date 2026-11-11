/**
 * Deteksi maksud pesan chat AI dan pengurai cepat kalimat transaksi (tanpa memanggil model).
 * Dipisah dari routes/api/chat/+server.js supaya bisa diuji.
 */

// ─── Intent Detection ─────────────────────────────────────────────────────────

export const INTENTS = [
	{ key: 'hr_advanced',     pattern: /kpi|penilaian|performa|kontrak|sp|peringatan/ },
	{ key: 'hr',              pattern: /karyawan|gaji|absen|payroll|cuti|shift|pegawai|lembur|staf|staff|sdm/ },
	{ key: 'crm',             pattern: /pelanggan|customer|klien|deal|pipeline|kontak|crm|prospek|pembeli/ },
	{ key: 'inventory',       pattern: /stok|produk|barang|inventori|laku|laris|habis|dead.?stock|item/ },
	{ key: 'finance_advanced',pattern: /tutup.?buku|closing.?period|akhir.?bulan/ },
	{ key: 'finance',         pattern: /uang|laba|rugi|keuangan|kas|saldo|pemasukan|pengeluaran|omzet|hutang|piutang|bon|jurnal|buku.?besar|cash.?flow|profit|tagihan/ },
	{ key: 'pos',             pattern: /pos|kasir|struk|order|bayar|jual|penjualan kasir/ },
	{ key: 'sales',           pattern: /pipeline|deal|closing|penawaran|quotation|sales.?order|komisi|target.?sales/ },
	{ key: 'marketing',       pattern: /kampanye|campaign|iklan|leads?|landing.?page|voucher|diskon|marketing|roas/ },
	{ key: 'cs',              pattern: /tiket|ticket|keluhan|komplain|support|helpdesk|cs|customer.?service/ },
	{ key: 'ecommerce',       pattern: /toko.?online|ecommerce|e-commerce|storefront|marketplace|shopee|tokopedia/ },
	{ key: 'procurement',     pattern: /supplier|vendor|\bpo\b|purchase.?order|pembelian|restock|kulakan/ },
	{ key: 'asset',           pattern: /aset|mobil|mesin|fixed.?asset|penyusutan|kendaraan/ },
	{ key: 'tax',             pattern: /pajak|ppn|pph|tax/ },
	{ key: 'budget',          pattern: /anggaran|budget|jatah/ },
	{ key: 'approval',        pattern: /persetujuan|approval|reimburse/ },
	{ key: 'gudang',          pattern: /gudang|warehouse|opname|selisih.?stok|batch/ },
	{ key: 'penggajian',      pattern: /komponen.?gaji|tunjangan|potongan|slip|bpjs/ },
	{ key: 'akuntansi',       pattern: /akun|coa|chart.?of.?account|rekening/ },
	{ key: 'audit',           pattern: /log|riwayat|audit|hapus|aktivitas|jejak/ },
	{ key: 'transaction_input', pattern: /\b(beli|bayar|bayarin|jual|jualan|belanja|keluar|masuk|dapat|terima|dapet|kirim|transfer|bayarkan|habis|abis|borong|restock|kulakan|traktir|sponsor|sponsoran|kiriman|cicil|cicilan|angsuran|dp|down.?payment|setor|setorin|tarik|fee|komisi|upah|gaji.?kasih|kasih|kasih uang|bayar.?uang|uang masuk|uang keluar|pemasukan|pengeluaran|bayar.?tagihan|tagihan masuk|tagihan keluar|profit|hasil|pendapatan|diterima|dibayar|lunas|bayar.?lunas|bayar.?dp|transaksi)\b/ },
	{ key: 'help',            pattern: /bantuan|cara|bagaimana|fitur|menu|aplikasi|dimana|link|halaman|help|tolong|bingung/ },
];

/**
 * Kalimat tanya ("ada berapa transaksi bulan lalu?", "transaksi terakhir apa?") — bukan perintah mencatat.
 * Dulu kata "transaksi" membuat pertanyaan seperti ini masuk ke jalur pencatatan sehingga tidak dijawab (A-3).
 */
const POLA_TANYA = /\?\s*$|^(berapa|apa|apakah|kapan|siapa|bagaimana|gimana|kenapa|mengapa|mana|cek|lihat|tampilkan|tunjukkan|tunjukin|daftar|ringkas|rangkum|rekap|jelaskan|analisa|analisis|bandingkan|ada\s+berapa|ada\s+apa)\b|\b(berapa|apa\s+saja|yang\s+mana|ada\s+berapa)\b/i;

export function kalimatTanya(text) {
	return POLA_TANYA.test(String(text || '').trim());
}

export function detectIntent(text) {
	const lower = text.toLowerCase();
	const tanya = kalimatTanya(lower);
	for (const { key, pattern } of INTENTS) {
		if (tanya && key === 'transaction_input') continue;
		if (pattern.test(lower)) return key;
	}
	return 'general';
}

// ─── Transaction NL Parser ────────────────────────────────────────────────────

export function parseTransactionNL(text) {
	if (kalimatTanya(text)) return null;
	const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
	const todayWIB = new Date(Date.now() + WIB_OFFSET_MS).toISOString().split('T')[0];
	const lower = text.toLowerCase();

	// ── 1. MUST have a nominal to be a transaction ──────────────────────────
	// Accept: 10rb, 10 rb, 10ribu, 10k, 1jt, 1.5jt, 500000, 1.500.000, dll
	const hasNominal = /(\d[\d.,]*)\s*(rb|ribu|k\b|jt|juta|ratus\.?ribu|ratus|jt\.?an)?/i.test(text)
		&& /\d{3,}|\d+\s*(rb|ribu|jt|juta|k\b)/i.test(text); // min 3 digit or explicit unit
	if (!hasNominal) return null;

	// ── 2. Determine KATEGORI with wide vocabulary ──────────────────────────
	// Keluar: pengeluaran, expense words
	const isKeluar = /\b(beli|bayar|bayarin|belanja|keluar|abis|habis|borong|restock|kulakan|bayarkan|traktir|bayar.?tagihan|cicil|cicilan|angsuran|dp|down.?payment|setor|beli.?in|beli.?kan|bayar.?dp|bayar.?lunas|biaya|pengeluaran|expense|beban|modal|investasi|sewa|bayar.?sewa|bayar.?listrik|bayar.?air|bayar.?internet|langganan|iuran|denda|pajak|ongkir|kirim.?barang|ongkos|beli.?stok|ambil.?dari.?kas|keluar.?uang|uang.?keluar|pesan|order|gaji|gajian|honor|upah|bonus|thr|pesangon|kasbon)\b/i.test(lower);

	// Masuk: pemasukan, income words
	const isMasuk  = /\b(jual|jualan|dapat|terima|dapet|masuk|pendapatan|pemasukan|income|profit|hasil|laba|penjualan|diterima|kiriman|transfer.?masuk|bayaran|fee|komisi|sponsorship|sponsor|donasi|hibah|penerimaan|bayar.?customer|customer.?bayar|pelanggan.?bayar|bayar.?dari|uang.?masuk|setoran|tarik.?dari|untung|revenue)\b/i.test(lower);

	// If neither detected, check context clues (standalone "masuk"/"keluar" as verb + amount)
	const hasKonteks = isMasuk || isKeluar;
	if (!hasKonteks) return null;

	const kategori = isKeluar ? 'Keluar' : 'Masuk';

	// ── 3. Extract nominal ──────────────────────────────────────────────────
	const nomMatches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k\b|jt|juta|ratus\.?ribu|ratus)?/gi)];
	if (!nomMatches.length) return null;
	
	// Jika terdeteksi lebih dari 1 angka, serahkan ke AI untuk multiple input
	if (nomMatches.length > 1) return null;

	let bestNominal = 0;
	for (const m of nomMatches) {
		let val = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
		const unit = (m[2] || '').toLowerCase();
		if (/jt|juta/.test(unit))          val *= 1_000_000;
		else if (/rb|ribu/.test(unit))      val *= 1_000;
		else if (/\bk\b/.test(unit))        val *= 1_000;
		else if (/ratus.?ribu/.test(unit))  val *= 100_000;
		else if (/ratus/.test(unit))        val *= 100;
		// If no unit and less than 1000, might be thousands written without unit (e.g. "500" in casual speech often means 500rb)
		// Only apply this if there's a unit keyword nearby in the original text
		if (val > 0 && val <= 1_000_000_000 && val > bestNominal) bestNominal = val;
	}
	if (bestNominal <= 0) return null;

	// ── 4. Build keterangan from remaining text ─────────────────────────────
	// Strip numbers (with units), action words, stop words
	const cleaned = text
		.replace(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k\b|jt|juta|ratus\.?ribu|ratus)?/gi, ' ')
		.replace(/\b(beli|bayar|bayarin|jual|dapat|terima|dapet|masuk|keluar|habis|abis|tadi|barusan|udah|udh|buat|untuk|dengan|dari|ke|di|yang|dan|atau|ini|itu|sih|deh|dong|ya|kak|nih|aja|tuh|banget|lagi|sudah|sudah|memang|mau|ada|hari|ini|kemarin|tadi|malam|pagi|siang|sore|sekarang|transfer|setor|tarik|kirim|kasih|kasih|ngasih|ngasih|kirimin|bayar|bayarin|beli|beliin)\b/gi, ' ')
		.replace(/\s+/g, ' ').trim().toUpperCase();

	const keterangan = cleaned || (isKeluar ? 'PENGELUARAN' : 'PEMASUKAN');

	// Detect metode from text
	const metode = /\b(transfer|tf|bank|bca|bri|bni|mandiri|gopay|ovo|dana|shopeepay|qris|debit|kartu)\b/i.test(lower)
		? 'Transfer'
		: /\b(qris|scan|barcode)\b/i.test(lower)
		? 'QRIS'
		: 'Tunai';

	return [{ kategori, nominal: bestNominal, keterangan, tanggal: todayWIB, metode }];
}

