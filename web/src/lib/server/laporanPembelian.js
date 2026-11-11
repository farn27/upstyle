import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { products, purchaseInvoiceItems, purchaseInvoices, suppliers } from '$lib/server/schema';

/**
 * Laporan pembelian periode (dihitung dari tagihan supplier): ringkasan, per supplier, per produk.
 * Dipakai halaman web pengadaan/laporan dan API app (scm/laporan).
 * @param {any} db @param {number} unitId @param {string} dari YYYY-MM-DD @param {string} sampai YYYY-MM-DD
 */
export async function laporanPembelian(db, unitId, dari, sampai) {
	const periode = and(eq(purchaseInvoices.unitId, unitId), gte(purchaseInvoices.tanggal, dari), lte(purchaseInvoices.tanggal, sampai));
	const [[ringkasan], perSupplier, perProduk] = await Promise.all([
		db
			.select({
				jumlah: sql`COUNT(*)`,
				subtotal: sql`COALESCE(SUM(${purchaseInvoices.subtotal}), 0)`,
				diskon: sql`COALESCE(SUM(${purchaseInvoices.diskon}), 0)`,
				ongkir: sql`COALESCE(SUM(${purchaseInvoices.ongkir}), 0)`,
				ppn: sql`COALESCE(SUM(${purchaseInvoices.ppn}), 0)`,
				total: sql`COALESCE(SUM(${purchaseInvoices.total}), 0)`
			})
			.from(purchaseInvoices)
			.where(periode),
		db
			.select({ nama: suppliers.namaSupplier, jumlah: sql`COUNT(*)`, total: sql`COALESCE(SUM(${purchaseInvoices.total}), 0)` })
			.from(purchaseInvoices)
			.leftJoin(suppliers, eq(purchaseInvoices.supplierId, suppliers.id))
			.where(periode)
			.groupBy(purchaseInvoices.supplierId, suppliers.namaSupplier)
			.orderBy(desc(sql`COALESCE(SUM(${purchaseInvoices.total}), 0)`)),
		db
			.select({
				nama: products.nama,
				qty: sql`COALESCE(SUM(${purchaseInvoiceItems.qty}), 0)`,
				nilai: sql`COALESCE(SUM(${purchaseInvoiceItems.qty} * ${purchaseInvoiceItems.unitPrice}), 0)`
			})
			.from(purchaseInvoiceItems)
			.innerJoin(purchaseInvoices, eq(purchaseInvoiceItems.invoiceId, purchaseInvoices.id))
			.leftJoin(products, eq(purchaseInvoiceItems.productId, products.id))
			.where(periode)
			.groupBy(purchaseInvoiceItems.productId, products.nama)
			.orderBy(desc(sql`COALESCE(SUM(${purchaseInvoiceItems.qty} * ${purchaseInvoiceItems.unitPrice}), 0)`))
			.limit(50)
	]);
	return { ringkasan, perSupplier, perProduk };
}
