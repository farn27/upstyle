/**
 * Neraca kumulatif: neraca bulan tertentu memuat saldo sejak awal + laba periode sebelumnya sebagai
 * laba ditahan, dan tetap seimbang. Dulu hanya mutasi bulan terpilih yang dihitung.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('laporan keuangan — neraca kumulatif', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let eq;
	/** @type {Record<string, any>} */ const ids = {};

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		const { buatJurnalManual } = await import('../lib/server/jurnalManual.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `nrc${t}`, email: `nrc${t}@x.id` });
		ids.user = u.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: ids.user, namaUnit: 'N', slug: `nrc-${t}`, modalAwal: '0' });
		ids.unit = unit.insertId;
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, ids.unit));
		const akun = await db.select().from(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, ids.unit));
		const id = (/** @type {RegExp} */ r) => akun.find((/** @type {any} */ a) => r.test(a.namaAkun)).id;
		const kas = id(/^Kas Tunai/), modal = id(/Modal Pemilik/), pend = id(/Pendapatan Penjualan/), beban = id(/Operasional Lainnya/);
		const j = (/** @type {string} */ tgl, /** @type {number} */ d, /** @type {number} */ k, /** @type {number} */ n) =>
			buatJurnalManual(db, { unitId: ids.unit, userId: ids.user, tanggal: tgl, lines: [{ coaId: d, debit: n }, { coaId: k, kredit: n }] });
		await j('2026-10-02', kas, modal, 1000);
		await j('2026-10-05', kas, pend, 500);
		await j('2026-11-03', beban, kas, 200);
	});

	afterAll(async () => {
		if (ids.unit) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, ids.unit));
		if (ids.user) await db.delete(s.users).where(eq(s.users.id, ids.user));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	it('November: kas 1.300, modal 1.000 + laba ditahan 500 + laba berjalan −200, seimbang', async () => {
		const { buatLaporanKeuangan } = await import('../lib/server/laporanKeuangan.js');
		const { labaRugi, neraca } = await buatLaporanKeuangan({ id: ids.unit }, 2026, '11');
		expect(labaRugi.labaBersih).toBe(-200);
		expect(neraca.totalAset).toBe(1300);
		expect(neraca.ekuitas.find((/** @type {any} */ e) => /ditahan/.test(e.namaAkun))?.saldo).toBe(500);
		expect(neraca.totalEkuitas).toBe(1300);
		expect(neraca.totalAset).toBe(neraca.totalLiabilitas + neraca.totalEkuitas);
	});

	it('Setahun penuh: tidak ada laba ditahan, laba bersih 300, tetap seimbang', async () => {
		const { buatLaporanKeuangan } = await import('../lib/server/laporanKeuangan.js');
		const { labaRugi, neraca } = await buatLaporanKeuangan({ id: ids.unit }, 2026, 'all');
		expect(labaRugi.labaBersih).toBe(300);
		expect(neraca.ekuitas.some((/** @type {any} */ e) => /ditahan/.test(e.namaAkun))).toBe(false);
		expect(neraca.totalAset).toBe(1300);
		expect(neraca.totalAset).toBe(neraca.totalLiabilitas + neraca.totalEkuitas);
	});
});
