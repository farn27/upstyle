/** Foto ke AI: kompres, pembersihan keluaran model, pemetaan ke transaksi, cache foto. Model di-mock. */
import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';

vi.mock('$env/dynamic/private', () => ({ env: { ...process.env, GROQ_API_KEY: 'uji' } }));
const { angka, tanggalValid, normalkan, keTransaksi, susunBalasan, siapkanGambar, bacaFoto, bacaTeksOcr, kandidatVisi, VisiTidakTersedia } = await import('$lib/server/aiFoto');
const { GroqError } = await import('$lib/server/groq');
const { kosongkanCacheLokal, ambilCache } = await import('$lib/server/aiCache');
const SCOUT = ['meta-llama/llama-4-scout-17b-16e-instruct'];

const COA = [
	{ id: 1, kodeAkun: '1-1001', namaAkun: 'Kas Kasir', tipeAkun: 'ASET_LANCAR', deskripsi: 'Uang tunai' },
	{ id: 2, kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', deskripsi: 'Rekening transfer' },
	{ id: 3, kodeAkun: '1-1003', namaAkun: 'QRIS / E-Wallet', tipeAkun: 'ASET_LANCAR', deskripsi: 'Saldo QRIS' },
	{ id: 10, kodeAkun: '4-1001', namaAkun: 'Pendapatan Penjualan', tipeAkun: 'PENDAPATAN', deskripsi: '' },
	{ id: 20, kodeAkun: '5-1001', namaAkun: 'Pembelian Bahan Baku', tipeAkun: 'HPP', deskripsi: 'belanja bahan' },
	{ id: 21, kodeAkun: '6-1001', namaAkun: 'Beban Listrik & Air', tipeAkun: 'BEBAN_OPERASIONAL', deskripsi: '' },
	{ id: 22, kodeAkun: '6-1009', namaAkun: 'Beban Lain-lain', tipeAkun: 'BEBAN_LAINNYA', deskripsi: '' }
];

describe('pembersihan', () => {
	it('angka rupiah dari berbagai format', () => {
		expect(angka('Rp 45.500')).toBe(45500);
		expect(angka('1,250,000')).toBe(1250000);
		expect(angka(12000)).toBe(12000);
		expect(angka('2,5')).toBe(3);
		expect(angka(null)).toBe(0);
	});
	it('tanggal nota hanya dipakai bila masuk akal', () => {
		expect(tanggalValid('2026-11-10', '2026-11-13')).toBe('2026-11-10');
		expect(tanggalValid('2027-01-01', '2026-11-13')).toBe('2026-11-13'); // masa depan
		expect(tanggalValid('2025-01-01', '2026-11-13')).toBe('2026-11-13'); // > 90 hari
		expect(tanggalValid('13/11/2026', '2026-11-13')).toBe('2026-11-13');
	});
	it('normalkan keluaran model yang berantakan', () => {
		const h = normalkan({ jenis: 'nota_belanja', toko: ' TB Makmur ', total: 'Rp 87.000', items: [{ nama: 'Gula 1kg', qty: '2', harga: '15.000' }, { nama: '', harga: 5000 }], terbaca: 150, jenis2: 'x' });
		expect(h).toMatchObject({ jenis: 'nota_belanja', toko: 'TB Makmur', total: 87000, terbaca: 100 });
		expect(h.items).toEqual([{ nama: 'Gula 1kg', qty: 2, harga: 15000, subtotal: 30000 }]);
		expect(normalkan({ jenis: 'aneh' }).jenis).toBe('lainnya');
	});
});

describe('pemetaan ke transaksi', () => {
	it('nota belanja via transfer → pengeluaran, akun bank, keterangan berisi toko & item', () => {
		const h = normalkan({ jenis: 'nota_belanja', toko: 'Toko Sumber Rejeki', metode: 'transfer', tanggal: '2026-11-11', total: 87000, items: [{ nama: 'Gula', qty: 2, harga: 15000 }, { nama: 'Kopi bubuk', qty: 1, harga: 57000 }] });
		const [k] = keTransaksi(h, COA, '2026-11-13');
		expect(k).toMatchObject({ kategori: 'Keluar', nominal: 87000, tanggal: '2026-11-11', metode: 'Transfer', kas_coa_id: 2 });
		expect(k.keterangan).toContain('Toko Sumber Rejeki');
		expect(k.keterangan).toContain('Gula');
		expect([20, 21, 22]).toContain(k.coa_id);
	});
	it('struk penjualan → pemasukan; bukti transfer masuk → pemasukan', () => {
		expect(keTransaksi(normalkan({ jenis: 'struk_penjualan', total: 45000 }), COA, '2026-11-13')[0]).toMatchObject({ kategori: 'Masuk', coa_id: 10 });
		expect(keTransaksi(normalkan({ jenis: 'bukti_transfer', arah: 'masuk', metode: 'transfer', total: 250000 }), COA, '2026-11-13')[0]).toMatchObject({ kategori: 'Masuk', kas_coa_id: 2 });
	});
	it('catatan kas tulisan tangan → banyak transaksi', () => {
		const h = normalkan({ jenis: 'catatan_kas', transaksi: [{ kategori: 'Masuk', nominal: '350.000', keterangan: 'jualan pagi' }, { kategori: 'keluar', nominal: 50000, keterangan: 'beli es batu' }, { kategori: 'Keluar', nominal: 0 }] });
		const k = keTransaksi(h, COA, '2026-11-13');
		expect(k.map((x) => [x.kategori, x.nominal])).toEqual([['Masuk', 350000], ['Keluar', 50000]]);
	});
	it('daftar harga tidak menjadi transaksi; balasan memberi peringatan total tidak cocok', () => {
		expect(keTransaksi(normalkan({ jenis: 'daftar_harga', items: [{ nama: 'Kopi', harga: 15000 }] }), COA, '2026-11-13')).toEqual([]);
		const h = normalkan({ jenis: 'nota_belanja', total: 100000, items: [{ nama: 'A', qty: 1, harga: 50000 }], terbaca: 40 });
		const b = susunBalasan(h, keTransaksi(h, COA, '2026-11-13'));
		expect(b).toContain('Cek ulang total');
		expect(b).toContain('Foto kurang jelas');
		expect(b).toContain('| A | 1 |');
	});
});

describe('gambar & cache', () => {
	it('gambar besar dikecilkan ke ≤1280 px JPEG; file bukan gambar ditolak', async () => {
		const besar = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#ffffff' } }).png().toBuffer();
		const kecil = await siapkanGambar(besar);
		const meta = await sharp(kecil).metadata();
		expect(meta.format).toBe('jpeg');
		expect(Math.max(meta.width || 0, meta.height || 0)).toBe(1280);
		await expect(siapkanGambar(Buffer.from('bukan gambar'))).rejects.toThrow(/bukan gambar/);
	});
	it('foto yang sama dibaca dari cache (model hanya dipanggil sekali)', async () => {
		const gambar = await siapkanGambar(await sharp({ create: { width: 400, height: 300, channels: 3, background: '#f0f0f0' } }).png().toBuffer());
		const panggil = vi.fn(async () => ({ choices: [{ message: { content: '{"jenis":"nota_belanja","total":"12.000","items":[]}' } }], usage: { prompt_tokens: 900 } }));
		const a = await bacaFoto(gambar, { panggil: /** @type {any} */ (panggil), kandidat: SCOUT });
		const b = await bacaFoto(gambar, { panggil: /** @type {any} */ (panggil), kandidat: SCOUT });
		expect(a).toMatchObject({ dariCache: false, hasil: { total: 12000 } });
		expect(b.dariCache).toBe(true);
		expect(panggil).toHaveBeenCalledTimes(1);
		// pesan berisi gambar base64 dan model visi
		const arg = /** @type {any} */ (panggil.mock.calls[0])[0];
		expect(arg.model).toMatch(/scout|vision|llama-4/);
		expect(arg.messages[1].content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
	});
	it('keluaran model bukan JSON → pesan ramah', async () => {
		const gambar = await siapkanGambar(await sharp({ create: { width: 50, height: 50, channels: 3, background: '#000' } }).png().toBuffer());
		const panggil = vi.fn(async () => ({ choices: [{ message: { content: 'maaf saya tidak bisa' } }] }));
		await expect(bacaFoto(gambar, { panggil: /** @type {any} */ (panggil), kandidat: SCOUT })).rejects.toThrow(/Foto tidak bisa dibaca/);
	});
});

describe('pemilihan model visi & cadangan OCR', () => {
	const gambarUji = async (/** @type {string} */ warna) => siapkanGambar(await sharp({ create: { width: 60, height: 40, channels: 3, background: warna } }).png().toBuffer());

	it('kandidat diambil dari daftar model aktif yang namanya cocok pola visi', async () => {
		kosongkanCacheLokal();
		const k = await kandidatVisi(async () => ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'meta-llama/llama-4-scout-17b-16e-instruct', 'whisper-large-v3']);
		expect(k).toEqual(['meta-llama/llama-4-scout-17b-16e-instruct']);
		expect(await kandidatVisi(async () => ['openai/gpt-oss-20b', 'llama-3.1-8b-instant'])).toEqual([]);
	});

	it('model 404 dilewati, model berikutnya dipakai dan diingat', async () => {
		kosongkanCacheLokal();
		const panggil = vi.fn(async (/** @type {any} */ arg) => {
			if (arg.model === 'mati') throw new GroqError('model_not_found', 404);
			return { choices: [{ message: { content: '{"jenis":"nota_belanja","total":5000,"items":[]}' } }] };
		});
		const r = await bacaFoto(await gambarUji('#123456'), { panggil: /** @type {any} */ (panggil), kandidat: ['mati', 'hidup'] });
		expect(r.hasil.total).toBe(5000);
		expect(r.sumber).toBe('visi');
		expect(panggil).toHaveBeenCalledTimes(2);
		expect(await ambilCache('ai:visi:model')).toBe('hidup');
		// kandidat berikutnya: model yang diingat dicoba lebih dulu
		expect((await kandidatVisi(async () => ['x-vision']))[0]).toBe('hidup');
	});

	it('tidak ada model visi → VisiTidakTersedia (klien lanjut OCR), galat lain diteruskan', async () => {
		kosongkanCacheLokal();
		const gagal404 = vi.fn(async () => { throw new GroqError('model_not_found', 404); });
		await expect(bacaFoto(await gambarUji('#222222'), { panggil: /** @type {any} */ (gagal404), kandidat: SCOUT })).rejects.toBeInstanceOf(VisiTidakTersedia);
		expect(await ambilCache('ai:visi:model')).toBe('-');
		expect(await kandidatVisi(async () => SCOUT)).toEqual([]);
		await expect(bacaFoto(await gambarUji('#333333'), { kandidat: [] })).rejects.toBeInstanceOf(VisiTidakTersedia);
		const sibuk = vi.fn(async () => { throw new GroqError('rate limit', 429); });
		await expect(bacaFoto(await gambarUji('#444444'), { panggil: /** @type {any} */ (sibuk), kandidat: SCOUT })).rejects.toThrow(/rate limit/);
	});

	it('teks OCR dirapikan model teks kecil (JSON), hasil di-cache', async () => {
		kosongkanCacheLokal();
		const panggil = vi.fn(async () => ({ choices: [{ message: { content: '{"jenis":"nota_belanja","toko":"TB Maju","total":"45.500","items":[{"nama":"Semen","qty":1,"harga":45500,"subtotal":45500}]}' } }] }));
		const teks = 'TB MAJU\nSemen 1 x 45.5OO\nTOTAL 45.5OO';
		const a = await bacaTeksOcr(teks, { panggil: /** @type {any} */ (panggil) });
		const b = await bacaTeksOcr(teks, { panggil: /** @type {any} */ (panggil) });
		expect(a).toMatchObject({ sumber: 'ocr', dariCache: false, hasil: { toko: 'TB Maju', total: 45500 } });
		expect(b.dariCache).toBe(true);
		expect(panggil).toHaveBeenCalledTimes(1);
		const arg = /** @type {any} */ (panggil.mock.calls[0])[0];
		expect(arg.model).toBe('openai/gpt-oss-20b');
		expect(arg.messages[1].content).toContain('TEKS OCR');
		await expect(bacaTeksOcr('  ', { panggil: /** @type {any} */ (panggil) })).rejects.toThrow(/tidak terbaca/);
	});
});
