/**
 * Tes kontrak API yang dibaca app mobile (UpstyleApi.kt): bentuk balasan harus
 * cocok dengan model Kotlin. Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));

describe.skipIf(!TEST_DB)('Kontrak API mobile', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let eq;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const cookies = { get: () => undefined };

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		r.approvals = await import('../routes/api/app/hr/approvals/+server.js');
		r.katalog = await import('../routes/api/app/katalog/+server.js');
		r.plan = await import('../routes/api/app/business-plan/+server.js');
		r.marketing = await import('../routes/api/app/marketing/+server.js');
		r.finance = await import('../routes/api/app/finance/+server.js');
		r.laporan = await import('../routes/api/app/finance/laporan/+server.js');
		r.jurnal = await import('../routes/api/app/finance/journal/+server.js');
		r.bukuBesar = await import('../routes/api/app/finance/buku-besar/+server.js');

		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ka${t}`, email: `ka${t}@contoh.id` });
		const [b] = await db.insert(s.users).values({ username: `kb${t}`, email: `kb${t}@contoh.id` });
		id.user = a.insertId; id.userLain = b.insertId;
		const [u] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko Kontrak', slug: `toko-k-${t}`, modalAwal: '0' });
		const [u2] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Lain', slug: `lain-k-${t}`, modalAwal: '0' });
		id.unit = u.insertId; id.unitLain = u2.insertId;
		const [e] = await db.insert(s.employees).values({ companyId: id.unit, fullName: 'Budi', position: 'Kasir', salary: '1', status: 'active' });
		id.emp = e.insertId;
		await db.insert(s.approvalRequests).values({
			module: 'REIMBURSEMENT', referenceId: `R-${t}`, requesterId: String(id.emp), unitId: id.unit, actionType: 'CREATE',
			dataAfter: { amount: 50000, description: 'Bensin' }, status: 'PENDING', currentLevel: 1, maxLevel: 1
		});
		await db.insert(s.products).values({ id: `PK-${t}`, slug: `pk-${t}`, nama: 'Kopi', userId: id.user, unitId: id.unit, hargaBeli: '1', hargaJual: '2', stok: 3, status: 'active' });
		const { businessPlans } = await import('../lib/server/businessPlanSchema.js');
		id.bp = businessPlans;
		await db.insert(businessPlans).values({ userId: id.user, unitId: id.unit, namaBisnis: 'Kedai', kategori: 'FNB_RESTO', deskripsi: 'Kopi susu', aiSummary: 'Ringkas' });
		const [lp] = await db.insert(s.landingPages).values({ unitId: id.unitLain, pageSlug: `lp-lain-${t}`, title: 'LP lain' });
		id.lpLain = lp.insertId;
		const [lp2] = await db.insert(s.landingPages).values({ unitId: id.unit, pageSlug: `lp-saya-${t}`, title: 'LP saya' });
		id.lpSaya = lp2.insertId;
	});

	afterAll(async () => {
		for (const u of [id.unit, id.unitLain]) if (u) await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, u));
		if (id.emp) await db.delete(s.employees).where(eq(s.employees.id, id.emp));
		for (const u of [id.user, id.userLain]) if (u) await db.delete(s.users).where(eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	it('approvals: `data` berisi pending/approved/rejected dengan field ApprovalRequest', async () => {
		login.userId = id.user;
		const res = await r.approvals.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.success).toBe(true);
		const item = body.data.pending[0];
		expect(item).toMatchObject({ unitId: id.unit, employeeId: id.emp, employeeName: 'Budi', type: 'reimbursement', amount: 50000, description: 'Bensin' });
	});

	it('katalog: `data` = { settings, products } sesuai KatalogData', async () => {
		login.userId = id.user;
		const res = await r.katalog.GET({ url: new URL(`http://x?unitId=${id.unit}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.data.settings).toMatchObject({ unitId: id.unit, namaPortal: 'Toko Kontrak', totalProducts: 1, publishedProducts: 1 });
		expect(body.data.products[0]).toMatchObject({ nama: 'Kopi', hargaJual: 2, isPublished: true, stok: 3 });
	});

	it('finance: dashboard mengirim summary, alerts, kpi, bankBalances & hormati rentang tanggal', async () => {
		login.userId = id.user;
		const tgl = new Date().toISOString().slice(0, 10);
		await db.insert(s.transaksi).values({ unitId: id.unit, userId: id.user, kategoriTrx: 'MASUK', nominal: '300000', totalHarga: '300000', keterangan: 'JUAL', tanggal: `${tgl} 10:00:00`, metodeBayar: 'KAS' });
		await db.insert(s.transaksi).values({ unitId: id.unit, userId: id.user, kategoriTrx: 'KELUAR', nominal: '100000', totalHarga: '100000', keterangan: 'BELI', tanggal: `${tgl} 11:00:00`, metodeBayar: 'KAS' });
		const ambil = async (q) => (await (await r.finance.GET({ url: new URL(`http://x?unitId=${id.unit}${q}`), cookies, request: new Request('http://x') })).json()).data;
		const d = await ambil('');
		expect(d.summary).toMatchObject({ total_masuk: 300000, total_keluar: 100000, saldoKas: 200000 });
		expect(d.alerts).toMatchObject({ receivables: 0, payables: 0 });
		expect(d.kpi.target).toBeGreaterThanOrEqual(10_000_000);
		expect(d.kpi.current).toBe(300000);
		expect(Array.isArray(d.bankBalances)).toBe(true);
		expect(d.transactions[0]).toHaveProperty('metodeLabel');
		// tanggal dikirim sebagai teks WIB apa adanya (bukan epoch yang bergeser zona server)
		expect(String(d.transactions.find((t) => t.keterangan === 'JUAL').tanggal)).toBe(`${tgl} 10:00:00`);
		// grafik per tanggal dihitung server untuk seluruh periode
		expect(d.grafik.find((g) => g.label === tgl)).toMatchObject({ masuk: 300000, keluar: 100000 });
		expect(Array.isArray(d.produkTerlaris)).toBe(true);
		// satu hari → grafik per jam
		const sehari = await ambil(`&start=${tgl}&end=${tgl}`);
		expect(sehari.perJam).toBe(true);
		expect(sehari.grafik.find((g) => g.label === '10:00')).toMatchObject({ masuk: 300000 });
		// rentang di masa lalu → ringkasan 0, tetapi saldo kas tetap sepanjang waktu
		const lama = await ambil('&start=2000-01-01&end=2000-01-02');
		expect(lama.summary.total_masuk).toBe(0);
		expect(lama.summary.saldoKas).toBe(200000);
		expect(lama.transactions).toHaveLength(0);
	});

	it('finance: riwayat dipaginasi, difilter server & saldo berjalan tetap akurat', async () => {
		login.userId = id.user;
		const ambil = async (q) => (await (await r.finance.GET({ url: new URL(`http://x?unitId=${id.unit}${q}`), cookies, request: new Request('http://x') })).json()).data;
		const h1 = await ambil('&limit=1');
		expect(h1.transactions).toHaveLength(1);
		expect(h1.adaLagi).toBe(true);
		expect(h1.transactions[0].keterangan).toBe('BELI');
		expect(h1.transactions[0].saldoSetelah).toBe(200000);
		const h2 = await ambil('&limit=1&offset=1');
		expect(h2.transactions[0].keterangan).toBe('JUAL');
		expect(h2.transactions[0].saldoSetelah).toBe(300000);
		expect(h2.adaLagi).toBe(false);
		// filter jenis & kata kunci → saldo berjalan tidak ikut berubah oleh filter
		const masuk = await ambil('&jenis=masuk');
		expect(masuk.transactions.map((t) => t.keterangan)).toEqual(['JUAL']);
		expect(masuk.transactions[0].saldoSetelah).toBe(300000);
		const cari = await ambil('&q=beli');
		expect(cari.transactions.map((t) => t.keterangan)).toEqual(['BELI']);
		expect(cari.transactions[0].saldoSetelah).toBe(200000);
		expect(Array.isArray(cari.abcOptions)).toBe(true);
		const lama = await ambil('&urut=terlama');
		expect(lama.transactions.map((t) => t.keterangan)).toEqual(['JUAL', 'BELI']);
		const nom = await ambil('&urut=nominal_asc');
		expect(nom.transactions.map((t) => t.keterangan)).toEqual(['BELI', 'JUAL']);
		expect(nom.transactions.map((t) => t.saldoSetelah)).toEqual([200000, 300000]);
	});

	it('jurnal: baris memuat data akun, validasi seimbang & akun milik unit', async () => {
		login.userId = id.user;
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		await pastikanCoaStandar(db, id.unit);
		await pastikanCoaStandar(db, id.unitLain);
		const akun = await db.select().from(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, id.unit));
		const akunLain = await db.select().from(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, id.unitLain));
		const kas = akun.find((a) => a.tipeAkun === 'ASET_LANCAR');
		const modal = akun.find((a) => a.tipeAkun === 'EKUITAS');
		const kirim = async (body) => { const res = await r.jurnal.POST({ request: new Request('http://x', { method: 'POST', body: JSON.stringify({ unitId: id.unit, ...body }), headers: { 'content-type': 'application/json' } }), cookies, url: new URL('http://x') }); return { st: res.status, j: await res.json() }; };
		const ok = await kirim({ tanggal: '2026-01-15', memo: 'Setor modal', referensi: 'REF-1', lines: [{ coaId: kas.id, debit: 500000, kredit: 0 }, { coaId: modal.id, debit: 0, kredit: 500000 }] });
		expect(ok.j.success).toBe(true);
		// tidak seimbang / satu baris / debit+kredit sekaligus / akun tenant lain
		expect((await kirim({ tanggal: '2026-01-15', memo: 'x', lines: [{ coaId: kas.id, debit: 10 }, { coaId: modal.id, kredit: 5 }] })).st).toBe(400);
		expect((await kirim({ tanggal: '2026-01-15', memo: 'x', lines: [{ coaId: kas.id, debit: 10 }] })).st).toBe(400);
		expect((await kirim({ tanggal: '2026-01-15', memo: 'x', lines: [{ coaId: kas.id, debit: 10, kredit: 10 }, { coaId: modal.id, kredit: 0, debit: 0 }] })).st).toBe(400);
		const curi = await kirim({ tanggal: '2026-01-15', memo: 'x', lines: [{ coaId: kas.id, debit: 10 }, { coaId: akunLain[0].id, kredit: 10 }] });
		expect(curi.st).toBe(400);
		expect(curi.j.message).toMatch(/bukan milik unit/);
		// GET: 'lines' berisi akun lengkap + filter bulan/tahun
		const ambil = async (q) => (await (await r.jurnal.GET({ url: new URL(`http://x?unitId=${id.unit}${q}`), cookies, request: new Request('http://x') })).json()).data;
		const jan = await ambil('&tahun=2026&bulan=1');
		const e = jan.find((x) => x.memo === 'Setor modal');
		expect(e.referensi).toBe('REF-1');
		expect(e.lines).toHaveLength(2);
		expect(e.lines[0].account).toMatchObject({ kodeAkun: kas.kodeAkun, namaAkun: kas.namaAkun });
		expect((await ambil('&tahun=2026&bulan=2')).some((x) => x.memo === 'Setor modal')).toBe(false);

		// buku besar: periode, saldo awal & saldo berjalan (kas bertambah 500.000 pada Januari 2026)
		await kirim({ tanggal: '2026-02-10', memo: 'Tarik kas', lines: [{ coaId: modal.id, debit: 100000 }, { coaId: kas.id, kredit: 100000 }] });
		const bb = async (q) => (await (await r.bukuBesar.GET({ url: new URL(`http://x?unitId=${id.unit}&coaId=${kas.id}${q}`), cookies, request: new Request('http://x') })).json()).data;
		const janBB = await bb('&tahun=2026&bulan=1');
		expect(janBB.saldoAwal).toBe(0);
		expect(janBB.saldoAkhir).toBe(500000);
		expect(janBB.entries.map((e) => e.saldo)).toEqual([500000]);
		const febBB = await bb('&tahun=2026&bulan=2');
		expect(febBB.saldoAwal).toBe(500000);
		expect(febBB.entries).toHaveLength(1);
		expect(febBB.saldoAkhir).toBe(400000);
		expect(febBB.totalKredit).toBe(100000);
		const setahun = await bb('&tahun=2026');
		expect(setahun.entries.map((e) => e.saldo)).toEqual([500000, 400000]);
		expect(setahun.entries[0].referensi).toBe('REF-1');
	});

	it('laporan: type=report memuat dashboard, laba rugi & neraca', async () => {
		login.userId = id.user;
		const res = await r.laporan.GET({ url: new URL(`http://x?unitId=${id.unit}&type=report&tahun=${new Date().getFullYear()}`), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.dashboard.summary).toMatchObject({ totalMasuk: 300000, totalKeluar: 100000 });
		expect(body.data.dashboard.arusKas).toHaveLength(12);
		expect(Array.isArray(body.data.dashboard.metodeBayarStats)).toBe(true);
		expect(body.data.labaRugi).toHaveProperty('labaBersih');
		expect(body.data.neraca).toHaveProperty('totalAset');
	});

	it('business plan: daftar memuat deskripsi & ringkasan untuk app', async () => {
		login.userId = id.user;
		const res = await r.plan.GET({ url: new URL('http://x'), cookies, request: new Request('http://x') });
		const body = await res.json();
		expect(body.data[0]).toMatchObject({ unitId: id.unit, namaBisnis: 'Kedai', deskripsi: 'Kopi susu', aiSummary: 'Ringkas' });
	});

	it('lead baru: wajib landing page milik unit sendiri', async () => {
		login.userId = id.user;
		/** @param {any} lead */
		const kirim = (lead) => r.marketing.POST({
			cookies,
			request: new Request('http://x', { method: 'POST', body: JSON.stringify({ action: 'create-lead', lead }), headers: { 'content-type': 'application/json' } })
		});
		expect((await kirim({ firstName: 'Tanpa LP' })).status).toBe(422);
		expect((await kirim({ firstName: 'Nyusup', landingPageId: id.lpLain })).status).toBe(422);
		expect((await kirim({ firstName: 'Sah', landingPageId: id.lpSaya })).status).toBe(200);
	});
});
