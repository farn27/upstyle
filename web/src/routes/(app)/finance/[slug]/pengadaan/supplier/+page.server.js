import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { purchaseOrders, suppliers } from '$lib/server/schema';
import { aksiAman, idAngka, konteksHalaman } from '$lib/server/pengadaanAksi';
import { aturAktifSupplier, bacaKontak, buatSupplier, hapusSupplier, ubahSupplier } from '$lib/server/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const [daftar, statistik] = await Promise.all([
		db.select().from(suppliers).where(eq(suppliers.unitId, unit.id)).orderBy(asc(suppliers.namaSupplier)),
		db
			.select({
				supplierId: purchaseOrders.supplierId,
				jumlah: sql`COUNT(*)`,
				nilai: sql`COALESCE(SUM(CASE WHEN ${purchaseOrders.status} NOT IN ('DRAFT','CANCELLED') THEN ${purchaseOrders.totalAmount} ELSE 0 END), 0)`
			})
			.from(purchaseOrders)
			.where(eq(purchaseOrders.unitId, unit.id))
			.groupBy(purchaseOrders.supplierId)
	]);
	const peta = new Map(statistik.map((s) => [s.supplierId, s]));
	return {
		unit,
		suppliers: daftar.map((s) => ({
			id: s.id,
			namaSupplier: s.namaSupplier,
			termPembayaran: s.termPembayaran,
			isActive: s.isActive,
			...bacaKontak(s.kontak),
			jumlahPO: Number(peta.get(s.id)?.jumlah || 0),
			nilaiPO: Number(peta.get(s.id)?.nilai || 0)
		}))
	};
}

const baca = (/** @type {FormData} */ f) => Object.fromEntries(['namaSupplier', 'contactName', 'phone', 'email', 'category', 'address', 'npwp', 'termPembayaran'].map((k) => [k, f.get(k)]));

export const actions = {
	simpan: async (event) =>
		aksiAman(async () => {
			const { ctx } = await konteksHalaman(event);
			const f = await event.request.formData();
			const id = Number(f.get('id')) || 0;
			if (id) await ubahSupplier(db, ctx, id, baca(f));
			else await buatSupplier(db, ctx, baca(f));
			return { pesan: id ? 'Supplier diperbarui.' : 'Supplier ditambahkan.' };
		}),
	aktif: async (event) =>
		aksiAman(async () => {
			const { ctx } = await konteksHalaman(event);
			const f = await event.request.formData();
			const aktif = f.get('aktif') === '1';
			await aturAktifSupplier(db, ctx, idAngka(String(f.get('id'))), aktif);
			return { pesan: aktif ? 'Supplier diaktifkan.' : 'Supplier dinonaktifkan.' };
		}),
	hapus: async (event) =>
		aksiAman(async () => {
			const { ctx } = await konteksHalaman(event);
			const f = await event.request.formData();
			await hapusSupplier(db, ctx, idAngka(String(f.get('id'))));
			return { pesan: 'Supplier dihapus.' };
		})
};
