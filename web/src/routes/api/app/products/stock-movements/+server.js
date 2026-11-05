import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, stockLogs } from '$lib/server/schema';
import { and, desc, eq } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

/** alasan di stock_logs → tipe StockMovement di app mobile */
const TIPE = /** @type {Record<string, string>} */ ({
	PENJUALAN: 'SALE',
	MASUK: 'PURCHASE',
	RETUR: 'RETURN',
	OPNAME: 'ADJUSTMENT',
	ADJUSTMENT: 'ADJUSTMENT',
	RUSAK: 'ADJUSTMENT',
	KELUAR: 'ADJUSTMENT'
});

/**
 * GET /api/app/products/stock-movements?unitId=X&productId=Y[&limit=50]
 * Riwayat pergerakan stok satu produk — sama dengan halaman web produk/[productSlug]/stock_logs.
 * (unitId dicek milik user oleh guard di hooks.server.js)
 */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

	const unitId = Number(url.searchParams.get('unitId'));
	const productId = url.searchParams.get('productId');
	if (!unitId || !productId) {
		return json({ success: false, message: 'unitId dan productId wajib diisi' }, { status: 400 });
	}
	const limit = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')) || 50));

	try {
		const produk = await db.query.products.findFirst({
			where: and(eq(products.id, productId), eq(products.unitId, unitId)),
			columns: { id: true }
		});
		if (!produk) return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });

		const logs = await db
			.select()
			.from(stockLogs)
			.where(and(eq(stockLogs.productId, productId), eq(stockLogs.unitId, unitId)))
			.orderBy(desc(stockLogs.createdAt))
			.limit(limit);

		const data = logs.map((l) => ({
			id: l.id,
			productId: l.productId || productId,
			variantId: null,
			type: TIPE[l.alasan] || 'ADJUSTMENT',
			quantity: l.perubahan,
			stockBefore: l.stokAwal,
			stockAfter: l.stokAkhir,
			reason: l.alasan,
			notes: l.keterangan || null,
			referenceId: null,
			createdBy: String(l.userId || ''),
			createdAt: l.createdAt || ''
		}));

		return json({ success: true, data });
	} catch (err) {
		log.api.error({ err }, 'GET products/stock-movements');
		return json({ success: false, message: 'Gagal memuat riwayat stok' }, { status: 500 });
	}
}
