import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { transaksi, products, unitBisnis } from '$lib/server/schema';
import { eq, and, desc, gt } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

/**
 * API endpoint for polling updates
 * Returns recent transactions and product changes since lastUpdate timestamp
 */
export async function GET({ url, cookies }) {
    const userId = await getCurrentUserId(cookies);
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const slug = url.searchParams.get('slug');
    const lastUpdate = url.searchParams.get('lastUpdate');
    const updateType = url.searchParams.get('type') || 'all'; // 'transactions', 'products', 'all'

    if (!slug) {
        return json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    try {
        // Get unit info
        const units = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId)))
            .limit(1);

        if (units.length === 0) {
            return json({ error: 'Unit not found' }, { status: 404 });
        }

        const unitId = units[0].id;
        const lastUpdateDate = lastUpdate ? new Date(parseInt(lastUpdate)) : new Date(Date.now() - 60000); // Default 1 minute ago

        const updates = {
            transactions: [],
            products: [],
            timestamp: Date.now()
        };

        // Get recent transactions
        if (updateType === 'all' || updateType === 'transactions') {
            const recentTransactions = await db.select({
                id: transaksi.id,
                keterangan: transaksi.keterangan,
                nominal: transaksi.totalHarga,
                kategoriTrx: transaksi.kategoriTrx,
                tanggal: transaksi.tanggal,
                orderNumber: transaksi.orderNumber
            })
            .from(transaksi)
            .where(and(
                eq(transaksi.unitId, unitId),
                gt(transaksi.tanggal, lastUpdateDate.toISOString())
            ))
            .orderBy(desc(transaksi.tanggal))
            .limit(10);

            updates.transactions = recentTransactions;
        }

        // Get recent product updates (stock changes)
        if (updateType === 'all' || updateType === 'products') {
            const recentProducts = await db.select({
                id: products.id,
                nama: products.nama,
                stok: products.stok,
                updatedAt: products.updatedAt
            })
            .from(products)
            .where(and(
                eq(products.unitId, unitId),
                gt(products.updatedAt, lastUpdateDate.toISOString())
            ))
            .orderBy(desc(products.updatedAt))
            .limit(10);

            updates.products = recentProducts;
        }

        return json(updates);

    } catch (error) {
        console.error('[Updates API] Error:', error);
        return json({ error: 'Failed to fetch updates' }, { status: 500 });
    }
}
