import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ringkasanBilling } from '$lib/server/billing';

/** GET /api/app/billing/invoices — sama dengan web: belum ada tabel invoice, jadi daftar kosong */
export async function GET({ cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const { invoices } = await ringkasanBilling(db, userId);
	return json({ success: true, data: invoices });
}
