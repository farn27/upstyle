import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, purchaseOrders, purchaseReturnItems, purchaseReturns, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const baris = await db
		.select({
			id: purchaseReturns.id,
			nomor: purchaseReturns.nomor,
			tanggal: purchaseReturns.tanggal,
			alasan: purchaseReturns.alasan,
			nilaiPotongHutang: purchaseReturns.nilaiPotongHutang,
			poId: purchaseReturns.poId,
			poNumber: purchaseOrders.poNumber,
			namaSupplier: suppliers.namaSupplier
		})
		.from(purchaseReturns)
		.innerJoin(purchaseOrders, eq(purchaseReturns.poId, purchaseOrders.id))
		.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(eq(purchaseReturns.unitId, unit.id))
		.orderBy(desc(purchaseReturns.id))
		.limit(200);

	const isi = baris.length
		? await db
				.select({ returnId: purchaseReturnItems.returnId, qty: purchaseReturnItems.qty, nama: products.nama })
				.from(purchaseReturnItems)
				.leftJoin(products, eq(purchaseReturnItems.productId, products.id))
				.where(inArray(purchaseReturnItems.returnId, baris.map((b) => b.id)))
		: [];

	return {
		unit,
		retur: baris.map((b) => ({
			...b,
			ringkasan: isi.filter((i) => i.returnId === b.id).map((i) => `${i.nama || 'Produk terhapus'} × ${i.qty}`).join(', ')
		}))
	};
}
