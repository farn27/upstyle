/**
 * Pengurai transaksi dari kalimat bebas ("jual 2 es teh lemon", "bayar listrik 120rb via transfer").
 * Dipakai bersama oleh form entri web (?/prosesAI) dan aplikasi mobile (POST /api/app/ai-entry),
 * supaya keduanya memberi hasil yang sama.
 *
 * Perbaikan dari hasil uji:
 *  - A-1: keluaran model kosong / JSON tidak valid dulu membuat HTTP 500 → kini dibaca toleran, dan bila
 *         tetap gagal dipakai penguraian berbasis aturan.
 *  - A-2: pembayaran nonkas (QRIS, transfer, ojek daring) dulu dicatat ke kas kasir → akun kas dipilih
 *         dengan aturan tetap dari kata kunci metode bayar, dan deskripsi akun ikut dikirim ke model.
 *  - A-4: saat penyedia AI menolak (batas token per menit) model cadangan dicoba; bila semua gagal,
 *         penguraian berbasis aturan tetap mengisi formulir (sumber: 'aturan').
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { products, chartOfAccounts } from '$lib/server/schema';
import { groqChatCompletion, bacaJsonAI } from '$lib/server/groq';
import { log } from '$lib/server/logger';

const TIPE_MASUK = new Set(['PENDAPATAN', 'PENDAPATAN_LAINNYA']);
const TIPE_KELUAR = new Set(['BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'HPP', 'ASET_TETAP']);

const KATA_KELUAR = /\b(beli|bayar|bayarin|belanja|keluar|borong|restock|kulakan|biaya|ongkir|ongkos|sewa|listrik|air|internet|pulsa|gaji|upah|honor|bonus|thr|kasbon|iuran|pajak|denda|cicil|cicilan|angsuran|servis|perbaikan|pengeluaran|beban)\b/i;
const KATA_MASUK = /\b(jual|jualan|terjual|laku|dapat|dapet|terima|diterima|masuk|pemasukan|pendapatan|penjualan|omzet|omset|order|pesanan|setoran|pelunasan|dp\s+dari|bayaran|fee|komisi)\b/i;

/**
 * Metode bayar dari kata kunci kalimat.
 * @param {string} teks
 * @returns {'MERCHANT' | 'QRIS' | 'BANK' | 'TUNAI' | null}
 */
export function metodeDariTeks(teks) {
	const t = String(teks || '').toLowerCase();
	if (/\b(go-?food|grab-?food|shopee-?food|gojek|grab|ojol|ojek\s*(online|daring)|maxim|marketplace|tokopedia|shopee|tiktok\s*shop)\b/.test(t)) return 'MERCHANT';
	if (/\b(qris|scan|ovo|gopay|go-?pay|dana|shopee-?pay|linkaja|e-?wallet|dompet\s*digital|edc)\b/.test(t)) return 'QRIS';
	if (/\b(transfer|tf|trf|bank|bca|bri|bni|mandiri|bsi|cimb|rekening|debit|kartu|m-?banking)\b/.test(t)) return 'BANK';
	if (/\b(tunai|cash|kes|kontan|uang\s*pas|laci)\b/.test(t)) return 'TUNAI';
	return null;
}

/**
 * Pilih akun kas/bank sesuai metode bayar.
 * @param {{ id: number, namaAkun: string, tipeAkun: string, deskripsi?: string | null }[]} coa
 * @param {'MERCHANT' | 'QRIS' | 'BANK' | 'TUNAI' | null} metode
 * @returns {number | null}
 */
export function pilihAkunKas(coa, metode) {
	const lancar = coa.filter((a) => a.tipeAkun === 'ASET_LANCAR' && !/persediaan|stok/i.test(a.namaAkun));
	const teks = (/** @type {{ namaAkun: string, deskripsi?: string | null }} */ a) => `${a.namaAkun} ${a.deskripsi || ''}`;
	const cari = (/** @type {RegExp} */ pola) => lancar.find((a) => pola.test(teks(a)))?.id ?? null;
	const bank = () => cari(/\bbank\b|bca|bri|bni|mandiri|transfer|rekening/i);
	const kas = () => lancar.find((a) => /\bkas\b/i.test(a.namaAkun) && !/piutang|bank/i.test(a.namaAkun))?.id ?? cari(/\bkas\b|tunai|cash/i);

	if (metode === 'MERCHANT') return cari(/merchant|ojol|gojek|grab|marketplace|shopee|tokopedia/i) ?? cari(/e-?wallet|edc|qris/i) ?? bank() ?? kas();
	if (metode === 'QRIS') return cari(/qris|e-?wallet|edc/i) ?? bank() ?? kas();
	if (metode === 'BANK') return bank() ?? kas();
	return kas() ?? bank() ?? lancar.find((a) => !/piutang/i.test(a.namaAkun))?.id ?? null;
}

/**
 * Nominal rupiah dari kalimat: "15k", "120rb", "1,5jt", "Rp 25.000", "250000".
 * Mengambil angka terbesar (nilai transaksi biasanya angka terbesar dalam kalimat).
 * @param {string} teks
 * @returns {number}
 */
export function nominalDariTeks(teks) {
	let terbesar = 0;
	const pola = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(rb|ribu|k|jt|juta|miliar)?\b/gi;
	for (const m of String(teks || '').matchAll(pola)) {
		const mentah = m[1];
		const satuan = (m[2] || '').toLowerCase();
		let n;
		if (satuan) {
			n = parseFloat(mentah.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
			if (satuan === 'rb' || satuan === 'ribu' || satuan === 'k') n *= 1_000;
			else if (satuan === 'jt' || satuan === 'juta') n *= 1_000_000;
			else n *= 1_000_000_000;
		} else {
			n = Number(mentah.replace(/[.,](?=\d{3}\b)/g, ''));
			// angka kecil tanpa satuan biasanya jumlah barang, bukan uang
			if (n < 500) continue;
		}
		if (Number.isFinite(n) && n > terbesar && n <= 100_000_000_000) terbesar = Math.round(n);
	}
	return terbesar;
}

/** @param {string} teks */
function qtyDariTeks(teks) {
	const m = /\b(\d{1,4})\s*(x|pcs|buah|porsi|gelas|cup|botol|bungkus|pack|kg|item|biji)?\s+[a-z]/i.exec(String(teks || ''));
	const n = m ? Number(m[1]) : 1;
	return n >= 1 && n <= 9999 ? n : 1;
}

/**
 * Kategori dari kata kunci (cadangan bila model gagal).
 * @param {string} teks
 * @returns {'Masuk' | 'Keluar'}
 */
export function kategoriDariTeks(teks) {
	const t = String(teks || '');
	const keluar = KATA_KELUAR.test(t);
	const masuk = KATA_MASUK.test(t);
	if (masuk && !keluar) return 'Masuk';
	if (keluar && !masuk) return 'Keluar';
	// "bayar" dari pelanggan = masuk; selain itu pengeluaran lebih aman diminta dicek
	if (/\b(pelanggan|customer|pembeli|klien)\b.*\bbayar|\bbayar\b.*\b(dari)\b/i.test(t)) return 'Masuk';
	return keluar ? 'Keluar' : 'Masuk';
}

/**
 * Produk yang namanya disebut di kalimat (nama terpanjang yang cocok menang).
 * @param {{ id: string, nama: string }[]} daftar
 * @param {string} teks
 */
function produkDariTeks(daftar, teks) {
	const t = ` ${String(teks || '').toLowerCase().replace(/\s+/g, ' ')} `;
	let pilih = null;
	for (const p of daftar) {
		const nama = String(p.nama || '').toLowerCase().trim();
		if (nama.length >= 3 && t.includes(nama) && (!pilih || nama.length > pilih.nama.length)) pilih = p;
	}
	return pilih;
}

/**
 * Akun lawan default sesuai kategori.
 * @param {{ id: number, namaAkun: string, tipeAkun: string }[]} coa
 * @param {'Masuk' | 'Keluar'} kategori
 * @param {string} teks
 */
function akunLawanDefault(coa, kategori, teks) {
	if (kategori === 'Masuk') {
		const pend = coa.filter((a) => a.tipeAkun === 'PENDAPATAN');
		return (pend.find((a) => /penjualan/i.test(a.namaAkun)) || pend[0] || coa.find((a) => a.tipeAkun === 'PENDAPATAN_LAINNYA'))?.id ?? null;
	}
	const beban = coa.filter((a) => a.tipeAkun === 'BEBAN_OPERASIONAL');
	const t = String(teks || '').toLowerCase();
	/** @type {[RegExp, RegExp][]} */
	const peta = [
		[/listrik|air|pdam|pln/, /listrik|air/i],
		[/sewa|kontrak/, /sewa/i],
		[/gaji|upah|honor|bonus|thr/, /gaji|upah/i],
		[/iklan|promo|ads|marketing/, /pemasaran|iklan|promosi/i],
		[/bahan|belanja|kulakan|restock|stok|beli/, /bahan|persediaan|pembelian/i],
		[/internet|wifi|pulsa|kuota/, /internet|telepon|komunikasi/i],
		[/bensin|bbm|ongkir|ongkos|transport|parkir|ojek/, /transport|kirim|ongkir|bensin/i]
	];
	for (const [kata, akun] of peta) {
		if (kata.test(t)) {
			const ketemu = beban.find((a) => akun.test(a.namaAkun));
			if (ketemu) return ketemu.id;
		}
	}
	return (beban.find((a) => /lain/i.test(a.namaAkun)) || beban[0] || coa.find((a) => a.tipeAkun === 'BEBAN_LAINNYA'))?.id ?? null;
}

/**
 * @param {any} db
 * @param {number} unitId
 * @param {string} teksInput
 * @param {{ panggilAI?: typeof groqChatCompletion }} [opsi]
 * @returns {Promise<{ product_id: string | null, qty: number, kategori: 'Masuk' | 'Keluar', coa_id: number | null,
 *   kas_coa_id: number | null, nominal: number, catatan: string, metode: string, sumber: 'ai' | 'aturan' }>}
 */
export async function uraikanTransaksi(db, unitId, teksInput, opsi = {}) {
	const panggilAI = opsi.panggilAI || groqChatCompletion;
	const teks = String(teksInput || '').trim().slice(0, 500);

	const [produkList, coaList] = await Promise.all([
		db
			.select({ id: products.id, nama: products.nama, hargaJual: products.hargaJual, hargaBeli: products.hargaBeli })
			.from(products)
			.where(and(eq(products.unitId, unitId), isNull(products.deletedAt)))
			.orderBy(asc(products.nama))
			.limit(150),
		db
			.select({ id: chartOfAccounts.id, kodeAkun: chartOfAccounts.kodeAkun, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, deskripsi: chartOfAccounts.deskripsi })
			.from(chartOfAccounts)
			.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)))
			.orderBy(asc(chartOfAccounts.kodeAkun))
	]);

	const coaById = new Map(coaList.map((/** @type {any} */ c) => [Number(c.id), c]));
	const metode = metodeDariTeks(teks);

	/** @type {any} */
	let ai = null;
	try {
		const produkStr = produkList
			.map((/** @type {any} */ p) => `- id=${p.id} | ${p.nama} | harga_jual=${Number(p.hargaJual) || 0}`)
			.join('\n');
		const coaStr = coaList
			.filter((/** @type {any} */ c) => TIPE_MASUK.has(c.tipeAkun) || TIPE_KELUAR.has(c.tipeAkun))
			.map((/** @type {any} */ c) => `- id=${c.id} | ${c.kodeAkun} ${c.namaAkun} | ${c.tipeAkun}${c.deskripsi ? ` | ${c.deskripsi}` : ''}`)
			.join('\n');
		const sistem = `Kamu mengurai SATU kalimat transaksi UMKM Indonesia menjadi JSON.

PRODUK UNIT:
${produkStr || '(belum ada produk)'}

AKUN PENDAPATAN & BEBAN:
${coaStr || '(belum ada akun)'}

ATURAN:
- kategori "Masuk" untuk penjualan/pendapatan/uang diterima; "Keluar" untuk pembelian/biaya/uang dibayarkan.
- product_id: id produk dari daftar HANYA jika kalimat menjual produk itu; selain itu null.
- qty: jumlah barang (bilangan bulat, default 1).
- coa_id: id akun dari daftar yang paling sesuai (Masuk → PENDAPATAN/PENDAPATAN_LAINNYA; Keluar → BEBAN/HPP/ASET_TETAP). null bila tidak ada yang cocok.
- nominal: total rupiah sebagai angka (15k = 15000, 120rb = 120000, 1,5jt = 1500000). 0 bila tidak disebut.
- catatan: keterangan singkat Bahasa Indonesia, maksimal 60 karakter.
Balas HANYA JSON: {"kategori":"Masuk","product_id":null,"qty":1,"coa_id":null,"nominal":0,"catatan":""}`;

		const hasil = await panggilAI({
			model: 'openai/gpt-oss-20b',
			messages: [
				{ role: 'system', content: sistem },
				{ role: 'user', content: teks }
			],
			temperature: 0,
			max_tokens: 300,
			response_format: { type: 'json_object' }
		});
		ai = bacaJsonAI(hasil?.choices?.[0]?.message?.content);
		if (!ai || typeof ai !== 'object' || Array.isArray(ai)) {
			log.ai.warn({ isi: String(hasil?.choices?.[0]?.message?.content || '').slice(0, 200) }, '[AI Transaksi] keluaran model tidak bisa dibaca, pakai aturan');
			ai = null;
		}
	} catch (err) {
		log.ai.warn({ err: err instanceof Error ? err.message : String(err) }, '[AI Transaksi] AI gagal, pakai aturan');
		ai = null;
	}

	// ── Gabungkan keluaran model dengan aturan; semua id divalidasi terhadap data unit ──
	/** @type {'Masuk' | 'Keluar'} */
	let kategori = ai && /^keluar$/i.test(String(ai.kategori || '').trim())
		? 'Keluar'
		: ai && /^masuk$/i.test(String(ai.kategori || '').trim())
			? 'Masuk'
			: kategoriDariTeks(teks);

	let qty = Math.trunc(Number(ai?.qty));
	if (!(qty >= 1 && qty <= 9999)) qty = qtyDariTeks(teks);

	/** @type {any} */
	let produk = null;
	if (ai?.product_id != null && ai.product_id !== '') {
		produk = produkList.find((/** @type {any} */ p) => String(p.id) === String(ai.product_id)) || null;
	}
	if (!produk && kategori === 'Masuk') produk = produkDariTeks(produkList, teks);
	// Produk hanya dipakai untuk penjualan (catatTransaksi mengurangi stok pada transaksi MASUK)
	if (produk && kategori === 'Keluar') produk = null;

	let coaId = Number(ai?.coa_id);
	const akun = coaById.get(coaId);
	const tipeCocok = kategori === 'Masuk' ? TIPE_MASUK : TIPE_KELUAR;
	if (!akun || !tipeCocok.has(akun.tipeAkun)) coaId = /** @type {number} */ (akunLawanDefault(coaList, kategori, teks));

	let nominal = Number(ai?.nominal);
	if (!(nominal > 0)) nominal = nominalDariTeks(teks);
	if (produk) {
		// Kalimat tanpa angka rupiah ("jual 2 es teh") → total dari harga jual produk, bukan tebakan model
		if (Number(produk.hargaJual) > 0 && nominalDariTeks(teks) === 0) nominal = qty * Number(produk.hargaJual);
		const pendapatanPenjualan = coaList.find((/** @type {any} */ c) => c.tipeAkun === 'PENDAPATAN' && /penjualan/i.test(c.namaAkun));
		if (pendapatanPenjualan) coaId = pendapatanPenjualan.id;
	}

	let catatan = typeof ai?.catatan === 'string' && ai.catatan.trim() ? ai.catatan.trim() : '';
	if (produk) catatan = `Penjualan ${produk.nama} (${qty}x)`;
	if (!catatan) catatan = teks;

	return {
		product_id: produk ? String(produk.id) : null,
		qty,
		kategori,
		coa_id: coaId || null,
		kas_coa_id: pilihAkunKas(coaList, metode),
		nominal: Math.max(0, Math.round(nominal || 0)),
		catatan: catatan.slice(0, 120),
		metode: metode || 'TUNAI',
		sumber: ai ? 'ai' : 'aturan'
	};
}
