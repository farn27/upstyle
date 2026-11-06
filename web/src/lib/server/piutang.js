/**
 * Piutang usaha — SATU logika untuk web (halaman Piutang) dan mobile (/api/app/finance/receivables).
 *
 * Invoice baru langsung dijurnal: Debit Piutang Usaha / Kredit Pendapatan.
 * Pembayaran invoice berjurnal: Debit Kas/Bank / Kredit Piutang Usaha (lewat catatTransaksi, jadi juga
 * muncul di arus kas). Invoice lama (tanpa journalId) hanya diubah statusnya, sama seperti hutang manual,
 * supaya akun Piutang tidak minus karena invoicenya dulu tidak pernah dijurnal.
 */
import { and, eq } from 'drizzle-orm';
import { receivables, accountingContacts, chartOfAccounts, journalEntries, journalEntryLines } from '$lib/server/schema';
import { catatTransaksi, pastikanCoaStandar, pilihAkunDefault, TransaksiError } from '$lib/server/catatTransaksi';
import { todayStrWIB } from '$lib/server/dateUtils';

export class PiutangError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 400) {
		super(message);
		this.name = 'PiutangError';
		this.status = status;
	}
}

/** @param {unknown} n */
const bulat = (n) => Math.round((Number(n) || 0) * 100) / 100;
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @param {number} nominal @param {number} dibayar
 * @returns {'BELUM_BAYAR' | 'SEBAGIAN' | 'LUNAS'}
 */
export function statusPiutang(nominal, dibayar) {
	if (bulat(dibayar) <= 0) return 'BELUM_BAYAR';
	return bulat(dibayar) >= bulat(nominal) ? 'LUNAS' : 'SEBAGIAN';
}

/**
 * Akun Piutang Usaha & Pendapatan unit (dibuat kalau belum ada).
 * @param {any} tx @param {number} unitId
 * @returns {Promise<{ piutangId: number, pendapatanId: number }>}
 */
export async function pastikanAkunPiutang(tx, unitId) {
	await pastikanCoaStandar(tx, unitId);
	/** @type {{ id: number, namaAkun: string, tipeAkun: string, kodeAkun: string }[]} */
	const akun = await tx
		.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun, kodeAkun: chartOfAccounts.kodeAkun })
		.from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)))
		.orderBy(chartOfAccounts.kodeAkun);

	let piutang = akun.find((a) => a.tipeAkun === 'ASET_LANCAR' && /piutang/i.test(a.namaAkun) && !/karyawan|pajak/i.test(a.namaAkun));
	if (!piutang) {
		const kodeTerpakai = new Set(akun.map((a) => a.kodeAkun));
		let kode = '1-10003';
		for (let i = 3; kodeTerpakai.has(kode); i++) kode = `1-1${String(i).padStart(4, '0')}`;
		const [hasil] = await tx.insert(chartOfAccounts).values({ unitId, kodeAkun: kode, namaAkun: 'Piutang Usaha', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', isActive: 1 });
		piutang = { id: hasil.insertId, namaAkun: 'Piutang Usaha', tipeAkun: 'ASET_LANCAR', kodeAkun: kode };
	}
	const pendapatan = akun.filter((a) => a.tipeAkun === 'PENDAPATAN');
	const pilihan = pendapatan.find((a) => /penjualan/i.test(a.namaAkun)) || pendapatan[0];
	if (!pilihan) throw new PiutangError('Akun pendapatan belum ada. Tambahkan di Master Data → COA.', 422);
	return { piutangId: piutang.id, pendapatanId: pilihan.id };
}

/**
 * Buat invoice piutang + jurnalnya.
 * @param {any} db
 * @param {{ unitId: number, userId: number }} ctx
 * @param {{ contactId: unknown, tanggal?: unknown, jatuhTempo?: unknown, nominal: unknown, keterangan?: unknown, nomorInvoice?: unknown }} input
 * @returns {Promise<{ id: number, nomorInvoice: string, journalId: number }>}
 */
export async function buatPiutang(db, ctx, input) {
	const nominal = bulat(input.nominal);
	const contactId = Number(input.contactId);
	const tanggal = String(input.tanggal || todayStrWIB());
	const jatuhTempo = String(input.jatuhTempo || tanggal);
	const nomorInvoice = String(input.nomorInvoice || `INV-${Date.now()}`).trim().slice(0, 50);
	const keterangan = input.keterangan ? String(input.keterangan).trim() : null;

	if (!(nominal > 0)) throw new PiutangError('Nominal harus lebih dari 0', 422);
	if (!Number.isInteger(contactId) || contactId <= 0) throw new PiutangError('Pilih pelanggan', 422);
	if (!POLA_TANGGAL.test(tanggal) || !POLA_TANGGAL.test(jatuhTempo)) throw new PiutangError('Format tanggal tidak valid', 422);
	if (jatuhTempo < tanggal) throw new PiutangError('Jatuh tempo tidak boleh sebelum tanggal invoice', 422);

	return db.transaction(async (/** @type {any} */ tx) => {
		const [kontak] = await tx
			.select({ id: accountingContacts.id })
			.from(accountingContacts)
			.where(and(eq(accountingContacts.id, contactId), eq(accountingContacts.unitId, ctx.unitId)))
			.limit(1);
		if (!kontak) throw new PiutangError('Pelanggan tidak ditemukan di unit ini', 404);

		const akun = await pastikanAkunPiutang(tx, ctx.unitId);
		const memo = `Piutang ${nomorInvoice}${keterangan ? ` - ${keterangan}` : ''}`.slice(0, 255);
		const [jurnal] = await tx.insert(journalEntries).values({
			unitId: ctx.unitId,
			userId: ctx.userId,
			tanggal,
			nomorJurnal: `JRN-AR-${nomorInvoice}`.slice(0, 50),
			referensi: nomorInvoice,
			memo,
			sourceType: 'PIUTANG',
			totalDebit: String(nominal),
			totalKredit: String(nominal),
			status: 'POSTED'
		});
		const journalId = jurnal.insertId;
		await tx.insert(journalEntryLines).values([
			{ journalId, coaId: akun.piutangId, keterangan: memo, debit: String(nominal), kredit: '0', contactId },
			{ journalId, coaId: akun.pendapatanId, keterangan: memo, debit: '0', kredit: String(nominal), contactId }
		]);

		const [hasil] = await tx.insert(receivables).values({
			unitId: ctx.unitId,
			contactId,
			journalId,
			nomorInvoice,
			tanggal,
			jatuhTempo,
			nominal: String(nominal),
			sudahDibayar: '0',
			status: 'BELUM_BAYAR',
			keterangan
		});
		await tx.update(journalEntries).set({ sourceId: String(hasil.insertId) }).where(eq(journalEntries.id, journalId));
		return { id: hasil.insertId, nomorInvoice, journalId };
	});
}

/**
 * Catat pembayaran piutang. Invoice harus milik unit ctx; nominal tidak boleh melebihi sisa.
 * @param {any} db
 * @param {{ unitId: number, userId: number }} ctx
 * @param {number} receivableId
 * @param {{ nominal: unknown, kasCoaId?: unknown }} input
 * @returns {Promise<{ sisa: number, status: string, sudahDibayar: number, berjurnal: boolean }>}
 */
export async function bayarPiutang(db, ctx, receivableId, input) {
	const nominal = bulat(input.nominal);
	if (!(nominal > 0)) throw new PiutangError('Nominal bayar harus lebih dari 0', 422);

	try {
		return await db.transaction(async (/** @type {any} */ tx) => {
			const [piutang] = await tx
				.select()
				.from(receivables)
				.where(and(eq(receivables.id, Number(receivableId)), eq(receivables.unitId, ctx.unitId)))
				.for('update');
			if (!piutang) throw new PiutangError('Invoice tidak ditemukan', 404);
			const sisa = bulat(Number(piutang.nominal) - Number(piutang.sudahDibayar || 0));
			if (sisa <= 0) throw new PiutangError('Invoice ini sudah lunas', 409);
			if (nominal > sisa) throw new PiutangError(`Nominal melebihi sisa tagihan (sisa Rp ${sisa.toLocaleString('id-ID')})`, 409);

			const berjurnal = Boolean(piutang.journalId);
			if (berjurnal) {
				let kasCoaId = Number(input.kasCoaId) || null;
				if (!kasCoaId) ({ kasCoaId } = await pilihAkunDefault(tx, ctx.unitId, 'MASUK', 'KAS'));
				if (!kasCoaId) throw new PiutangError('Pilih akun kas/bank penerima', 422);
				const [kas] = await tx
					.select({ id: chartOfAccounts.id })
					.from(chartOfAccounts)
					.where(and(eq(chartOfAccounts.id, kasCoaId), eq(chartOfAccounts.unitId, ctx.unitId), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR')))
					.limit(1);
				if (!kas) throw new PiutangError('Akun kas/bank tidak ditemukan di unit ini', 404);

				const akun = await pastikanAkunPiutang(tx, ctx.unitId);
				await catatTransaksi(tx, {
					unitId: ctx.unitId,
					userId: ctx.userId,
					kategori: 'MASUK',
					nominal,
					keterangan: `Penerimaan piutang ${piutang.nomorInvoice}`,
					coaId: akun.piutangId,
					kasCoaId
				});
			}

			const dibayar = bulat(Number(piutang.sudahDibayar || 0) + nominal);
			const status = statusPiutang(Number(piutang.nominal), dibayar);
			await tx.update(receivables).set({ sudahDibayar: String(dibayar), status }).where(eq(receivables.id, piutang.id));
			return { sisa: bulat(sisa - nominal), status, sudahDibayar: dibayar, berjurnal };
		});
	} catch (err) {
		if (err instanceof TransaksiError) throw new PiutangError(err.message, err.status);
		throw err;
	}
}
