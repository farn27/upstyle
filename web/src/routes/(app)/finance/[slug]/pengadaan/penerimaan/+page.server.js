import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, purchaseOrders, purchaseReceiptItems, purchaseReceipts, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const baris = await db
		.select({
			id: purchaseReceipts.id,
			nomor: purchaseReceipts.nomor,
			tanggal: purchaseReceipts.tanggal,
			noSuratJalan: purchaseReceipts.noSuratJalan,
			poId: purchaseReceipts.poId,
			poNumber: purchaseOrders.poNumber,
			namaSupplier: suppliers.namaSupplier
		})
		.from(purchaseReceipts)
		.innerJoin(purchaseOrders, eq(purchaseReceipts.poId, purchaseOrders.id))
		.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
		.where(eq(purchaseReceipts.unitId, unit.id))
		.orderBy(desc(purchaseReceipts.id))
		.limit(200);

	const isi = baris.length
		? await db
				.select({ receiptId: purchaseReceiptItems.receiptId, qty: purchaseReceiptItems.qty, nama: products.nama })
				.from(purchaseReceiptItems)
				.leftJoin(products, eq(purchaseReceiptItems.productId, products.id))
				.where(inArray(purchaseReceiptItems.receiptId, baris.map((b) => b.id)))
		: [];

	return {
		unit,
		penerimaan: baris.map((b) => ({
			...b,
			ringkasan: isi.filter((i) => i.receiptId === b.id).map((i) => `${i.nama || 'Produk terhapus'} × ${i.qty}`).join(', ')
		}))
	};
}
