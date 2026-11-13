/**
 * Kustomisasi kasir per jenis usaha: profil, penyusunan otomatis (aturan & AI), open bill per meja,
 * tiket dapur per stasiun, service charge & PB1 di checkout + jurnal, dan jaminan unit lama tidak berubah.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: null }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => true, pusherServer: { trigger: async () => {} } }));

describe('profil kasir (murni)', () => {
	it('tebakProfil: nama/uraian lebih spesifik daripada kategori', async () => {
		const { tebakProfil } = await import('../lib/posProfil.js');
		expect(tebakProfil('FNB_RESTO', 'Esteh Zara')).toBe('kedai');
		expect(tebakProfil('FNB_RESTO', 'Rumah Makan Padang Sederhana')).toBe('resto');
		expect(tebakProfil('FNB_RESTO', '')).toBe('resto');
		expect(tebakProfil('FNB_COFFEE_ROASTERY')).toBe('kafe');
		expect(tebakProfil('JASA_TEKNIK', 'Bengkel Motor Jaya')).toBe('bengkel');
		expect(tebakProfil('JASA_LAUNDRY')).toBe('laundry');
		expect(tebakProfil('HEALTH_DENTAL')).toBe('klinik');
		expect(tebakProfil('RETAIL_MINIMARKET')).toBe('retail');
		expect(tebakProfil('DEFAULT', 'usaha saya')).toBe('umum');
		expect(tebakProfil('Kedai Kopi Senja')).toBe('umum'); // teks bebas dibaca lewat susunProfilPos
	});

	it('normalisasiPengaturan: batas, sanitasi, kode unik', async () => {
		const { normalisasiPengaturan } = await import('../lib/posProfil.js');
		const p = normalisasiPengaturan(
			{
				jenisPesanan: ['DINE_IN', 'HACK', 'DINE_IN'],
				meja: { aktif: true, daftar: [{ kode: '1', area: '<b>Dalam</b>' }, { kode: '1', area: 'Teras' }, { kode: '2' }] },
				servis: { persen: 99 },
				pajakResto: { aktif: 'true', persen: 50 },
				isian: [{ label: 'Plat nomor', wajib: true }, { label: 'Plat nomor' }, { label: '' }],
				dapur: { aktif: true, stasiun: [] }
			},
			'resto'
		);
		expect(p.jenisPesanan).toEqual(['DINE_IN']);
		expect(p.meja.daftar.map((m) => m.kode)).toEqual(['1', '2']);
		expect(p.meja.daftar[0].area).toBe('bDalam/b');
		expect(p.meja.daftar[1].area).toBe('Utama');
		expect(p.servis.persen).toBe(30);
		expect(p.pajakResto).toEqual({ aktif: true, persen: 15, inklusif: false });
		expect(p.isian.map((f) => f.kunci)).toEqual(['plat_nomor', 'plat_nomor_2']);
		expect(p.dapur.aktif).toBe(false); // tanpa stasiun tidak bisa aktif
		const kosong = normalisasiPengaturan({ jenisPesanan: [] }, 'umum');
		expect(kosong.jenisPesanan).toEqual(['TAKEAWAY']);
		expect(kosong.meja.aktif).toBe(false);
	});

	it('hitungBiayaTambahan: servis dari dasar, PB1 dari (dasar + servis)', async () => {
		const { hitungBiayaTambahan } = await import('../lib/posProfil.js');
		const p = { servis: { persen: 5, hanyaDineIn: true }, pajakResto: { aktif: true, persen: 10, inklusif: false } };
		expect(hitungBiayaTambahan(100000, p, 'DINE_IN')).toMatchObject({ servis: 5000, pajak: 10500, total: 115500 });
		expect(hitungBiayaTambahan(100000, p, 'TAKEAWAY')).toMatchObject({ servis: 0, pajak: 10000, total: 110000 });
		const ink = { servis: { persen: 0, hanyaDineIn: true }, pajakResto: { aktif: true, persen: 10, inklusif: true } };
		expect(hitungBiayaTambahan(110000, ink, 'DINE_IN')).toMatchObject({ pajak: 10000, total: 110000, pajakInklusif: true });
		expect(hitungBiayaTambahan(50000, null, 'DINE_IN').total).toBe(50000);
	});

	it('stasiunUntuk: kategori → stasiun, sisanya ke stasiun umum', async () => {
		const { stasiunUntuk } = await import('../lib/posProfil.js');
		const st = [{ kode: 'dapur', nama: 'Dapur', kategori: [] }, { kode: 'bar', nama: 'Bar', kategori: ['MINUMAN'] }];
		expect(stasiunUntuk('Minuman', st)).toBe('bar');
		expect(stasiunUntuk('MAKANAN', st)).toBe('dapur');
		expect(stasiunUntuk(null, st)).toBe('dapur');
		expect(stasiunUntuk('X', [])).toBe(null);
	});

	it('pengaturanDariAi: meja per area, profil tak sah → cadangan', async () => {
		const { pengaturanDariAi } = await import('../lib/posProfil.js');
		const a = pengaturanDariAi({ profil: 'kedai', jumlahMeja: 12, area: ['Dalam', 'Teras'], servisPersen: 5, isian: [{ label: 'Nama ojol' }] }, 'umum');
		expect(a.profil).toBe('kedai');
		expect(a.pengaturan.meja.daftar).toHaveLength(12);
		expect(new Set(a.pengaturan.meja.daftar.map((m) => m.area))).toEqual(new Set(['Dalam', 'Teras']));
		expect(a.pengaturan.jenisPesanan[0]).toBe('DINE_IN');
		expect(a.pengaturan.servis.persen).toBe(5);
		expect(a.pengaturan.isian[0].label).toBe('Nama ojol');
		expect(pengaturanDariAi({ profil: 'hacker' }, 'retail').profil).toBe('retail');
	});

	it('cekIsianWajib & teksIsian', async () => {
		const { cekIsianWajib, teksIsian } = await import('../lib/posProfil.js');
		const isian = [{ kunci: 'plat', label: 'Plat nomor', tipe: 'teks', wajib: true }, { kunci: 'mek', label: 'Mekanik', tipe: 'teks', wajib: false }];
		expect(cekIsianWajib(/** @type {any} */ (isian), {})).toBe('Plat nomor wajib diisi');
		expect(cekIsianWajib(/** @type {any} */ (isian), { plat: 'B 1 CD' })).toBe(null);
		expect(teksIsian(/** @type {any} */ (isian), { plat: 'B 1 CD', mek: 'Andi' })).toBe('Plat nomor: B 1 CD · Mekanik: Andi');
	});
});

describe.skipIf(!TEST_DB)('profil kasir di basis data', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let o; /** @type {any} */ let prof; /** @type {any} */ let resto; /** @type {any} */ let co; /** @type {any} */ let unitLib;
	/** @type {Record<string, any>} */ const id = {};
	const t = Date.now();

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		o = await import('drizzle-orm');
		prof = await import('../lib/server/posProfil.js');
		resto = await import('../lib/server/posResto.js');
		co = await import('../lib/server/posCheckout.js');
		unitLib = await import('../lib/server/unitBaru.js');
		const [u] = await db.insert(s.users).values({ username: `prof${t}`, email: `prof${t}@x.id` });
		id.user = u.insertId;
	});

	/** Buat produk di unit, dengan kategori bernama */
	async function produk(/** @type {number} */ unitId, /** @type {string} */ kode, /** @type {string} */ nama, /** @type {number} */ harga, /** @type {string} */ kategori) {
		const [k] = await db.select().from(s.kategoriProduk).where(o.and(o.eq(s.kategoriProduk.unitId, unitId), o.eq(s.kategoriProduk.namaKategori, kategori)));
		let katId = k?.id;
		if (!katId) [{ insertId: katId }] = await db.insert(s.kategoriProduk).values({ unitId, namaKategori: kategori });
		await db.insert(s.products).values({ id: `${kode}-${t}`, slug: `${kode}-${t}`.toLowerCase(), userId: id.user, unitId, nama, hargaJual: String(harga), hargaBeli: '1000', stok: 100, kategoriId: katId });
		return `${kode}-${t}`;
	}

	it('unit baru: profil kasir dibuat otomatis (aturan) dan saklar fitur ikut', async () => {
		const u = await unitLib.buatUnit(db, id.user, { nama: `RM Sunda ${t}`, kategori: 'FNB_RESTO', alamat: 'x' });
		id.resto = u.id;
		expect(u.profilPos?.profil).toBe('resto');
		const p = await prof.ambilProfilPos(db, u.id);
		expect(p.sumber).toBe('aturan');
		expect(p.pengaturan.meja.daftar).toHaveLength(10);
		const [unit] = await db.select().from(s.unitBisnis).where(o.eq(s.unitBisnis.id, u.id));
		const fitur = typeof unit.posFeatureOverride === 'string' ? JSON.parse(unit.posFeatureOverride) : unit.posFeatureOverride;
		expect(fitur.tableManagement).toBe(true);
		expect(fitur.kitchenDisplay).toBe(true);
	});

	it('cabang mewarisi profil induk', async () => {
		const c = await unitLib.buatUnit(db, id.user, { nama: `RM Sunda Cabang ${t}`, isCabang: true, cabangDari: id.resto, alamat: 'x' });
		expect((await prof.ambilProfilPos(db, c.id))?.profil).toBe('resto');
	});

	it('uraian usaha + AI → profil disempurnakan; AI gagal → tetap jadi dari aturan', async () => {
		const ai = async () => '```json\n{"profil":"resto","jumlahMeja":15,"area":["Dalam","Saung"],"stasiun":[{"nama":"Dapur","kategori":[]},{"nama":"Minuman","kategori":["MINUMAN"]}],"servisPersen":5,"pajakResto":true,"istilahPelanggan":"Tamu"}\n```';
		const u = await unitLib.buatUnit(db, id.user, { nama: `Saung ${t}`, kategori: 'FNB_RESTO', alamat: 'x', deskripsi: 'Rumah makan sunda 15 meja, ada saung', panggilAi: ai });
		const p = await prof.ambilProfilPos(db, u.id);
		expect(p.sumber).toBe('ai');
		expect(p.pengaturan.meja.daftar).toHaveLength(15);
		expect(p.pengaturan.pajakResto.aktif).toBe(true);
		expect(p.pengaturan.servis.persen).toBe(5);
		id.saung = u.id;

		const gagal = await unitLib.buatUnit(db, id.user, {
			nama: `Laundry ${t}`, kategori: 'JASA_LAUNDRY', alamat: 'x', deskripsi: 'laundry kiloan dekat kampus', panggilAi: async () => { throw new Error('kuota habis'); }
		});
		const q = await prof.ambilProfilPos(db, gagal.id);
		expect(q.profil).toBe('laundry');
		expect(q.sumber).toBe('aturan');
	});

	it('open bill: satu bill per meja, kirim dapur hanya tambahan, catatan berubah tidak kirim ulang', async () => {
		const unitId = id.resto;
		const p = (await prof.ambilProfilPos(db, unitId)).pengaturan;
		id.nasi = await produk(unitId, 'NSI', 'Nasi Timbel', 25000, 'MAKANAN');
		id.teh = await produk(unitId, 'TEH', 'Es Teh', 5000, 'MINUMAN');
		const mejaSah = p.meja.daftar.map((/** @type {any} */ m) => m.kode);

		const b = await resto.simpanBill(db, unitId, { meja: '3', items: [{ productId: id.nasi, qty: 2, catatan: 'sambal pisah', harga: 1 }, { productId: id.teh, qty: 2 }] }, { mejaSah });
		expect(b.subtotal).toBe(60000); // harga dari DB, bukan kiriman klien
		await expect(resto.simpanBill(db, unitId, { meja: '3', items: [{ productId: id.teh, qty: 1 }] }, { mejaSah })).rejects.toThrow(/Meja 3 masih punya bill/);
		await expect(resto.simpanBill(db, unitId, { meja: '99', items: [{ productId: id.teh, qty: 1 }] }, { mejaSah })).rejects.toThrow(/tidak ada di denah/);

		const k1 = await resto.kirimBillKeDapur(db, unitId, b.id, { stasiun: p.dapur.stasiun, labelBill: p.labelBill });
		expect(k1.tiket).toBe(2); // dapur + bar
		const tiket = await resto.daftarTiket(db, unitId);
		const bar = tiket.find((/** @type {any} */ x) => x.stasiun === 'bar');
		expect(bar.items).toEqual([{ nama: 'Es Teh', qty: 2, catatan: '' }]);
		expect(bar.label).toBe('Meja 3');

		// Versi lama ditolak (kasir lain sudah mengubah)
		await expect(resto.simpanBill(db, unitId, { id: b.id, versi: b.versi, meja: '3', items: [{ productId: id.teh, qty: 3 }] }, { mejaSah })).rejects.toThrow(/diubah kasir lain/);

		// Ubah catatan nasi + tambah 1 es teh → yang dikirim hanya 1 es teh
		const b2 = await resto.simpanBill(db, unitId, { id: b.id, versi: k1.bill.versi, meja: '3', items: [{ productId: id.nasi, qty: 2, catatan: 'tanpa sambal' }, { productId: id.teh, qty: 3 }] }, { mejaSah });
		expect(b2.belumDikirim).toBe(1);
		const k2 = await resto.kirimBillKeDapur(db, unitId, b.id, { stasiun: p.dapur.stasiun, labelBill: p.labelBill });
		expect(k2.tiket).toBe(1);
		id.bill = b.id;
	});

	it('bayar bill: servis 5% + PB1 10%, jurnal seimbang, bill tertutup, bayar dua kali ditolak', async () => {
		const unitId = id.resto;
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
		await db.transaction((/** @type {any} */ tx) => pastikanCoaStandar(tx, unitId));
		const lama = await prof.ambilProfilPos(db, unitId);
		await prof.simpanProfilPos(db, unitId, { profil: 'resto', pengaturan: { ...lama.pengaturan, servis: { persen: 5, hanyaDineIn: true }, pajakResto: { aktif: true, persen: 10, inklusif: false } } });
		const profil = await prof.ambilProfilPos(db, unitId);
		const [unit] = await db.select().from(s.unitBisnis).where(o.eq(s.unitBisnis.id, unitId));
		const ctxUnit = { id: unitId, slug: unit.slug, userId: id.user, kategori: unit.kategori, posFeatureOverride: unit.posFeatureOverride };

		const bayar = async () => {
			const ekstra = await resto.siapkanCheckoutProfil(db, unitId, profil, { billId: id.bill, items: [] });
			return co.prosesCheckoutPos(db, { unit: ctxUnit, kasirPemilik: true, pengaturanPos: ekstra.pengaturanPos, setelahOrder: ekstra.setelahOrder }, {
				items: ekstra.items, orderType: ekstra.orderType, tableNumber: ekstra.tableNumber, paymentMethod: 'TUNAI', amountPaid: 200000
			});
		};
		const h = await bayar();
		// 2 × 25.000 + 3 × 5.000 = 65.000 → servis 3.250 → PB1 (68.250 × 10%) = 6.825 → total 75.075
		expect(h.subtotal).toBe(65000);
		expect(h.servis).toBe(3250);
		expect(h.pajakResto).toBe(6825);
		expect(h.total).toBe(75075);

		const [j] = await db.select().from(s.journalEntries).where(o.eq(s.journalEntries.referensi, h.orderNumber));
		const garis = await db.select().from(s.journalEntryLines).where(o.eq(s.journalEntryLines.journalId, j.id));
		const debit = garis.reduce((/** @type {number} */ a, /** @type {any} */ g) => a + Number(g.debit), 0);
		const kredit = garis.reduce((/** @type {number} */ a, /** @type {any} */ g) => a + Number(g.kredit), 0);
		expect(debit).toBe(75075);
		expect(kredit).toBe(75075);
		const akun = await db.select().from(s.chartOfAccounts).where(o.inArray(s.chartOfAccounts.id, garis.map((/** @type {any} */ g) => g.coaId)));
		const nama = (/** @type {any} */ g) => akun.find((/** @type {any} */ a) => a.id === g.coaId)?.namaAkun;
		expect(garis.find((/** @type {any} */ g) => nama(g) === 'Pendapatan Service Charge')?.kredit).toBe('3250.00');
		expect(garis.find((/** @type {any} */ g) => nama(g) === 'Utang Pajak Restoran (PB1)')?.kredit).toBe('6825.00');

		const b = await resto.ambilBill(db, unitId, id.bill);
		expect(b.status).toBe('PAID');
		const [order] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.orderNumber, h.orderNumber));
		expect(order.tableNumber).toBe('3');
		expect(order.orderType).toBe('DINE_IN');
		await expect(bayar()).rejects.toThrow(/sudah dibayar/);

		// PPN dan PB1 tidak boleh bersamaan
		const ekstra = await resto.siapkanCheckoutProfil(db, unitId, profil, { items: [] });
		await expect(co.prosesCheckoutPos(db, { unit: ctxUnit, kasirPemilik: true, pengaturanPos: ekstra.pengaturanPos }, {
			items: [{ productId: id.teh, qty: 1 }], kenaiPpn: true, paymentMethod: 'TUNAI'
		})).rejects.toThrow(/PB1/);
	});

	it('kedai tanpa meja: nomor antrean otomatis & tiket langsung saat bayar; isian wajib dicek', async () => {
		const u = await unitLib.buatUnit(db, id.user, { nama: `Esteh Uji ${t}`, kategori: 'FNB_RESTO', alamat: 'x' });
		const profil = await prof.ambilProfilPos(db, u.id);
		expect(profil.profil).toBe('kedai');
		const teh = await produk(u.id, 'ETU', 'Es Teh Jumbo', 5000, 'MINUMAN');
		const [unit] = await db.select().from(s.unitBisnis).where(o.eq(s.unitBisnis.id, u.id));
		const ctxUnit = { id: u.id, slug: unit.slug, userId: id.user, kategori: unit.kategori, posFeatureOverride: unit.posFeatureOverride };
		const items = [{ productId: teh, qty: 2, catatan: 'less sugar' }];
		const ekstra = await resto.siapkanCheckoutProfil(db, u.id, profil, { items, customerName: 'Rina' });
		expect(ekstra.queueNumber).toBe('A1');
		const h = await co.prosesCheckoutPos(db, { unit: ctxUnit, kasirPemilik: true, pengaturanPos: ekstra.pengaturanPos, setelahOrder: ekstra.setelahOrder }, {
			items, queueNumber: ekstra.queueNumber, customerName: 'Rina', paymentMethod: 'QRIS'
		});
		expect(h.servis).toBe(0);
		const tiket = await resto.daftarTiket(db, u.id);
		expect(tiket).toHaveLength(1);
		expect(tiket[0]).toMatchObject({ stasiun: 'racik', label: 'Antrean A1 · Rina' });
		expect(tiket[0].items[0]).toMatchObject({ qty: 2, catatan: 'less sugar' });
		expect(await resto.nomorAntreanBerikut(db, u.id)).toBe('A2');

		// Bengkel: plat nomor wajib
		const bk = await unitLib.buatUnit(db, id.user, { nama: `Bengkel ${t}`, kategori: 'JASA_TEKNIK', alamat: 'x' });
		const pb = await prof.ambilProfilPos(db, bk.id);
		await expect(resto.siapkanCheckoutProfil(db, bk.id, pb, { items: [], isian: {} })).rejects.toThrow(/Plat nomor wajib/);
		const ok = await resto.siapkanCheckoutProfil(db, bk.id, pb, { items: [], isian: { plat_nomor: 'D 1234 AB' } });
		expect(ok.catatanTambahan).toBe('Plat nomor: D 1234 AB');
	});

	it('checkout dari HP: tanpa service/PB1 (uang dari HP tetap cukup), tiket dapur tetap dibuat, offline lama tanpa tiket', async () => {
		const unitId = id.resto; // profil resto dengan service 5% & PB1 10% (tes sebelumnya)
		const profil = await prof.ambilProfilPos(db, unitId);
		const [unit] = await db.select().from(s.unitBisnis).where(o.eq(s.unitBisnis.id, unitId));
		const ctxUnit = { id: unitId, slug: unit.slug, userId: id.user, kategori: unit.kategori, posFeatureOverride: unit.posFeatureOverride };
		const sebelum = (await resto.daftarTiket(db, unitId)).length;
		const sekarang = Date.now();
		const kirim = async (/** @type {string} */ nomor) => {
			const e = await resto.siapkanCheckoutHp(db, unitId, profil, { orderNumber: nomor, tableNumber: '8', items: [{ productId: id.teh }] });
			return co.prosesCheckoutPos(db, { unit: ctxUnit, kasirPemilik: true, pengaturanPos: e.pengaturanPos, setelahOrder: e.setelahOrder }, {
				items: [{ productId: id.teh, qty: 2 }], orderNumber: nomor, tableNumber: '8', orderType: 'DINE_IN', paymentMethod: 'TUNAI', amountPaid: 10000, izinkanStokKurang: true
			});
		};
		// Aplikasi HP membayar 10.000 untuk 2 es teh: tidak boleh ditolak "uang kurang"
		const h = await kirim(`ORD-${sekarang}`);
		expect(h).toMatchObject({ total: 10000, servis: 0, pajakResto: 0 });
		const t1 = await resto.daftarTiket(db, unitId);
		expect(t1.length).toBe(sebelum + 1);
		expect(t1.at(-1)).toMatchObject({ stasiun: 'bar', label: 'Meja 8' });
		// Penjualan offline yang baru tersinkron 1 jam kemudian: tercatat, tanpa tiket dapur
		await kirim(`ORD-${sekarang - 3600_000}`);
		expect((await resto.daftarTiket(db, unitId)).length).toBe(sebelum + 1);
		// Aplikasi versi baru boleh meminta service/PB1 dihitung
		const e = await resto.siapkanCheckoutHp(db, unitId, profil, { orderNumber: 'X', items: [], biayaProfil: true });
		expect(e.pengaturanPos?.servis.persen).toBe(5);
		// Bengkel: plat nomor wajib di web, tapi HP versi lama tidak diblokir
		const bk = (await db.select().from(s.unitBisnis).where(o.like(s.unitBisnis.namaUnit, `Bengkel ${t}`)))[0];
		const pb = await prof.ambilProfilPos(db, bk.id);
		await expect(resto.siapkanCheckoutHp(db, bk.id, pb, { items: [] })).resolves.toMatchObject({ pengaturanPos: null });
	});

	it('unit lama tanpa profil: tidak berubah sama sekali', async () => {
		const [a] = await db.insert(s.unitBisnis).values({ userId: id.user, namaUnit: 'Unit Lama', slug: `lama-${t}`, modalAwal: '0', kategori: 'FNB_RESTO' });
		expect(await prof.ambilProfilPos(db, a.insertId)).toBe(null);
		const e = await resto.siapkanCheckoutProfil(db, a.insertId, null, { items: [] });
		expect(e).toMatchObject({ catatanTambahan: '', pengaturanPos: null, setelahOrder: null });
		await expect(resto.siapkanCheckoutProfil(db, a.insertId, null, { billId: 5, items: [] })).rejects.toThrow(/tidak terbaca/);
		expect(await resto.siapkanCheckoutHp(db, a.insertId, null, { queueNumber: 'Q9', items: [] })).toMatchObject({ queueNumber: 'Q9', pengaturanPos: null, setelahOrder: null });
		const [unit] = await db.select().from(s.unitBisnis).where(o.eq(s.unitBisnis.id, a.insertId));
		expect(unit.posFeatureOverride).toBe(null);
	});

	it('batal bill membatalkan tiket yang belum dimasak', async () => {
		const unitId = id.saung;
		const p = (await prof.ambilProfilPos(db, unitId)).pengaturan;
		const nasi = await produk(unitId, 'NSU', 'Nasi Liwet', 20000, 'MAKANAN');
		const b = await resto.simpanBill(db, unitId, { meja: '1', items: [{ productId: nasi, qty: 1 }] });
		await resto.kirimBillKeDapur(db, unitId, b.id, { stasiun: p.dapur.stasiun, labelBill: p.labelBill });
		await resto.batalkanBill(db, unitId, b.id);
		expect((await resto.daftarTiket(db, unitId)).filter((/** @type {any} */ x) => x.billId === b.id)).toHaveLength(0);
		await expect(resto.batalkanBill(db, unitId, b.id)).rejects.toThrow(/sudah ditutup/);
		// Unit lain tidak bisa menyentuh bill ini
		await expect(resto.ubahStatusTiket(db, id.resto + 999999, 1, 'SIAP')).rejects.toThrow(/tidak ditemukan/);
	});
});
