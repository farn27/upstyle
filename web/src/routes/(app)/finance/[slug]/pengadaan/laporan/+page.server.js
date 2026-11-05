import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, purchaseInvoiceItems, purchaseInvoices, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { todayStrWIB } from '$lib/server/dateUtils';

const formatTanggal = /^\d{4}-\d{2}-\d{2}$/;

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const hariIni = todayStrWIB();
	const dariInput = event.url.searchParams.get('dari') || '';
	const sampaiInput = event.url.searchParams.get('sampai') || '';
	const dari = formatTanggal.test(dariInput) ? dariInput : `${hariIni.slice(0, 7)}-01`;
	const sampai = formatTanggal.test(sampaiInput) ? sampaiInput : hariIni;

	const periode = and(eq(purchaseInvoices.unitId, unit.id), gte(purchaseInvoices.tanggal, dari), lte(purchaseInvoices.tanggal, sampai));

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

	return { unit, dari, sampai, ringkasan, perSupplier, perProduk };
}
