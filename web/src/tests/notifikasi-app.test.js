/**
 * Notifikasi app: lintas unit, paginasi, tandai dibaca, dan isolasi antar user.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Notifikasi app', () => {
	it('lintas unit, paginasi, baca semua & isolasi user', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq, and } = await import('drizzle-orm');
		const daftar = await import('../routes/api/app/notifications/+server.js');
		const bacaSatu = await import('../routes/api/app/notifications/[notifId]/read/+server.js');
		const bacaSemua = await import('../routes/api/app/notifications/read-all/+server.js');
		const t = Date.now();

		const [a] = await db.insert(s.users).values({ username: `na${t}`, email: `na${t}@x.id`, role: 'free' });
		const [b] = await db.insert(s.users).values({ username: `nb${t}`, email: `nb${t}@x.id`, role: 'free' });
		const [u1] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'Toko A1', slug: `na1-${t}`, modalAwal: '0', kategori: 'RETAIL' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'Toko A2', slug: `na2-${t}`, modalAwal: '0', kategori: 'RETAIL' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'Toko B', slug: `nb-${t}`, modalAwal: '0', kategori: 'RETAIL' });
		for (let i = 0; i < 35; i++) await db.insert(s.riwayatAksi).values({ userId: a.insertId, unitId: i % 2 ? u1.insertId : u2.insertId, pesan: `Aksi ${i}`, kategori: 'KEUANGAN', tipe: 'info' });
		await db.insert(s.riwayatAksi).values({ userId: b.insertId, unitId: ub.insertId, pesan: 'RAHASIA B', kategori: 'KEUANGAN', tipe: 'info' });

		const ambil = async (q = '') => (await daftar.GET({ url: new URL(`http://x/?${q}`), cookies: { get() {} }, request: new Request('http://x') })).json();

		login.userId = a.insertId;
		const h1 = await ambil('limit=30');
		expect(h1.success).toBe(true);
		expect(h1.data).toHaveLength(30);
		expect(h1.adaLagi).toBe(true);
		expect(h1.data.every((n) => n.pesan !== 'RAHASIA B')).toBe(true);
		expect(new Set(h1.data.map((n) => n.unitNama))).toEqual(new Set(['Toko A1', 'Toko A2']));
		const h2 = await ambil(`limit=30&before=${h1.data.at(-1).id}`);
		expect(h2.data).toHaveLength(5);
		expect(h2.adaLagi).toBe(false);
		// per unit
		const satuUnit = await ambil(`unitId=${u1.insertId}&limit=100`);
		expect(satuUnit.data.every((n) => n.unitId === u1.insertId)).toBe(true);
		// unit user lain → ditolak
		expect((await ambil(`unitId=${ub.insertId}`)).success).toBe(false);

		// tandai satu dibaca
		const sat = await bacaSatu.PUT({ params: { notifId: String(h1.data[0].id) }, cookies: { get() {} }, request: new Request('http://x') });
		expect((await sat.json()).success).toBe(true);
		// notifikasi user lain tidak bisa ditandai
		const [rahasia] = await db.select().from(s.riwayatAksi).where(eq(s.riwayatAksi.unitId, ub.insertId));
		const tolak = await bacaSatu.PUT({ params: { notifId: String(rahasia.id) }, cookies: { get() {} }, request: new Request('http://x') });
		expect(tolak.status).toBe(404);

		// baca semua (tanpa unitId) → hanya milik A
		const semua = await bacaSemua.PUT({ url: new URL('http://x/'), cookies: { get() {} }, request: new Request('http://x') });
		expect((await semua.json()).success).toBe(true);
		const belum = await ambil('limit=100');
		expect(belum.data.filter((n) => n.isRead === 0)).toHaveLength(0);
		const [masihBaru] = await db.select().from(s.riwayatAksi).where(and(eq(s.riwayatAksi.unitId, ub.insertId), eq(s.riwayatAksi.isRead, 0)));
		expect(masihBaru).toBeTruthy();
	});
});
