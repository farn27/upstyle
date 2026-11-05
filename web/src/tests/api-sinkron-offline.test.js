/**
 * Tes sinkron offline opsi B (#15): app mengirim ulang antrean ke endpoint asli dengan header
 * Idempotency-Key — request yang sama tidak boleh tercatat dua kali. Lewat hooks.server.js sungguhan.
 * Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

// Redis tiruan (mendukung set NX + EX seperti Upstash)
const fakeRedis = vi.hoisted(() => {
	const m = new Map();
	return {
		store: m,
		get: async (/** @type {string} */ k) => m.get(k) ?? null,
		set: async (/** @type {string} */ k, /** @type {any} */ v, /** @type {any} */ o) => { if (o?.nx && m.has(k)) return null; m.set(k, v); return 'OK'; },
		del: async (/** @type {string[]} */ ...ks) => { ks.forEach((k) => m.delete(k)); return 1; },
		keys: async () => []
	};
});
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/session', () => ({ getUserIdFromSession: async (/** @type {string} */ t) => Number(t) || null }));
vi.mock('$lib/server/redis', () => ({ redis: fakeRedis }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));

describe.skipIf(!TEST_DB)('Sinkron offline — Idempotency-Key', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {any} */ let handle;
	/** @type {any} */ let finance;
	/** @type {Record<string, any>} */
	const id = {};

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		({ handle } = await import('../hooks.server.js'));
		finance = await import('../routes/api/app/finance/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `so${t}`, email: `so${t}@contoh.id` });
		id.user = a.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Offline', slug: `so-${t}`, modalAwal: '0' });
		id.unit = u.insertId;
	});

	afterAll(async () => {
		if (id.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, id.unit));
		if (id.user) await db.delete(s.users).where(eq(s.users.id, id.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	/** Kirim POST /api/app/finance lewat hooks + endpoint asli (seperti app) */
	const kirim = async (/** @type {string | null} */ kunci, /** @type {string} */ ket) => {
		const url = new URL('http://x/api/app/finance');
		const headers = { authorization: `Bearer ${id.user}`, 'content-type': 'application/json', ...(kunci ? { 'idempotency-key': kunci } : {}) };
		const request = new Request(url, { method: 'POST', headers, body: JSON.stringify({ transaction: { unitId: id.unit, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: ket } }) });
		const event = { url, request, cookies: { get: () => undefined }, locals: {} };
		return handle({ event, resolve: (/** @type {any} */ e) => finance.POST({ request: e.request, cookies: e.cookies }) });
	};
	const jumlah = async (/** @type {string} */ ket) =>
		(await db.select().from(s.transaksi).where(eq(s.transaksi.unitId, id.unit))).filter((/** @type {any} */ t) => t.keterangan === ket).length;

	it('kunci sama dikirim dua kali → tercatat sekali, balasan kedua sama persis', async () => {
		const r1 = await kirim('OFF-1700000000-111', 'Galon offline');
		const b1 = await r1.text();
		expect(r1.status).toBe(200);
		const r2 = await kirim('OFF-1700000000-111', 'Galon offline');
		expect(r2.headers.get('idempotent-replayed')).toBe('true');
		expect(await r2.text()).toBe(b1);
		expect(await jumlah('Galon offline')).toBe(1);
	});

	it('kunci berbeda / tanpa kunci → diproses biasa', async () => {
		await kirim('OFF-1700000000-222', 'Beda kunci');
		await kirim('OFF-1700000000-333', 'Beda kunci');
		expect(await jumlah('Beda kunci')).toBe(2);
		await kirim(null, 'Tanpa kunci');
		await kirim(null, 'Tanpa kunci');
		expect(await jumlah('Tanpa kunci')).toBe(2);
	});

	it('request yang ditolak (422) disimpan juga → kirim ulang tidak mencoba lagi', async () => {
		const url = new URL('http://x/api/app/finance');
		const req = () => new Request(url, { method: 'POST', headers: { authorization: `Bearer ${id.user}`, 'content-type': 'application/json', 'idempotency-key': 'OFF-1700000000-444' }, body: JSON.stringify({ transaction: { unitId: id.unit, kategoriTrx: 'KELUAR', nominal: -5, keterangan: 'x' } }) });
		const lewat = (/** @type {Request} */ request) => handle({ event: { url, request, cookies: { get: () => undefined }, locals: {} }, resolve: (/** @type {any} */ e) => finance.POST({ request: e.request, cookies: e.cookies }) });
		expect((await lewat(req())).status).toBe(422);
		const ulang = await lewat(req());
		expect(ulang.status).toBe(422);
		expect(ulang.headers.get('idempotent-replayed')).toBe('true');
	});
});
