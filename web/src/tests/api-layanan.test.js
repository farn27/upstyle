/**
 * Tes layanan (#11): knowledge base per unit & diagnostik app. Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
const dihapus = vi.hoisted(() => /** @type {string[]} */ ([]));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { del: async (/** @type {string} */ k) => { dihapus.push(k); return 1; }, ping: async () => 'PONG' } }));

describe.skipIf(!TEST_DB)('Layanan: knowledge base & diagnostik', () => {
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
		r.kb = await import('../routes/api/app/knowledge-base/+server.js');
		r.diag = await import('../routes/api/app/help/diagnostics/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `la${t}`, email: `la${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `lb${t}`, email: `lb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko Layanan', slug: `la-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `lb-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId;
		const [k] = await db.insert(s.knowledgeBase).values({ unitId: id.unitLain, category: 'Umum', title: 'Rahasia orang', content: 'x' });
		id.kbLain = k.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

	it('tambah, cari, hapus artikel; cache halaman web ikut dibuang', async () => {
		login.userId = id.user;
		const buat = await r.kb.POST({ cookies, request: req('POST', { unitId: id.unit, title: 'Cara retur', content: 'Bawa struk ke kasir' }) });
		expect(buat.status).toBe(200);
		const artikelId = (await buat.json()).data.id;
		expect(dihapus).toContain(`cs_kb:${id.unit}`);

		const cari = await (await r.kb.GET({ url: new URL(`http://x?unitId=${id.unit}&q=struk`), cookies, request: req('GET') })).json();
		expect(cari.data).toEqual([expect.objectContaining({ id: artikelId, title: 'Cara retur', category: 'Umum' })]);
		const kosong = await (await r.kb.GET({ url: new URL(`http://x?unitId=${id.unit}&q=tidakada`), cookies, request: req('GET') })).json();
		expect(kosong.data).toEqual([]);

		expect((await r.kb.DELETE({ url: new URL(`http://x?id=${artikelId}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(200);
	});

	it('judul / konten kosong → 422; artikel unit lain tidak bisa dihapus', async () => {
		login.userId = id.user;
		expect((await r.kb.POST({ cookies, request: req('POST', { unitId: id.unit, title: '', content: 'x' }) })).status).toBe(422);
		expect((await r.kb.DELETE({ url: new URL(`http://x?id=${id.kbLain}&unitId=${id.unit}`), cookies, request: req('DELETE') })).status).toBe(404);
		expect(await db.query.knowledgeBase.findFirst({ where: eq(s.knowledgeBase.id, id.kbLain) })).toBeTruthy();
	});

	it('diagnostik: sesi, database, unit, COA belum ada → warning', async () => {
		login.userId = id.user;
		const body = await (await r.diag.POST({ cookies, request: req('POST', { unitId: id.unit }) })).json();
		const cek = Object.fromEntries(body.data.checks.map((/** @type {any} */ c) => [c.name, c.status]));
		expect(cek).toMatchObject({ server: 'ok', sesi: 'ok', database: 'ok', cache: 'ok', unit: 'ok', akun_coa: 'warning' });
		expect(body.data.overallStatus).toBe('warning');
	});

	it('diagnostik tanpa login → status error di cek sesi', async () => {
		login.userId = null;
		const body = await (await r.diag.POST({ cookies, request: req('POST', {}) })).json();
		expect(body.data.checks.find((/** @type {any} */ c) => c.name === 'sesi').status).toBe('error');
		expect(body.data.overallStatus).toBe('error');
	});
});
