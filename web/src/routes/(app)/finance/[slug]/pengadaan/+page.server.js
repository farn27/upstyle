import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { payables, products, purchaseInvoices, purchaseOrders, suppliers } from '$lib/server/schema';
import { konteksHalaman } from '$lib/server/pengadaanAksi';
import { todayStrWIB } from '$lib/server/dateUtils';
import { STATUS_TERBUKA } from '$lib/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const hariIni = todayStrWIB();
	const awalBulan = `${hariIni.slice(0, 7)}-01`;

	const kolomPO = {
		id: purchaseOrders.id,
		poNumber: purchaseOrders.poNumber,
		status: purchaseOrders.status,
		totalAmount: purchaseOrders.totalAmount,
		expectedDate: purchaseOrders.expectedDate,
		createdAt: purchaseOrders.createdAt,
		namaSupplier: suppliers.namaSupplier
	};

	const [[terbuka], [bulanIni], [hutang], [{ jumlahDraft }], terlambat, terbaru, stokMenipis] = await Promise.all([
		db
			.select({ jumlah: sql`COUNT(*)`, nilai: sql`COALESCE(SUM(${purchaseOrders.totalAmount}), 0)` })
			.from(purchaseOrders)
			.where(and(eq(purchaseOrders.unitId, unit.id), inArray(purchaseOrders.status, STATUS_TERBUKA))),
		db
			.select({ nilai: sql`COALESCE(SUM(${purchaseInvoices.total}), 0)` })
			.from(purchaseInvoices)
			.where(and(eq(purchaseInvoices.unitId, unit.id), sql`${purchaseInvoices.tanggal} >= ${awalBulan}`)),
		db
			.select({
				sisa: sql`COALESCE(SUM(${payables.nominal} - ${payables.sudahDibayar}), 0)`,
				lewatTempo: sql`COALESCE(SUM(CASE WHEN ${payables.jatuhTempo} < ${hariIni} THEN ${payables.nominal} - ${payables.sudahDibayar} ELSE 0 END), 0)`
			})
			.from(purchaseInvoices)
			.innerJoin(payables, eq(purchaseInvoices.payableId, payables.id))
			.where(and(eq(purchaseInvoices.unitId, unit.id), sql`${payables.status} <> 'LUNAS'`)),
		db
			.select({ jumlahDraft: sql`COUNT(*)` })
			.from(purchaseOrders)
			.where(and(eq(purchaseOrders.unitId, unit.id), eq(purchaseOrders.status, 'DRAFT'))),
		db
			.select(kolomPO)
			.from(purchaseOrders)
			.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.where(
				and(
					eq(purchaseOrders.unitId, unit.id),
					inArray(purchaseOrders.status, STATUS_TERBUKA),
					lt(purchaseOrders.expectedDate, new Date(`${hariIni}T00:00:00+07:00`))
				)
			)
			.orderBy(asc(purchaseOrders.expectedDate))
			.limit(5),
		db
			.select(kolomPO)
			.from(purchaseOrders)
			.leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
			.where(eq(purchaseOrders.unitId, unit.id))
			.orderBy(desc(purchaseOrders.id))
			.limit(6),
		db
			.select({ id: products.id, nama: products.nama, stok: products.stok, minStok: products.minStok })
			.from(products)
			.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt), eq(products.status, 'active'), gt(products.minStok, 0), lte(products.stok, products.minStok)))
			.orderBy(asc(products.stok))
			.limit(5)
	]);

	return {
		unit,
		ringkasan: {
			jumlahTerbuka: Number(terbuka.jumlah),
			nilaiTerbuka: Number(terbuka.nilai),
			pembelianBulanIni: Number(bulanIni.nilai),
			sisaHutang: Number(hutang?.sisa || 0),
			hutangLewatTempo: Number(hutang?.lewatTempo || 0),
			jumlahDraft: Number(jumlahDraft)
		},
		terlambat: JSON.parse(JSON.stringify(terlambat)),
		terbaru: JSON.parse(JSON.stringify(terbaru)),
		stokMenipis
	};
}
