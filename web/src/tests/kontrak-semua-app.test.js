/**
 * UJI MENYELURUH tombol/aksi app mobile: setiap panggilan mutasi di UpstyleApi.kt dikirim ke handler server
 * dengan payload yang sama persis seperti yang dibangun app, dengan data nyata di database tes.
 * Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';
import { muatKotlin, periksa } from './helpers/modelKotlin.js';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64);
process.env.DB_RELATIONAL_MODE ||= 'planetscale'; // MariaDB lokal tak punya LATERAL JOIN

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK', incr: async () => 1, expire: async () => 1, pipeline: () => ({ incr() {}, expire() {}, exec: async () => [] }) } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));
vi.mock('$lib/server/groq', () => ({ groqChatCompletion: async () => ({ choices: [{ message: { content: '[{"namaAkun":"Kas Besar","tipeAkun":"ASET_LANCAR"},{"namaAkun":"Omzet","tipeAkun":"PENDAPATAN"}]' } }], usage: {} }) }));

const mods = import.meta.glob('../routes/api/app/**/+server.js');

describe.skipIf(!TEST_DB)('Uji menyeluruh aksi app mobile', () => {
	it('semua payload app diterima server', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq, and } = await import('drizzle-orm');
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		const p = await import('../lib/server/pengadaan.js');
		const t = Date.now();

		// ── data awal ─────────────────────────────────────────────────────────
		const [usr] = await db.insert(s.users).values({ username: `ua${t}`, email: `ua${t}@x.id`, role: 'free' });
		login.userId = usr.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: usr.insertId, namaUnit: 'Uji', slug: `uji-${t}`, modalAwal: '1000000', kategori: 'RETAIL' });
		const unitId = unit.insertId;
		await pastikanCoaStandar(db, unitId);
		const coa = await db.select().from(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, unitId));
		const kas = coa.find((x) => x.tipeAkun === 'ASET_LANCAR');
		const pend = coa.find((x) => x.tipeAkun === 'PENDAPATAN');
		const beban = coa.find((x) => x.tipeAkun === 'BEBAN_OPERASIONAL');
		const pid = `PU${t}`;
		await db.insert(s.products).values({ id: pid, slug: `pu-${t}`, nama: 'Kopi Uji', userId: usr.insertId, unitId, hargaBeli: '1000', hargaJual: '2000', stok: 50, minStok: 5, status: 'active', jenis: 'BARANG_JADI' });
		const [kontakAk] = await db.insert(s.accountingContacts).values({ unitId, namaKontak: 'Pelanggan Uji', tipeKontak: 'BOTH', isActive: 1 });
		const [kontakCrm] = await db.insert(s.crmContacts).values({ ownerId: usr.insertId, unitId, nama: 'Lead Uji' });
		const [sup] = await db.insert(s.suppliers).values({ unitId, namaSupplier: 'Sup Uji' });
		const ctx = { unitId, userId: usr.insertId };
		const poId = await p.buatPO(db, ctx, { supplierId: sup.insertId, items: [{ productId: pid, qty: 10, unitPrice: 1000 }] });
		await p.kirimPO(db, ctx, poId);

		const hasil = []; const dilewati = [];
		/** @type {Record<string, any>} */
		const c = {};
		/**
		 * @param {string} nama @param {string} rute @param {'GET'|'POST'|'PUT'|'DELETE'} meth
		 * @param {{ q?: Record<string, any>, body?: any, params?: Record<string, any>, ok?: (j: any, status: number) => boolean }} [o]
		 */
		async function uji(nama, rute, meth, o = {}) {
			const key = `../routes/api/app/${rute}/+server.js`;
			if (!mods[key]) { hasil.push(`RUTE TIDAK ADA  ${nama} (${rute})`); return null; }
			try {
				const m = await mods[key]();
				if (!m[meth]) { hasil.push(`METODE TIDAK ADA ${nama} (${meth} ${rute})`); return null; }
				const qs = new URLSearchParams(Object.entries(o.q || {}).map(([k, v]) => [k, String(v)])).toString();
				const url = `http://x/?${qs}`;
				const req = new Request(url, o.body !== undefined ? { method: meth, body: JSON.stringify(o.body), headers: { 'content-type': 'application/json' } } : { method: meth });
				const res = await m[meth]({ request: req, cookies: { get() {} }, url: new URL(url), params: o.params || {}, locals: {} });
				const j = await res.json().catch(() => ({}));
				const bagus = o.ok ? o.ok(j, res.status) : (res.status < 400 && j.success !== false);
				const lateral = o.lateral && res.status === 500; // MariaDB lokal tak mendukung LATERAL (produksi TiDB/MySQL8 mendukung)
				if (!bagus && lateral) { dilewati.push(nama); return j; }
				if (!bagus) hasil.push(`GAGAL  ${nama}: ${res.status} ${j.message || JSON.stringify(j).slice(0, 120)}`);
				return j;
			} catch (e) { hasil.push(`CRASH  ${nama}: ${String(e.message).slice(0, 140)}`); return null; }
		}
		const hari = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);

		// ── Unit bisnis ───────────────────────────────────────────────────────
		const unitBaru = await uji('unit: buat', 'business', 'POST', { body: { name: 'Cabang Uji', type: 'RETAIL_MINIMARKET', is_cabang: false } });
		await uji('unit: ubah', 'business', 'PUT', { q: { unitId }, body: { unitId, action: 'updateBusiness', namaUnit: 'Uji 2', alamat: 'a', telepon: '1', email: '', modalAwal: 5 } });
		if (unitBaru?.data?.id) await uji('unit: hapus', 'business', 'DELETE', { q: { unitId: unitBaru.data.id } });

		// ── Keuangan ──────────────────────────────────────────────────────────
		const trx = await uji('transaksi: catat (dgn COA)', 'finance', 'POST', { body: { transaction: { unitId, kategoriTrx: 'MASUK', nominal: 5000, keterangan: 'Jual uji', metodeBayar: 'KAS', coaId: pend.id, kasCoaId: kas.id } } });
		await uji('transaksi: catat keluar', 'finance', 'POST', { body: { transaction: { unitId, kategoriTrx: 'KELUAR', nominal: 1000, keterangan: 'Beli uji', coaId: beban.id, kasCoaId: kas.id } } });
		await uji('transaksi: hapus', 'finance', 'DELETE', { q: { transactionId: trx?.data?.id, unitId } });
		await uji('jurnal: buat', 'finance/journal', 'POST', { q: { unitId }, body: { tanggal: hari, memo: 'uji', lines: [{ coaId: kas.id, debit: 100, kredit: 0 }, { coaId: pend.id, debit: 0, kredit: 100 }] } });
		await uji('piutang: buat', 'finance/receivables', 'POST', { q: { unitId }, body: { contactId: kontakAk.insertId, tanggal: hari, jatuhTempo: hari, nominal: 1000, keterangan: 'x' } });
		await uji('hutang: buat', 'finance/payables', 'POST', { q: { unitId }, body: { contactId: kontakAk.insertId, tanggal: hari, jatuhTempo: hari, nominal: 1000 } });
		const [ar] = await db.select().from(s.receivables).where(eq(s.receivables.unitId, unitId)).limit(1);
		const [ap] = await db.select().from(s.payables).where(eq(s.payables.unitId, unitId)).limit(1);
		await uji('piutang: bayar (+akun kas)', 'finance/receivables', 'PUT', { body: { action: 'pay', invoiceId: ar?.id, nominalBayar: 500, kasCoaId: kas.id } });
		await uji('piutang: bayar (tanpa akun kas)', 'finance/receivables', 'PUT', { body: { action: 'pay', invoiceId: ar?.id, nominalBayar: 100 } });
		await uji('hutang: bayar', 'finance/payables', 'PUT', { body: { action: 'pay', invoiceId: ap?.id, nominalBayar: 500, kasCoaId: kas.id } });
		const kk = await uji('kontak akuntansi: buat', 'finance/contacts', 'POST', { body: { unitId, namaKontak: 'Baru', tipeKontak: 'CUSTOMER', email: '', telepon: '1', alamat: '', npwp: '', limitKredit: 0, termPembayaran: 30 } });
		await uji('kontak akuntansi: buat (format lama, null)', 'finance/contacts', 'POST', { q: { unitId }, body: { id: 0, unitId, namaKontak: 'Lama', tipeKontak: 'customer', email: null, telepon: null, alamat: null, npwp: null, limitKredit: 0, termPembayaran: 30, isActive: 1 } });
		await uji('kontak akuntansi: ubah', 'finance/contacts', 'PUT', { body: { contactId: kk?.data?.id, unitId, namaKontak: 'Baru2', tipeKontak: 'SUPPLIER', email: '', telepon: '', alamat: '', npwp: '', limitKredit: 10, termPembayaran: 15 } });
		await uji('kontak akuntansi: hapus', 'finance/contacts', 'DELETE', { q: { contactId: kk?.data?.id, unitId } });
		const aset = await uji('aset tetap: buat', 'finance/fixed-assets', 'POST', { body: { unitId, namaAset: 'Motor', kategori: 'KENDARAAN', nilaiPerolehan: 10000000, tanggalPerolehan: hari, umurEkonomis: 5, metodePenyusutan: 'GARIS_LURUS', nilaiSisa: 0 } });
		const [asetRow] = await db.select().from(s.fixedAssets).where(eq(s.fixedAssets.unitId, unitId)).limit(1);
		await uji('aset tetap: ubah', 'finance/fixed-assets', 'PUT', { body: { id: asetRow?.id, unitId, namaAset: 'Motor 2', kategori: 'KENDARAAN', nilaiPerolehan: 10000000, tanggalPerolehan: hari, umurEkonomis: 5, metodePenyusutan: 'GARIS_LURUS', nilaiSisa: 0, status: 'AKTIF' } });
		await uji('aset tetap: hapus', 'finance/fixed-assets', 'DELETE', { q: { id: asetRow?.id, unitId } });
		await uji('pajak: buat', 'finance/tax-rates', 'POST', { body: { unitId, namaPajak: 'PPN 11%', persentase: 11, tipe: 'PPN', isDefault: 1 } });
		const [pj] = await db.select().from(s.taxRates).where(eq(s.taxRates.unitId, unitId)).limit(1);
		await uji('pajak: ubah', 'finance/tax-rates', 'PUT', { body: { id: pj?.id, unitId, namaPajak: 'PPN 12%', persentase: 12, tipe: 'PPN', isDefault: 1, isActive: 1 } });
		await uji('pajak: rekap', 'finance/pajak', 'GET', { q: { unitId, tahun: 2026 } });
		await uji('pajak: hapus', 'finance/tax-rates', 'DELETE', { q: { id: pj?.id, unitId } });
		await uji('anggaran: buat', 'finance/budget', 'POST', { body: { unitId, coaId: beban.id, tahun: 2026, bulan: 0, nominal: 100000, keterangan: 'x' } });
		const [bg] = await db.select().from(s.budgetItems).where(eq(s.budgetItems.unitId, unitId)).limit(1);
		await uji('anggaran: hapus', 'finance/budget', 'DELETE', { q: { id: bg?.id, unitId } });
		await uji('COA: buat', 'finance/coa', 'POST', { body: { unitId, kodeAkun: '1-9999', namaAkun: 'Kas Uji', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT' } });
		const [cu] = await db.select().from(s.chartOfAccounts).where(and(eq(s.chartOfAccounts.unitId, unitId), eq(s.chartOfAccounts.kodeAkun, '1-9999')));
		await uji('COA: ubah', 'finance/coa', 'PUT', { body: { id: cu?.id, namaAkun: 'Kas Uji 2', deskripsi: '', isActive: true } });
		await uji('COA: nonaktifkan', 'finance/coa', 'DELETE', { q: { coaId: cu?.id } });
		await uji('COA: lengkapi dengan AI', 'finance/coa', 'POST', { body: { action: 'generate-ai', unitId, deskripsi: 'toko kopi', tambahkan: true } });
		await uji('tutup buku', 'finance/close-period', 'POST', { body: { unitId, periodStart: '2026-01-01', periodEnd: '2026-01-31', keterangan: 'uji' } });
		await uji('laporan lengkap', 'finance/laporan', 'GET', { q: { unitId, type: 'report', tahun: 2026, bulan: 'all' } });

		// ── Produk ────────────────────────────────────────────────────────────
		const pb = await uji('produk: tambah (kategori baru)', 'products', 'POST', { body: { id: '', sku: 'SKU-' + t, nama: 'Teh Uji', hargaBeli: 500, hargaJual: 1500, stok: 5, minStok: 2, kategori: 'MINUMAN', unitId, hasVariant: 0, showInPos: 1, jenis: 'BARANG_JADI' } });
		const [teh] = await db.select().from(s.products).where(and(eq(s.products.unitId, unitId), eq(s.products.nama, 'TEH UJI')));
		const tehId = teh?.id || (await db.select().from(s.products).where(eq(s.products.unitId, unitId))).find((x) => /teh/i.test(x.nama))?.id;
		await uji('produk: ubah', 'products', 'PUT', { body: { id: tehId, sku: 'SKU-' + t, nama: 'Teh Uji 2', hargaBeli: 500, hargaJual: 1600, stok: 8, minStok: 2, kategori: 'MINUMAN', unitId } });
		await uji('produk: koreksi stok', 'products', 'POST', { body: { action: 'adjust-stock', productId: tehId, unitId, perubahan: 3, alasan: 'ADJUSTMENT', keterangan: '' } });
		await uji('produk: log stok', 'products', 'GET', { q: { unitId, action: 'stock-logs', productId: tehId } });
		await uji('varian: buat', 'products/variants', 'POST', { q: { unitId }, body: { productId: tehId, namaVariasi: 'Besar', sku: '', hargaBeli: 1, hargaJual: 2, stok: 1, minStok: 0 } });
		await uji('harga: terapkan strategi', 'products/pricing', 'POST', { q: { unitId }, body: { productId: tehId, type: 'PERCENTAGE', value: 20 } });
		await uji('produk: hapus (ke tempat sampah)', 'products', 'DELETE', { q: { productId: tehId } });
		await uji('produk: pulihkan', 'products/trash', 'POST', { body: { productId: tehId } });

		// ── POS ───────────────────────────────────────────────────────────────
		await uji('kasir: bayar', 'pos', 'POST', { body: { action: 'checkout', order: { orderNumber: `ORD-${t}`, unitId, subtotal: 2000, diskon: 0, total: 2000, paymentMethod: 'CASH', items: [{ productId: pid, productName: 'Kopi Uji', qty: 1, price: 2000 }], orderType: 'DINE_IN', tableNumber: '5', queueNumber: 'A1', amountPaid: 5000, changeAmount: 3000, payments: [{ method: 'CASH', amount: 2000 }] } } });
		await uji('kasir: pelanggan baru', 'pos', 'POST', { body: { action: 'create-customer', customer: { namaCustomer: 'Cust', email: '', telepon: '', unitId } } });
		const sh = await uji('shift: buka', 'pos', 'POST', { body: { action: 'open-shift', shift: { unitId, modalAwal: 100000 } } });
		await uji('shift: setor kas', 'pos/cash', 'POST', { body: { unitId, shiftId: sh?.data?.id, type: 'CASH_IN', amount: 1000, description: 'receh' } });
		await uji('shift: kas shift', 'pos/cash', 'GET', { q: { shiftId: sh?.data?.id } });
		await uji('shift: tutup', 'pos', 'POST', { body: { action: 'close-shift', shift: { shiftId: sh?.data?.id, unitId, kasAkhirAktual: 101000, catatan: '' } } });
		const [ord] = await db.select().from(s.posOrders).where(eq(s.posOrders.unitId, unitId)).limit(1);
		await uji('antrean: ubah status', 'pos', 'POST', { body: { action: 'update-queue-status', orderId: ord?.id, status: 'PREPARING' } });
		await uji('antrean: daftar', 'pos', 'GET', { q: { unitId, action: 'queue' } });
		await uji('voucher: buat', 'pos/vouchers', 'POST', { body: { unitId, code: 'HM' + t, discountType: 'PERCENTAGE', discountValue: 10, maxUsage: 0, minPurchase: 0, validFrom: '2026-01-01', validUntil: '2030-01-01' } });
		const [vc] = await db.select().from(s.vouchers).where(eq(s.vouchers.unitId, unitId)).limit(1);
		await uji('voucher: cek kode', 'pos/vouchers', 'PUT', { body: { action: 'validate-voucher', unitId, code: 'HM' + t, purchaseAmount: 10000 } });
		await uji('voucher: ubah', 'pos/vouchers', 'PUT', { body: { action: 'update-voucher', voucherId: vc?.id, discountType: 'FIXED', discountValue: 500, maxUsage: 5, minPurchase: 0, validFrom: '2026-01-01', validUntil: '2030-01-01', isActive: true } });
		await uji('voucher: nonaktifkan', 'pos/vouchers', 'DELETE', { q: { voucherId: vc?.id } });
		await uji('POS: ubah fitur', 'pos/features', 'PUT', { body: { unitId, features: { manualDiscount: true } } });
		await uji('POS: reset fitur', 'pos/features', 'DELETE', { q: { unitId } });
		await uji('POS: produk tampil di kasir', 'pos/products', 'PUT', { body: { unitId, productId: pid, showInPos: true } });
		await uji('POS: laporan', 'pos/reports', 'GET', { q: { unitId }, lateral: true });

		// ── HR ────────────────────────────────────────────────────────────────
		await uji('karyawan: tambah', 'hr', 'POST', { body: { action: 'create-employee', employee: { fullName: 'Rina Uji', position: 'Kasir', salary: 1000000, pin: '1234', role: 'cashier', unitId, email: 'r@x.id', phone: '08', password: 'rahasia1', division: 'Toko', jobGrade: 'Junior', employmentStatus: 'Tetap', joinDate: hari } } });
		const [emp] = await db.select().from(s.employees).where(eq(s.employees.companyId, unitId)).limit(1);
		await uji('karyawan: detail', `hr/[employeeId]`, 'GET', { params: { employeeId: String(emp?.id) } });
		await uji('karyawan: ubah profil', `hr/[employeeId]`, 'PUT', { params: { employeeId: String(emp?.id) }, body: { fullName: 'Rina Uji 2', position: 'Kasir Senior', salary: 1200000, email: 'r2@x.id', employmentStatus: 'Tetap', status: 'active' } });
		await uji('absen masuk', 'hr', 'POST', { body: { action: 'check-in', employeeId: emp?.id, unitId, date: hari, time: '08:00' } });
		await uji('absen keluar', 'hr', 'POST', { body: { action: 'check-out', employeeId: emp?.id, date: hari, time: '17:00' } });
		await uji('payroll: proses', 'hr', 'POST', { body: { action: 'process-payroll', payroll: { employeeId: emp?.id, monthYear: '08/2026', periodMonth: 8, periodYear: 2026, salary: 1000000, allowance: 0, deduction: 0, netSalary: 1000000, unitId } } });
		await uji('payroll: tolak proses ganda', 'hr', 'POST', { body: { action: 'process-payroll', payroll: { employeeId: emp?.id, monthYear: '08/2026', periodMonth: 8, periodYear: 2026, salary: 1000000, allowance: 0, deduction: 0, netSalary: 1000000, unitId } }, ok: (j, st) => st === 409 });
		await uji('payroll: tolak net tidak konsisten', 'hr', 'POST', { body: { action: 'process-payroll', payroll: { employeeId: emp?.id, monthYear: '09/2026', periodMonth: 9, periodYear: 2026, salary: 1000000, allowance: 100000, deduction: 0, netSalary: 5000000, unitId } }, ok: (j, st) => st === 422 });
		const [pr] = await db.select().from(s.payrolls).limit(1);
		await uji('payroll: tandai lunas', 'hr/payroll', 'PUT', { body: { action: 'mark-paid', unitId, payrollIds: [pr?.id] }, lateral: true });
		await uji('departemen: buat', 'hr/departments', 'POST', { body: { unitId, name: 'Gudang' } });
		const [dp] = await db.select().from(s.departments).where(eq(s.departments.unitId, unitId)).limit(1);
		await uji('departemen: ubah', 'hr/departments', 'PUT', { body: { departmentId: dp?.id, unitId, name: 'Gudang 2' } });
		await uji('departemen: hapus', 'hr/departments', 'DELETE', { q: { departmentId: dp?.id, unitId } });
		await uji('persetujuan: ajukan reimburse', 'hr/approvals', 'POST', { body: { action: 'create-reimbursement-request', unitId, employeeId: emp?.id, amount: 50000, category: 'LAINNYA', description: 'Bensin', expenseDate: hari } });
		const [ap1] = await db.select().from(s.approvalRequests).where(eq(s.approvalRequests.unitId, unitId)).limit(1);
		await uji('persetujuan: setujui', 'hr/approvals', 'PUT', { body: { action: 'approve-request', requestId: ap1?.id, unitId } });
		await uji('komponen gaji: tambah', `hr/[employeeId]`, 'POST', { params: { employeeId: String(emp?.id) }, body: { action: 'add-component', component: { name: 'Tunjangan transport', amount: 150000, type: 'addition' } } });
		await uji('komponen gaji: tambah potongan', `hr/[employeeId]`, 'POST', { params: { employeeId: String(emp?.id) }, body: { action: 'add-component', component: { name: 'BPJS', amount: 50000, type: 'deduction' } } });
		await uji('komponen gaji: tolak nominal 0', `hr/[employeeId]`, 'POST', { params: { employeeId: String(emp?.id) }, body: { action: 'add-component', component: { name: 'X', amount: 0, type: 'addition' } }, ok: (j, st) => st === 422 });
		const [komp] = await db.select().from(s.salaryComponents).where(eq(s.salaryComponents.employeeId, emp?.id)).limit(1);
		await uji('komponen gaji: hapus', `hr/[employeeId]`, 'POST', { params: { employeeId: String(emp?.id) }, body: { action: 'delete-component', componentId: komp?.id } });
		await uji('karyawan: hapus', 'hr', 'DELETE', { q: { employeeId: emp?.id, unitId } });

		// ── CRM ───────────────────────────────────────────────────────────────
		await uji('CRM: kontak baru', 'crm', 'POST', { body: { action: 'create-contact', contact: { nama: 'Bimo', telepon: '', email: '', perusahaan: '', stage: 'lead', sumber: 'manual', unitId } } });
		await uji('CRM: deal baru', 'crm', 'POST', { body: { deal: { contactName: 'Ani', companyName: 'PT A', dealValue: 100, stage: 'PROSPEK', phone: '', unitId } } });
		const [dl] = await db.select().from(s.crmDeals).where(eq(s.crmDeals.unitId, unitId)).limit(1);
		await uji('CRM: pindah tahap', 'crm', 'PUT', { body: { dealId: dl?.id, stage: 'NEGOSIASI', unitId } });
		await uji('CRM: aktivitas', 'crm/activities', 'POST', { body: { action: 'create-activity', activity: { kontakId: kontakCrm.insertId, tipe: 'Call', catatan: 'x', unitId } } });
		await uji('CRM: kampanye', 'crm/campaigns', 'POST', { body: { unitId, name: 'Promo', type: 'EMAIL', status: 'DRAFT', budget: 0 } });
		await uji('CRM: hapus deal', 'crm', 'DELETE', { q: { dealId: dl?.id, unitId } });
		await uji('target sales: buat', 'sales/targets', 'POST', { body: { action: 'create-target', target: { unitId, targetAmount: 1000000, periodMonth: 8, periodYear: 2026 } } });

		// ── Pengadaan ─────────────────────────────────────────────────────────
		await uji('supplier: buat', 'scm', 'POST', { body: { action: 'create-supplier', supplier: { name: 'Sup Baru', contactName: 'c', phone: '1', email: '', category: 'Umum', address: 'a', unitId } } });
		const po2 = await uji('PO: buat', 'scm', 'POST', { body: { action: 'create-po', po: { poNumber: `PO-${t}`, supplierId: String(sup.insertId), productId: pid, qty: 3, unitCost: 1000, totalAmount: 3000, unitId } } });
		const [poBaru] = await db.select().from(s.purchaseOrders).where(and(eq(s.purchaseOrders.unitId, unitId))).orderBy((await import('drizzle-orm')).desc(s.purchaseOrders.id)).limit(1);
		await uji('PO: kirim', 'scm', 'PUT', { body: { poId: String(poBaru.id), status: 'SENT', unitId } });
		await uji('PO: detail', 'scm/po', 'GET', { q: { poId: poId } });
		const it1 = (await db.select().from(s.purchaseOrderItems).where(eq(s.purchaseOrderItems.poId, poId)))[0];
		await uji('PO: terima barang', 'scm/po', 'POST', { body: { poId, action: 'terima', tanggal: hari, noSuratJalan: 'SJ1', catatan: '', items: [{ itemId: it1.id, qty: 4 }] } });
		await uji('PO: catat tagihan', 'scm/po', 'POST', { body: { poId, action: 'tagih', nomorFaktur: `F-${t}`, tanggal: hari, jatuhTempo: hari, items: [{ itemId: it1.id, qty: 4 }] } });
		const [tg] = await db.select().from(s.payables).where(eq(s.payables.unitId, unitId)).orderBy((await import('drizzle-orm')).desc(s.payables.id)).limit(1);
		await uji('PO: bayar tagihan', 'scm/po', 'POST', { body: { poId, action: 'bayar', payableId: tg.id, nominal: 1000, kasCoaId: kas.id } });
		await uji('PO: retur', 'scm/po', 'POST', { body: { poId, action: 'retur', tanggal: hari, alasan: 'rusak', items: [{ itemId: it1.id, qty: 1 }] } });
		await uji('PO: tutup', 'scm/po', 'POST', { body: { poId, action: 'tutup' } });
		await uji('supplier: hapus (ber-PO ditolak 409 wajar)', 'scm', 'DELETE', { q: { supplierId: sup.insertId, unitId }, ok: (_j, st) => st === 409 });

		// ── Layanan pelanggan, notifikasi ─────────────────────────────────────
		const tk = await uji('tiket: buat', 'cs', 'POST', { body: { action: 'create', subject: 'Tes', customerName: 'Ani', priority: 'medium', message: 'halo', unitId } });
		const [tkRow] = await db.select().from(s.supportTickets).where(eq(s.supportTickets.unitId, unitId)).limit(1);
		await uji('tiket: balas', 'cs/[ticketId]/reply', 'POST', { params: { ticketId: String(tkRow?.id) }, body: { message: 'ok' } });
		await uji('tiket: ubah status', 'cs/[ticketId]', 'PUT', { params: { ticketId: String(tkRow?.id) }, body: { status: 'RESOLVED' } });
		await uji('notifikasi: tandai semua', 'notifications/read-all', 'PUT', { q: { unitId } });

		// ── Marketing, katalog, web, sosmed ───────────────────────────────────
		await uji('lead: buat', 'marketing', 'POST', { body: { action: 'create-lead', lead: { firstName: 'Dedi', email: 'd@x.id', phone: '08' } }, ok: (j, st) => st < 500 });
		await uji('katalog: terbitkan produk', 'katalog', 'PUT', { body: { action: 'toggle-publish', productId: pid, unitId, publish: true } });
		await uji('katalog: pengaturan', 'katalog', 'PUT', { body: { action: 'update-katalog-settings', unitId, settings: { unitId, slug: `kat-${t}`, namaPortal: 'Portal', isActive: true } } });
		await uji('halaman landing: buat', 'landing-page', 'POST', { body: { unitId, pageSlug: `lp-${t}`, title: 'Promo', templateId: 'leadgen', contentJson: {}, isActive: false } });
		const [lp] = await db.select().from(s.landingPages).where(eq(s.landingPages.unitId, unitId)).limit(1);
		await uji('halaman landing: aktifkan', 'landing-page', 'PUT', { body: { id: lp?.id, unitId, isActive: true } });
		await uji('halaman landing: hapus', 'landing-page', 'DELETE', { q: { id: lp?.id, unitId } });
		await uji('sosmed: buat', 'sosmed', 'POST', { body: { unitId, platform: 'INSTAGRAM', caption: 'halo', status: 'DRAFT' } });
		const [sp] = await db.select().from(s.socialPosts).where(eq(s.socialPosts.unitId, unitId)).limit(1);
		await uji('sosmed: ubah', 'sosmed', 'PUT', { body: { id: sp?.id, unitId, platform: 'INSTAGRAM', caption: 'halo 2', status: 'DRAFT' } });
		await uji('sosmed: hapus', 'sosmed', 'DELETE', { q: { postId: sp?.id, unitId } });
		await uji('website: simpan', 'website', 'PUT', { body: { unitId, domainSlug: `w${t}`, theme: 'modern', colorPrimary: '#6366F1', heroTitle: 'x', heroSubtitle: '', aboutUs: '', contactPhone: '', contactEmail: '', contactAddress: '' } });
		await uji('basis pengetahuan: buat', 'knowledge-base', 'POST', { body: { unitId, title: 'Cara', category: 'Umum', content: 'isi' } });

		// ── Pengaturan akun & rencana bisnis ─────────────────────────────────
		await uji('profil: simpan', 'settings', 'PUT', { body: { mode: 'profile', name: 'Uji', phone: '08' } });
		await uji('preferensi: simpan', 'settings', 'PUT', { body: { mode: 'preferences', darkMode: true, notifPref: true } });
		const bp = await uji('rencana bisnis: simpan', 'business-plan', 'POST', { body: { namaBisnis: 'Kedai', kategori: 'FNB_RESTO', deskripsi: 'x', targetPasar: 'y', status: 'DRAFT' } });
		await uji('rencana bisnis: wizard simpan lagi', 'business-plan', 'POST', { body: { id: bp?.data?.id, namaBisnis: 'Kedai', kategori: 'FNB_RESTO', modalAwal: 1000000, estimasiHarga: 20000, estimasiVolumePerBulan: 100, channelPenjualan: ['offline'], platformOnline: [], currentStep: 5, status: 'COMPLETE' } });
		await uji('rencana bisnis: hapus', 'business-plan', 'DELETE', { q: { id: bp?.data?.id } });


		// ── Kontrak balasan GET ↔ model Kotlin (properti wajib, tipe, array) ─────
		const kotlin = muatKotlin();
		const temuan = [];
		if (kotlin) {
			const abaikan = new Set(['api/app/finance']); // diuji terpisah (query periode)
			for (const ep of kotlin.endpoints) {
				const rute = ep.path.replace(/^api\/app\//, '');
				if (ep.path.includes('$') || !ep.path.startsWith('api/app/') || abaikan.has(ep.path)) continue;
				const key = `../routes/api/app/${rute}/+server.js`;
				if (!mods[key]) continue;
				const q = { unitId };
				for (const [k, v] of Object.entries(ep.query)) {
					if (/^"[^"]*"$/.test(v)) q[k] = v.slice(1, -1);
					else if (k === 'tahun' || k === 'year') q[k] = new Date().getFullYear();
				}
				try {
					const m = await mods[key]();
					const url = `http://x/?${new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])).toString()}`;
					const res = await m.GET({ request: new Request(url), cookies: { get() {} }, url: new URL(url), params: {}, locals: {} });
					const j = await res.json().catch(() => null);
					if (!j || res.status >= 500 || j.success === false) { if (res.status >= 500) temuan.push(`${ep.fn} (${rute}): HTTP ${res.status} ${j?.message || ''}`.slice(0, 600)); continue; }
					const kendala = [];
					periksa(j.data, ep.tipe, kotlin.classes, '', kendala);
					for (const k of kendala.slice(0, 4)) temuan.push(`${ep.fn} (${rute}) → ${ep.tipe}: ${k}`);
				} catch (e) { temuan.push(`${ep.fn} (${rute}): CRASH ${String(e.message).slice(0, 100)}`); }
			}
		}
		if (process.env.AUDIT_OUT) (await import('node:fs')).writeFileSync(process.env.AUDIT_OUT, temuan.join('\n'));

		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
		console.log('DILEWATI (khusus MariaDB lokal):', dilewati.join('; '));
		expect(hasil).toEqual([]);
	}, 120000);
});
