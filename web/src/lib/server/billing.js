/**
 * Billing — SATU sumber untuk halaman web settings/billing, webhook Midtrans, dan API mobile (/api/app/billing/*).
 */
import { eq, sql } from 'drizzle-orm';
import { unitBisnis, users, products, employees, transaksi, riwayatAksi } from '$lib/server/schema';
import { getPlanLimits, estimateStorageGB, getNextBillingDate } from '$lib/server/planLimits';
import { PLAN_PRICES } from '$lib/server/payment';

/** Paket yang ditawarkan (sama dengan kartu paket di halaman billing web) */
export const PAKET = [
	{
		id: 'free',
		name: 'Free Tier',
		price: 'Rp 0',
		amount: 0,
		features: ['3 Unit Bisnis', '2GB Storage', 'Laporan Keuangan Dasar', 'Manajemen Produk', 'Entry Transaksi Manual']
	},
	{
		id: 'pro',
		name: 'Pro Hub',
		price: 'Rp 149k',
		amount: PLAN_PRICES.pro.amount,
		features: ['10 Unit Bisnis', '20GB Storage', 'Sistem POS', 'Manajemen HR / Payroll', 'Portal Karyawan', 'AI Input & Chat Bisnis']
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: 'Rp 499k',
		amount: PLAN_PRICES.enterprise.amount,
		features: ['Unlimited Unit Bisnis', '100GB Storage', 'Semua Fitur Pro Hub', 'CRM Lengkap', 'Audit Log & Security']
	}
];

/** role user → id paket ('user' / kosong dianggap free, sama seperti web) */
export const paketDariRole = (/** @type {string | null | undefined} */ role) => {
	const r = String(role || 'free').toLowerCase();
	return r === 'pro' || r === 'enterprise' ? r : 'free';
};

/**
 * Ringkasan paket & pemakaian user.
 * @param {any} db @param {number} userId
 */
export async function ringkasanBilling(db, userId) {
	const [userData, unitCount, productCount, employeeCount, transactionCount] = await Promise.all([
		db.query.users.findFirst({ where: eq(users.id, userId), columns: { username: true, email: true, role: true, createdAt: true } }),
		db.select({ count: sql`count(*)` }).from(unitBisnis).where(eq(unitBisnis.userId, userId)),
		db.select({ count: sql`count(*)` }).from(products).innerJoin(unitBisnis, eq(products.unitId, unitBisnis.id)).where(eq(unitBisnis.userId, userId)),
		db.select({ count: sql`count(*)` }).from(employees).innerJoin(unitBisnis, eq(employees.companyId, unitBisnis.id)).where(eq(unitBisnis.userId, userId)),
		db.select({ count: sql`count(*)` }).from(transaksi).innerJoin(unitBisnis, eq(transaksi.unitId, unitBisnis.id)).where(eq(unitBisnis.userId, userId))
	]);
	const counts = {
		products: Number(productCount[0]?.count || 0),
		employees: Number(employeeCount[0]?.count || 0),
		transactions: Number(transactionCount[0]?.count || 0)
	};
	const { unitLimit, storageLimitGB, planName } = getPlanLimits(userData?.role);
	const planId = paketDariRole(userData?.role);
	return {
		user: userData,
		planId,
		counts,
		currentPlan: {
			name: planName,
			role: userData?.role || 'free',
			unitsUsed: Number(unitCount[0]?.count || 0),
			unitLimit,
			storageUsed: estimateStorageGB(counts),
			storageLimit: storageLimitGB
		},
		plans: PAKET.map(({ amount: _a, ...p }) => ({ ...p, isCurrent: p.id === planId })),
		nextBillingDate: userData?.createdAt && planId !== 'free' ? getNextBillingDate(userData.createdAt) : '',
		invoices: /** @type {any[]} */ ([]) // belum ada tabel invoice — sama dengan halaman web
	};
}

/**
 * Pembayaran lunas → naikkan paket user. Dipakai webhook Midtrans & konfirmasi dari app (idempoten).
 * @param {any} db @param {number} userId @param {string} planId
 * @returns {Promise<boolean>} true kalau paket berubah
 */
export async function aktifkanPaket(db, userId, planId) {
	if (!['pro', 'enterprise'].includes(planId)) return false;
	const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } });
	if (!user || String(user.role).toLowerCase() === planId) return false;
	await db.update(users).set({ role: planId }).where(eq(users.id, userId));
	const [unit] = await db.select({ id: unitBisnis.id }).from(unitBisnis).where(eq(unitBisnis.userId, userId)).orderBy(unitBisnis.id).limit(1);
	if (unit) {
		await db.insert(riwayatAksi).values({ userId, unitId: unit.id, pesan: `Upgrade ke paket ${planId.toUpperCase()} berhasil`, tipe: 'success', kategori: 'billing' }).catch(() => {});
	}
	return true;
}

/**
 * order_id Midtrans: UPSTYLE-{PLAN}-{USER_ID}-{TIMESTAMP}
 * @param {unknown} orderId
 * @returns {{ planId: string, userId: number } | null}
 */
export function bacaOrderId(orderId) {
	const parts = String(orderId || '').split('-');
	if (parts.length < 4 || parts[0] !== 'UPSTYLE') return null;
	const planId = parts[1].toLowerCase();
	const userId = Number(parts[2]);
	if (!['pro', 'enterprise'].includes(planId) || !Number.isInteger(userId) || userId <= 0) return null;
	return { planId, userId };
}
