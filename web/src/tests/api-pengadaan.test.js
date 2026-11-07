/**
 * Alur modul Pengadaan terhadap database sungguhan.
 * Hanya jalan kalau TEST_DATABASE_URL diset (database khusus tes).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('modul Pengadaan', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let p;
	/** @type {any} */ let eq;
	/** @type {any} */ let scm;
	/** @type {any} */ let scmPo;
	/** @type {any} */ let scmLaporan;
	/** @type {any} */ let ctx;
	/** @type {any} */ let ctxLain;
	/** @type {Record<string, any>} */
	const id = {};
	const akhiran = Date.now();

	const stok = async (/** @type {string} */ pid) => {
		const [b] = await db.select().from(s.products).where(eq(s.products.id, pid));
		return b;
	};
	const barisPO = (/** @type {number} */ poId) => db.select().from(s.purchaseOrderItems).where(eq(s.purchaseOrderItems.poId, poId));
	const kepala = async (/** @type {number} */ poId) => (await db.select().from(s.purchaseOrders).where(eq(s.purchaseOrders.id, poId)))[0];

	/** PO dalam status SENT: A 10 x 1.000, B 5 x 2.000 */
	async function poTerkirim(/** @type {any} */ biaya = {}) {
		const poId = await p.buatPO(db, ctx, {
			supplierId: id.supplier,
			items: [
				{ productId: id.produkA, qty: 10, unitPrice: 1000 },
				{ productId: id.produkB, qty: 5, unitPrice: 2000 }
			],
			...biaya
		});
		await p.kirimPO(db, ctx, poId);
		const items = await barisPO(poId);
		return { poId, a: items.find((/** @type {any} */ i) => i.productId === id.produkA), b: items.find((/** @type {any} */ i) => i.productId === id.produkB) };
	}

	const faktur = (/** @type {string} */ nama) => `${nama}-${akhiran}`;

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		p = await import('../lib/server/pengadaan.js');
		scm = await import('../routes/api/app/scm/+server.js');
		scmPo = await import('../routes/api/app/scm/po/+server.js');
		scmLaporan = await import('../routes/api/app/scm/laporan/+server.js');

		const [u1] = await db.insert(s.users).values({ username: `beli1${akhiran}`, email: `beli1${akhiran}@tes.local`, password: 'x' });
		const [u2] = await db.insert(s.users).values({ username: `beli2${akhiran}`, email: `beli2${akhiran}@tes.local`, password: 'x' });
		id.user = u1.insertId;
		id.userLain = u2.insertId;
		const [unit] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Toko Tes', slug: `beli-${akhiran}`, kategori: 'RETAIL' });
		const [unitLain] = await db.insert(s.unitBisnis).values({ userId: id.userLain, namaUnit: 'Toko Lain', slug: `beli-lain-${akhiran}`, kategori: 'RETAIL' });
		id.unit = unit.insertId;
		id.unitLain = unitLain.insertId;
		ctx = { unitId: id.unit, userId: id.user };
		ctxLain = { unitId: id.unitLain, userId: id.userLain };

		id.supplier = await p.buatSupplier(db, ctx, { namaSupplier: 'PT Pemasok Tes', phone: '0811', termPembayaran: 14 });
		id.supplierLain = await p.buatSupplier(db, ctxLain, { namaSupplier: 'PT Pemasok Lain' });

		id.produkA = `A${akhiran}`;
		id.produkB = `B${akhiran}`;
		id.produkLain = `L${akhiran}`;
		const produk = (/** @type {string} */ pid, /** @type {number} */ userId, /** @type {number} */ unitId, /** @type {string} */ nama) => ({
			id: pid, slug: pid, nama, userId, unitId, hargaBeli: '500', hargaJual: '3000', stok: 10
		});
		await db.insert(s.products).values([
			produk(id.produkA, id.user, id.unit, 'Produk A'),
			produk(id.produkB, id.user, id.unit, 'Produk B'),
			produk(id.produkLain, id.userLain, id.unitLain, 'Produk Lain')
		]);
	});

	afterAll(async () => {
		// Tidak cascade dari user: transaksi.user_id dan payables.contact_id (restrict)
		if (id.user) await db.delete(s.transaksi).where(eq(s.transaksi.userId, id.user));
		if (id.unit) await db.delete(s.payables).where(eq(s.payables.unitId, id.unit));
		if (id.user) await db.delete(s.users).where(eq(s.users.id, id.user));
		if (id.userLain) await db.delete(s.users).where(eq(s.users.id, id.userLain));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool.end();
	});

	describe('Purchase Order', () => {
		it('menghitung total di server dan memberi nomor urut', async () => {
			const poId = await p.buatPO(db, ctx, {
				supplierId: id.supplier,
				diskon: 1000,
				ongkir: 500,
				ppnPersen: 11,
				items: [{ productId: id.produkA, qty: 10, unitPrice: 1000 }]
			});
			const po = await kepala(poId);
			expect(Number(po.totalAmount)).toBe(10490);
			expect(po.status).toBe('DRAFT');
			expect(po.createdBy).toBe(id.user);
			expect(po.poNumber).toMatch(new RegExp(`^PO-${id.unit}-\\d{4}-\\d{4}$`));

			const kedua = await kepala(await p.buatPO(db, ctx, { supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 1 }] }));
			expect(Number(kedua.poNumber.slice(-4))).toBe(Number(po.poNumber.slice(-4)) + 1);
		});

		it('menolak supplier & produk unit lain, baris ganda, dan diskon berlebih', async () => {
			const barang = [{ productId: id.produkA, qty: 1, unitPrice: 100 }];
			await expect(p.buatPO(db, ctx, { supplierId: id.supplierLain, items: barang })).rejects.toThrow('Supplier tidak ditemukan');
			await expect(p.buatPO(db, ctx, { supplierId: id.supplier, items: [{ productId: id.produkLain, qty: 1, unitPrice: 1 }] })).rejects.toThrow('produk yang tidak ditemukan');
			await expect(p.buatPO(db, ctx, { supplierId: id.supplier, items: [...barang, ...barang] })).rejects.toThrow('lebih dari sekali');
			await expect(p.buatPO(db, ctx, { supplierId: id.supplier, diskon: 999, items: barang })).rejects.toThrow('Diskon');
			await expect(p.buatPO(db, ctx, { supplierId: id.supplier, items: [] })).rejects.toThrow('minimal satu barang');
		});

		it('draft bisa diubah & dihapus, setelah dikirim tidak bisa', async () => {
			const poId = await p.buatPO(db, ctx, { supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 100 }] });
			await p.ubahPO(db, ctx, poId, { supplierId: id.supplier, items: [{ productId: id.produkB, qty: 3, unitPrice: 100 }] });
			const items = await barisPO(poId);
			expect(items).toHaveLength(1);
			expect(items[0].productId).toBe(id.produkB);
			expect(Number((await kepala(poId)).totalAmount)).toBe(300);

			await p.kirimPO(db, ctx, poId);
			await expect(p.ubahPO(db, ctx, poId, { supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 1 }] })).rejects.toThrow('Draft');
			await expect(p.hapusPO(db, ctx, poId)).rejects.toThrow('Draft');
			await expect(p.kirimPO(db, ctx, poId)).rejects.toThrow('sudah pernah dikirim');

			const draft = await p.buatPO(db, ctx, { supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 100 }] });
			await p.hapusPO(db, ctx, draft);
			expect(await kepala(draft)).toBeUndefined();
			expect(await barisPO(draft)).toHaveLength(0);
		});

		it('pengguna unit lain tidak bisa menyentuh PO', async () => {
			const { poId, a } = await poTerkirim();
			await expect(p.batalPO(db, ctxLain, poId)).rejects.toThrow('tidak ditemukan');
			await expect(p.terimaBarang(db, ctxLain, poId, { items: [{ itemId: a.id, qty: 1 }] })).rejects.toThrow('tidak ditemukan');
			expect(await p.detailPO(db, id.unitLain, poId)).toBeNull();
		});
	});

	describe('Penerimaan', () => {
		it('sebagian lalu lengkap: stok, log, harga pokok, status', async () => {
			const awalA = await stok(id.produkA);
			const { poId, a, b } = await poTerkirim();

			await p.terimaBarang(db, ctx, poId, { noSuratJalan: 'SJ-1', items: [{ itemId: a.id, qty: 4 }] });
			expect((await kepala(poId)).status).toBe('PARTIAL');
			const setelah = await stok(id.produkA);
			expect(setelah.stok).toBe(awalA.stok + 4);
			// Harga pokok rata-rata bergerak
			const harapan = (awalA.stok * Number(awalA.hargaBeli) + 4 * 1000) / (awalA.stok + 4);
			expect(Number(setelah.hargaBeli)).toBeCloseTo(harapan, 1);

			const log = await db.select().from(s.stockLogs).where(eq(s.stockLogs.productId, id.produkA));
			expect(log.at(-1)?.alasan).toBe('MASUK');

			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 6 }, { itemId: b.id, qty: 5 }] });
			expect((await kepala(poId)).status).toBe('COMPLETED');
			expect((await p.detailPO(db, id.unit, poId)).penerimaan).toHaveLength(2);
		});

		it('menolak jumlah berlebih, baris ganda, PO draft, dan PO selesai', async () => {
			const { poId, a, b } = await poTerkirim();
			const stokAwal = (await stok(id.produkA)).stok;
			await expect(p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 11 }] })).rejects.toThrow('melebihi sisa');
			await expect(p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 6 }, { itemId: a.id, qty: 6 }] })).rejects.toThrow('lebih dari sekali');
			await expect(p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 0 }] })).rejects.toThrow('minimal satu');
			// Barang valid + barang berlebih: semuanya batal (transaksi)
			await expect(p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 1 }, { itemId: b.id, qty: 99 }] })).rejects.toThrow('melebihi sisa');
			expect((await stok(id.produkA)).stok).toBe(stokAwal);
			expect((await p.detailPO(db, id.unit, poId)).penerimaan).toHaveLength(0);

			const draft = await p.buatPO(db, ctx, { supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 100 }] });
			const [itemDraft] = await barisPO(draft);
			await expect(p.terimaBarang(db, ctx, draft, { items: [{ itemId: itemDraft.id, qty: 1 }] })).rejects.toThrow('Kirim PO');
		});

		it('dua penerimaan bersamaan tidak bisa melebihi pesanan', async () => {
			const { poId, a } = await poTerkirim();
			const stokAwal = (await stok(id.produkA)).stok;
			const hasil = await Promise.allSettled([
				p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] }),
				p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] })
			]);
			expect(hasil.filter((h) => h.status === 'fulfilled')).toHaveLength(1);
			expect((await stok(id.produkA)).stok).toBe(stokAwal + 10);
		});

		it('batal hanya sebelum ada barang; tutup PO untuk yang sebagian', async () => {
			const { poId, a } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 1 }] });
			await expect(p.batalPO(db, ctx, poId)).rejects.toThrow();
			await p.tutupPO(db, ctx, poId);
			expect((await kepala(poId)).status).toBe('COMPLETED');
			await expect(p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 1 }] })).rejects.toThrow('tidak menunggu');

			const lain = await poTerkirim();
			await p.batalPO(db, ctx, lain.poId, 'Salah pesan');
			const dibatalkan = await kepala(lain.poId);
			expect(dibatalkan.status).toBe('CANCELLED');
			expect(dibatalkan.alasanBatal).toBe('Salah pesan');
		});
	});

	describe('Tagihan, pembayaran, retur', () => {
		/** @param {number} journalId */
		const barisJurnal = async (journalId) => {
			const baris = await db
				.select({ namaAkun: s.chartOfAccounts.namaAkun, debit: s.journalEntryLines.debit, kredit: s.journalEntryLines.kredit })
				.from(s.journalEntryLines)
				.innerJoin(s.chartOfAccounts, eq(s.journalEntryLines.coaId, s.chartOfAccounts.id))
				.where(eq(s.journalEntryLines.journalId, journalId));
			return baris.map((/** @type {any} */ b) => ({ akun: b.namaAkun, d: Number(b.debit), k: Number(b.kredit) }));
		};

		it('tagihan membuat hutang + jurnal seimbang, proporsional terhadap PO', async () => {
			const { poId, a, b } = await poTerkirim({ diskon: 2000, ongkir: 1000, ppnPersen: 10 });
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }, { itemId: b.id, qty: 5 }] });

			// A 5 x 1.000 = 5.000 dari subtotal 20.000 (25%)
			const { payableId, total } = await p.buatTagihan(db, ctx, poId, {
				nomorFaktur: faktur('F1'), tanggal: '2026-11-01', jatuhTempo: '2026-11-15', items: [{ itemId: a.id, qty: 5 }]
			});
			// diskon 500, ongkir 250, dpp 4.500, ppn 450, persediaan 4.750
			expect(total).toBe(5200);

			const [hutang] = await db.select().from(s.payables).where(eq(s.payables.id, payableId));
			expect(Number(hutang.nominal)).toBe(5200);
			expect(hutang.status).toBe('BELUM_BAYAR');

			const jurnal = await barisJurnal(hutang.journalId);
			expect(jurnal.find((/** @type {any} */ j) => /persediaan/i.test(j.akun))?.d).toBe(4750);
			expect(jurnal.find((/** @type {any} */ j) => /ppn masukan/i.test(j.akun))?.d).toBe(450);
			expect(jurnal.find((/** @type {any} */ j) => /hutang/i.test(j.akun))?.k).toBe(5200);

			// Kontak akuntansi dibuat otomatis dari supplier
			const [supplier] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, id.supplier));
			expect(supplier.contactId).toBe(hutang.contactId);

			const [item] = (await barisPO(poId)).filter((/** @type {any} */ i) => i.id === a.id);
			expect(item.qtyInvoiced).toBe(5);
		});

		it('tidak bisa menagih melebihi barang diterima atau memakai faktur yang sama', async () => {
			const { poId, a, b } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 3 }] });
			const dasar = { tanggal: '2026-11-01', jatuhTempo: '2026-11-15' };
			await expect(p.buatTagihan(db, ctx, poId, { ...dasar, nomorFaktur: faktur('F2'), items: [{ itemId: a.id, qty: 4 }] })).rejects.toThrow('belum ditagih');
			await expect(p.buatTagihan(db, ctx, poId, { ...dasar, nomorFaktur: faktur('F2'), items: [{ itemId: b.id, qty: 1 }] })).rejects.toThrow('belum ditagih');
			await expect(p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F2'), tanggal: '2026-11-15', jatuhTempo: '2026-11-01', items: [{ itemId: a.id, qty: 1 }] })).rejects.toThrow('Jatuh tempo');

			await p.buatTagihan(db, ctx, poId, { ...dasar, nomorFaktur: faktur('F2'), items: [{ itemId: a.id, qty: 1 }] });
			await expect(p.buatTagihan(db, ctx, poId, { ...dasar, nomorFaktur: faktur('F2'), items: [{ itemId: a.id, qty: 1 }] })).rejects.toThrow('sudah pernah dicatat');
			// Gagal di faktur ganda: jumlah ditagih tidak ikut bertambah
			expect((await barisPO(poId)).find((/** @type {any} */ i) => i.id === a.id).qtyInvoiced).toBe(1);
		});

		it('pembayaran mencicil sampai lunas, dicatat di jurnal & arus kas', async () => {
			const { poId, a } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] });
			const { payableId } = await p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F3'), tanggal: '2026-11-01', jatuhTempo: '2026-11-15', items: [{ itemId: a.id, qty: 10 }] });
			const kas = (await p.daftarAkunKas(db, id.unit))[0];
			expect(kas).toBeTruthy();

			await expect(p.bayarTagihan(db, ctx, payableId, { nominal: 10001, kasCoaId: kas.id })).rejects.toThrow('melebihi sisa');
			await expect(p.bayarTagihan(db, ctx, payableId, { nominal: 100 })).rejects.toThrow('kas/bank');
			await expect(p.bayarTagihan(db, ctxLain, payableId, { nominal: 100, kasCoaId: kas.id })).rejects.toThrow('tidak ditemukan');

			await p.bayarTagihan(db, ctx, payableId, { nominal: 4000, kasCoaId: kas.id });
			let [hutang] = await db.select().from(s.payables).where(eq(s.payables.id, payableId));
			expect(hutang.status).toBe('SEBAGIAN');

			await p.bayarTagihan(db, ctx, payableId, { nominal: 6000, kasCoaId: kas.id });
			[hutang] = await db.select().from(s.payables).where(eq(s.payables.id, payableId));
			expect(hutang.status).toBe('LUNAS');
			await expect(p.bayarTagihan(db, ctx, payableId, { nominal: 1, kasCoaId: kas.id })).rejects.toThrow('sudah lunas');

			const bayar = await db.select().from(s.purchasePayments).where(eq(s.purchasePayments.payableId, payableId));
			expect(bayar).toHaveLength(2);
			const jurnal = await barisJurnal(bayar[0].journalId);
			expect(jurnal.find((/** @type {any} */ j) => /hutang/i.test(j.akun))?.d).toBe(4000);
			expect(jurnal.find((/** @type {any} */ j) => j.akun === kas.namaAkun)?.k).toBe(4000);
			const [trx] = await db.select().from(s.transaksi).where(eq(s.transaksi.id, bayar[0].trxId));
			expect(trx.kategoriTrx).toBe('KELUAR');
		});

		it('retur barang belum ditagih hanya mengurangi stok', async () => {
			const { poId, a } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 5 }] });
			const stokAwal = (await stok(id.produkA)).stok;

			const { nilaiPotongHutang, returnId } = await p.returBarang(db, ctx, poId, { alasan: 'Rusak', items: [{ itemId: a.id, qty: 2 }] });
			expect(nilaiPotongHutang).toBe(0);
			expect((await stok(id.produkA)).stok).toBe(stokAwal - 2);
			const [retur] = await db.select().from(s.purchaseReturns).where(eq(s.purchaseReturns.id, returnId));
			expect(retur.journalId).toBeNull();

			const [item] = (await barisPO(poId)).filter((/** @type {any} */ i) => i.id === a.id);
			expect(item.qtyReturned).toBe(2);
			// Yang bisa ditagih tinggal 3
			await expect(p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F4'), tanggal: '2026-11-01', jatuhTempo: '2026-11-15', items: [{ itemId: a.id, qty: 4 }] })).rejects.toThrow('belum ditagih');
		});

		it('retur barang sudah ditagih memotong hutang + jurnal balik', async () => {
			const { poId, a } = await poTerkirim({ ppnPersen: 10 });
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] });
			const { payableId } = await p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F5'), tanggal: '2026-11-01', jatuhTempo: '2026-11-15', items: [{ itemId: a.id, qty: 10 }] });
			expect(Number((await db.select().from(s.payables).where(eq(s.payables.id, payableId)))[0].nominal)).toBe(11000);

			const { nilaiPotongHutang, returnId } = await p.returBarang(db, ctx, poId, { alasan: 'Salah kirim', items: [{ itemId: a.id, qty: 2 }] });
			expect(nilaiPotongHutang).toBe(2200);
			const [hutang] = await db.select().from(s.payables).where(eq(s.payables.id, payableId));
			expect(Number(hutang.nominal)).toBe(8800);

			const [retur] = await db.select().from(s.purchaseReturns).where(eq(s.purchaseReturns.id, returnId));
			const jurnal = await barisJurnal(retur.journalId);
			expect(jurnal.find((/** @type {any} */ j) => /hutang/i.test(j.akun))?.d).toBe(2200);
			expect(jurnal.find((/** @type {any} */ j) => /persediaan/i.test(j.akun))?.k).toBe(2000);
			expect(jurnal.find((/** @type {any} */ j) => /ppn masukan/i.test(j.akun))?.k).toBe(200);
		});

		it('retur ditolak kalau hutang sudah dibayar atau stok sudah habis, dan tidak meninggalkan jejak', async () => {
			const { poId, a } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] });
			const { payableId } = await p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F6'), tanggal: '2026-11-01', jatuhTempo: '2026-11-15', items: [{ itemId: a.id, qty: 10 }] });
			const kas = (await p.daftarAkunKas(db, id.unit))[0];
			await p.bayarTagihan(db, ctx, payableId, { nominal: 10000, kasCoaId: kas.id });

			const stokAwal = (await stok(id.produkA)).stok;
			await expect(p.returBarang(db, ctx, poId, { alasan: 'Rusak', items: [{ itemId: a.id, qty: 1 }] })).rejects.toThrow('Jurnal Umum');
			expect((await stok(id.produkA)).stok).toBe(stokAwal);
			expect((await p.detailPO(db, id.unit, poId)).retur).toHaveLength(0);

			const lain = await poTerkirim();
			await p.terimaBarang(db, ctx, lain.poId, { items: [{ itemId: lain.a.id, qty: 10 }] });
			await db.update(s.products).set({ stok: 1 }).where(eq(s.products.id, id.produkA));
			await expect(p.returBarang(db, ctx, lain.poId, { alasan: 'Rusak', items: [{ itemId: lain.a.id, qty: 2 }] })).rejects.toThrow('tidak cukup');
			await expect(p.returBarang(db, ctx, lain.poId, { alasan: '', items: [{ itemId: lain.a.id, qty: 1 }] })).rejects.toThrow('Alasan');
			await db.update(s.products).set({ stok: 100 }).where(eq(s.products.id, id.produkA));
		});
	});

	describe('Supplier', () => {
		it('menyimpan kontak dalam format mobile, nama ikut berubah di kontak hutang', async () => {
			const sid = await p.buatSupplier(db, ctx, { namaSupplier: 'CV Lama', phone: '0812', email: 'a@b.co', address: 'x'.repeat(200), termPembayaran: 7 });
			const [baris] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, sid));
			expect(p.bacaKontak(baris.kontak).phone).toBe('0812');
			expect(p.bacaKontak('0813').phone).toBe('0813');

			const poId = await p.buatPO(db, ctx, { supplierId: sid, items: [{ productId: id.produkA, qty: 1, unitPrice: 100 }] });
			await p.kirimPO(db, ctx, poId);
			const [item] = await barisPO(poId);
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: item.id, qty: 1 }] });
			const { payableId } = await p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('F7'), tanggal: '2026-11-01', jatuhTempo: '2026-11-08', items: [{ itemId: item.id, qty: 1 }] });
			const [hutang] = await db.select().from(s.payables).where(eq(s.payables.id, payableId));

			await p.ubahSupplier(db, ctx, sid, { namaSupplier: 'CV Baru', termPembayaran: 7 });
			const [kontak] = await db.select().from(s.accountingContacts).where(eq(s.accountingContacts.id, hutang.contactId));
			expect(kontak.namaKontak).toBe('CV Baru');
		});

		it('supplier ber-PO tidak bisa dihapus; nonaktif tidak bisa dipakai PO baru', async () => {
			await expect(p.hapusSupplier(db, ctx, id.supplier)).rejects.toThrow('riwayat PO');
			await expect(p.hapusSupplier(db, ctx, id.supplierLain)).rejects.toThrow('tidak ditemukan');

			const sid = await p.buatSupplier(db, ctx, { namaSupplier: 'CV Nonaktif' });
			await p.aturAktifSupplier(db, ctx, sid, false);
			await expect(p.buatPO(db, ctx, { supplierId: sid, items: [{ productId: id.produkA, qty: 1, unitPrice: 1 }] })).rejects.toThrow('nonaktif');
			await p.hapusSupplier(db, ctx, sid);
			expect(await db.select().from(s.suppliers).where(eq(s.suppliers.id, sid))).toHaveLength(0);
		});
	});

	describe('API mobile /api/app/scm', () => {
		const put = (/** @type {any} */ body) =>
			scm.PUT({ request: new Request('http://x/', { method: 'PUT', body: JSON.stringify(body) }), cookies: { get: () => undefined } });

		it('RECEIVED memakai logika yang sama: stok masuk sekali, tidak bisa ditagih lagi', async () => {
			login.userId = id.user;
			const { poId, a, b } = await poTerkirim();
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 4 }] });
			const stokA = (await stok(id.produkA)).stok;

			const res = await put({ poId, status: 'RECEIVED' });
			expect(res.status).toBe(200);
			expect((await kepala(poId)).status).toBe('RECEIVED');
			// Yang sudah diterima di web (4) tidak masuk lagi, hanya sisanya (6)
			expect((await stok(id.produkA)).stok).toBe(stokA + 6);

			const items = await barisPO(poId);
			const itemA = items.find((/** @type {any} */ i) => i.id === a.id);
			const itemB = items.find((/** @type {any} */ i) => i.id === b.id);
			expect(itemA.qtyReceived).toBe(10);
			expect(itemB.qtyReceived).toBe(5);
			// Sisa dianggap tunai, tapi 4 yang diterima di web masih bisa ditagih
			expect(itemA.qtyInvoiced).toBe(6);
			expect(itemB.qtyInvoiced).toBe(5);

			const ulang = await put({ poId, status: 'RECEIVED' });
			expect(ulang.status).toBe(409);
			expect((await stok(id.produkA)).stok).toBe(stokA + 6);
		});

		it('status tak dikenal ditolak dan unit lain dapat 404', async () => {
			const { poId } = await poTerkirim();
			login.userId = id.user;
			expect((await put({ poId, status: 'APA_SAJA' })).status).toBe(422);
			login.userId = id.userLain;
			expect((await put({ poId, status: 'RECEIVED' })).status).toBe(404);
			expect((await kepala(poId)).status).toBe('SENT');
		});

		it('supplier ber-PO tidak terhapus lewat API', async () => {
			login.userId = id.user;
			const res = await scm.DELETE({
				url: new URL(`http://x/?supplierId=${id.supplier}&unitId=${id.unit}`),
				cookies: { get: () => undefined },
				request: new Request('http://x/')
			});
			expect(res.status).toBe(409);
			expect(await db.select().from(s.suppliers).where(eq(s.suppliers.id, id.supplier))).toHaveLength(1);
		});
	});

	describe('API mobile detail PO (scm/po)', () => {
		const kuki = { get: () => undefined };
		const post = (/** @type {any} */ body) => scmPo.POST({ cookies: kuki, request: new Request('http://x/', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) });

		it('terima sebagian lalu tagih & retur lewat API, detail ikut berubah', async () => {
			login.userId = id.user;
			const { poId } = await poTerkirim();
			const detail = async () => (await (await scmPo.GET({ url: new URL(`http://x/?poId=${poId}`), cookies: kuki, request: new Request('http://x/') })).json()).data;
			const awal = await detail();
			expect(awal.status).toBe('SENT');
			const itemA = awal.items.find((/** @type {any} */ i) => i.productId === id.produkA);
			expect((await post({ poId, action: 'terima', items: [{ itemId: itemA.id, qty: 4 }] })).status).toBe(200);
			const setelah = await detail();
			expect(setelah.status).toBe('PARTIAL');
			expect(setelah.penerimaan).toHaveLength(1);
			expect(setelah.items.find((/** @type {any} */ i) => i.id === itemA.id).qtyReceived).toBe(4);
			expect((await post({ poId, action: 'tagih', nomorFaktur: `F-${akhiran}`, tanggal: '2026-01-01', jatuhTempo: '2026-01-31', items: [{ itemId: itemA.id, qty: 4 }] })).status).toBe(200);
			const ditagih = await detail();
			expect(ditagih.tagihan[0]).toMatchObject({ total: 4000, nominalHutang: 4000, sudahDibayar: 0 });
			// jumlah melebihi sisa ditolak server
			expect((await post({ poId, action: 'terima', items: [{ itemId: itemA.id, qty: 999 }] })).status).toBeGreaterThanOrEqual(400);
		});

		it('PO milik user lain tidak bisa dibuka/diubah', async () => {
			login.userId = id.user;
			const { poId } = await poTerkirim();
			login.userId = id.userLain ?? 999999999;
			const res = await scmPo.GET({ url: new URL(`http://x/?poId=${poId}`), cookies: kuki, request: new Request('http://x/') });
			expect(res.status).toBe(404);
			expect((await post({ poId, action: 'tutup' })).status).toBe(404);
			login.userId = id.user;
		});
	});
	describe('API mobile PO lengkap & ubah supplier (scm)', () => {
		const kuki = { get: () => undefined };
		const kirim = async (/** @type {string} */ method, /** @type {any} */ body) => {
			const res = await scm[method]({ cookies: kuki, request: new Request('http://x/', { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }), url: new URL('http://x/') });
			return { st: res.status, j: await res.json() };
		};

		it('PO banyak barang + diskon/ongkir/PPN dihitung server; unit lain ditolak', async () => {
			login.userId = id.user;
			const r = await kirim('POST', { action: 'create-po-lengkap', po: { unitId: id.unit, supplierId: id.supplier, expectedDate: '2031-05-20', notes: 'Kirim pagi', diskon: 2000, ongkir: 1000, ppnPersen: 10,
				items: [{ productId: id.produkA, qty: 10, unitPrice: 1000 }, { productId: id.produkB, qty: 5, unitPrice: 2000 }] } });
			expect(r.j.success).toBe(true);
			const po = await kepala(Number(r.j.id));
			// subtotal 20.000 − diskon 2.000 + ppn 1.800 (10% dari 18.000) + ongkir 1.000 = 20.800
			expect(Number(po.totalAmount)).toBe(20800);
			expect(po.status).toBe('DRAFT');
			expect((await barisPO(po.id))).toHaveLength(2);
			// validasi: tanpa barang, produk ganda, diskon berlebih
			expect((await kirim('POST', { action: 'create-po-lengkap', po: { unitId: id.unit, supplierId: id.supplier, items: [] } })).st).toBe(422);
			expect((await kirim('POST', { action: 'create-po-lengkap', po: { unitId: id.unit, supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 1 }, { productId: id.produkA, qty: 1, unitPrice: 1 }] } })).st).toBe(422);
			expect((await kirim('POST', { action: 'create-po-lengkap', po: { unitId: id.unit, supplierId: id.supplier, diskon: 999999, items: [{ productId: id.produkA, qty: 1, unitPrice: 10 }] } })).st).toBe(422);
			// unit milik user lain → 404
			login.userId = id.userLain;
			expect((await kirim('POST', { action: 'create-po-lengkap', po: { unitId: id.unit, supplierId: id.supplier, items: [{ productId: id.produkA, qty: 1, unitPrice: 1 }] } })).st).toBe(404);
		});

		it('ubah data supplier & nonaktifkan', async () => {
			login.userId = id.user;
			const u = await kirim('PUT', { action: 'update-supplier', supplierId: id.supplier, supplier: { namaSupplier: 'Supplier Baru Nama', contactName: 'Budi', phone: '0812', email: 'b@x.id', address: 'Jl. A', termPembayaran: 14 } });
			expect(u.j.success).toBe(true);
			const [sup] = await db.select().from(s.suppliers).where(eq(s.suppliers.id, id.supplier));
			expect(sup.namaSupplier).toBe('Supplier Baru Nama');
			expect(sup.termPembayaran).toBe(14);
			expect((await kirim('PUT', { action: 'update-supplier', supplierId: id.supplier, supplier: { namaSupplier: '' } })).st).toBe(422);
			expect((await kirim('PUT', { action: 'set-supplier-aktif', supplierId: id.supplier, aktif: false })).j.success).toBe(true);
			expect((await kirim('PUT', { action: 'set-supplier-aktif', supplierId: id.supplier, aktif: true })).j.success).toBe(true);
			login.userId = id.userLain;
			expect((await kirim('PUT', { action: 'update-supplier', supplierId: id.supplier, supplier: { namaSupplier: 'Curi' } })).st).toBe(404);
		});
	});

	describe('API mobile laporan pembelian (scm/laporan)', () => {
		const kuki = { get: () => undefined };
		const ambil = async (/** @type {string} */ q, /** @type {number} */ unit = id.unit) => {
			const res = await scmLaporan.GET({ url: new URL(`http://x/?unitId=${unit}${q}`), cookies: kuki, request: new Request('http://x/') });
			return { st: res.status, j: await res.json() };
		};

		it('ringkasan, per supplier & per produk sesuai tagihan; periode & isolasi unit', async () => {
			login.userId = id.user;
			const { poId, a } = await poTerkirim({ diskon: 0, ongkir: 0, ppnPersen: 0 });
			await p.terimaBarang(db, ctx, poId, { items: [{ itemId: a.id, qty: 10 }] });
			await p.buatTagihan(db, ctx, poId, { nomorFaktur: faktur('LAP'), tanggal: '2031-03-10', jatuhTempo: '2031-03-31', items: [{ itemId: a.id, qty: 10 }] });
			const r = await ambil('&dari=2031-03-01&sampai=2031-03-31');
			expect(r.j.success).toBe(true);
			expect(r.j.data).toMatchObject({ jumlahFaktur: 1, total: 10000, subtotal: 10000 });
			expect(r.j.data.perSupplier[0]).toMatchObject({ jumlah: 1, total: 10000 });
			expect(r.j.data.perProduk[0]).toMatchObject({ qty: 10, nilai: 10000 });
			// periode lain kosong
			expect((await ambil('&dari=2031-04-01&sampai=2031-04-30')).j.data.jumlahFaktur).toBe(0);
			// unit milik user lain → 404
			expect((await ambil('&dari=2031-03-01&sampai=2031-03-31', id.unitLain)).st).toBe(404);
		});
	});
});
