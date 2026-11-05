/**
 * Tes master data (#9): aset tetap, pajak, budget, COA standar — API mobile & form web
 * memakai logika yang sama ($lib/server/masterData.js). Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$env/static/private', () => ({ GROQ_API_KEY: 'tes' }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));
vi.mock('$lib/server/groq', () => ({ groqChatCompletion: async () => null }));

describe.skipIf(!TEST_DB)('Master data', () => {
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
		r.aset = await import('../routes/api/app/finance/fixed-assets/+server.js');
		r.pajak = await import('../routes/api/app/finance/tax-rates/+server.js');
		r.budget = await import('../routes/api/app/finance/budget/+server.js');
		r.coa = await import('../routes/api/app/finance/coa/+server.js');
		r.webAset = await import('../routes/(app)/finance/[slug]/master-data/aset/+page.server.js');
		r.webPajak = await import('../routes/(app)/finance/[slug]/master-data/pajak/+page.server.js');
		r.webCoa = await import('../routes/(app)/finance/[slug]/master-data/coa/+page.server.js');

		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ma${t}`, email: `ma${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `mb${t}`, email: `mb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'A', slug: `ma-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'B', slug: `mb-${t}`, modalAwal: '0' });
		const [u3] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Kosong', slug: `mk-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId; id.unitKosong = u3.insertId; id.slug = `ma-${t}`; id.slugKosong = `mk-${t}`;
		const [x] = await db.insert(s.fixedAssets).values({ unitId: id.unit, namaAset: 'Laptop', nilaiPerolehan: '10000000', tanggalPerolehan: '2026-01-01', umurEkonomis: 4 });
		const [y] = await db.insert(s.fixedAssets).values({ unitId: id.unitLain, namaAset: 'Mobil orang', nilaiPerolehan: '1', tanggalPerolehan: '2026-01-01', umurEkonomis: 1 });
		id.aset = x.insertId; id.asetLain = y.insertId;
		const [p] = await db.insert(s.taxRates).values({ unitId: id.unit, namaPajak: 'PPN 11%', persentase: '11', tipe: 'PPN' });
		const [p2] = await db.insert(s.taxRates).values({ unitId: id.unitLain, namaPajak: 'PPN orang', persentase: '11', tipe: 'PPN' });
		id.pajak = p.insertId; id.pajakLain = p2.insertId;
		const [k] = await db.insert(s.chartOfAccounts).values({ unitId: id.unit, kodeAkun: '6-1', namaAkun: 'Beban Sewa', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT' });
		const [bg] = await db.insert(s.budgetItems).values({ unitId: id.unit, coaId: k.insertId, tahun: 2026, bulan: 1, nominal: '500000' });
		id.budget = bg.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain, id.unitKosong]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
	/** @param {Record<string, string>} isi */
	const form = (isi) => { const fd = new FormData(); for (const [k, v] of Object.entries(isi)) fd.set(k, v); return new Request('http://x', { method: 'POST', body: fd }); };

	it('API: ubah aset (parsial) & hapus aset sendiri', async () => {
		login.userId = id.user;
		const res = await r.aset.PUT({ cookies, request: req('PUT', { id: id.aset, unitId: id.unit, namaAset: 'Laptop Kantor', status: 'DIJUAL' }) });
		expect(res.status).toBe(200);
		const a = await db.query.fixedAssets.findFirst({ where: eq(s.fixedAssets.id, id.aset) });
		expect(a).toMatchObject({ namaAset: 'Laptop Kantor', status: 'DIJUAL', umurEkonomis: 4 });
		expect((await r.aset.PUT({ cookies, request: req('PUT', { id: id.aset, unitId: id.unit, kategori: 'PESAWAT' }) })).status).toBe(422);
	});

	it('API: aset/pajak unit lain → 404 walau unitId diakali ke unit sendiri', async () => {
		login.userId = id.user;
		expect((await r.aset.PUT({ cookies, request: req('PUT', { id: id.asetLain, unitId: id.unit, namaAset: 'X' }) })).status).toBe(404);
		expect((await r.aset.DELETE({ url: new URL(`http://x?id=${id.asetLain}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(404);
		expect((await r.pajak.DELETE({ url: new URL(`http://x?id=${id.pajakLain}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(404);
		expect((await db.query.fixedAssets.findFirst({ where: eq(s.fixedAssets.id, id.asetLain) })).namaAset).toBe('Mobil orang');
		expect(await db.query.taxRates.findFirst({ where: eq(s.taxRates.id, id.pajakLain) })).toBeTruthy();
	});

	it('API: ubah pajak (nonaktifkan) lalu hapus; hapus budget', async () => {
		login.userId = id.user;
		expect((await r.pajak.PUT({ cookies, request: req('PUT', { id: id.pajak, unitId: id.unit, persentase: 12, isActive: 0 }) })).status).toBe(200);
		const p = await db.query.taxRates.findFirst({ where: eq(s.taxRates.id, id.pajak) });
		expect(Number(p.persentase)).toBe(12);
		expect(p.isActive).toBe(0);
		expect((await r.pajak.DELETE({ url: new URL(`http://x?id=${id.pajak}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(200);
		expect((await r.budget.DELETE({ url: new URL(`http://x?id=${id.budget}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(200);
		expect((await r.budget.DELETE({ url: new URL(`http://x?id=${id.budget}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(404);
	});

	it('API: isi COA standar sekali saja; tipe tak dikenal ditolak', async () => {
		login.userId = id.user;
		const seed = (/** @type {any} */ body) => r.coa.POST({ cookies, request: req('POST', { action: 'seed-default', unitId: id.unitKosong, ...body }) });
		expect((await seed({ type: 'PESAWAT' })).status).toBe(422);
		const ok = await seed({ type: 'CAFE' });
		expect(ok.status).toBe(200);
		expect((await ok.json()).data.created).toBeGreaterThan(5);
		expect((await seed({ type: 'CAFE' })).status).toBe(409);
	});

	it('Web: tombol COA standar tanpa pilih jenis tidak lagi gagal (dulu pakai "GENERAL" yang tidak ada)', async () => {
		login.userId = id.user;
		await db.delete(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, id.unitKosong));
		const hasil = await r.webCoa.actions.seedDefaultCoa({ request: form({}), params: { slug: id.slugKosong }, cookies });
		expect(hasil.success).toBe(true);
	});

	it('Web: form edit/hapus aset & pajak tidak bisa menyentuh data unit lain', async () => {
		login.userId = id.user;
		const e = await r.webAset.actions.editAsset({ request: form({ id: String(id.asetLain), namaAset: 'Dibajak', kategori: 'LAINNYA', nilaiPerolehan: '1', tanggalPerolehan: '2026-01-01', umurEkonomis: '1', metodePenyusutan: 'GARIS_LURUS' }), params: { slug: id.slug }, cookies });
		expect(e.status).toBe(404);
		const d = await r.webPajak.actions.deleteTax({ request: form({ id: String(id.pajakLain) }), params: { slug: id.slug }, cookies });
		expect(d.status).toBe(404);
		expect((await db.query.fixedAssets.findFirst({ where: eq(s.fixedAssets.id, id.asetLain) })).namaAset).toBe('Mobil orang');
		expect(await db.query.taxRates.findFirst({ where: eq(s.taxRates.id, id.pajakLain) })).toBeTruthy();
	});

	it('Web: form edit aset sendiri tetap jalan', async () => {
		login.userId = id.user;
		const e = await r.webAset.actions.editAsset({ request: form({ id: String(id.aset), namaAset: 'Laptop Baru', kategori: 'INVENTARIS', nilaiPerolehan: '9000000', tanggalPerolehan: '2026-02-01', umurEkonomis: '5', metodePenyusutan: 'GARIS_LURUS', nilaiSisa: '', coaId: '' }), params: { slug: id.slug }, cookies });
		expect(e).toEqual({ success: true });
		const a = await db.query.fixedAssets.findFirst({ where: eq(s.fixedAssets.id, id.aset) });
		expect(a).toMatchObject({ namaAset: 'Laptop Baru', kategori: 'INVENTARIS', umurEkonomis: 5, status: 'AKTIF', coaId: null });
	});
});
