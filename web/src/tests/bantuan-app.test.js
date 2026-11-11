/**
 * Pusat Bantuan (app): konten FAQ/panduan/kendala satu sumber dengan halaman web, tiket & ulasan tervalidasi.
 */
import { describe, it, expect, vi } from 'vitest';

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (1) }));
vi.mock('$env/dynamic/private', () => ({ env: { SUPPORT_EMAIL: '' } }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/drizzle', () => ({ db: { query: { users: { findFirst: async () => null } }, insert: () => ({ values: () => Promise.resolve() }) } }));

const mk = (method, body, qs = '') => ({
	request: new Request('http://x/' + qs, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
	cookies: { get() {} },
	url: new URL('http://x/' + qs)
});

describe('Pusat Bantuan app', () => {
	it('GET mengembalikan FAQ, kategori, panduan, dan kendala dari konten yang sama dengan web', async () => {
		const api = await import('../routes/api/app/help/+server.js');
		const konten = await import('../lib/bantuanKonten.js');
		const r = await api.GET(mk('GET', null));
		const j = await r.json();
		expect(j.success).toBe(true);
		expect(j.data.total).toBe(konten.FAQS.length);
		expect(j.data.items[0]).toMatchObject({ id: 1, q: konten.FAQS[0].q, category: konten.FAQS[0].cat });
		expect(j.data.kategori.map((k) => k.id)).toEqual(Object.keys(konten.KATEGORI_FAQ));
		expect(j.data.panduan.length).toBe(konten.PANDUAN.length);
		expect(j.data.panduan[0].steps.length).toBeGreaterThan(0);
		expect(j.data.troubleshoot.map((t) => t.id).sort()).toEqual(Object.keys(konten.TROUBLESHOOT).sort());
		expect(j.data.troubleshoot[0].masalah[0]).toHaveProperty('solution');
	});

	it('filter kategori & pencarian', async () => {
		const api = await import('../routes/api/app/help/+server.js');
		const konten = await import('../lib/bantuanKonten.js');
		const cat = konten.FAQS[0].cat;
		const j1 = await (await api.GET(mk('GET', null, `?category=${cat}`))).json();
		expect(j1.data.items.every((i) => i.category === cat)).toBe(true);
		const j2 = await (await api.GET(mk('GET', null, '?q=zzzz-tidak-ada'))).json();
		expect(j2.data.total).toBe(0);
	});

	it('review: rating wajib 1-5; tiket: wajib judul+isi dan butuh SUPPORT_EMAIL', async () => {
		const api = await import('../routes/api/app/help/+server.js');
		expect((await api.POST(mk('POST', { action: 'review', rating: 9 }))).status).toBe(422);
		expect((await api.POST(mk('POST', { action: 'ticket', title: '', description: '' }))).status).toBe(422);
		expect((await api.POST(mk('POST', { action: 'ticket', title: 'Halo', description: 'Isi' }))).status).toBe(503);
	});

	it('tanpa login → 401', async () => {
		const api = await import('../routes/api/app/help/+server.js');
		login.userId = null;
		expect((await api.GET(mk('GET', null))).status).toBe(401);
		login.userId = 1;
	});
});
