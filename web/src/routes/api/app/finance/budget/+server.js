import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { budgetItems } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { triggerEvent } from '$lib/server/pusher';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const unitId = url.searchParams.get('unitId');
	if (!unitId) {
		return json({ success: false, message: 'unitId parameter is required' }, { status: 400 });
	}

	const tahun = url.searchParams.get('tahun');

	try {
		const conditions = [eq(budgetItems.unitId, Number(unitId))];
		if (tahun) {
			conditions.push(eq(budgetItems.tahun, Number(tahun)));
		}

		const data = await db.query.budgetItems.findMany({
			where: and(...conditions),
			orderBy: [desc(budgetItems.tahun), desc(budgetItems.bulan)]
		});

		return json({
			success: true,
			message: 'Berhasil mengambil data anggaran',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET BUDGET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { unitId, coaId, tahun, bulan, nominal, keterangan } = body;

		if (!unitId || !coaId || tahun == null || bulan == null || nominal == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const existing = await db.query.budgetItems.findFirst({
			where: and(
				eq(budgetItems.unitId, Number(unitId)),
				eq(budgetItems.coaId, Number(coaId)),
				eq(budgetItems.tahun, Number(tahun)),
				eq(budgetItems.bulan, Number(bulan))
			)
		});

		let budgetId;
		if (existing) {
			await db.update(budgetItems)
				.set({
					nominal: String(nominal),
					keterangan: keterangan || null
				})
				.where(eq(budgetItems.id, existing.id));
			budgetId = existing.id;
		} else {
			const [inserted] = await db.insert(budgetItems).values({
				unitId: Number(unitId),
				coaId: Number(coaId),
				tahun: Number(tahun),
				bulan: Number(bulan),
				nominal: String(nominal),
				keterangan: keterangan || null
			});
			budgetId = inserted.insertId;
		}

		try {
			await triggerEvent(`unit-${unitId}`, 'budget-saved', {
				id: budgetId,
				coaId,
				tahun,
				bulan
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Anggaran berhasil disimpan',
			data: { id: budgetId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST BUDGET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id, nominal, keterangan } = body;

		if (!id) {
			return json({ success: false, message: 'id anggaran wajib diisi' }, { status: 400 });
		}

		const budget = await db.query.budgetItems.findFirst({
			where: eq(budgetItems.id, Number(id))
		});

		if (!budget) {
			return json({ success: false, message: 'Data anggaran tidak ditemukan' }, { status: 404 });
		}

		await db.update(budgetItems)
			.set({
				nominal: nominal != null ? String(nominal) : budget.nominal,
				keterangan: keterangan !== undefined ? keterangan : budget.keterangan
			})
			.where(eq(budgetItems.id, Number(id)));

		try {
			await triggerEvent(`unit-${budget.unitId}`, 'budget-updated', {
				id: budget.id
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Anggaran berhasil diperbarui',
			data: { id: budget.id }
		});
	} catch (err) {
		log.finance.error({ err }, 'API PUT BUDGET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const budgetId = url.searchParams.get('budgetId');
	if (!budgetId) {
		return json({ success: false, message: 'budgetId parameter is required' }, { status: 400 });
	}

	try {
		const budget = await db.query.budgetItems.findFirst({
			where: eq(budgetItems.id, Number(budgetId))
		});

		if (!budget) {
			return json({ success: false, message: 'Data anggaran tidak ditemukan' }, { status: 404 });
		}

		await db.delete(budgetItems)
			.where(eq(budgetItems.id, Number(budgetId)));

		try {
			await triggerEvent(`unit-${budget.unitId}`, 'budget-deleted', {
				id: budget.id
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Anggaran berhasil dihapus',
			data: { id: budget.id }
		});
	} catch (err) {
		log.finance.error({ err }, 'API DELETE BUDGET ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
