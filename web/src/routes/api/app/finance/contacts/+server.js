import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { accountingContacts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

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
		const data = await db.query.accountingContacts.findMany({
			where: and(
				eq(accountingContacts.unitId, Number(unitId)),
				eq(accountingContacts.isActive, 1)
			),
			orderBy: [desc(accountingContacts.id)]
		});

		return json({
			success: true,
			message: 'Berhasil mengambil data kontak akuntansi',
			data
		});
	} catch (err) {
		log.finance.error({ err }, 'API GET CONTACTS ERROR');
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
		const { unitId, namaKontak, tipeKontak, email, telepon, alamat } = body;

		if (!unitId || !namaKontak) {
			return json({ success: false, message: 'unitId dan namaKontak wajib diisi' }, { status: 400 });
		}

		const validTipe = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
		const finalTipe = validTipe.includes(tipeKontak) ? tipeKontak : 'CUSTOMER';

		const [inserted] = await db.insert(accountingContacts).values({
			unitId: Number(unitId),
			namaKontak,
			tipeKontak: finalTipe,
			email: email || null,
			telepon: telepon || null,
			alamat: alamat || null,
			isActive: 1
		});

		return json({
			success: true,
			message: 'Kontak akuntansi berhasil dibuat',
			data: { id: inserted.insertId }
		});
	} catch (err) {
		log.finance.error({ err }, 'API POST CONTACT ERROR');
		return json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 });
	}
}
