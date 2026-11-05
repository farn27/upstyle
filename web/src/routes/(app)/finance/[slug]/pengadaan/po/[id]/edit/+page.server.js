import { error, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, suppliers } from '$lib/server/schema';
import { aksiAman, dataPODariForm, idAngka, konteksHalaman } from '$lib/server/pengadaanAksi';
import { detailPO, ubahPO } from '$lib/server/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const detail = await detailPO(db, unit.id, idAngka(event.params.id));
	if (!detail) throw error(404, 'Purchase Order tidak ditemukan');
	if (detail.po.status !== 'DRAFT') throw redirect(303, `/finance/${unit.slug}/pengadaan/po/${detail.po.id}`);

	const [daftarSupplier, daftarProduk] = await Promise.all([
		db.select({ id: suppliers.id, namaSupplier: suppliers.namaSupplier }).from(suppliers).where(and(eq(suppliers.unitId, unit.id), eq(suppliers.isActive, 1))).orderBy(suppliers.namaSupplier),
		db
			.select({ id: products.id, nama: products.nama, sku: products.sku, hargaBeli: products.hargaBeli, stok: products.stok })
			.from(products)
			.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)))
			.orderBy(products.nama)
	]);

	const { po, items } = detail;
	return {
		unit,
		po: { id: po.id, poNumber: po.poNumber },
		suppliers: daftarSupplier,
		products: daftarProduk,
		awal: {
			supplierId: po.supplierId,
			expectedDate: po.expectedDate ? new Date(new Date(po.expectedDate).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10) : '',
			notes: po.notes || '',
			diskon: Number(po.diskon || 0),
			ongkir: Number(po.ongkir || 0),
			ppnPersen: Number(po.ppnPersen || 0),
			items: items.map((/** @type {any} */ i) => ({ productId: i.productId, nama: i.namaProduk || i.productId, sku: i.sku, qty: i.qtyOrdered, unitPrice: Number(i.unitPrice) }))
		}
	};
}

export const actions = {
	simpan: async (event) =>
		aksiAman(async () => {
			const { unit, ctx } = await konteksHalaman(event);
			const poId = idAngka(event.params.id);
			await ubahPO(db, ctx, poId, dataPODariForm(await event.request.formData()));
			throw redirect(303, `/finance/${unit.slug}/pengadaan/po/${poId}`);
		})
};
