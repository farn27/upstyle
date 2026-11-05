import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ringkasanBilling } from '$lib/server/billing';
import { log } from '$lib/server/logger';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return { user: null };
	try {
		const r = await ringkasanBilling(db, userId);
		return { user: r.user, currentPlan: r.currentPlan, plans: r.plans, invoices: r.invoices };
	} catch (err) {
		log.api.error({ err }, 'Billing load error');
		return { user: null };
	}
}
