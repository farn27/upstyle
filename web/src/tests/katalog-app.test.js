/**
 * Katalog online (app): aktif/nonaktif tersimpan di website_settings, GET menampilkan slug situs, dan situs publik
 * /w/<slug> menolak (404) saat tidak dipublikasikan. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.DB_RELATIONAL_MODE ||= 'planetscale';

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Katalog app', () => {
	it('aktif/nonaktif tersimpan dan memengaruhi situs publik', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const kat = await import('../routes/api/app/katalog/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ka${t}`, email: `ka${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `kb${t}`, email: `kb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'Katalog A', slug: `kat-a-${t}`, kategori: 'RETAIL_TOKO' });
		const unit = ua.insertId;
		const mk = (method, body, qs = '') => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`)
		});
		const jalan = async (fn, ...x) => { const r = await fn(...x); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		// validasi + simpan
		expect((await jalan(kat.PUT, mk('PUT', { action: 'update-katalog-settings', unitId: unit, settings: {} }))).st).toBe(400);
		expect((await jalan(kat.PUT, mk('PUT', { action: 'update-katalog-settings', unitId: unit, settings: { isActive: false } }))).j.success).toBe(true);
		let g = (await jalan(kat.GET, mk('GET', null, `unitId=${unit}`))).j.data.settings;
		expect(g.isActive).toBe(false);
		const [situs] = await db.select().from(s.websiteSettings).where(eq(s.websiteSettings.unitId, unit));
		expect(situs.isPublished).toBeFalsy();
		expect(g.slug).toBe(situs.domainSlug);

		// situs publik menolak saat nonaktif, status aktif tersimpan
		const publik = await import('../routes/w/[slug]/+page.server.js');
		await expect(publik.load({ params: { slug: situs.domainSlug } })).rejects.toMatchObject({ status: 404 });
		expect((await jalan(kat.PUT, mk('PUT', { action: 'update-katalog-settings', unitId: unit, settings: { isActive: true } }))).j.success).toBe(true);
		// (render penuh halaman publik memakai relasi LATERAL yang tak ada di MariaDB lokal → cukup cek status tersimpan)
		expect((await db.select().from(s.websiteSettings).where(eq(s.websiteSettings.unitId, unit)))[0].isPublished).toBeTruthy();
		g = (await jalan(kat.GET, mk('GET', null, `unitId=${unit}`))).j.data.settings;
		expect(g.isActive).toBe(true);

		// user lain tidak bisa mengubah
		login.userId = b.insertId;
		expect((await jalan(kat.PUT, mk('PUT', { action: 'update-katalog-settings', unitId: unit, settings: { isActive: false } }))).st).toBe(404);
	});
});
