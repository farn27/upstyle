/**
 * Tagihan hutang manual (di luar modul Pengadaan) — validasi bersama web (/hutang ?/addInvoice)
 * dan mobile (POST /api/app/finance/payables). Dulu: isian kosong → galat 500, nominal 0/negatif
 * diterima, dan kontak dari unit lain bisa dipakai.
 */
import { and, eq } from 'drizzle-orm';
import { payables, accountingContacts } from '$lib/server/schema';

export class HutangError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 400) {
		super(message);
		this.name = 'TransaksiError'; // diloloskan pesanAman sebagai pesan bisnis
		this.status = status;
	}
}

const TGL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {any} db
 * @param {number} unitId
 * @param {{ contactId: unknown, tanggal: unknown, jatuhTempo: unknown, nominal: unknown, keterangan?: unknown, nomorFaktur?: unknown }} input
 * @returns {Promise<{ id: number, nomorFaktur: string }>}
 */
export async function buatHutangManual(db, unitId, input) {
	const contactId = Number(input.contactId);
	const tanggal = String(input.tanggal || '').slice(0, 10);
	const jatuhTempo = String(input.jatuhTempo || '').slice(0, 10);
	const nominal = Math.round(Number(input.nominal) * 100) / 100;
	if (!Number.isInteger(contactId) || contactId <= 0) throw new HutangError('Pilih supplier / kontak');
	if (!TGL.test(tanggal) || !TGL.test(jatuhTempo)) throw new HutangError('Tanggal faktur dan jatuh tempo wajib diisi (YYYY-MM-DD)');
	if (jatuhTempo < tanggal) throw new HutangError('Jatuh tempo tidak boleh sebelum tanggal faktur');
	if (!Number.isFinite(nominal) || nominal <= 0) throw new HutangError('Nominal harus lebih dari 0');

	const [kontak] = await db.select({ id: accountingContacts.id }).from(accountingContacts)
		.where(and(eq(accountingContacts.id, contactId), eq(accountingContacts.unitId, unitId))).limit(1);
	if (!kontak) throw new HutangError('Kontak tidak ditemukan di unit ini', 404);

	const nomorFaktur = String(input.nomorFaktur || '').trim().slice(0, 50) || `FKT-${Date.now()}`;
	const [hasil] = await db.insert(payables).values({
		unitId,
		contactId,
		nomorFaktur,
		tanggal,
		jatuhTempo,
		nominal: String(nominal),
		sudahDibayar: '0',
		status: 'BELUM_BAYAR',
		keterangan: input.keterangan ? String(input.keterangan).slice(0, 500) : null
	});
	return { id: Number(hasil.insertId), nomorFaktur };
}
