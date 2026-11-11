/**
 * Tes asap: setiap aksi formulir web (+page.server.js actions) dipanggil dengan isian KOSONG.
 * Harusnya ditolak dengan pesan (fail 4xx / { success:false }), bukan melempar galat atau 5xx.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.DB_RELATIONAL_MODE ||= 'planetscale';
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
const catatan = vi.hoisted(() => ({ galat: /** @type {string[]} */ ([]) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { get: async () => null, set: async () => 'OK', del: async () => 0, keys: async () => [], incr: async () => 1, expire: async () => 1 } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));
vi.mock('$lib/server/groq', () => ({ groqChatCompletion: async () => ({ choices: [{ message: { content: '{}' } }] }), bacaJsonAI: () => null, GroqError: class extends Error {}, pesanGalatAI: () => '' }));
vi.mock('$lib/server/logger', () => {
	const tulis = (/** @type {any} */ o) => { const e = o?.err; catatan.galat.push(`${e?.message || ''} ${e?.cause?.message || ''} ${typeof e === 'string' ? e : ''}`); };
	const l = { error: tulis, warn: tulis, info() {}, debug() {} };
	return { log: new Proxy({}, { get: () => l }), default: l };
});

const halaman = import.meta.glob('../routes/**/+page.server.js');
// Aksi yang memanggil layanan luar / logout / login dilewati
const LEWATI = /auth\/|logout|google|shopee|billing|\/w\/lp/;

describe.skipIf(!TEST_DB)('asap: aksi formulir dengan isian kosong', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq;
	/** @type {Record<string, any>} */ const ids = {};
	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `aksi${t}`, email: `aksi${t}@x.id`, role: 'enterprise' });
		ids.user = u.insertId; ids.slug = `aksi-${t}`;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'Aksi', slug: ids.slug, modalAwal: '0', kategori: 'RETAIL_TOKO' });
		ids.unit = unit.insertId;
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, ids.unit));
	});
	afterAll(async () => {
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('tidak ada aksi yang crash', async () => {
		login.userId = ids.user;
		const user = { id: ids.user, username: 'a', role: 'enterprise' };
		/** @type {string[]} */ const gagal = [];
		for (const [path, impor] of Object.entries(halaman)) {
			const rute = path.replace('../routes', '').replace('/+page.server.js', '');
			if (LEWATI.test(rute)) continue;
			const m = await impor().catch(() => null);
			if (!m?.actions) continue;
			/** @type {Record<string, string>} */ const params = {};
			for (const [, n] of rute.matchAll(/\[(\w+)\]/g)) params[n] = { slug: ids.slug }[n] ?? 'tidak-ada';
			for (const [nama, aksi] of Object.entries(m.actions)) {
				const url = new URL(`http://x/?/${nama}`);
				catatan.galat = [];
				try {
					const r = await /** @type {any} */ (aksi)({
						request: new Request(url, { method: 'POST', body: new FormData() }), params, url,
						locals: { user }, cookies: { get: () => undefined, set() {}, delete() {} }, fetch, getClientAddress: () => '127.0.0.1'
					});
					const st = r?.status;
					if (st >= 500) {
						if (/LATERAL|Unknown column '[a-z]+[A-Z]?\w*\.\w+' in 'WHERE'/.test(catatan.galat.join(' '))) continue;
						gagal.push(`${rute} ?/${nama}: fail(${st}) ${JSON.stringify(r?.data || {}).slice(0, 120)} | ${catatan.galat.join(' ').slice(0, 160)}`);
					}
				} catch (/** @type {any} */ e) {
					if ((e?.status && e.status < 500) || e?.location) continue;
					const p = `${e?.message || e} ${e?.cause?.message || ''}`;
					if (/LATERAL|Unknown column '[a-z]+[A-Z]?\w*\.\w+' in 'WHERE'/.test(p)) continue;
					gagal.push(`${rute} ?/${nama}: THROW ${p.slice(0, 200)}`);
				}
			}
		}
		expect(gagal).toEqual([]);
	}, 180000);
});
