import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { knowledgeBase } from '$lib/server/schema';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// Knowledge base layanan pelanggan per unit — sama dengan halaman web
// ecommerce/[slug]/layanan/[slug]/knowledge-base (tambah & hapus artikel).
// unitId dicek milik user oleh guard di hooks.server.js.

/** Cache daftar artikel yang dipakai halaman web — harus dibuang setiap ada perubahan */
async function bersihkanCache(/** @type {number} */ unitId) {
	try { if (redis) await redis.del(`cs_kb:${unitId}`); } catch { /* best-effort */ }
}

/** GET ?unitId=X[&q=kata] */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	const q = (url.searchParams.get('q') || '').trim();
	try {
		const cari = q ? or(like(knowledgeBase.title, `%${q}%`), like(knowledgeBase.content, `%${q}%`)) : undefined;
		const rows = await db
			.select()
			.from(knowledgeBase)
			.where(cari ? and(eq(knowledgeBase.unitId, unitId), cari) : eq(knowledgeBase.unitId, unitId))
			.orderBy(desc(knowledgeBase.createdAt));
		const data = rows.map((a) => ({
			id: a.id, unitId: a.unitId, category: a.category, title: a.title,
			content: a.content, views: a.views || 0, createdAt: a.createdAt || ''
		}));
		return json({ success: true, data });
	} catch (err) {
		log.api.error({ err }, 'GET knowledge-base');
		return json({ success: false, message: 'Gagal memuat knowledge base' }, { status: 500 });
	}
}

const artikelSchema = z.object({
	unitId: z.coerce.number().int().positive(),
	title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
	category: z.string().trim().max(100).optional().default('Umum'),
	content: z.string().trim().min(1, 'Konten wajib diisi')
});

/** POST { unitId, title, category?, content } */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const parsed = artikelSchema.safeParse(await request.json());
		if (!parsed.success) {
			return json({ success: false, message: parsed.error.issues[0]?.message || 'Input tidak valid' }, { status: 422 });
		}
		const { unitId, title, category, content } = parsed.data;
		const [hasil] = await db.insert(knowledgeBase).values({ unitId, title, category: category || 'Umum', content });
		await bersihkanCache(unitId);
		return json({ success: true, message: 'Artikel disimpan', data: { id: hasil.insertId } });
	} catch (err) {
		log.api.error({ err }, 'POST knowledge-base');
		return json({ success: false, message: 'Gagal simpan artikel' }, { status: 500 });
	}
}

/** DELETE ?id=X&unitId=Y */
export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const id = Number(url.searchParams.get('id'));
	const unitId = Number(url.searchParams.get('unitId'));
	if (!id || !unitId) return json({ success: false, message: 'id dan unitId wajib diisi' }, { status: 400 });
	try {
		const [hasil] = await db.delete(knowledgeBase).where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.unitId, unitId)));
		if (!hasil?.affectedRows) return json({ success: false, message: 'Artikel tidak ditemukan' }, { status: 404 });
		await bersihkanCache(unitId);
		return json({ success: true, message: 'Artikel dihapus' });
	} catch (err) {
		log.api.error({ err }, 'DELETE knowledge-base');
		return json({ success: false, message: 'Gagal hapus artikel' }, { status: 500 });
	}
}
