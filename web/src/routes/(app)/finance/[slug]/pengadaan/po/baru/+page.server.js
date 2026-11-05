import { redirect } from '@sveltejs/kit';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { products, suppliers } from '$lib/server/schema';
import { aksiAman, dataPODariForm, konteksHalaman } from '$lib/server/pengadaanAksi';
import { buatPO } from '$lib/server/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const [daftarSupplier, daftarProduk] = await Promise.all([
		db.select({ id: suppliers.id, namaSupplier: suppliers.namaSupplier }).from(suppliers).where(and(eq(suppliers.unitId, unit.id), eq(suppliers.isActive, 1))).orderBy(suppliers.namaSupplier),
		db
			.select({ id: products.id, nama: products.nama, sku: products.sku, hargaBeli: products.hargaBeli, stok: products.stok, minStok: products.minStok })
			.from(products)
			.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)))
			.orderBy(products.nama)
	]);

	// Datang dari Saran Restock: ?produk=id:qty,id:qty&supplier=1
	const awal = { supplierId: Number(event.url.searchParams.get('supplier')) || '', items: /** @type {any[]} */ ([]) };
	const permintaan = (event.url.searchParams.get('produk') || '').split(',').filter(Boolean);
	if (permintaan.length) {
		const peta = new Map(daftarProduk.map((p) => [p.id, p]));
		for (const bagian of permintaan) {
			const [id, qty] = decodeURIComponent(bagian).split(':');
			const p = peta.get(id);
			if (p) awal.items.push({ productId: p.id, nama: p.nama, sku: p.sku, qty: Math.max(1, Number(qty) || 1), unitPrice: Number(p.hargaBeli || 0) });
		}
	}

	return { unit, suppliers: daftarSupplier, products: daftarProduk, awal };
}

export const actions = {
	simpan: async (event) =>
		aksiAman(async () => {
			const { unit, ctx } = await konteksHalaman(event);
			const poId = await buatPO(db, ctx, dataPODariForm(await event.request.formData()));
			throw redirect(303, `/finance/${unit.slug}/pengadaan/po/${poId}`);
		})
};
