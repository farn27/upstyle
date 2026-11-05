import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmActivities, crmContacts, riwayatAksi } from '$lib/server/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// Aktivitas CRM (telepon, WA, meeting, email, task) — sama dengan halaman web finance/[slug]/crm/aktivitas.
// unitId dicek milik user oleh guard di hooks.server.js.

/** GET ?unitId=X[&kontakId=Y] — 100 aktivitas terbaru beserta kontaknya */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	const kontakId = Number(url.searchParams.get('kontakId')) || null;
	try {
		const list = await db
			.select()
			.from(crmActivities)
			.where(kontakId
				? and(eq(crmActivities.unitId, unitId), eq(crmActivities.kontakId, kontakId))
				: eq(crmActivities.unitId, unitId))
			.orderBy(desc(crmActivities.tanggal))
			.limit(100);
		// kontak diambil terpisah (tanpa LATERAL JOIN) supaya jalan di MySQL/TiDB/MariaDB
		const idKontak = [...new Set(list.map((a) => a.kontakId).filter(Boolean))];
		const kontakList = idKontak.length
			? await db.select().from(crmContacts).where(and(eq(crmContacts.unitId, unitId), inArray(crmContacts.id, /** @type {number[]} */ (idKontak))))
			: [];
		const kontakMap = new Map(kontakList.map((c) => [c.id, c]));
		const data = list.map((/** @type {any} */ a) => ({ ...a, contact: kontakMap.get(a.kontakId) || null })).map((/** @type {any} */ a) => ({
			id: a.id,
			ownerId: a.ownerId,
			unitId: a.unitId,
			kontakId: a.kontakId,
			tipe: a.tipe,
			catatan: a.catatan || '',
			tanggal: a.tanggal || '',
			contact: a.contact
				? {
					id: a.contact.id, ownerId: a.contact.ownerId, unitId: a.contact.unitId, nama: a.contact.nama,
					telepon: a.contact.telepon || '', email: a.contact.email || '', perusahaan: a.contact.perusahaan || '',
					stage: a.contact.stage || 'lead', sumber: a.contact.sumber || 'manual'
				}
				: null
		}));
		return json({ success: true, data });
	} catch (err) {
		log.api.error({ err }, 'GET crm/activities');
		return json({ success: false, message: 'Gagal memuat aktivitas' }, { status: 500 });
	}
}

const aktivitasSchema = z.object({
	unitId: z.coerce.number().int().positive(),
	kontakId: z.coerce.number().int().positive('Pilih kontak'),
	tipe: z.enum(['Call', 'WA', 'Meeting', 'Email', 'Task'], { message: 'Tipe harus Call, WA, Meeting, Email, atau Task' }),
	catatan: z.string().max(5000).optional().default('')
});

/** POST { unitId, kontakId, tipe, catatan } (atau dibungkus { activity: {...} } seperti app) */
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const parsed = aktivitasSchema.safeParse(body?.activity || body);
		if (!parsed.success) return json({ success: false, message: parsed.error.issues[0]?.message || 'Input tidak valid' }, { status: 422 });
		const { unitId, kontakId, tipe, catatan } = parsed.data;

		const kontak = await db.query.crmContacts.findFirst({
			where: and(eq(crmContacts.id, kontakId), eq(crmContacts.unitId, unitId)),
			columns: { id: true, nama: true }
		});
		if (!kontak) return json({ success: false, message: 'Kontak tidak ditemukan di unit ini' }, { status: 404 });

		const [hasil] = await db.insert(crmActivities).values({ ownerId: userId, unitId, kontakId, tipe, catatan: catatan || null });
		await db.insert(riwayatAksi).values({ userId, unitId, pesan: `Aktivitas ${tipe} dengan ${kontak.nama}`, kategori: 'CRM', tipe: 'info' });
		return json({ success: true, message: 'Aktivitas dicatat', data: { id: hasil.insertId } });
	} catch (err) {
		log.api.error({ err }, 'POST crm/activities');
		return json({ success: false, message: 'Gagal mencatat aktivitas' }, { status: 500 });
	}
}
