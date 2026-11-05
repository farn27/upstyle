import { and, asc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, purchaseOrderItems, purchaseOrders, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { STATUS_TERBUKA } from '$lib/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);

	const [menipis, dipesan] = await Promise.all([
		db
			.select({
				id: products.id,
				nama: products.nama,
				sku: products.sku,
				stok: products.stok,
				minStok: products.minStok,
				hargaBeli: products.hargaBeli,
				supplierId: products.supplierId,
				namaSupplier: suppliers.namaSupplier
			})
			.from(products)
			.leftJoin(suppliers, eq(products.supplierId, suppliers.id))
			.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt), eq(products.status, 'active'), gt(products.minStok, 0), lte(products.stok, products.minStok)))
			.orderBy(asc(products.stok)),
		db
			.select({ productId: purchaseOrderItems.productId, jumlah: sql`SUM(${purchaseOrderItems.qtyOrdered} - COALESCE(${purchaseOrderItems.qtyReceived}, 0))` })
			.from(purchaseOrderItems)
			.innerJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id))
			.where(and(eq(purchaseOrders.unitId, unit.id), inArray(purchaseOrders.status, STATUS_TERBUKA)))
			.groupBy(purchaseOrderItems.productId)
	]);

	const petaDipesan = new Map(dipesan.map((d) => [d.productId, Number(d.jumlah || 0)]));
	return {
		unit,
		produk: menipis.map((p) => {
			const sedangDipesan = petaDipesan.get(p.id) || 0;
			// Isi sampai dua kali batas minimum, dikurangi yang sudah dipesan
			const saran = Math.max(0, Number(p.minStok) * 2 - Number(p.stok || 0) - sedangDipesan);
			return { ...p, sedangDipesan, saran };
		})
	};
}
