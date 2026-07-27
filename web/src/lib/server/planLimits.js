/** @param {string | null | undefined} role */
export function getPlanLimits(role) {
	const r = String(role || 'free').toLowerCase();

	if (r === 'enterprise') {
		return { unitLimit: 999, storageLimitGB: 100, planName: 'Enterprise' };
	}
	if (r === 'pro') {
		return { unitLimit: 10, storageLimitGB: 20, planName: 'Pro Hub' };
	}
	return { unitLimit: 3, storageLimitGB: 2, planName: 'Free Tier' };
}

/**
 * Estimasi storage dari jumlah record (GB).
 * @param {{ products?: number, employees?: number, transactions?: number }} counts
 */
export function estimateStorageGB(counts) {
	const products = Number(counts.products) || 0;
	const employees = Number(counts.employees) || 0;
	const transactions = Number(counts.transactions) || 0;
	const estimated = products * 0.05 + employees * 0.002 + transactions * 0.001;
	return Math.round(Math.max(0.01, estimated) * 100) / 100;
}

/** @param {string | Date} createdAt */
export function getNextBillingDate(createdAt) {
	const base = new Date(createdAt);
	const next = new Date(base);
	next.setDate(15);
	if (next <= new Date()) {
		next.setMonth(next.getMonth() + 1);
	}
	return next.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
