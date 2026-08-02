import { db } from '$lib/server/drizzle';
import { unitBisnis, users, products, employees, transaksi } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { getPlanLimits, estimateStorageGB } from '$lib/server/planLimits';
import { log } from '$lib/server/logger';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const userId = await getCurrentUserId(cookies);

	if (!userId) return { user: null };

	try {
		const [userData, unitCount, productCount, employeeCount, transactionCount] = await Promise.all([
			db.query.users.findFirst({
				where: eq(users.id, userId),
				columns: { username: true, role: true, createdAt: true }
			}),
			db
				.select({ count: sql`count(id)` })
				.from(unitBisnis)
				.where(eq(unitBisnis.userId, userId)),
			db.select({ count: sql`count(*)` })
				.from(products)
				.innerJoin(unitBisnis, eq(products.unitId, unitBisnis.id))
				.where(eq(unitBisnis.userId, userId)),
			db.select({ count: sql`count(*)` })
				.from(employees)
				.innerJoin(unitBisnis, eq(employees.companyId, unitBisnis.id))
				.where(eq(unitBisnis.userId, userId)),
			db.select({ count: sql`count(*)` })
				.from(transaksi)
				.innerJoin(unitBisnis, eq(transaksi.unitId, unitBisnis.id))
				.where(eq(unitBisnis.userId, userId))
		]);

		const counts = {
			products: productCount[0]?.count || 0,
			employees: employeeCount[0]?.count || 0,
			transactions: transactionCount[0]?.count || 0
		};
		const { unitLimit, storageLimitGB, planName } = getPlanLimits(userData?.role);
		const storageUsed = estimateStorageGB(counts);
		const totalUnits = unitCount[0]?.count || 0;

		return {
			user: userData,
			currentPlan: {
				name: planName,
				role: userData?.role || 'free',
				unitsUsed: totalUnits,
				unitLimit,
				storageUsed,
				storageLimit: storageLimitGB
			},
			plans: [
				{
					id: 'free',
					name: 'Free Tier',
					price: 'Rp 0',
					features: [
						'3 Unit Bisnis',
						'2GB Storage',
						'Laporan Keuangan Dasar',
						'Manajemen Produk',
						'Entry Transaksi Manual'
					],
					isCurrent: !userData?.role || userData.role === 'free' || userData.role === 'user'
				},
				{
					id: 'pro',
					name: 'Pro Hub',
					price: 'Rp 149k',
					features: [
						'10 Unit Bisnis',
						'20GB Storage',
						'Sistem POS',
						'Manajemen HR / Payroll',
						'Portal Karyawan',
						'AI Input & Chat Bisnis'
					],
					isCurrent: userData?.role === 'pro'
				},
				{
					id: 'enterprise',
					name: 'Enterprise',
					price: 'Rp 499k',
					features: [
						'Unlimited Unit Bisnis',
						'100GB Storage',
						'Semua Fitur Pro Hub',
						'CRM Lengkap',
						'Audit Log & Security'
					],
					isCurrent: userData?.role === 'enterprise'
				}
			],
			invoices: []
		};
	} catch (err) {
		log.api.error({ err }, 'Billing load error');
		return { user: null };
	}
}
