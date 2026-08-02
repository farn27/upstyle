import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { payables, accountingContacts } from '$lib/server/schema';
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
		const list = await db.query.payables.findMany({
			where: eq(payables.unitId, Number(unitId)),
			orderBy: [desc(payables.id)],
			with: {
				contact: true
			}
		});

		const data = list.map((item) => ({
			...item,
			namaKontak: item.contact?.namaKontak || null
		}));

		return json({
			success: true,
			message: 'Berhasil mengambil data hutang',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET PAYABLES ERROR');
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
		const { unitId, contactId, nomorFaktur, tanggal, jatuhTempo, nominal, keterangan } = body;

		if (!unitId || !contactId || !nomorFaktur || !tanggal || !jatuhTempo || nominal == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const [inserted] = await db.insert(payables).values({
			unitId: Number(unitId),
			contactId: Number(contactId),
			nomorFaktur,
			tanggal,
			jatuhTempo,
			nominal: String(nominal),
			sudahDibayar: '0',
			status: 'BELUM_BAYAR',
			keterangan: keterangan || null
		});

		try {
			await triggerEvent(`unit-${unitId}`, 'payable-created', {
				id: inserted.insertId,
				nomorFaktur
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Hutang berhasil dibuat',
			data: { id: inserted.insertId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST PAYABLE ERROR');
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
		const { invoiceId, nominalBayar } = body;

		if (!invoiceId || nominalBayar == null) {
			return json({ success: false, message: 'invoiceId dan nominalBayar wajib diisi' }, { status: 400 });
		}

		const payable = await db.query.payables.findFirst({
			where: eq(payables.id, Number(invoiceId))
		});

		if (!payable) {
			return json({ success: false, message: 'Data hutang tidak ditemukan' }, { status: 404 });
		}

		const bayar = Number(nominalBayar);
		if (isNaN(bayar) || bayar <= 0) {
			return json({ success: false, message: 'Nominal bayar harus lebih dari 0' }, { status: 400 });
		}

		const currentSudahDibayar = Number(payable.sudahDibayar || 0);
		const newSudahDibayar = currentSudahDibayar + bayar;
		const totalNominal = Number(payable.nominal);

		const newStatus = newSudahDibayar >= totalNominal ? 'LUNAS' : 'SEBAGIAN';

		await db.update(payables)
			.set({
				sudahDibayar: String(newSudahDibayar),
				status: newStatus
			})
			.where(eq(payables.id, Number(invoiceId)));

		try {
			await triggerEvent(`unit-${payable.unitId}`, 'payable-updated', {
				id: payable.id,
				sudahDibayar: newSudahDibayar,
				status: newStatus
			});
		} catch (e) {
			// ignore pusher error
		}

		return json({
			success: true,
			message: 'Pembayaran hutang berhasil dicatat',
			data: {
				id: payable.id,
				sudahDibayar: newSudahDibayar,
				status: newStatus
			}
		});
	} catch (err) {
		log.finance.error({ err }, 'API PUT PAYABLE ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
