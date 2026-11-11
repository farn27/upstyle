/**
 * Pembayaran gaji: semua jalur memakai bayarPayroll → payroll lunas + satu transaksi KELUAR + jurnal
 * (beban gaji di debit, kas di kredit). Tidak bisa dibayar dua kali; payroll unit lain diabaikan.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('bayarPayroll', () => {
	/** @type {any} */ let db; /** @type {any} */ let schema; /** @type {any} */ let eq; /** @type {any} */ let bayarPayroll;
	/** @type {Record<string, any>} */ const ids = {};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		({ bayarPayroll } = await import('../lib/server/bayarGaji.js'));
		const s = Date.now();
		const [u] = await db.insert(schema.users).values({ username: `gaji${s}`, email: `gaji${s}@contoh.id` });
		ids.user = u.insertId;
		const [a] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'Gaji A', slug: `gaji-a-${s}`, modalAwal: '0' });
		const [b] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'Gaji B', slug: `gaji-b-${s}`, modalAwal: '0' });
		ids.unitA = a.insertId; ids.unitB = b.insertId;
		const emp = async (/** @type {number} */ unit, /** @type {string} */ nama) => {
			const [e] = await db.insert(schema.employees).values({ companyId: unit, userId: ids.user, fullName: nama, slug: `${nama.toLowerCase()}-${s}`, salary: '1000000', status: 'active' });
			return e.insertId;
		};
		const pay = async (/** @type {number} */ e, /** @type {number} */ net) => {
			const [p] = await db.insert(schema.payrolls).values({ employeeId: e, periodMonth: 11, periodYear: 2026, basicSalary: String(net), allowances: '0', deductions: '0', netSalary: String(net), paymentStatus: 'unpaid' });
			return p.insertId;
		};
		ids.p1 = await pay(await emp(ids.unitA, 'Ani'), 1500000);
		ids.p2 = await pay(await emp(ids.unitA, 'Budi'), 2000000);
		ids.pB = await pay(await emp(ids.unitB, 'Cici'), 900000);
	});

	afterAll(async () => {
		// Hapus lewat API mobile: sekaligus menguji unit berkaryawan + payroll bisa dihapus
		vi.doMock('$lib/server/getUser', () => ({ getCurrentUserId: async () => ids.user }));
		const api = await import('../routes/api/app/business/+server.js');
		for (const unit of [ids.unitA, ids.unitB]) {
			const r = await api.DELETE({ url: new URL(`http://x/?unitId=${unit}`), cookies: { get: () => undefined }, request: new Request('http://x') });
			expect(r.status).toBe(200);
		}
		const r404 = await api.DELETE({ url: new URL(`http://x/?unitId=${ids.unitA}`), cookies: { get: () => undefined }, request: new Request('http://x') });
		expect(r404.status).toBe(404);
		if (ids.user) await db.delete(schema.users).where(eq(schema.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('melunasi, mencatat transaksi KELUAR & jurnal seimbang; payroll unit lain diabaikan', async () => {
		const hasil = await db.transaction((/** @type {any} */ tx) => bayarPayroll(tx, { unitId: ids.unitA, userId: ids.user, payrollIds: [ids.p1, ids.p2, ids.pB] }));
		expect(hasil).toMatchObject({ jumlah: 2, total: 3500000 });
		const trx = await db.query.transaksi.findFirst({ where: eq(schema.transaksi.id, hasil.trxId) });
		expect(trx).toMatchObject({ kategoriTrx: 'KELUAR', unitId: ids.unitA });
		expect(Number(trx.nominal)).toBe(3500000);
		const jurnal = await db.query.journalEntries.findFirst({ where: eq(schema.journalEntries.sourceId, String(hasil.trxId)) });
		const baris = await db.select().from(schema.journalEntryLines).where(eq(schema.journalEntryLines.journalId, jurnal.id));
		const debit = baris.reduce((/** @type {number} */ a, /** @type {any} */ b) => a + Number(b.debit), 0);
		const kredit = baris.reduce((/** @type {number} */ a, /** @type {any} */ b) => a + Number(b.kredit), 0);
		expect(debit).toBe(3500000);
		expect(kredit).toBe(3500000);
		const akunDebit = await db.query.chartOfAccounts.findFirst({ where: eq(schema.chartOfAccounts.id, baris.find((/** @type {any} */ b) => Number(b.debit) > 0).coaId) });
		expect(akunDebit.namaAkun).toMatch(/gaji/i);
		const pB = await db.query.payrolls.findFirst({ where: eq(schema.payrolls.id, ids.pB) });
		expect(pB.paymentStatus).toBe('unpaid');
	});

	it('dibayar ulang → tidak ada transaksi baru', async () => {
		const sebelum = (await db.select().from(schema.transaksi).where(eq(schema.transaksi.unitId, ids.unitA))).length;
		const hasil = await db.transaction((/** @type {any} */ tx) => bayarPayroll(tx, { unitId: ids.unitA, userId: ids.user, payrollIds: [ids.p1, ids.p2] }));
		expect(hasil.jumlah).toBe(0);
		const sesudah = (await db.select().from(schema.transaksi).where(eq(schema.transaksi.unitId, ids.unitA))).length;
		expect(sesudah).toBe(sebelum);
	});
});
