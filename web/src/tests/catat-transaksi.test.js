/**
 * Tes catat transaksi: web (form entry) dan mobile (POST /api/app/finance) memakai
 * logika yang SAMA (src/lib/server/catatTransaksi.js) → stok, jurnal double-entry,
 * transaksi, riwayat aksi.
 *
 * Semua tes memanggil kode asli terhadap MySQL sungguhan. Hanya jalan kalau
 * TEST_DATABASE_URL diset ke database KOSONG khusus tes yang tabelnya sudah dibuat
 * (npx drizzle-kit push dengan DATABASE_URL = db tes).
 *
 * Yang di-mock hanya layanan luar: login, Redis, Pusher/socket, Inngest.
 *
 * Jalankan:  TEST_DATABASE_URL=mysql://... npx vitest run src/tests/catat-transaksi.test.js
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));

vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));
vi.mock('$lib/server/groq', () => ({ groqChatCompletion: async () => null }));

describe.skipIf(!TEST_DB)('catatTransaksi — web & mobile sama', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let schema;
	/** @type {any} */ let lib;
	/** @type {any} */ let api;
	/** @type {any} */ let entry;
	/** @type {any} */ let eq;
	/** @type {any} */ let and;
	/** @type {Record<string, any>} */
	const ids = {};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		lib = await import('../lib/server/catatTransaksi.js');
		({ db } = await import('../lib/server/drizzle.js'));
		api = await import('../routes/api/app/finance/+server.js');
		entry = await import('../routes/(app)/finance/[slug]/entry/+page.server.js');
		({ eq, and } = await import('drizzle-orm'));

		const s = Date.now();
		const [u] = await db.insert(schema.users).values({ username: `catat${s}`, email: `catat${s}@contoh.id` });
		ids.user = u.insertId;
		const [u2] = await db.insert(schema.users).values({ username: `lain${s}`, email: `lain${s}@contoh.id` });
		ids.userLain = u2.insertId;

		// Unit A: punya COA standar + produk stok 5
		const [a] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'Unit A', slug: `unit-a-${s}`, modalAwal: '0' });
		ids.unitA = a.insertId;
		ids.slugA = `unit-a-${s}`;
		await db.transaction((/** @type {any} */ tx) => lib.pastikanCoaStandar(tx, ids.unitA));
		ids.produk = `PRD-A-${s}`;
		await db.insert(schema.products).values({ id: ids.produk, slug: `prd-a-${s}`, nama: 'Kopi', userId: ids.user, unitId: ids.unitA, hargaBeli: '6000', hargaJual: '10000', stok: 5 });

		// Unit B: milik user yang sama, BELUM punya COA (tes seed otomatis dari mobile)
		const [b] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'Unit B', slug: `unit-b-${s}`, modalAwal: '0' });
		ids.unitB = b.insertId;

		// Unit C: milik orang lain, punya COA + produk
		const [c] = await db.insert(schema.unitBisnis).values({ userId: ids.userLain, namaUnit: 'Unit C', slug: `unit-c-${s}`, modalAwal: '0' });
		ids.unitC = c.insertId;
		await db.transaction((/** @type {any} */ tx) => lib.pastikanCoaStandar(tx, ids.unitC));
		ids.produkC = `PRD-C-${s}`;
		await db.insert(schema.products).values({ id: ids.produkC, slug: `prd-c-${s}`, nama: 'Teh', userId: ids.userLain, unitId: ids.unitC, hargaBeli: '1000', hargaJual: '2000', stok: 9 });
	});

	afterAll(async () => {
		for (const unit of [ids.unitA, ids.unitB, ids.unitC]) {
			if (unit) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, unit));
		}
		for (const user of [ids.user, ids.userLain]) {
			if (user) await db.delete(schema.users).where(eq(schema.users.id, user));
		}
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {number} unitId @param {RegExp} nama */
	const akun = async (unitId, nama) => {
		const semua = await db.select().from(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.unitId, unitId));
		return semua.find((/** @type {any} */ a) => nama.test(a.namaAkun)).id;
	};
	const stok = async (/** @type {string} */ id) => (await db.query.products.findFirst({ where: eq(schema.products.id, id) })).stok;
	const baris = async (/** @type {number} */ journalId) =>
		db.select().from(schema.journalEntryLines).where(eq(schema.journalEntryLines.journalId, journalId));
	const jumlahTrx = async (/** @type {number} */ unitId) =>
		(await db.select().from(schema.transaksi).where(eq(schema.transaksi.unitId, unitId))).length;

	/** @param {any} body */
	const postMobile = (body) =>
		api.POST({
			request: new Request('http://x/api/app/finance', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
			cookies: { get: () => undefined }
		});

	// ─── Logika bersama ───────────────────────────────────────────────────
	it('penjualan produk: stok berkurang, HPP dari harga beli, jurnal 2 baris seimbang', async () => {
		const kas = await akun(ids.unitA, /^Kas Tunai/);
		const pendapatan = await akun(ids.unitA, /Pendapatan Penjualan/);
		const hasil = await db.transaction((/** @type {any} */ tx) =>
			lib.catatTransaksi(tx, { unitId: ids.unitA, userId: ids.user, kategori: 'MASUK', nominal: 20000, keterangan: 'JUAL KOPI', coaId: pendapatan, kasCoaId: kas, productId: ids.produk, qty: 2 })
		);
		expect(await stok(ids.produk)).toBe(3);
		expect(hasil.hppTotal).toBe(12000);

		const trx = await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, hasil.trxId) });
		expect(trx.metodeBayar).toBe(String(kas));
		expect(Number(trx.hppTotal)).toBe(12000);

		const jurnal = await db.query.journalEntries.findFirst({ where: eq(schema.journalEntries.id, hasil.journalId) });
		expect(jurnal.sourceType).toBe('TRX');
		expect(jurnal.sourceId).toBe(String(hasil.trxId));

		const lines = await baris(hasil.journalId);
		expect(lines).toHaveLength(2);
		const debit = lines.find((/** @type {any} */ l) => Number(l.debit) > 0);
		const kredit = lines.find((/** @type {any} */ l) => Number(l.kredit) > 0);
		expect(debit.coaId).toBe(kas);
		expect(kredit.coaId).toBe(pendapatan);
		expect(Number(debit.debit)).toBe(Number(kredit.kredit));
	});

	it('pengeluaran: debit beban, kredit kas, stok tidak berubah', async () => {
		const kas = await akun(ids.unitA, /^Kas Tunai/);
		const beban = await akun(ids.unitA, /Biaya Sewa/);
		const sebelum = await stok(ids.produk);
		const hasil = await db.transaction((/** @type {any} */ tx) =>
			lib.catatTransaksi(tx, { unitId: ids.unitA, userId: ids.user, kategori: 'KELUAR', nominal: 500000, keterangan: 'SEWA', coaId: beban, kasCoaId: kas, productId: ids.produk, qty: 1 })
		);
		expect(await stok(ids.produk)).toBe(sebelum);
		const lines = await baris(hasil.journalId);
		expect(lines.find((/** @type {any} */ l) => Number(l.debit) > 0).coaId).toBe(beban);
		expect(lines.find((/** @type {any} */ l) => Number(l.kredit) > 0).coaId).toBe(kas);
	});

	it('stok kurang → 409 dan TIDAK ada yang tersimpan (rollback)', async () => {
		const kas = await akun(ids.unitA, /^Kas Tunai/);
		const pendapatan = await akun(ids.unitA, /Pendapatan Penjualan/);
		const sebelum = { stok: await stok(ids.produk), trx: await jumlahTrx(ids.unitA) };
		const jalan = db.transaction((/** @type {any} */ tx) =>
			lib.catatTransaksi(tx, { unitId: ids.unitA, userId: ids.user, kategori: 'MASUK', nominal: 1000, keterangan: 'KEBANYAKAN', coaId: pendapatan, kasCoaId: kas, productId: ids.produk, qty: 99 })
		);
		await expect(jalan).rejects.toMatchObject({ name: 'TransaksiError', status: 409 });
		expect(await stok(ids.produk)).toBe(sebelum.stok);
		expect(await jumlahTrx(ids.unitA)).toBe(sebelum.trx);
	});

	it('menolak akun COA milik unit lain', async () => {
		const kasA = await akun(ids.unitA, /^Kas Tunai/);
		const pendapatanC = await akun(ids.unitC, /Pendapatan Penjualan/);
		const jalan = db.transaction((/** @type {any} */ tx) =>
			lib.catatTransaksi(tx, { unitId: ids.unitA, userId: ids.user, kategori: 'MASUK', nominal: 1000, keterangan: 'X', coaId: pendapatanC, kasCoaId: kasA })
		);
		await expect(jalan).rejects.toMatchObject({ status: 422 });
	});

	it('menolak produk milik unit lain (stok unit lain tidak tersentuh)', async () => {
		const kas = await akun(ids.unitA, /^Kas Tunai/);
		const pendapatan = await akun(ids.unitA, /Pendapatan Penjualan/);
		const jalan = db.transaction((/** @type {any} */ tx) =>
			lib.catatTransaksi(tx, { unitId: ids.unitA, userId: ids.user, kategori: 'MASUK', nominal: 1000, keterangan: 'X', coaId: pendapatan, kasCoaId: kas, productId: ids.produkC, qty: 1 })
		);
		await expect(jalan).rejects.toMatchObject({ status: 404 });
		expect(await stok(ids.produkC)).toBe(9);
	});

	// ─── Mobile: POST /api/app/finance ────────────────────────────────────
	it('mobile tanpa akun COA: unit kosong dapat COA standar, jurnal & stok tercatat', async () => {
		login.userId = ids.user;
		const res = await postMobile({ transaction: { unitId: ids.unitB, kategoriTrx: 'KELUAR', nominal: 75000, keterangan: 'Beli galon', metodeBayar: 'KAS' } });
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.data.journalId).toBeTruthy();

		const coa = await db.select().from(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.unitId, ids.unitB));
		expect(coa.length).toBe(lib.COA_STANDAR.length);
		const lines = await baris(body.data.journalId);
		const debit = coa.find((/** @type {any} */ a) => a.id === lines.find((/** @type {any} */ l) => Number(l.debit) > 0).coaId);
		const kredit = coa.find((/** @type {any} */ a) => a.id === lines.find((/** @type {any} */ l) => Number(l.kredit) > 0).coaId);
		expect(debit.namaAkun).toBe('Biaya Operasional Lainnya');
		expect(kredit.namaAkun).toBe('Kas Tunai');
	});

	it('mobile penjualan via QRIS: kas = akun bank, stok berkurang', async () => {
		login.userId = ids.user;
		const sebelum = await stok(ids.produk);
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'MASUK', nominal: 10000, keterangan: 'Jual kopi', metodeBayar: 'QRIS', productId: ids.produk, qty: 1 } });
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(await stok(ids.produk)).toBe(sebelum - 1);
		const trx = await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, body.data.id) });
		expect(trx.metodeBayar).toBe(String(await akun(ids.unitA, /^Bank/)));
	});

	it('mobile kirim akun pilihan (coaId + kasCoaId) → jurnal pakai akun itu', async () => {
		login.userId = ids.user;
		const beban = await akun(ids.unitA, /Listrik/);
		const bank = await akun(ids.unitA, /^Bank/);
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'KELUAR', nominal: 300000, keterangan: 'PLN', coaId: beban, kasCoaId: bank } });
		const body = await res.json();
		expect(res.status).toBe(200);
		const lines = await baris(body.data.journalId);
		expect(lines.find((/** @type {any} */ l) => Number(l.debit) > 0).coaId).toBe(beban);
		expect(lines.find((/** @type {any} */ l) => Number(l.kredit) > 0).coaId).toBe(bank);
	});

	it('app versi lama: metodeBayar "COA:<id>" dibaca sebagai akun kas', async () => {
		login.userId = ids.user;
		const bank = await akun(ids.unitA, /^Bank/);
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'Lama', metodeBayar: `COA:${bank}` } });
		const body = await res.json();
		expect(res.status).toBe(200);
		const trx = await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, body.data.id) });
		expect(trx.metodeBayar).toBe(String(bank));
	});

	it('mobile kirim akun milik unit lain → 422', async () => {
		login.userId = ids.user;
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'x', kasCoaId: await akun(ids.unitC, /^Kas Tunai/) } });
		expect(res.status).toBe(422);
	});

	it('mobile stok kurang → 409 dengan pesan jelas', async () => {
		login.userId = ids.user;
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'MASUK', nominal: 10000, keterangan: 'Borong', productId: ids.produk, qty: 500 } });
		expect(res.status).toBe(409);
		expect((await res.json()).message).toMatch(/tidak mencukupi/);
	});

	it('mobile ke unit milik orang lain → 404, tidak ada transaksi', async () => {
		login.userId = ids.user;
		const sebelum = await jumlahTrx(ids.unitC);
		const res = await postMobile({ transaction: { unitId: ids.unitC, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'Nyusup' } });
		expect(res.status).toBe(404);
		expect(await jumlahTrx(ids.unitC)).toBe(sebelum);
	});

	it('mobile tanpa login → 401', async () => {
		login.userId = null;
		const res = await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'x' } });
		expect(res.status).toBe(401);
	});

	// ─── Mobile: DELETE /api/app/finance ──────────────────────────────────
	/** @param {any} trxId @param {any} unitId */
	const deleteMobile = (trxId, unitId) =>
		api.DELETE({
			url: new URL(`http://x/api/app/finance?transactionId=${trxId}&unitId=${unitId}`),
			request: new Request('http://x', { method: 'DELETE' }),
			cookies: { get: () => undefined }
		});
	const jurnalAda = async (/** @type {number} */ id) =>
		Boolean(await db.query.journalEntries.findFirst({ where: eq(schema.journalEntries.id, id) }));

	it('mobile hapus penjualan: stok kembali, jurnal & barisnya terhapus', async () => {
		login.userId = ids.user;
		const awal = await stok(ids.produk);
		const buat = await (await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'MASUK', nominal: 20000, keterangan: 'Jual 2', productId: ids.produk, qty: 2 } })).json();
		expect(await stok(ids.produk)).toBe(awal - 2);

		const res = await deleteMobile(buat.data.id, ids.unitA);
		expect(res.status).toBe(200);
		expect(await stok(ids.produk)).toBe(awal);
		expect(await jurnalAda(buat.data.journalId)).toBe(false);
		expect(await baris(buat.data.journalId)).toHaveLength(0);
		expect(await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, buat.data.id) })).toBeUndefined();
	});

	it('mobile hapus pengeluaran: stok tidak berubah, jurnal terhapus', async () => {
		login.userId = ids.user;
		const awal = await stok(ids.produk);
		const buat = await (await postMobile({ transaction: { unitId: ids.unitA, kategoriTrx: 'KELUAR', nominal: 5000, keterangan: 'Plastik', productId: ids.produk, qty: 3 } })).json();
		const res = await deleteMobile(buat.data.id, ids.unitA);
		expect(res.status).toBe(200);
		expect(await stok(ids.produk)).toBe(awal);
		expect(await jurnalAda(buat.data.journalId)).toBe(false);
	});

	it('mobile tidak bisa hapus transaksi di unit milik orang lain', async () => {
		login.userId = ids.userLain;
		const buat = await (await postMobile({ transaction: { unitId: ids.unitC, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'Punya C' } })).json();
		login.userId = ids.user;
		const res = await deleteMobile(buat.data.id, ids.unitC);
		expect(res.status).toBe(404);
		expect(await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, buat.data.id) })).toBeTruthy();
	});

	it('mobile hapus ID yang tidak ada → 404; ID bukan angka → 400', async () => {
		login.userId = ids.user;
		expect((await deleteMobile(999999999, ids.unitA)).status).toBe(404);
		expect((await deleteMobile('abc', ids.unitA)).status).toBe(400);
	});

	// ─── Web: form entry tetap jalan ──────────────────────────────────────
	it('web form entry: tetap mencatat dengan jurnal & mengurangi stok', async () => {
		login.userId = ids.user;
		const sebelum = await stok(ids.produk);
		const fd = new FormData();
		fd.set('product_id', ids.produk);
		fd.set('qty', '1');
		fd.set('nominal', '10000');
		fd.set('keterangan', 'jual kopi web');
		fd.set('kategori_trx', 'MASUK');
		fd.set('coa_id', String(await akun(ids.unitA, /Pendapatan Penjualan/)));
		fd.set('kas_coa_id', String(await akun(ids.unitA, /^Kas Tunai/)));
		const hasil = await entry.actions.addTransaction({
			request: new Request('http://x', { method: 'POST', body: fd }),
			params: { slug: ids.slugA },
			cookies: { get: () => undefined }
		});
		expect(hasil.success).toBe(true);
		expect(await stok(ids.produk)).toBe(sebelum - 1);
		const trx = await db.query.transaksi.findFirst({
			where: and(eq(schema.transaksi.unitId, ids.unitA), eq(schema.transaksi.keterangan, 'JUAL KOPI WEB'))
		});
		const jurnal = await db.query.journalEntries.findFirst({
			where: and(eq(schema.journalEntries.sourceType, 'TRX'), eq(schema.journalEntries.sourceId, String(trx.id)))
		});
		expect(jurnal).toBeTruthy();
	});

	it('web form entry: stok kurang → pesan gagal, bukan crash', async () => {
		login.userId = ids.user;
		const fd = new FormData();
		fd.set('product_id', ids.produk);
		fd.set('qty', '999');
		fd.set('nominal', '10000');
		fd.set('keterangan', 'borong');
		fd.set('kategori_trx', 'MASUK');
		fd.set('coa_id', String(await akun(ids.unitA, /Pendapatan Penjualan/)));
		fd.set('kas_coa_id', String(await akun(ids.unitA, /^Kas Tunai/)));
		const hasil = await entry.actions.addTransaction({
			request: new Request('http://x', { method: 'POST', body: fd }),
			params: { slug: ids.slugA },
			cookies: { get: () => undefined }
		});
		expect(hasil.status).toBe(400);
		expect(hasil.data.message).toMatch(/tidak mencukupi/);
	});
});
