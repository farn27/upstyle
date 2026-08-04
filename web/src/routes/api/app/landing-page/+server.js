import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { landingPages, users, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';

const LANDING_TEMPLATES = [
	{
		id: 'promo-ramadhan',
		name: 'Promo Ramadhan',
		description: 'Template khusus kampanye Ramadhan dengan highlight diskon.',
		fields: ['title', 'heroImage', 'ctaText', 'ctaLink']
	},
	{
		id: 'product-launch',
		name: 'Product Launch',
		description: 'Template peluncuran produk dengan timeline dan fitur utama.',
		fields: ['title', 'heroImage', 'features', 'ctaText', 'ctaLink']
	},
	{
		id: 'lead-gen',
		name: 'Lead Generation',
		description: 'Template form lead generation untuk kampanye marketing.',
		fields: ['title', 'formFields', 'thankYouMessage', 'ctaText']
	}
];

async function getUnitIdFromUser(userId) {
	const [row] = await db.select({ companyId: users.companyId })
		.from(users)
		.where(eq(users.id, userId));
	return row?.companyId ?? null;
}

// GET /api/app/landing-page
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	const mode = url.searchParams.get('mode') || 'list';

	try {
		if (mode === 'templates') {
			return apiSuccess(LANDING_TEMPLATES, 'Templates loaded');
		}

		const unitId = url.searchParams.get('unitId');
		if (!unitId) return apiError('unitId wajib', 400);

		if (mode === 'detail' || url.searchParams.get('id')) {
			const id = Number(url.searchParams.get('id'));
			const page = await db.query.landingPages.findFirst({
				where: and(eq(landingPages.unitId, Number(unitId)), eq(landingPages.id, id))
			});

			if (!page) return apiError('Landing page tidak ditemukan', 404);

			return apiSuccess({
				id: page.id,
				unitId: page.unitId,
				pageSlug: page.pageSlug,
				title: page.title,
				contentJson: page.contentJson ?? null,
				templateId: page.templateId ?? null,
				isActive: Boolean(page.isActive),
				createdAt: page.createdAt || ''
			}, 'OK');
		}

		const pages = await db.query.landingPages.findMany({
			where: eq(landingPages.unitId, Number(unitId)),
			orderBy: [desc(landingPages.id)]
		});

		const data = pages.map(p => ({
			id: p.id,
			unitId: p.unitId,
			pageSlug: p.pageSlug,
			title: p.title,
			templateId: p.templateId ?? null,
			isActive: Boolean(p.isActive),
			createdAt: p.createdAt || ''
		}));

		return apiSuccess(data, 'OK');
	} catch (err) {
		log.api.error({ err }, 'GET /api/app/landing-page');
		return apiError('Gagal memuat landing page', 500);
	}
}

// POST /api/app/landing-page
export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId) return apiError('unitId wajib', 422);

		const schema = z.object({
			unitId: z.coerce.number().int().positive(),
			pageSlug: z.string().min(1).max(100),
			title: z.string().min(1).max(200),
			contentJson: z.any().optional(),
			templateId: z.string().optional()
		});

		const parsed = schema.safeParse(body);
		if (!parsed.success) {
			const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input landing page tidak valid';
			return apiError(msg, 422);
		}

		const { pageSlug, title, contentJson, templateId } = parsed.data;

		const [result] = await db.insert(landingPages).values({
			unitId,
			pageSlug,
			title,
			contentJson: contentJson ?? null,
			templateId: templateId ?? null,
			isActive: true,
			createdAt: new Date().toISOString()
		});

		await db.insert(riwayatAksi).values({
			userId,
			unitId,
			pesan: `Landing page dibuat: ${title}`,
			kategori: 'MARKETING',
			tipe: 'success'
		});

		return apiSuccess({ id: result.insertId, pageSlug, title }, 'Landing page berhasil dibuat');
	} catch (err) {
		log.api.error({ err }, 'POST /api/app/landing-page');
		return apiError('Gagal membuat landing page', 500);
	}
}

// PUT /api/app/landing-page
export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const body = await request.json();
		const id = Number(body?.id);
		const unitId = Number(body?.unitId);

		if (!id || !unitId) return apiError('id dan unitId wajib', 422);

		const existing = await db.query.landingPages.findFirst({
			where: and(eq(landingPages.id, id), eq(landingPages.unitId, unitId))
		});
		if (!existing) return apiError('Landing page tidak ditemukan', 404);

		const updatePayload = {};
		if (body.pageSlug !== undefined) updatePayload.pageSlug = String(body.pageSlug);
		if (body.title !== undefined) updatePayload.title = String(body.title);
		if (body.contentJson !== undefined) updatePayload.contentJson = body.contentJson;
		if (body.templateId !== undefined) updatePayload.templateId = body.templateId ? String(body.templateId) : null;
		if (body.isActive !== undefined) updatePayload.isActive = Boolean(body.isActive);

		await db.update(landingPages)
			.set(updatePayload)
			.where(and(eq(landingPages.id, id), eq(landingPages.unitId, unitId)));

		await db.insert(riwayatAksi).values({
			userId,
			unitId,
			pesan: `Landing page diperbarui: ${existing.title}`,
			kategori: 'MARKETING',
			tipe: 'info'
		});

		return apiSuccess({ message: 'Landing page berhasil diperbarui' }, 'OK');
	} catch (err) {
		log.api.error({ err }, 'PUT /api/app/landing-page');
		return apiError('Gagal memperbarui landing page', 500);
	}
}

// DELETE /api/app/landing-page?id=X&unitId=X
export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const id = Number(url.searchParams.get('id'));
		const unitId = Number(url.searchParams.get('unitId'));

		if (!id || !unitId) return apiError('id dan unitId wajib', 400);

		const existing = await db.query.landingPages.findFirst({
			where: and(eq(landingPages.id, id), eq(landingPages.unitId, unitId))
		});
		if (!existing) return apiError('Landing page tidak ditemukan', 404);

		await db.delete(landingPages).where(and(eq(landingPages.id, id), eq(landingPages.unitId, unitId)));

		await db.insert(riwayatAksi).values({
			userId,
			unitId,
			pesan: `Landing page dihapus: ${existing.title}`,
			kategori: 'MARKETING',
			tipe: 'warning'
		});

		return apiSuccess({ message: 'Landing page berhasil dihapus' }, 'OK');
	} catch (err) {
		log.api.error({ err }, 'DELETE /api/app/landing-page');
		return apiError('Gagal menghapus landing page', 500);
	}
}
