import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { eq, and, sql, asc } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { unitBisnis, chartOfAccounts, products as productsTable } from '$lib/server/schema';

/**
 * GET /api/transaction/master-data?unit={slug}
 * Returns kas accounts, COA accounts, and products for AI Transaction Wizard
 */
export async function GET({ url, cookies, request }) {
	try {
		const userId = await getCurrentUserId(cookies, request);
		if (!userId) {
			return json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const unitSlug = url.searchParams.get('unit');
		if (!unitSlug) {
			return json({ success: false, message: 'Unit slug diperlukan' }, { status: 400 });
		}

		// Verify unit belongs to user
		const unit = await db.query.unitBisnis.findFirst({
			where: and(eq(unitBisnis.slug, unitSlug), eq(unitBisnis.userId, userId))
		});

		if (!unit) {
			return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });
		}

		// Load all active COA
		const coaList = await db.select({
			id: chartOfAccounts.id,
			kodeAkun: chartOfAccounts.kodeAkun,
			namaAkun: chartOfAccounts.namaAkun,
			tipeAkun: chartOfAccounts.tipeAkun,
			normalBalance: chartOfAccounts.normalBalance
		}).from(chartOfAccounts)
		  .where(and(
			eq(chartOfAccounts.unitId, unit.id),
			eq(chartOfAccounts.isActive, 1)
		  ))
		  .orderBy(chartOfAccounts.kodeAkun);

		// Filter kas/bank accounts (ASET_LANCAR with matching names)
		const kasAccounts = coaList.filter(c =>
			c.tipeAkun === 'ASET_LANCAR' && (
				c.namaAkun.toLowerCase().includes('kas') ||
				c.namaAkun.toLowerCase().includes('bank') ||
				c.namaAkun.toLowerCase().includes('transfer') ||
				c.namaAkun.toLowerCase().includes('qris') ||
				c.namaAkun.toLowerCase().includes('digital') ||
				c.namaAkun.toLowerCase().includes('gopay') ||
				c.namaAkun.toLowerCase().includes('ovo') ||
				c.namaAkun.toLowerCase().includes('dana')
			)
		);

		// Load products for this unit
		const productsList = await db.select({
			id: productsTable.id,
			nama: productsTable.nama,
			hargaJual: productsTable.hargaJual,
			hargaBeli: productsTable.hargaBeli,
			stok: productsTable.stok,
			minStok: productsTable.minStok,
			sku: productsTable.sku
		}).from(productsTable)
		  .where(and(
			eq(productsTable.unitId, unit.id),
			sql`${productsTable.deletedAt} IS NULL`
		  ))
		  .orderBy(asc(productsTable.nama));

		return json({
			success: true,
			hasCoa: coaList.length > 0,
			kasAccounts,
			coaAccounts: coaList,
			products: productsList
		});

	} catch (err) {
		log.api?.error?.({ err }, '[Transaction Master Data API]');
		console.error('[Transaction Master Data API]', err);
		return json({ success: false, message: 'Server error' }, { status: 500 });
	}
}
