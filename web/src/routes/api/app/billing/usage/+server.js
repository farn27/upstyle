import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ringkasanBilling } from '$lib/server/billing';

/** GET /api/app/billing/usage — pemakaian vs batas paket (bentuk UsageMetrics) */
export async function GET({ cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const r = await ringkasanBilling(db, userId);
	return json({
		success: true,
		data: {
			products: r.counts.products,
			storageUsedMb: Math.round(r.currentPlan.storageUsed * 1024),
			users: r.counts.employees,
			businessUnits: r.currentPlan.unitsUsed,
			apiCallsThisMonth: 0,
			lastUpdated: new Date().toISOString(),
			limits: { maxProducts: 0, maxStorageMb: r.currentPlan.storageLimit * 1024, maxUsers: 0, maxBusinessUnits: r.currentPlan.unitLimit }
		}
	});
}
