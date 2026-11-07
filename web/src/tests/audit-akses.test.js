/**
 * Tes hasil audit (pakai database tes): harga POS dari server, isolasi antar-unit,
 * piutang berjurnal, retur POS, batas paket, dan celah IDOR di halaman web.
 * Hanya jalan kalau TEST_DATABASE_URL diset.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null), staff: /** @type {any} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/portalAuth', () => ({ getVerifiedStaffSession: async () => login.staff }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));

describe.skipIf(!TEST_DB)('Audit: harga, isolasi unit, piutang, retur', () => {
	/** @type {any} */ let db;
	/** @type {any} */ let s;
	/** @type {any} */ let o;
	/** @type {Record<string, any>} */
	const id = {};
	/** @type {Record<string, any>} */
	const r = {};
	const t = Date.now();

	const cookies = { get: () => undefined };
	/** @param {string} m @param {any} [body] */
	const req = (m, body) => new Request('http://x', body === undefined ? { method: m } : { method: m, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
	/** @param {Record<string, any>} isi */
	const formReq = (isi) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(isi)) f.append(k, String(v));
		return new Request('http://x', { method: 'POST', body: f });
	};
	/** @param {string} productId */
	const stok = async (productId) => (await db.select({ stok: s.products.stok }).from(s.products).where(o.eq(s.products.id, productId)))[0].stok;
	/** POST kasir web sebagai owner A */
	const posWeb = async (/** @type {any} */ body, /** @type {any} */ locals = { user: { id: id.userA } }) =>
		r.posWeb.POST({ request: req('POST', body), cookies, params: { slug: id.slugA }, locals });

	beforeAll(async () => {
		s = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		o = await import('drizzle-orm');
		r.posWeb = await import('../routes/(app)/finance/[slug]/pos/+server.js');
		r.posApp = await import('../routes/api/app/pos/+server.js');
		r.retur = await import('../routes/(app)/finance/[slug]/pos/retur/+server.js');
		r.piutang = await import('../routes/(app)/finance/[slug]/piutang/+page.server.js');
		r.pipeline = await import('../routes/(app)/finance/[slug]/crm/pipeline/+page.server.js');
		r.promo = await import('../routes/(app)/finance/[slug]/pos/kelola/promo/+page.server.js');
		r.inbox = await import('../routes/(app)/finance/[slug]/cs/inbox/+page.server.js');
		r.units = await import('../routes/api/units/+server.js');
		r.plan = await import('../lib/server/planLimits.js');
		const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');

		const [a] = await db.insert(s.users).values({ username: `za${t}`, email: `za${t}@contoh.id`, role: 'free' });
		const [b] = await db.insert(s.users).values({ username: `zb${t}`, email: `zb${t}@contoh.id`, role: 'free' });
		id.userA = a.insertId; id.userB = b.insertId;
		id.slugA = `za-${t}`; id.slugB = `zb-${t}`;
		const [ua] = await db.insert(s.unitBisnis).values({ userId: id.userA, namaUnit: 'Toko A', slug: id.slugA, modalAwal: '0', kategori: 'UMUM' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: id.userB, namaUnit: 'Toko B', slug: id.slugB, modalAwal: '0', kategori: 'UMUM' });
		id.unitA = ua.insertId; id.unitB = ub.insertId;
		await pastikanCoaStandar(db, id.unitA);

		id.pA = `ZA-${t}`; id.pB = `ZB-${t}`;
		await db.insert(s.products).values([
			{ id: id.pA, slug: `za-p-${t}`, nama: 'Kopi A', userId: id.userA, unitId: id.unitA, hargaBeli: '1000', hargaJual: '2000', stok: 50 },
			{ id: id.pB, slug: `zb-p-${t}`, nama: 'Kopi B', userId: id.userB, unitId: id.unitB, hargaBeli: '1000', hargaJual: '2000', stok: 10 }
		]);
		const [kA] = await db.insert(s.accountingContacts).values({ unitId: id.unitA, namaKontak: 'Pelanggan A', tipeKontak: 'CUSTOMER' });
		id.kontakA = kA.insertId;
		const [kB] = await db.insert(s.accountingContacts).values({ unitId: id.unitB, namaKontak: 'Pelanggan B', tipeKontak: 'CUSTOMER' });
		id.kontakB = kB.insertId;
	});

	afterAll(async () => {
		// receivables.contact_id = RESTRICT → hapus piutang dulu sebelum unit (cascade ke kontak)
		for (const u of [id.unitA, id.unitB]) if (u) await db.delete(s.receivables).where(o.eq(s.receivables.unitId, u));
		for (const u of [id.unitA, id.unitB, ...(id.unitTambahan || [])]) if (u) await db.delete(s.unitBisnis).where(o.eq(s.unitBisnis.id, u));
		for (const u of [id.userA, id.userB]) if (u) await db.delete(s.users).where(o.eq(s.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end();
	});

	// ─── POS web ──────────────────────────────────────────────────────────────

	it('POS web: harga dari database, bukan dari keranjang kiriman kasir', async () => {
		login.userId = id.userA; login.staff = null;
		const res = await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 2, harga_jual: 1 }], payment_method: 'CASH' });
		const data = await res.json();
		expect(res.status).toBe(200);
		expect(data.total).toBe(4000);
		const [order] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.id, data.orderId));
		expect(Number(order.total)).toBe(4000);
		expect(await stok(id.pA)).toBe(48);
	});

	it('POS web: produk unit lain ditolak dan stoknya tidak berubah', async () => {
		login.userId = id.userA;
		const res = await posWeb({ cart: [{ id: id.pB, nama: 'Kopi B', qty: 3 }] });
		expect(res.status).toBe(404);
		expect(await stok(id.pB)).toBe(10);
	});

	it('POS web: qty negatif / nol ditolak (dulu menambah stok)', async () => {
		login.userId = id.userA;
		for (const qty of [-5, 0, 1.5]) {
			const res = await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty }] });
			expect(res.status).toBe(400);
		}
		expect(await stok(id.pA)).toBe(48);
	});

	it('POS web: stok kurang ditolak 409', async () => {
		login.userId = id.userA;
		const res = await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1000 }] });
		expect(res.status).toBe(409);
		expect(await stok(id.pA)).toBe(48);
	});

	it('POS web: diskon manual hanya kalau fiturnya aktif, dan tidak melebihi subtotal', async () => {
		login.userId = id.userA;
		let data = await (await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1 }], discount_value: 1500 })).json();
		expect(data.total).toBe(2000);

		await db.update(s.unitBisnis).set({ posFeatureOverride: { manualDiscount: true, openPrice: true } }).where(o.eq(s.unitBisnis.id, id.unitA));
		data = await (await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1 }], discount_value: 1500 })).json();
		expect(data.total).toBe(500);
		data = await (await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1, harga_jual: 3000 }], discount_value: 99999 })).json();
		expect(data.total).toBe(0); // harga bebas aktif → 3000, diskon dibatasi subtotal
		await db.update(s.unitBisnis).set({ posFeatureOverride: null }).where(o.eq(s.unitBisnis.id, id.unitA));
	});

	it('POS web & mobile: produk bervarian terjual dengan harga varian (dulu gagal: variant_id INT vs UUID)', async () => {
		login.userId = id.userA; login.staff = null;
		const idVarian = crypto.randomUUID();
		await db.insert(s.productVariants).values({ id: idVarian, productId: id.pA, namaVariasi: 'Large', hargaBeli: '1200', hargaJual: '2500', stok: 5 });
		const web = await (await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1, variantId: idVarian }] })).json();
		expect(web.total).toBe(2500);
		const [item] = await db.select().from(s.posOrderItems).where(o.eq(s.posOrderItems.orderId, web.orderId));
		expect(item.productName).toBe('Kopi A - Large');

		const app = await r.posApp.POST({
			request: req('POST', { action: 'checkout', order: { unitId: id.unitA, subtotal: 0, total: 0, paymentMethod: 'CASH', amountPaid: 5000, changeAmount: 2500, items: [{ productId: id.pA, productName: 'Kopi A', qty: 1, price: 1, variantId: idVarian }] } }),
			cookies
		});
		const dataApp = await app.json();
		expect(dataApp.data.total).toBe(2500);
		const [orderApp] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.id, Number(dataApp.id)));
		expect(Number(orderApp.change)).toBe(2500);
	});

	it('POS web: kasir (karyawan) bisa transaksi; user_id tercatat atas nama pemilik, bukan ID karyawan', async () => {
		login.userId = null;
		login.staff = { id: 987654, full_name: 'Kasir Uji', role: 'kasir', unit_id: id.unitA, owner_id: id.userA, unit_slug: id.slugA };
		const res = await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 1 }] }, {});
		const data = await res.json();
		expect(res.status).toBe(200);
		const [order] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.id, data.orderId));
		expect(order.createdBy).toBe(id.userA);
		const trx = await db.select().from(s.transaksi).where(o.and(o.eq(s.transaksi.unitId, id.unitA), o.like(s.transaksi.keterangan, 'Penjualan Kopi A%')));
		expect(trx.every((/** @type {any} */ x) => x.userId === id.userA)).toBe(true);
		login.staff = null;
	});

	// ─── POS mobile ───────────────────────────────────────────────────────────

	it('POS mobile: total & harga dihitung server; produk unit lain ditolak', async () => {
		login.userId = id.userA;
		const kirim = (/** @type {any[]} */ items) => r.posApp.POST({
			request: req('POST', { action: 'checkout', order: { unitId: id.unitA, subtotal: 1, total: 1, paymentMethod: 'CASH', items } }),
			cookies
		});
		const res = await kirim([{ productId: id.pA, productName: 'Kopi A', qty: 3, price: 1 }]);
		const data = await res.json();
		expect(res.status).toBe(200);
		expect(data.data.total).toBe(6000);
		const [order] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.id, Number(data.id)));
		expect(Number(order.total)).toBe(6000);

		const tolak = await kirim([{ productId: id.pB, productName: 'Kopi B', qty: 1, price: 1 }]);
		expect(tolak.status).toBe(404);
		expect(await stok(id.pB)).toBe(10);
	});

	// ─── Retur POS ────────────────────────────────────────────────────────────

	it('Retur: refund dihitung server, qty dibatasi, stok kembali, jurnal tercatat', async () => {
		login.userId = id.userA; login.staff = null;
		const jual = await (await posWeb({ cart: [{ id: id.pA, nama: 'Kopi A', qty: 2 }] })).json();
		const [baris] = await db.select().from(s.posOrderItems).where(o.eq(s.posOrderItems.orderId, jual.orderId));
		const stokSetelahJual = await stok(id.pA);
		const retur = (/** @type {number} */ qty, /** @type {number} */ refund) => r.retur.POST({
			request: req('POST', { order_id: jual.orderId, items: [{ order_item_id: baris.id, product_id: id.pA, qty_returned: qty, refund_amount: refund }] }),
			cookies, params: { slug: id.slugA }, locals: { user: { id: id.userA } }
		});

		const satu = await (await retur(1, 999999)).json();
		expect(satu.totalRefund).toBe(2000); // bukan 999999 kiriman klien
		expect(await stok(id.pA)).toBe(stokSetelahJual + 1);
		const jurnal = await db.select().from(s.journalEntries).where(o.and(o.eq(s.journalEntries.unitId, id.unitA), o.like(s.journalEntries.memo, `%${satu.returnNumber}%`)));
		expect(jurnal.length).toBe(1);

		const lebih = await retur(5, 0);
		expect(lebih.status).toBe(409);

		const sisa = await (await retur(1, 0)).json();
		expect(sisa.status).toBe('REFUNDED');
		const ulang = await retur(1, 0);
		expect(ulang.status).toBe(409);
	});

	it('Retur: order unit lain tidak bisa diretur', async () => {
		login.userId = id.userB;
		const [orderA] = await db.select().from(s.posOrders).where(o.eq(s.posOrders.unitId, id.unitA)).limit(1);
		const res = await r.retur.POST({
			request: req('POST', { order_id: orderA.id, items: [{ order_item_id: 1, qty_returned: 1 }] }),
			cookies, params: { slug: id.slugA }, locals: { user: { id: id.userB } }
		});
		expect(res.status).toBe(403);
	});

	// ─── Piutang ──────────────────────────────────────────────────────────────

	it('Piutang: invoice & pembayaran dijurnal, tidak bisa lebih bayar, user lain tidak bisa melunasi', async () => {
		login.userId = id.userA;
		const buat = await r.piutang.actions.addInvoice({
			request: formReq({ contactId: id.kontakA, tanggal: '2026-11-01', jatuhTempo: '2026-11-30', nominal: 100000, keterangan: 'Proyek' }),
			params: { slug: id.slugA }, cookies
		});
		expect(buat).toEqual({ success: true });
		const [inv] = await db.select().from(s.receivables).where(o.eq(s.receivables.unitId, id.unitA));
		expect(inv.journalId).toBeTruthy();

		// pelanggan unit lain tidak boleh dipakai
		const kontakLain = await r.piutang.actions.addInvoice({
			request: formReq({ contactId: id.kontakB, tanggal: '2026-11-01', jatuhTempo: '2026-11-30', nominal: 5000 }),
			params: { slug: id.slugA }, cookies
		});
		expect(kontakLain.status).toBe(404);

		// user B mencoba melunasi invoice A lewat unit B → ditolak, data A tidak berubah
		login.userId = id.userB;
		const curang = await r.piutang.actions.payInvoice({ request: formReq({ invoiceId: inv.id, nominalBayar: 100000 }), params: { slug: id.slugB }, cookies });
		expect(curang.status).toBe(404);
		expect(Number((await db.select().from(s.receivables).where(o.eq(s.receivables.id, inv.id)))[0].sudahDibayar)).toBe(0);

		login.userId = id.userA;
		const lebih = await r.piutang.actions.payInvoice({ request: formReq({ invoiceId: inv.id, nominalBayar: 150000 }), params: { slug: id.slugA }, cookies });
		expect(lebih.status).toBe(409);
		const negatif = await r.piutang.actions.payInvoice({ request: formReq({ invoiceId: inv.id, nominalBayar: -1 }), params: { slug: id.slugA }, cookies });
		expect(negatif.status).toBe(422);

		const ok = await r.piutang.actions.payInvoice({ request: formReq({ invoiceId: inv.id, nominalBayar: 40000 }), params: { slug: id.slugA }, cookies });
		expect(ok).toEqual({ success: true });
		const [setelah] = await db.select().from(s.receivables).where(o.eq(s.receivables.id, inv.id));
		expect(setelah.status).toBe('SEBAGIAN');
		const trx = await db.select().from(s.transaksi).where(o.and(o.eq(s.transaksi.unitId, id.unitA), o.like(s.transaksi.keterangan, `Penerimaan piutang ${inv.nomorInvoice}%`)));
		expect(trx.length).toBe(1);
		expect(Number(trx[0].nominal)).toBe(40000);
	});

	// ─── IDOR halaman web ────────────────────────────────────────────────────

	it('Pipeline CRM: stage deal unit lain tidak bisa diubah', async () => {
		const [d] = await db.insert(s.crmDeals).values({ ownerId: id.userB, unitId: id.unitB, namaDeal: 'Deal B', nilai: '1000', stage: 'prospek', status: 'open' });
		login.userId = id.userA;
		await r.pipeline.actions.updateStage({ request: formReq({ dealId: d.insertId, newStage: 'won' }), cookies, params: { slug: id.slugA } });
		const [deal] = await db.select().from(s.crmDeals).where(o.eq(s.crmDeals.id, d.insertId));
		expect(deal.stage).toBe('prospek');
	});

	it('Promo POS: voucher unit lain tidak terlihat, tidak bisa dimatikan / dihapus', async () => {
		const [v] = await db.insert(s.vouchers).values({ unitId: id.unitB, code: `ZB${t}`, discountType: 'FIXED', discountValue: '1000', validFrom: '2026-01-01', validUntil: '2030-01-01' });
		login.userId = id.userA;
		const ev = (/** @type {Request} */ request, slug = id.slugB) => ({ request, cookies, params: { slug }, locals: { user: { id: id.userA } } });
		await expect(r.promo.load(ev(req('GET')))).rejects.toMatchObject({ status: 403 });
		await expect(r.promo.actions.delete(ev(formReq({ id: v.insertId })))).rejects.toMatchObject({ status: 403 });
		// lewat unit sendiri pun tidak bisa menyentuh voucher unit B
		await r.promo.actions.delete(ev(formReq({ id: v.insertId }), id.slugA));
		expect((await db.select().from(s.vouchers).where(o.eq(s.vouchers.id, v.insertId))).length).toBe(1);
	});

	it('Inbox CS: tiket unit lain tidak terbaca dan tidak bisa dibalas', async () => {
		const [tk] = await db.insert(s.supportTickets).values({ unitId: id.unitB, ticketNumber: `TB-${t}`, subject: 'Rahasia B' });
		login.userId = id.userA;
		const data = await r.inbox.load({ params: { slug: id.slugA }, cookies, url: new URL(`http://x?ticket=${tk.insertId}`) });
		expect(data.activeTicket).toBeNull();
		expect(data.messages).toEqual([]);
		const balas = await r.inbox.actions.replyTicket({ request: formReq({ ticketId: tk.insertId, message: 'halo' }), cookies, params: { slug: id.slugA } });
		expect(balas.status).toBe(404);
	});

	it('/api/units: wajib login dan hanya mengembalikan unit milik sendiri', async () => {
		login.userId = null;
		expect((await r.units.GET({ cookies, request: req('GET') })).status).toBe(401);
		login.userId = id.userA;
		const data = await (await r.units.GET({ cookies, request: req('GET') })).json();
		expect(data.units.map((/** @type {any} */ u) => u.id)).toEqual([id.unitA]);
	});

	it('Endpoint GET lama tidak lagi crash "request is not defined" (dulu selalu 500)', async () => {
		login.userId = null;
		const rute = [
			['../routes/api/updates/+server.js', {}],
			['../routes/api/qr/+server.js', {}],
			['../routes/api/invoice/[orderId]/+server.js', { orderId: '1' }],
			['../routes/api/slip-gaji/[employeeId]/+server.js', { employeeId: '1' }]
		];
		for (const [path, params] of rute) {
			const mod = await import(/* @vite-ignore */ path);
			const res = await mod.GET({ url: new URL('http://x?slug=a'), cookies, request: req('GET'), params });
			expect(res.status).toBe(401);
		}
	});

	it('Batas paket: akun free maksimal 3 unit', async () => {
		expect((await r.plan.cekBatasUnit(db, id.userA)).boleh).toBe(true);
		id.unitTambahan = [];
		for (let i = 0; i < 2; i++) {
			const [u] = await db.insert(s.unitBisnis).values({ userId: id.userA, namaUnit: `Tambahan ${i}`, slug: `za-x${i}-${t}`, modalAwal: '0' });
			id.unitTambahan.push(u.insertId);
		}
		const batas = await r.plan.cekBatasUnit(db, id.userA);
		expect(batas).toMatchObject({ boleh: false, batas: 3, terpakai: 3 });
		await db.update(s.users).set({ role: 'pro' }).where(o.eq(s.users.id, id.userA));
		expect((await r.plan.cekBatasUnit(db, id.userA)).boleh).toBe(true);
	});
});
