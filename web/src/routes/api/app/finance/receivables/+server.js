import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { receivables, accountingContacts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { triggerEvent } from '$lib/server/pusher';
import { buatPiutang, bayarPiutang, PiutangError } from '$lib/server/piutang';

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

export async function POST({ request, cookies, url }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		// App mobile mengirim unitId lewat query & tanpa nomor invoice → nomor dibuat otomatis
		const unitId = body.unitId ?? url.searchParams.get('unitId');
		const { contactId, nomorInvoice, tanggal, jatuhTempo, nominal, keterangan } = body;

		if (!unitId || !contactId || !tanggal || !jatuhTempo || nominal == null) {
			return json({ success: false, message: 'Data tidak lengkap' }, { status: 400 });
		}

		// Pelanggan wajib milik unit; invoice langsung dijurnal (Debit Piutang / Kredit Pendapatan)
		const hasil = await buatPiutang(db, { unitId: Number(unitId), userId }, { contactId, nomorInvoice, tanggal, jatuhTempo, nominal, keterangan });

		try {
			await triggerEvent(`unit-${unitId}`, 'receivable-created', { id: hasil.id, nomorInvoice: hasil.nomorInvoice });
		} catch (e) {
			// ignore pusher notification errors
		}

		return json({ success: true, message: 'Piutang berhasil dibuat', data: { id: hasil.id } });
	} catch (err) {
		if (err instanceof PiutangError) return json({ success: false, message: err.message }, { status: err.status });
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
		const { invoiceId, nominalBayar, kasCoaId } = body;

		if (!invoiceId || nominalBayar == null) {
			return json({ success: false, message: 'invoiceId dan nominalBayar wajib diisi' }, { status: 400 });
		}

		const receivable = await db.query.receivables.findFirst({
			where: eq(receivables.id, Number(invoiceId))
		});

		if (!receivable || !(await unitMilikUser(db, userId, receivable.unitId))) {
			return json({ success: false, message: 'Data piutang tidak ditemukan' }, { status: 404 });
		}

		// Nominal tidak boleh melebihi sisa; invoice berjurnal → pembayaran juga dijurnal ke kas
		const hasil = await bayarPiutang(db, { unitId: receivable.unitId, userId }, receivable.id, { nominal: nominalBayar, kasCoaId });

		try {
			await triggerEvent(`unit-${receivable.unitId}`, 'receivable-updated', {
				id: receivable.id,
				sudahDibayar: hasil.sudahDibayar,
				status: hasil.status
			});
		} catch (e) {
			// ignore pusher error
		}

		return json({
			success: true,
			message: 'Pembayaran piutang berhasil dicatat',
			data: {
				id: receivable.id,
				sudahDibayar: hasil.sudahDibayar,
				status: hasil.status
			}
		});
	} catch (err) {
		if (err instanceof PiutangError) return json({ success: false, message: err.message }, { status: err.status });
		log.finance.error({ err }, 'API PUT RECEIVABLE ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
