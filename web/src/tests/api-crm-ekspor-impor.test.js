/**
 * Tes #13: aktivitas CRM, export (link unduhan bertanda tangan) & import data. Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as XLSX from 'xlsx';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
const fakeRedis = vi.hoisted(() => {
	const lists = new Map();
	return {
		lpush: async (/** @type {string} */ k, /** @type {any} */ v) => { lists.set(k, [v, ...(lists.get(k) || [])]); return 1; },
		ltrim: async () => 'OK', expire: async () => 1,
		lrange: async (/** @type {string} */ k) => lists.get(k) || [],
		del: async () => 1, keys: async () => []
	};
});
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: fakeRedis }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));

describe.skipIf(!TEST_DB)('CRM aktivitas, export & import', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const cookies = { get: () => undefined };

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.akt = await import('../routes/api/app/crm/activities/+server.js');
		r.exp = await import('../routes/api/app/export/+server.js');
		r.dl = await import('../routes/api/app/export/download/+server.js');
		r.hist = await import('../routes/api/app/export/history/+server.js');
		r.imp = await import('../routes/api/app/import/+server.js');
		r.val = await import('../routes/api/app/import/validate/+server.js');
		r.webExportTrx = await import('../routes/api/export/transaksi/+server.js');
		r.webLaporan = await import('../routes/(app)/finance/[slug]/export/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ca${t}`, email: `ca${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `cb${t}`, email: `cb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko CRM', slug: `ca-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `cb-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId; id.slugLain = `cb-${t}`;
		const [c] = await db.insert(s.crmContacts).values({ ownerId: id.user, unitId: id.unit, nama: 'Bu Sari', telepon: '0812' });
		const [c2] = await db.insert(s.crmContacts).values({ ownerId: id.userLain, unitId: id.unitLain, nama: 'Kontak orang' });
		id.kontak = c.insertId; id.kontakLain = c2.insertId;
		await db.insert(s.transaksi).values({ unitId: id.unit, userId: id.user, kategoriTrx: 'MASUK', nominal: '50000', totalHarga: '50000', keterangan: 'JUAL', tanggal: '2026-11-03 10:00:00' });
		// kategori bernama sama milik unit lain — import tidak boleh memakainya
		const [k] = await db.insert(s.kategoriProduk).values({ unitId: id.unitLain, namaKategori: 'Minuman' });
		id.katLain = k.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
	/** @param {any[][]} aoa */
	const keBase64 = (aoa) => {
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'S');
		return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })).toString('base64');
	};

	it('aktivitas: catat (format app { activity }), daftar dengan kontak; kontak unit lain ditolak', async () => {
		login.userId = id.user;
		const res = await r.akt.POST({ cookies, request: req('POST', { action: 'create-activity', activity: { unitId: id.unit, kontakId: id.kontak, tipe: 'WA', catatan: 'Follow up' } }) });
		expect(res.status).toBe(200);
		const list = await (await r.akt.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).json();
		expect(list.data[0]).toMatchObject({ tipe: 'WA', catatan: 'Follow up', contact: { nama: 'Bu Sari' } });
		expect((await r.akt.POST({ cookies, request: req('POST', { unitId: id.unit, kontakId: id.kontakLain, tipe: 'Call' }) })).status).toBe(404);
		expect((await r.akt.POST({ cookies, request: req('POST', { unitId: id.unit, kontakId: id.kontak, tipe: 'Telegram' }) })).status).toBe(422);
	});

	it('export: link unduhan jalan tanpa login, isi CSV benar, riwayat tercatat', async () => {
		login.userId = id.user;
		const res = await r.exp.POST({ cookies, url: new URL('https://bizgrow.test/api/app/export'), request: req('POST', { unitId: id.unit, dataType: 'customers', format: 'csv' }) });
		const body = await res.json();
		expect(res.status).toBe(200);
		expect(body.data).toMatchObject({ format: 'CSV', recordCount: 1 });
		expect(body.data.downloadUrl).toMatch(/^https:\/\/bizgrow\.test\/api\/app\/export\/download\?token=/);

		login.userId = null; // browser HP tanpa sesi
		const dl = await r.dl.GET({ url: new URL(body.data.downloadUrl) });
		expect(dl.status).toBe(200);
		expect(dl.headers.get('content-disposition')).toContain('.csv');
		expect(await dl.text()).toContain('Bu Sari');

		login.userId = id.user;
		const hist = await (await r.hist.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: req('GET') })).json();
		expect(hist.data[0]).toMatchObject({ dataType: 'customers', format: 'CSV', recordCount: 1 });
	});

	it('export: token palsu / diubah ditolak; PDF hanya keuangan', async () => {
		login.userId = id.user;
		expect((await r.dl.GET({ url: new URL('http://x?token=palsu') })).status).toBe(410);
		expect((await r.exp.POST({ cookies, url: new URL('http://x'), request: req('POST', { unitId: id.unit, dataType: 'products', format: 'pdf' }) })).status).toBe(422);
		const keu = await r.exp.POST({ cookies, url: new URL('http://x'), request: req('POST', { unitId: id.unit, dataType: 'finance', format: 'excel', startDate: '2026-11-01', endDate: '2026-11-30' }) });
		expect((await keu.json()).data.recordCount).toBe(1);
	});

	it('import produk: cek file dulu, lalu impor; kategori dibuat di unit sendiri (bukan pakai milik unit lain)', async () => {
		login.userId = id.user;
		const file = keBase64([['nama', 'harga_jual', 'stok', 'kategori'], ['Es Teh', 5000, 20, 'Minuman'], ['', 1000, 1, '']]);
		const cek = await (await r.val.POST({ cookies, request: req('POST', { unitId: id.unit, dataType: 'products', fileBase64: file, fileName: 'p.xlsx' }) })).json();
		expect(cek.data).toMatchObject({ isValid: false, totalRows: 2 });
		expect(cek.data.errors[0]).toContain('Baris 3');

		const imp = await (await r.imp.POST({ cookies, request: req('POST', { unitId: id.unit, dataType: 'products', fileBase64: file, fileName: 'p.xlsx' }) })).json();
		expect(imp.data).toMatchObject({ totalRows: 2, successRows: 1, failedRows: 1 });
		const p = await db.query.products.findFirst({ where: eq(s.products.unitId, id.unit) });
		expect(p).toMatchObject({ nama: 'Es Teh', stok: 20 });
		expect(p.kategoriId).not.toBe(id.katLain);
		const kat = await db.query.kategoriProduk.findFirst({ where: eq(s.kategoriProduk.id, p.kategoriId) });
		expect(kat.unitId).toBe(id.unit);
	});

	it('import pelanggan → kontak CRM', async () => {
		login.userId = id.user;
		const file = keBase64([['Nama', 'Phone', 'Email'], ['Pak Budi', '0899', 'budi@contoh.id']]);
		const imp = await (await r.imp.POST({ cookies, request: req('POST', { unitId: id.unit, dataType: 'customers', fileBase64: file }) })).json();
		expect(imp.data.successRows).toBe(1);
		const ada = await db.select().from(s.crmContacts).where(eq(s.crmContacts.unitId, id.unit));
		expect(ada.map((/** @type {any} */ c) => c.nama)).toContain('Pak Budi');
	});

	it('web: export transaksi tidak lagi crash; laporan unit orang lain tidak bisa dipicu', async () => {
		login.userId = id.user;
		const res = await r.webExportTrx.GET({ url: new URL(`http://x?unitId=${id.unit}&format=excel`), cookies, request: req('GET') });
		expect(res.status).toBe(200);
		const lap = await r.webLaporan.GET({ params: { slug: id.slugLain }, cookies, request: req('GET') });
		expect(lap.status).toBe(404);
		login.userId = null;
		expect((await r.webLaporan.GET({ params: { slug: id.slugLain }, cookies, request: req('GET') })).status).toBe(401);
	});
});
