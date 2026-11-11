/**
 * Hapus satu transaksi beserta efeknya, di dalam db.transaction yang sama:
 * - stok produk dikembalikan (hanya penjualan / MASUK)
 * - jurnal double-entry yang dibuat form entry (sourceType 'TRX') ikut dihapus
 *
 * Catatan: penjualan POS dijurnal per ORDER (sourceType 'POS'), bukan per item,
 * jadi jurnal POS tidak ikut terhapus di sini — batalkan penjualan POS lewat retur.
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import { transaksi, products, journalEntries, journalEntryLines } from '$lib/server/schema';
import { deltaStokSaatHapus } from '$lib/financeDashboard';
import { pastikanPeriodeTerbuka } from '$lib/server/periodeTutup';

/**
 * @param {any} tx  transaksi Drizzle (dari db.transaction)
 * @param {{ unitId: number, trxId: number }} params
 * @returns {Promise<null | { trx: any, stokDikembalikan: number, jurnalTerhapus: number }>}
 */
export async function hapusTransaksi(tx, { unitId, trxId }) {
	const trx = await tx.query.transaksi.findFirst({
		where: and(eq(transaksi.id, trxId), eq(transaksi.unitId, unitId))
	});
	if (!trx) return null;
	await pastikanPeriodeTerbuka(tx, unitId, trx.tanggal);

	const delta = deltaStokSaatHapus(trx);
	if (delta) {
		await tx
			.update(products)
			.set({ stok: sql`${products.stok} + ${delta}` })
			.where(and(eq(products.id, trx.productId), eq(products.unitId, unitId)));
	}

	/** @type {{ id: number }[]} */
	const jurnal = await tx
		.select({ id: journalEntries.id })
		.from(journalEntries)
		.where(
			and(
				eq(journalEntries.unitId, unitId),
				eq(journalEntries.sourceType, 'TRX'),
				eq(journalEntries.sourceId, String(trxId))
			)
		);
	if (jurnal.length > 0) {
		const ids = jurnal.map((j) => j.id);
		await tx.delete(journalEntryLines).where(inArray(journalEntryLines.journalId, ids));
		await tx.delete(journalEntries).where(inArray(journalEntries.id, ids));
	}

	await tx.delete(transaksi).where(and(eq(transaksi.id, trxId), eq(transaksi.unitId, unitId)));

	return { trx, stokDikembalikan: delta, jurnalTerhapus: jurnal.length };
}
