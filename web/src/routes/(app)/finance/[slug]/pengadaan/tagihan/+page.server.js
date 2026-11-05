import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { payables, purchaseInvoices, purchaseOrders, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { todayStrWIB } from '$lib/server/dateUtils';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const hanyaBelumLunas = event.url.searchParams.get('status') === 'belum-lunas';

	const tagihan = await db
		.select({
			id: purchaseInvoices.id,
			nomorFaktur: purchaseInvoices.nomorFaktur,
			tanggal: purchaseInvoices.tanggal,
			jatuhTempo: purchaseInvoices.jatuhTempo,
			poId: purchaseInvoices.poId,
			poNumber: purchaseOrders.poNumber,
			namaSupplier: suppliers.namaSupplier,
			nominal: payables.nominal,
			sudahDibayar: payables.sudahDibayar,
			status: payables.status
		})
		.from(purchaseInvoices)
		.innerJoin(payables, eq(purchaseInvoices.payableId, payables.id))
		.innerJoin(purchaseOrders, eq(purchaseInvoices.poId, purchaseOrders.id))
		.leftJoin(suppliers, eq(purchaseInvoices.supplierId, suppliers.id))
		.where(and(eq(purchaseInvoices.unitId, unit.id), hanyaBelumLunas ? ne(payables.status, 'LUNAS') : undefined))
		.orderBy(desc(purchaseInvoices.id))
		.limit(200);

	return { unit, tagihan, hanyaBelumLunas, hariIni: todayStrWIB() };
}
