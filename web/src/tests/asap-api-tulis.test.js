/**
 * Tes asap: panggil handler POST/PUT/PATCH/DELETE setiap +server.js dengan body hampir kosong ({ unitId }).
 * Input tidak lengkap harus ditolak 4xx, bukan 5xx / galat (kecuali keterbatasan LATERAL MariaDB lokal).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.DB_RELATIONAL_MODE ||= 'planetscale';
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
// Catat galat yang di-log endpoint, supaya 500 akibat keterbatasan MariaDB lokal bisa dikenali
const catatan = vi.hoisted(() => ({ galat: /** @type {string[]} */ ([]) }));
vi.mock('$lib/server/logger', () => {
	const tulis = (/** @type {any} */ o) => { const e = o?.err; catatan.galat.push(`${e?.message || ''} ${e?.cause?.message || ''} ${typeof e === 'string' ? e : ''}`); };
	const l = { error: tulis, warn: tulis, info() {}, debug() {} };
	return { log: new Proxy({}, { get: () => l }), default: l };
});
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { get: async () => null, set: async () => 'OK', del: async () => 0, keys: async () => [], incr: async () => 1, expire: async () => 1, ping: async () => 'PONG' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));

const modul = import.meta.glob('../routes/**/+server.js');
const LEWATI = /\/api\/(inngest|shopee|auth|payment|health|socket-token|webhook-wa|chat|ai-|app\/ai-entry|app\/sosmed\/generate|app\/business-plan\/ai|uploads|app\/import|app\/products\/import)|\/api\/dokumen|\/logout|produk\/import/; // layanan luar / unggah berkas

describe.skipIf(!TEST_DB)('asap: semua API tulis dengan body kosong', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq;
	/** @type {Record<string, any>} */ const ids = {};

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const { pastikanCoaStandar, catatTransaksi, pilihAkunDefault } = await import('../lib/server/catatTransaksi.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `asapi${t}`, email: `asapi${t}@x.id`, role: 'enterprise' });
		ids.user = u.insertId;
		ids.slug = `asapi-${t}`;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'Asap API', slug: ids.slug, modalAwal: '0', kategori: 'RETAIL_TOKO' });
		ids.unit = unit.insertId;
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, ids.unit));
		ids.produk = `ASAPI-${t}`;
		await db.insert(s.products).values({ id: ids.produk, slug: `asapi-p-${t}`, nama: 'Produk', userId: ids.user, unitId: ids.unit, hargaBeli: '1000', hargaJual: '2000', stok: 3, minStok: 5 });
		const [e] = await db.insert(s.employees).values({ companyId: ids.unit, userId: ids.user, fullName: 'K', slug: `k-asapi-${t}`, salary: '1000000', status: 'active' });
		ids.emp = e.insertId;
		await db.transaction(async (/** @type {any} */ tx) => {
			const a = await pilihAkunDefault(tx, ids.unit, 'MASUK', 'TUNAI');
			await catatTransaksi(tx, { unitId: ids.unit, userId: ids.user, kategori: 'MASUK', nominal: 2000, keterangan: 'jual', coaId: a.coaId, kasCoaId: a.kasCoaId, productId: ids.produk, qty: 1 });
		});
	});

	afterAll(async () => {
		if (ids.emp) await db.delete(s.employees).where(eq(s.employees.id, ids.emp));
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('tidak ada yang 5xx', async () => {
		login.userId = ids.user;
		const user = { id: ids.user, username: 'a', role: 'enterprise' };
		/** @type {string[]} */ const gagal = [];
		/** @type {string[]} */ const lewat = [];
		for (const [path, impor] of Object.entries(modul)) {
			const rute = path.replace('../routes', '').replace('/+server.js', '');
			if (LEWATI.test(rute)) continue;
			const m = await impor().catch(() => null);
			if (!m) continue;
			for (const metode of ['POST', 'PUT', 'PATCH', 'DELETE']) {
				if (typeof m[metode] !== 'function') continue;
				/** @type {Record<string, string>} */ const params = {};
				for (const [, n] of rute.matchAll(/\[(\w+)\]/g)) params[n] = { slug: ids.slug, employeeId: String(ids.emp) }[n] ?? '999999';
				const qs = new URLSearchParams({ unitId: String(ids.unit) });
				const url = new URL(`http://x${rute.replace(/\([^)]*\)\//g, '').replace(/\[(\w+)\]/g, (_, n) => params[n])}?${qs}`);
				const init = metode === 'DELETE' ? { method: metode } : { method: metode, body: JSON.stringify({ unitId: ids.unit }), headers: { 'content-type': 'application/json' } };
				catatan.galat = [];
				try {
					const r = await m[metode]({ url, params, request: new Request(url, init), cookies: { get: () => undefined, set() {}, delete() {} }, locals: { user }, setHeaders() {}, fetch, getClientAddress: () => '127.0.0.1' });
					if (r?.status >= 500 && /LATERAL|Unknown column '[a-z]+[A-Z]?\w*\.\w+' in 'WHERE'/.test(catatan.galat.join(' '))) { lewat.push(`${metode} ${rute}`); continue; }
					if (r?.status >= 500) {
						const teks = await r.text().catch(() => '');
						gagal.push(`${metode} ${rute}: ${r.status} ${teks.slice(0, 120)} | ${catatan.galat.join(' ').slice(0, 160)}`);
					}
				} catch (/** @type {any} */ e) {
					if ((e?.status && e.status < 500) || e?.location) continue;
					const pesan = `${e?.message || e} ${e?.cause?.message || ''}`;
					if (/LATERAL|Unknown column '[a-z]+[A-Z]?\w*\.\w+' in 'WHERE'/.test(pesan)) { lewat.push(`${metode} ${rute}`); continue; }
					gagal.push(`${metode} ${rute}: THROW ${pesan.slice(0, 200)}`);
				}
			}
		}
		console.log('Dilewati (LATERAL):', lewat.join(', '));
		expect(gagal).toEqual([]);
	}, 180000);
});
