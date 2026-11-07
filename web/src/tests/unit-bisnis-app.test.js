/**
 * Struktur bisnis (app): buat pusat/cabang dengan data lengkap, slug unik, induk wajib, isolasi antar user.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Unit bisnis app', () => {
	it('buat pusat & cabang, slug unik, validasi induk, hapus induk', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const api = await import('../routes/api/app/business/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ba${t}`, email: `ba${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `bb${t}`, email: `bb${t}@x.id`, role: 'free' });
		const req = (method, body, qs = '') => ({ request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL(`http://x/?${qs}`) });
		const post = async (body) => { const r = await api.POST(req('POST', body)); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		// pusat dengan data lengkap (dulu alamat/telepon/modal diabaikan & alamat diisi teks "default")
		const p1 = await post({ name: 'Kopi Senja', type: 'FNB_COFFEE_ROASTERY', alamat: 'Jl. Mawar 1', telepon: '0812', email: 'kopi@x.id', modal_awal: 5000000 });
		expect(p1.j.success).toBe(true);
		const [u1] = await db.select().from(s.unitBisnis).where(eq(s.unitBisnis.id, p1.j.data.id));
		expect(u1).toMatchObject({ namaUnit: 'Kopi Senja', alamat: 'Jl. Mawar 1', telepon: '0812', email: 'kopi@x.id', kategori: 'FNB_COFFEE_ROASTERY', isCabang: 0 });
		expect(Number(u1.modalAwal)).toBe(5000000);
		const kats = await db.select().from(s.kategoriProduk).where(eq(s.kategoriProduk.unitId, u1.id));
		expect(kats.map((k) => k.namaKategori).sort()).toEqual(['BAHAN BAKU', 'MAKANAN', 'MINUMAN', 'SNACK']);

		// nama sama → slug berbeda (tidak lagi gagal "Nama unit sudah ada")
		const p2 = await post({ name: 'Kopi Senja', type: 'FNB_COFFEE_ROASTERY' });
		expect(p2.j.success).toBe(true);
		expect(p2.j.data.slug).not.toBe(p1.j.data.slug);

		// cabang: wajib induk, mewarisi kategori, tidak bisa induk cabang lain
		expect((await post({ name: 'Cabang X', is_cabang: true })).st).toBe(400);
		const c1 = await post({ name: 'Kopi Senja Cabang', is_cabang: true, cabang_dari: u1.id, alamat: 'Jl. Melati 2' });
		expect(c1.j.success).toBe(true);
		const [uc] = await db.select().from(s.unitBisnis).where(eq(s.unitBisnis.id, c1.j.data.id));
		expect(uc).toMatchObject({ isCabang: 1, cabangDari: u1.id, kategori: 'FNB_COFFEE_ROASTERY' });
		expect((await post({ name: 'Cabang dari cabang', is_cabang: true, cabang_dari: uc.id })).j.message).toMatch(/induk/i);
		// non-cabang tanpa kategori ditolak
		expect((await post({ name: 'Tanpa Kategori' })).st).toBe(400);

		// induk milik user lain ditolak
		login.userId = b.insertId;
		const curi = await post({ name: 'Cabang Curian', is_cabang: true, cabang_dari: u1.id });
		expect(curi.st).toBe(400);

		// daftar memuat cabangDari
		login.userId = a.insertId;
		const daftar = await (await api.GET({ cookies: { get() {} }, request: new Request('http://x/') })).json();
		expect(daftar.data.find((u) => u.id === uc.id).cabangDari).toBe(u1.id);

		// link portal staff: mengisi login_slug, slug unit TIDAK berubah
		const put = async (body) => (await (await api.PUT({ request: new Request('http://x/', { method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), cookies: { get() {} } })).json());
		const slugAsal = (await db.select().from(s.unitBisnis).where(eq(s.unitBisnis.id, uc.id)))[0].slug;
		const portal = await put({ action: 'updatePortal', unitId: uc.id, generateNewSlug: false });
		expect(portal.data.loginSlug).toMatch(/^kopi-senja-cabang-/);
		const portal2 = await put({ action: 'updatePortal', unitId: uc.id, generateNewSlug: true });
		expect(portal2.data.loginSlug).not.toBe(portal.data.loginSlug);
		expect((await db.select().from(s.unitBisnis).where(eq(s.unitBisnis.id, uc.id)))[0]).toMatchObject({ slug: slugAsal, loginSlug: portal2.data.loginSlug });

		// hapus induk → cabang tetap ada (cabang_dari menjadi null)
		const del = await api.DELETE(req('DELETE', null, `unitId=${u1.id}`));
		expect((await del.json()).success).toBe(true);
		const [sisa] = await db.select().from(s.unitBisnis).where(eq(s.unitBisnis.id, uc.id));
		expect(sisa).toBeTruthy();
		expect(sisa.cabangDari).toBeNull();
	});
});
