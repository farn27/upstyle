import { and, desc, eq, inArray, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { purchaseOrders, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { STATUS_PO, STATUS_TERBUKA } from '$lib/pengadaan';

const PER_HALAMAN = 20;

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const q = (event.url.searchParams.get('q') || '').trim();
	const status = event.url.searchParams.get('status') || '';
	const supplierId = Number(event.url.searchParams.get('supplier')) || 0;
	const halaman = Math.max(1, Number(event.url.searchParams.get('hal')) || 1);

	const syarat = [eq(purchaseOrders.unitId, unit.id)];
	if (status === 'terbuka') syarat.push(inArray(purchaseOrders.status, STATUS_TERBUKA));
	else if (status === 'COMPLETED') syarat.push(inArray(purchaseOrders.status, ['COMPLETED', 'RECEIVED']));
	else if (STATUS_PO[status]) syarat.push(eq(purchaseOrders.status, status));
	if (supplierId) syarat.push(eq(purchaseOrders.supplierId, supplierId));
	if (q) {
		const kata = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
		syarat.push(/** @type {any} */ (or(like(purchaseOrders.poNumber, kata), like(suppliers.namaSupplier, kata))));
	}
	const filter = and(...syarat);

	const [[{ jumlah }], baris, daftarSupplier] = await Promise.all([
		db.select({ jumlah: sql`COUNT(*)` }).from(purchaseOrders).leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id)).where(filter),
		db
			.select({
				id: purchaseOrders.id,
				poNumber: purchaseOrders.poNumber,
				status: purchaseOrders.status,
				totalAmount: purchaseOrders.totalAmount,
				expectedDate: purchaseOrders.expectedDate,
				createdAt: purchaseOrders.createdAt,
				namaSupplier: suppliers.namaSupplier
			})
			.from(purchaseOrders)
			.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.where(filter)
			.orderBy(desc(purchaseOrders.id))
			.limit(PER_HALAMAN)
			.offset((halaman - 1) * PER_HALAMAN),
		db.select({ id: suppliers.id, namaSupplier: suppliers.namaSupplier }).from(suppliers).where(eq(suppliers.unitId, unit.id)).orderBy(suppliers.namaSupplier)
	]);

	return {
		unit,
		pos: JSON.parse(JSON.stringify(baris)),
		daftarSupplier,
		filter: { q, status, supplierId },
		halaman,
		jumlahHalaman: Math.max(1, Math.ceil(Number(jumlah) / PER_HALAMAN)),
		jumlah: Number(jumlah)
	};
}
