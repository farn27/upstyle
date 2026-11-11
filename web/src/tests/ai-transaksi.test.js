/**
 * Perbaikan temuan uji AI:
 *  A-1 keluaran model kosong/JSON rusak tidak lagi membuat HTTP 500,
 *  A-2 akun kas pembayaran nonkas, A-3 pertanyaan berkata "transaksi" dijawab (bukan dicatat),
 *  A-4 model cadangan saat batas pemakaian (429).
 * Tanpa jaringan: pemanggilan model di-mock.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ...process.env, GROQ_API_KEY: 'uji', GROQ_MODEL: '' } }));

const { uraikanTransaksi, metodeDariTeks, pilihAkunKas, nominalDariTeks, kategoriDariTeks } = await import('$lib/server/aiTransaksi');
const { groqChatCompletion, bacaJsonAI, GroqError } = await import('$lib/server/groq');
const { detectIntent, parseTransactionNL, kalimatTanya } = await import('$lib/server/chatIntent');

// Bagan akun mirip template kafe (defaultCoa.js)
const COA = [
	{ id: 1, kodeAkun: '1-1001', namaAkun: 'Kas Kasir Cafe', tipeAkun: 'ASET_LANCAR', deskripsi: 'Uang kembalian di kasir' },
	{ id: 2, kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', deskripsi: 'Rekening penerimaan' },
	{ id: 3, kodeAkun: '1-1100', namaAkun: 'Piutang Merchant (Gojek/Grab)', tipeAkun: 'ASET_LANCAR', deskripsi: 'Dana di ojol' },
	{ id: 4, kodeAkun: '1-1201', namaAkun: 'Persediaan Biji Kopi & Susu', tipeAkun: 'ASET_LANCAR', deskripsi: 'Stok bar' },
	{ id: 10, kodeAkun: '4-1001', namaAkun: 'Pendapatan Penjualan Minuman', tipeAkun: 'PENDAPATAN', deskripsi: null },
	{ id: 20, kodeAkun: '6-1001', namaAkun: 'Beban Gaji', tipeAkun: 'BEBAN_OPERASIONAL', deskripsi: null },
	{ id: 21, kodeAkun: '6-1003', namaAkun: 'Beban Listrik & Air', tipeAkun: 'BEBAN_OPERASIONAL', deskripsi: null },
	{ id: 22, kodeAkun: '6-1009', namaAkun: 'Beban Operasional Lain', tipeAkun: 'BEBAN_OPERASIONAL', deskripsi: null }
];
const PRODUK = [
	{ id: 'p-lemon', nama: 'Es Teh Lemon', hargaJual: '8000', hargaBeli: '3000' },
	{ id: 'p-leci', nama: 'Es Teh Leci', hargaJual: '9000', hargaBeli: '3500' }
];

/** db palsu: select().from(tabel).where().orderBy() [.limit()] */
function dbPalsu() {
	return {
		select: (/** @type {any} */ kolom) => ({
			from: () => {
				const data = 'hargaJual' in kolom ? PRODUK : COA;
				const hasil = { where: () => hasil, orderBy: () => Object.assign(Promise.resolve(data), { limit: async () => data }) };
				return hasil;
			}
		})
	};
}

const jawab = (/** @type {any} */ isi) => async () => ({ choices: [{ message: { content: typeof isi === 'string' ? isi : JSON.stringify(isi) } }] });

describe('aturan metode bayar & nominal', () => {
	it('metode bayar dari kata kunci', () => {
		expect(metodeDariTeks('jual 2 es teh bayar qris')).toBe('QRIS');
		expect(metodeDariTeks('terima transfer bca 50rb')).toBe('BANK');
		expect(metodeDariTeks('pesanan gofood 45rb')).toBe('MERCHANT');
		expect(metodeDariTeks('jual es teh 8rb')).toBe(null);
	});
	it('akun kas nonkas tidak jatuh ke kas kasir (A-2)', () => {
		expect(pilihAkunKas(COA, 'QRIS')).toBe(2); // tidak ada akun QRIS → bank
		expect(pilihAkunKas(COA, 'BANK')).toBe(2);
		expect(pilihAkunKas(COA, 'MERCHANT')).toBe(3);
		expect(pilihAkunKas(COA, null)).toBe(1);
		expect(pilihAkunKas(COA, 'TUNAI')).toBe(1);
	});
	it('nominal & kategori dari kalimat', () => {
		expect(nominalDariTeks('bayar es batu 15k')).toBe(15000);
		expect(nominalDariTeks('bayar listrik 120rb')).toBe(120000);
		expect(nominalDariTeks('sewa 1,5jt')).toBe(1500000);
		expect(nominalDariTeks('terima Rp 25.000 dari pelanggan')).toBe(25000);
		expect(nominalDariTeks('jual 2 es teh')).toBe(0);
		expect(kategoriDariTeks('bayar listrik 120rb')).toBe('Keluar');
		expect(kategoriDariTeks('jual 2 es teh lemon')).toBe('Masuk');
	});
});

describe('uraikanTransaksi', () => {
	it('memakai keluaran model yang valid; akun kas mengikuti metode bayar', async () => {
		const h = await uraikanTransaksi(dbPalsu(), 1, 'jual 2 es teh lemon bayar qris', {
			panggilAI: jawab({ kategori: 'Masuk', product_id: 'p-lemon', qty: 2, coa_id: 10, nominal: 16000, catatan: 'jual es teh' })
		});
		expect(h).toMatchObject({ kategori: 'Masuk', product_id: 'p-lemon', qty: 2, coa_id: 10, kas_coa_id: 2, nominal: 16000, sumber: 'ai' });
	});

	it('A-1: keluaran kosong / bukan JSON → tetap terisi dari aturan, tidak melempar galat', async () => {
		for (const isi of ['', 'maaf saya tidak paham', '{"kategori": ']) {
			const h = await uraikanTransaksi(dbPalsu(), 1, 'bayar listrik 120rb', { panggilAI: jawab(isi) });
			expect(h).toMatchObject({ kategori: 'Keluar', coa_id: 21, kas_coa_id: 1, nominal: 120000, sumber: 'aturan', product_id: null });
		}
	});

	it('A-4: penyedia AI menolak (429) → hasil berbasis aturan', async () => {
		const h = await uraikanTransaksi(dbPalsu(), 1, 'pesanan gofood es teh leci 2 gelas', {
			panggilAI: async () => { throw new GroqError('429', 429); }
		});
		expect(h).toMatchObject({ kategori: 'Masuk', product_id: 'p-leci', nominal: 18000, kas_coa_id: 3, coa_id: 10, sumber: 'aturan' });
	});

	it('id akun/produk karangan model diabaikan; akun lawan disesuaikan kategori', async () => {
		const h = await uraikanTransaksi(dbPalsu(), 1, 'bayar gaji karyawan 1jt via transfer', {
			panggilAI: jawab({ kategori: 'Keluar', product_id: 'p-tidak-ada', coa_id: 10, nominal: '1jt' })
		});
		expect(h).toMatchObject({ kategori: 'Keluar', product_id: null, coa_id: 20, kas_coa_id: 2, nominal: 1000000 });
	});
});

describe('groqChatCompletion — model cadangan & keluaran kosong', () => {
	const respons = (/** @type {number} */ status, /** @type {any} */ body) =>
		new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	it('429 pada model utama → model berikutnya dipakai', async () => {
		/** @type {string[]} */
		const dipanggil = [];
		const fetchFn = /** @type {any} */ (async (/** @type {string} */ _u, /** @type {any} */ o) => {
			const m = JSON.parse(o.body).model;
			dipanggil.push(m);
			if (m === 'openai/gpt-oss-20b') return respons(429, { error: { message: 'rate limit' } });
			return respons(200, { choices: [{ message: { content: 'ok' } }] });
		});
		const r = await groqChatCompletion({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: 'x' }], fetchFn });
		expect(r.choices[0].message.content).toBe('ok');
		expect(dipanggil).toEqual(['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
	});

	it('jawaban kosong → diulang dengan batas token lebih besar', async () => {
		/** @type {number[]} */
		const batas = [];
		const fetchFn = /** @type {any} */ (async (/** @type {string} */ _u, /** @type {any} */ o) => {
			const b = JSON.parse(o.body);
			batas.push(b.max_tokens);
			return respons(200, { choices: [{ message: { content: batas.length === 1 ? '' : '{"a":1}' } }] });
		});
		const r = await groqChatCompletion({ messages: [{ role: 'user', content: 'x' }], max_tokens: 300, fetchFn });
		expect(r.choices[0].message.content).toBe('{"a":1}');
		expect(batas[1]).toBeGreaterThan(batas[0]);
	});

	it('kunci API salah → berhenti, tidak mencoba semua model', async () => {
		let n = 0;
		const fetchFn = /** @type {any} */ (async () => { n++; return respons(401, { error: 'invalid key' }); });
		await expect(groqChatCompletion({ messages: [{ role: 'user', content: 'x' }], fetchFn })).rejects.toMatchObject({ status: 401 });
		expect(n).toBe(1);
	});

	it('bacaJsonAI toleran terhadap pagar kode & teks pembuka', () => {
		expect(bacaJsonAI('```json\n{"a":1}\n```')).toEqual({ a: 1 });
		expect(bacaJsonAI('Berikut hasilnya: {"a":2} semoga membantu')).toEqual({ a: 2 });
		expect(bacaJsonAI('')).toBe(null);
	});
});

describe('A-3: pertanyaan berkata "transaksi" tidak masuk jalur pencatatan', () => {
	it.each([
		'ada berapa transaksi bulan lalu?',
		'transaksi terakhir yang tercatat apa?',
		'berapa omzet hari ini',
		'cek transaksi kemarin'
	])('%s', (q) => {
		expect(kalimatTanya(q)).toBe(true);
		expect(detectIntent(q)).not.toBe('transaction_input');
		expect(parseTransactionNL(q)).toBe(null);
	});

	it('perintah mencatat tetap dikenali', () => {
		expect(parseTransactionNL('bayar listrik 120rb')?.[0]).toMatchObject({ kategori: 'Keluar', nominal: 120000 });
	});
});
