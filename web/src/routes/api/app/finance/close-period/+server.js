import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { closingPeriods, transaksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
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
		const data = await db.query.closingPeriods.findMany({
			where: eq(closingPeriods.unitId, Number(unitId)),
			orderBy: [desc(closingPeriods.createdAt)]
		});

		return json({
			success: true,
			message: 'Berhasil mengambil data periode tutup buku',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET CLOSING PERIODS ERROR');
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
		const { unitId, periodStart, periodEnd, keterangan } = body;

		if (!unitId || !periodStart || !periodEnd) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const [summary] = await db
			.select({
				totalMasuk: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
				totalKeluar: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
			})
			.from(transaksi)
			.where(
				and(
					eq(transaksi.unitId, Number(unitId)),
					sql`DATE(${transaksi.tanggal}) BETWEEN ${periodStart} AND ${periodEnd}`
				)
			);

		const labaRugiPeriode = Number(summary?.totalMasuk || 0) - Number(summary?.totalKeluar || 0);

		const [inserted] = await db.insert(closingPeriods).values({
			unitId: Number(unitId),
			userId,
			periodStart,
			periodEnd,
			status: 'CLOSED',
			labaRugiPeriode: String(labaRugiPeriode),
			keterangan: keterangan || null,
			closedAt: new Date()
		});

		try {
			await triggerEvent(`unit-${unitId}`, 'period-closed', {
				id: inserted.insertId,
				periodStart,
				periodEnd,
				labaRugiPeriode
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Periode buku berhasil ditutup',
			data: {
				id: inserted.insertId,
				labaRugiPeriode
			}
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST CLOSE PERIOD ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
