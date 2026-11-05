import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ringkasanBilling, PAKET } from '$lib/server/billing';
import { getPlanLimits } from '$lib/server/planLimits';

/** GET /api/app/billing/plans — paket (sama dengan kartu paket di settings/billing web), bentuk SubscriptionPlan */
export async function GET({ cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const { planId } = await ringkasanBilling(db, userId);
	const data = PAKET.map((p) => {
		const batas = getPlanLimits(p.id);
		return {
			id: p.id,
			name: p.name,
			tier: p.id.toUpperCase(),
			features: p.features,
			limits: { maxProducts: 0, maxStorageMb: batas.storageLimitGB * 1024, maxUsers: 0, maxBusinessUnits: batas.unitLimit },
			pricing: { monthly: p.amount, yearly: 0, currency: 'IDR' },
			isPopular: p.id === 'pro',
			isCurrent: p.id === planId,
			description: p.price
		};
	});
	return json({ success: true, data });
}
