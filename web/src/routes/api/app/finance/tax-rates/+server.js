import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { taxRates } from '$lib/server/schema';
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

	try {
		const data = await db.query.taxRates.findMany({
			where: and(
				eq(taxRates.unitId, Number(unitId)),
				eq(taxRates.isActive, 1)
			),
			orderBy: [desc(taxRates.id)]
		});

		return json({
			success: true,
			message: 'Berhasil mengambil tarif pajak',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET TAX RATES ERROR');
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
		const { unitId, namaPajak, persentase, tipe, isDefault, coaId } = body;

		if (!unitId || !namaPajak || persentase == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const [inserted] = await db.insert(taxRates).values({
			unitId: Number(unitId),
			namaPajak,
			persentase: String(persentase),
			tipe: tipe || 'PPN',
			isDefault: isDefault ? 1 : 0,
			isActive: 1,
			coaId: coaId ? Number(coaId) : null
		});

		try {
			await triggerEvent(`unit-${unitId}`, 'tax-rate-created', {
				id: inserted.insertId,
				namaPajak
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Tarif pajak berhasil dibuat',
			data: { id: inserted.insertId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST TAX RATE ERROR');
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
		const { id, namaPajak, persentase, isDefault, isActive, tipe, coaId } = body;

		if (!id) {
			return json({ success: false, message: 'id tarif pajak wajib diisi' }, { status: 400 });
		}

		const tax = await db.query.taxRates.findFirst({
			where: eq(taxRates.id, Number(id))
		});

		if (!tax) {
			return json({ success: false, message: 'Tarif pajak tidak ditemukan' }, { status: 404 });
		}

		await db.update(taxRates)
			.set({
				namaPajak: namaPajak !== undefined ? namaPajak : tax.namaPajak,
				persentase: persentase != null ? String(persentase) : tax.persentase,
				tipe: tipe !== undefined ? tipe : tax.tipe,
				isDefault: isDefault != null ? (isDefault ? 1 : 0) : tax.isDefault,
				isActive: isActive != null ? (isActive ? 1 : 0) : tax.isActive,
				coaId: coaId !== undefined ? (coaId ? Number(coaId) : null) : tax.coaId
			})
			.where(eq(taxRates.id, Number(id)));

		try {
			await triggerEvent(`unit-${tax.unitId}`, 'tax-rate-updated', {
				id: tax.id
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Tarif pajak berhasil diperbarui',
			data: { id: tax.id }
		});
	} catch (err) {
		log.finance.error({ err }, 'API PUT TAX RATE ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}

export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const taxId = url.searchParams.get('taxId');
	if (!taxId) {
		return json({ success: false, message: 'taxId parameter is required' }, { status: 400 });
	}

	try {
		const tax = await db.query.taxRates.findFirst({
			where: eq(taxRates.id, Number(taxId))
		});

		if (!tax) {
			return json({ success: false, message: 'Tarif pajak tidak ditemukan' }, { status: 404 });
		}

		await db.update(taxRates)
			.set({ isActive: 0 })
			.where(eq(taxRates.id, Number(taxId)));

		try {
			await triggerEvent(`unit-${tax.unitId}`, 'tax-rate-deleted', {
				id: tax.id
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Tarif pajak berhasil dinonaktifkan',
			data: { id: tax.id }
		});
	} catch (err) {
		log.finance.error({ err }, 'API DELETE TAX RATE ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
