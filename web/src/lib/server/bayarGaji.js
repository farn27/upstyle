/**
 * Pembayaran gaji (payroll) — satu logika untuk semua jalur web & mobile.
 *
 * Dulu ada empat jalur "tandai lunas" yang hasil keuangannya berbeda-beda:
 *  - web Penggajian "bayar semua": membaca kolom netPay yang tidak ada → total 0 → jurnal tidak pernah dibuat;
 *  - web halaman HR "mark-payroll-paid" dan API mobile mark-paid: hanya mengubah status, tanpa transaksi/jurnal;
 *  - API mobile process-payroll: menulis baris transaksi langsung tanpa jurnal.
 * Akibatnya beban gaji tidak muncul di laba rugi / buku besar. Sekarang setiap pembayaran dicatat sebagai
 * satu transaksi KELUAR lewat catatTransaksi (transaksi + jurnal double-entry, cek tutup buku).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { payrolls, employees, chartOfAccounts, riwayatAksi } from '$lib/server/schema';
import { catatTransaksi, pastikanCoaStandar, pilihAkunDefault } from '$lib/server/catatTransaksi';
import { nowWIB } from '$lib/server/dateUtils';

/**
 * @param {any} tx  transaksi Drizzle
 * @param {{ unitId: number, userId: number, payrollIds: number[], keterangan?: string }} p
 * @returns {Promise<{ jumlah: number, total: number, trxId: number | null }>}
 */
export async function bayarPayroll(tx, { unitId, userId, payrollIds, keterangan }) {
	const ids = [...new Set((payrollIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];
	if (!ids.length) return { jumlah: 0, total: 0, trxId: null };

	// Hanya payroll karyawan unit ini yang masih belum dibayar
	const daftar = await tx
		.select({ id: payrolls.id, netSalary: payrolls.netSalary, bulan: payrolls.periodMonth, tahun: payrolls.periodYear, nama: employees.fullName })
		.from(payrolls)
		.innerJoin(employees, eq(employees.id, payrolls.employeeId))
		.where(and(inArray(payrolls.id, ids), eq(employees.companyId, unitId), eq(payrolls.paymentStatus, 'unpaid')));
	if (!daftar.length) return { jumlah: 0, total: 0, trxId: null };

	const idSah = daftar.map((/** @type {any} */ d) => d.id);
	// Syarat paymentStatus='unpaid' diulang di UPDATE supaya dua klik bersamaan tidak membayar dua kali
	const [hasil] = await tx
		.update(payrolls)
		.set({ paymentStatus: 'paid' })
		.where(and(inArray(payrolls.id, idSah), eq(payrolls.paymentStatus, 'unpaid')));
	if (Number(hasil?.affectedRows ?? idSah.length) !== idSah.length) {
		throw new Error('Sebagian payroll sudah dibayar oleh proses lain. Muat ulang halaman.');
	}

	const total = Math.round(daftar.reduce((/** @type {number} */ a, /** @type {any} */ d) => a + Number(d.netSalary || 0), 0) * 100) / 100;
	let trxId = null;
	if (total > 0) {
		await pastikanCoaStandar(tx, unitId);
		const akun = await tx
			.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun, tipeAkun: chartOfAccounts.tipeAkun })
			.from(chartOfAccounts)
			.where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.isActive, 1)));
		const bebanGaji = akun.find((/** @type {any} */ a) => a.tipeAkun === 'BEBAN_OPERASIONAL' && /gaji|upah|tunjangan/i.test(a.namaAkun));
		const bawaan = await pilihAkunDefault(tx, unitId, 'KELUAR', 'TUNAI');
		const periode = [...new Set(daftar.map((/** @type {any} */ d) => `${d.bulan}/${d.tahun}`))].join(', ');
		const ket = keterangan || (daftar.length === 1
			? `Gaji karyawan: ${daftar[0].nama} (${periode})`
			: `Gaji ${daftar.length} karyawan (${periode})`);
		const r = await catatTransaksi(tx, {
			unitId,
			userId,
			kategori: 'KELUAR',
			nominal: total,
			keterangan: ket.slice(0, 250),
			coaId: bebanGaji?.id ?? bawaan.coaId,
			kasCoaId: bawaan.kasCoaId
		});
		trxId = r.trxId;
	}

	await tx.insert(riwayatAksi).values({
		userId,
		unitId,
		pesan: `${daftar.length} payroll dibayar. Total Rp ${total.toLocaleString('id-ID')}`,
		kategori: 'HR',
		tipe: 'success',
		waktu: nowWIB()
	});

	return { jumlah: daftar.length, total, trxId };
}
