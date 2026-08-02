import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { receivables, accountingContacts } from '$lib/server/schema';
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
		const list = await db.query.receivables.findMany({
			where: eq(receivables.unitId, Number(unitId)),
			orderBy: [desc(receivables.id)],
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
			message: 'Berhasil mengambil data piutang',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET RECEIVABLES ERROR');
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
		const { unitId, contactId, nomorInvoice, tanggal, jatuhTempo, nominal, keterangan } = body;

		if (!unitId || !contactId || !nomorInvoice || !tanggal || !jatuhTempo || nominal == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		const [inserted] = await db.insert(receivables).values({
			unitId: Number(unitId),
			contactId: Number(contactId),
			nomorInvoice,
			tanggal,
			jatuhTempo,
			nominal: String(nominal),
			sudahDibayar: '0',
			status: 'BELUM_BAYAR',
			keterangan: keterangan || null
		});

		try {
			await triggerEvent(`unit-${unitId}`, 'receivable-created', {
				id: inserted.insertId,
				nomorInvoice
			});
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({
			success: true,
			message: 'Piutang berhasil dibuat',
			data: { id: inserted.insertId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST RECEIVABLE ERROR');
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

		const receivable = await db.query.receivables.findFirst({
			where: eq(receivables.id, Number(invoiceId))
		});

		if (!receivable) {
			return json({ success: false, message: 'Data piutang tidak ditemukan' }, { status: 404 });
		}

		const bayar = Number(nominalBayar);
		if (isNaN(bayar) || bayar <= 0) {
			return json({ success: false, message: 'Nominal bayar harus lebih dari 0' }, { status: 400 });
		}

		const currentSudahDibayar = Number(receivable.sudahDibayar || 0);
		const newSudahDibayar = currentSudahDibayar + bayar;
		const totalNominal = Number(receivable.nominal);

		const newStatus = newSudahDibayar >= totalNominal ? 'LUNAS' : 'SEBAGIAN';

		await db.update(receivables)
			.set({
				sudahDibayar: String(newSudahDibayar),
				status: newStatus
			})
			.where(eq(receivables.id, Number(invoiceId)));

		try {
			await triggerEvent(`unit-${receivable.unitId}`, 'receivable-updated', {
				id: receivable.id,
				sudahDibayar: newSudahDibayar,
				status: newStatus
			});
		} catch (e) {
			// ignore pusher error
		}

		return json({
			success: true,
			message: 'Pembayaran piutang berhasil dicatat',
			data: {
				id: receivable.id,
				sudahDibayar: newSudahDibayar,
				status: newStatus
			}
		});
	} catch (err) {
		log.finance.error({ err }, 'API PUT RECEIVABLE ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
