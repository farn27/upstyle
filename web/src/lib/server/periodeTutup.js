import { and, eq, lte, gte } from 'drizzle-orm';
import { closingPeriods } from '$lib/server/schema';
import { TransaksiError } from '$lib/server/catatTransaksi';

/**
 * Periode tutup buku (CLOSED) yang memuat tanggal tertentu, atau null.
 * @param {any} db  db atau transaksi Drizzle
 * @param {number} unitId
 * @param {string | Date | null | undefined} tanggal  YYYY-MM-DD atau waktu SQL (hanya 10 karakter pertama dipakai)
 */
export async function periodeTerkunci(db, unitId, tanggal) {
	const t = tanggal instanceof Date ? tanggal.toISOString().slice(0, 10) : String(tanggal || '').slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
	const [p] = await db.select().from(closingPeriods).where(and(
		eq(closingPeriods.unitId, unitId), eq(closingPeriods.status, 'CLOSED'),
		lte(closingPeriods.periodStart, t), gte(closingPeriods.periodEnd, t)
	)).limit(1);
	return p || null;
}

/** Tolak perubahan data bila tanggalnya berada di periode yang sudah ditutup. */
export async function pastikanPeriodeTerbuka(db, unitId, tanggal) {
	const p = await periodeTerkunci(db, unitId, tanggal);
	if (p) {
		throw new TransaksiError(`Periode ${String(p.periodStart).slice(0, 10)} s/d ${String(p.periodEnd).slice(0, 10)} sudah ditutup buku. Buka kembali periodenya bila perlu mengubah data.`, 409);
	}
}
