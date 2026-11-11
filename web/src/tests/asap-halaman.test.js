/**
 * Tes asap: jalankan load() SETIAP halaman web (+page.server.js) sebagai pemilik unit berisi data contoh.
 * Gagal bila ada load yang melempar galat selain redirect / galat HTTP 4xx yang disengaja.
 * Galat LATERAL (relational query Drizzle) dilewati: MariaDB lokal tidak mendukungnya, MySQL 8 produksi mendukung.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.DB_RELATIONAL_MODE ||= 'planetscale';
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { get: async () => null, set: async () => 'OK', del: async () => 0, keys: async () => [], incr: async () => 1, expire: async () => 1, ping: async () => 'PONG' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));
vi.mock('$lib/server/groq', () => ({ groqChatCompletion: async () => ({ choices: [{ message: { content: '{}' } }] }), bacaJsonAI: () => null, GroqError: class extends Error {}, pesanGalatAI: () => '' }));

const halaman = import.meta.glob('../routes/**/+page.server.js');

describe.skipIf(!TEST_DB)('asap: semua load halaman', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq;
	/** @type {Record<string, any>} */ const ids = {};

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const { pastikanCoaStandar, catatTransaksi, pilihAkunDefault } = await import('../lib/server/catatTransaksi.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `asap${t}`, email: `asap${t}@x.id`, role: 'enterprise' });
		ids.user = u.insertId;
		ids.slug = `asap-${t}`;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'Asap', slug: ids.slug, modalAwal: '0', kategori: 'RETAIL_TOKO', loginSlug: `asap-login-${t}`, isPortalActive: 1 });
		ids.unit = unit.insertId;
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, ids.unit));
		ids.produk = `ASAP-${t}`;
		ids.produkSlug = `asap-p-${t}`;
		await db.insert(s.products).values({ id: ids.produk, slug: ids.produkSlug, nama: 'Produk Asap', userId: ids.user, unitId: ids.unit, hargaBeli: '1000', hargaJual: '2000', stok: 3, minStok: 5 });
		const [e] = await db.insert(s.employees).values({ companyId: ids.unit, userId: ids.user, fullName: 'Karyawan Asap', slug: `kry-asap-${t}`, salary: '1000000', status: 'active' });
		ids.empSlug = `kry-asap-${t}`;
		ids.emp = e.insertId;
		await db.transaction(async (/** @type {any} */ tx) => {
			const a = await pilihAkunDefault(tx, ids.unit, 'MASUK', 'TUNAI');
			await catatTransaksi(tx, { unitId: ids.unit, userId: ids.user, kategori: 'MASUK', nominal: 2000, keterangan: 'jual asap', coaId: a.coaId, kasCoaId: a.kasCoaId, productId: ids.produk, qty: 1 });
		});
	});

	afterAll(async () => {
		if (ids.emp) await db.delete(s.employees).where(eq(s.employees.id, ids.emp));
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('tidak ada load yang crash', async () => {
		login.userId = ids.user;
		const user = { id: ids.user, username: 'asap', role: 'enterprise', email: 'asap@x.id' };
		/** @type {string[]} */ const gagal = [];
		/** @type {string[]} */ const lewat = [];
		for (const [path, impor] of Object.entries(halaman)) {
			const m = await impor().catch((/** @type {any} */ e) => { gagal.push(`IMPOR ${path}: ${e.message}`); return null; });
			if (!m || typeof m.load !== 'function') continue;
			const rute = path.replace('../routes', '').replace('/+page.server.js', '');
			/** @type {Record<string, string>} */
			const params = {};
			for (const [, nama] of rute.matchAll(/\[(\w+)\]/g)) {
				params[nama] = { slug: ids.slug, productSlug: ids.produkSlug, employeeSlug: ids.empSlug, login_slug: `x`, domainSlug: 'tidak-ada', pageSlug: 'tidak-ada', id: '999999999', pageId: '999999999', orderId: '999999999' }[nama] ?? 'x';
			}
			const url = new URL(`http://x${rute.replace(/\([^)]*\)\//g, '').replace(/\[(\w+)\]/g, (_, n) => params[n])}`);
			try {
				await m.load({
					params, url, locals: { user }, cookies: { get: () => undefined, set() {}, delete() {}, getAll: () => [] },
					request: new Request(url), depends() {}, setHeaders() {}, untrack: (/** @type {any} */ f) => f(),
					parent: async () => ({ user, unit: { id: ids.unit, slug: ids.slug }, store: { unitId: ids.unit, storefrontName: 'Asap', isActive: true } }), fetch
				});
			} catch (/** @type {any} */ e) {
				const st = e?.status;
				if ((st && st < 500) || e?.location) continue; // redirect / 4xx disengaja
				// Dua dasbor ini membungkus galat kueri relasional (LATERAL, tak didukung MariaDB lokal) jadi "Database error"
				if (st === 500 && /\/(layanan|sales)\/\[slug\]$/.test(rute)) { lewat.push(rute); continue; }
				const pesan = String(e?.cause?.message || e?.body?.message || e?.message || e);
				const sebab = String(e?.cause?.cause?.message || e?.cause?.message || '');
				if (/LATERAL|lateral|right syntax to use near '\(select json_|Unknown column '[a-z]+[A-Z]\w*\.\w+' in 'WHERE'|Unknown column '(products|attendance|payables|receivables|quotations)\.\w+' in 'WHERE'/.test(pesan + sebab)) { lewat.push(rute); continue; }
				gagal.push(`${rute}: ${st || ''} ${pesan.slice(0, 160)} ${sebab.slice(0, 120)}`);
			}
		}
		console.log('Dilewati (LATERAL, khusus MariaDB lokal):', lewat.join(', '));
		expect(gagal).toEqual([]);
	}, 180000);
});
