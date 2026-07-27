import { db } from '$lib/server/drizzle';
import { unitBisnis, users, products, employees, transaksi } from '$lib/server/schema';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { getPlanLimits, estimateStorageGB, getNextBillingDate } from '$lib/server/planLimits';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const userId = await getCurrentUserId(cookies);

	if (!userId) return { user: null, stats: {} };

	try {
		const [userData, businessCount, productCount, employeeCount, transactionCount] = await Promise.all([
			db.query.users.findFirst({
				where: eq(users.id, userId),
				columns: { username: true, role: true, createdAt: true }
			}),
			db
				.select({ jumlahUnit: sql`count(id)` })
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
		const storageUsedGB = estimateStorageGB(counts);

		return {
			user: userData,
			stats: {
				totalUnit: businessCount[0]?.jumlahUnit || 0,
				unitLimit,
				storage: {
					used: storageUsedGB,
					max: storageLimitGB,
					percent: Math.min(100, Math.round((storageUsedGB / storageLimitGB) * 100))
				},
				usage: {
					products: Number(counts.products) || 0,
					employees: Number(counts.employees) || 0,
					transactions: Number(counts.transactions) || 0
				}
			},
			subscription: {
				plan: planName,
				status: 'Active',
				nextBilling: userData?.createdAt ? getNextBillingDate(userData.createdAt) : '-',
				memberSince: userData?.createdAt
					? new Date(userData.createdAt).toLocaleDateString('id-ID', {
							month: 'long',
							year: 'numeric'
						})
					: '-'
			},
			devUpdates: [
				{
					id: 1,
					tag: 'NEW',
					title: 'Modul POS Terintegrasi',
					desc: 'Transaksi kasir langsung tercatat di dashboard keuangan unit.'
				},
				{
					id: 2,
					tag: 'UPDATE',
					title: 'Keamanan Portal Karyawan',
					desc: 'Password karyawan kini di-hash Argon2 saat login dan pendaftaran.'
				},
				{
					id: 3,
					tag: 'TIPS',
					title: 'Keamanan Akun',
					desc: 'Gunakan password unik dan rotate API key Groq secara berkala.'
				}
			],
			taxCalendar: [
				{ tgl: '10 Feb', hal: 'Batas Setor PPh 21' },
				{ tgl: '20 Feb', hal: 'Batas Lapor PPN Masa' },
				{ tgl: '28 Feb', hal: 'Batas SPT Tahunan Badan' }
			],
			insights: [
				{
					kategori: 'TIPS',
					judul: 'Manajemen Kas Tanpa Pusing',
					img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500'
				},
				{
					kategori: 'IDE',
					judul: 'Strategi Ekspansi Unit Baru',
					img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=500'
				}
			]
		};
	} catch (err) {
		console.error('GAGAL LOAD BERANDA:', err);
		return { user: null, stats: {} };
	}
}
