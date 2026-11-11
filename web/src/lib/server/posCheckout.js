/**
 * Checkout kasir (POS) — SATU logika untuk web (/finance/[slug]/pos) dan aplikasi mobile (/api/app/pos).
 *
 * Dulu web dan mobile punya salinan logika sendiri-sendiri dan keduanya bermasalah:
 *  - potongan voucher/diskon tidak ikut ke tabel transaksi (dasbor & riwayat lebih besar dari jurnal)
 *  - jumlah uang yang dibayar tidak diperiksa server (bayar kurang tetap tersimpan)
 *  - penjualan tidak tercatat di riwayat stok
 *  - akun kas jurnal = akun ASET_LANCAR pertama apa pun (bukan kas/bank sesuai metode bayar)
 *  - metode tunai tercatat "CASH" (mobile) dan "TUNAI" (web)
 *  - pelanggan baru tidak tertaut ke order pertamanya; pemakaian voucher dari mobile tidak dihitung
 *  - produk yang sudah dihapus masih bisa dijual dari mobile
 */
import crypto from 'crypto';
import { and, eq, gte, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import {
	transaksi,
	products,
	productVariants,
	riwayatAksi,
	posCustomers,
	posOrders,
	posOrderItems,
	posPayments,
	vouchers,
	stockLogs,
	journalEntries,
	journalEntryLines
} from '$lib/server/schema';
import { nowWIB, todayStrWIB } from '$lib/server/dateUtils';
import { bisaDijual } from '$lib/jenisProduk';
import { getActivePosFeatures } from '$lib/posFeatures';
import { pilihAkunDefault } from '$lib/server/catatTransaksi';
import { hitungPpn, tarifPpnAktif, pastikanAkunPpnKeluaran } from '$lib/server/pajak';
import { redis } from '$lib/server/redis';
import { triggerEvent } from '$lib/server/pusher';
import { log } from '$lib/server/logger';

/** Error checkout yang pesannya aman ditampilkan ke kasir */
export class PosError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 400) {
		super(message);
		this.name = 'PosError';
		this.status = status;
	}
}

/**
 * Samakan penulisan metode bayar: tunai selalu "TUNAI" (dulu web "TUNAI", mobile "CASH").
 * @param {unknown} metode
 * @returns {string}
 */
export function normalisasiMetodeBayar(metode) {
	const m = String(metode || '').trim().toUpperCase();
	if (!m || m === 'CASH' || m === 'TUNAI' || m === 'KAS') return 'TUNAI';
	return m.slice(0, 50);
}

/** @param {string} metode */
export function metodeTunai(metode) {
	return normalisasiMetodeBayar(metode) === 'TUNAI';
}

/**
 * Bagi nilai bersih (setelah diskon / PPN) ke tiap baris secara proporsional; sisa pembulatan
 * masuk ke baris terakhir sehingga jumlah seluruh baris SAMA PERSIS dengan total order.
 * @param {number[]} bruto  nilai kotor tiap baris (harga × qty)
 * @param {number} total    total order yang benar-benar dibayar
 * @returns {number[]}
 */
export function bagiNilaiBersih(bruto, total) {
	const jumlahBruto = bruto.reduce((a, b) => a + b, 0);
	if (bruto.length === 0) return [];
	if (jumlahBruto <= 0) return bruto.map((_, i) => (i === bruto.length - 1 ? total : 0));
	let terpakai = 0;
	return bruto.map((b, i) => {
		if (i === bruto.length - 1) return Math.round((total - terpakai) * 100) / 100;
		const bagian = Math.round((b / jumlahBruto) * total);
		terpakai += bagian;
		return bagian;
	});
}

/**
 * @typedef {{
 *   productId: string, variantId?: string | null, qty: number, harga?: number | null, nama?: string | null
 * }} ItemKeranjang
 *
 * @typedef {{
 *   items: ItemKeranjang[],
 *   customerId?: number | null, customerName?: string | null,
 *   voucherId?: number | null, voucherCode?: string | null, diskonManual?: number | null,
 *   paymentMethod?: string | null, payments?: { method: string, amount: number }[] | null,
 *   amountPaid?: number | null,
 *   orderType?: string | null, tableNumber?: string | null, queueNumber?: string | null, notes?: string | null,
 *   kenaiPpn?: boolean, ppnInklusif?: boolean,
 *   orderNumber?: string | null,
 *   izinkanStokKurang?: boolean
 * }} InputCheckout
 *
 * @typedef {{
 *   unit: { id: number, slug?: string | null, userId: number, kategori?: string | null, posFeatureOverride?: unknown },
 *   kasirPemilik: boolean, namaKasir?: string | null
 * }} KonteksCheckout
 */

/**
 * Jalankan checkout dalam satu transaksi basis data.
 * @param {any} db
 * @param {KonteksCheckout} ctx
 * @param {InputCheckout} input
 */
export async function prosesCheckoutPos(db, ctx, input) {
	const unit = ctx.unit;
	const unitId = Number(unit.id);
	const pemilikId = Number(unit.userId);
	const fitur = getActivePosFeatures(unit.kategori, unit.posFeatureOverride);

	// ── Validasi bentuk keranjang (sebelum menyentuh basis data) ──
	if (!Array.isArray(input.items) || input.items.length === 0) throw new PosError('Keranjang kosong');
	if (input.items.length > 200) throw new PosError('Terlalu banyak baris dalam satu transaksi');
	for (const it of input.items) {
		const qty = Number(it?.qty);
		if (!Number.isInteger(qty) || qty <= 0 || qty > 1_000_000) {
			throw new PosError(`Jumlah ${it?.nama || 'barang'} tidak valid`);
		}
		if (!it?.productId) throw new PosError('Produk tidak valid');
	}

	const metodeUtama = normalisasiMetodeBayar(
		input.payments && input.payments.length > 0 ? input.payments[0].method : input.paymentMethod
	);
	const namaPelanggan = String(input.customerName || '').trim().slice(0, 150);
	const orderNumber = String(input.orderNumber || '').trim().slice(0, 100) || `POS-${unitId}-${Date.now()}-${crypto.randomInt(100, 999)}`;
	const sekarang = nowWIB();

	/** @type {any} */
	let hasil = null;

	await db.transaction(async (/** @type {any} */ tx) => {
		// 1. Produk: satu kueri untuk seluruh keranjang; harus milik unit ini dan belum dihapus
		const idProduk = [...new Set(input.items.map((i) => String(i.productId)))];
		/** @type {any[]} */
		const daftarProduk = await tx
			.select()
			.from(products)
			.where(and(eq(products.unitId, unitId), inArray(products.id, idProduk), isNull(products.deletedAt)));
		const petaProduk = new Map(daftarProduk.map((p) => [String(p.id), p]));

		const idVarian = [...new Set(input.items.map((i) => (i.variantId ? String(i.variantId) : null)).filter(Boolean))];
		/** @type {any[]} */
		const daftarVarian = idVarian.length
			? await tx.select().from(productVariants).where(inArray(productVariants.id, /** @type {string[]} */ (idVarian)))
			: [];
		const petaVarian = new Map(daftarVarian.map((v) => [String(v.id), v]));

		const baris = input.items.map((it) => {
			const produk = petaProduk.get(String(it.productId));
			if (!produk) throw new PosError(`Produk ${it.nama || ''} tidak ditemukan di unit ini`.trim(), 404);
			if (!bisaDijual(produk.jenis)) throw new PosError(`${produk.nama} bukan barang jual (bahan/kemasan/perlengkapan)`);
			let harga = Number(produk.hargaJual || 0);
			let nama = produk.nama;
			if (it.variantId) {
				const varian = petaVarian.get(String(it.variantId));
				if (!varian || String(varian.productId) !== String(produk.id)) throw new PosError(`Varian ${produk.nama} tidak ditemukan`, 404);
				// pos_order_items.variant_id bertipe INT sedangkan ID varian UUID → simpan namanya saja
				nama = `${produk.nama} - ${varian.namaVariasi}`;
				if (Number(varian.hargaJual) > 0) harga = Number(varian.hargaJual);
			}
			// Harga kiriman kasir hanya dipakai kalau fitur "harga bebas" aktif untuk unit ini
			if (fitur.openPrice) {
				const hargaKasir = Number(it.harga);
				if (it.harga != null && Number.isFinite(hargaKasir) && hargaKasir >= 0) harga = hargaKasir;
			}
			const qty = Number(it.qty);
			return { produk, qty, harga, nama, bruto: harga * qty };
		});
		const subtotal = baris.reduce((s, b) => s + b.bruto, 0);

		// 2. Pelanggan: harus milik unit ini; nama baru dibuatkan datanya
		let customerId = null;
		if (input.customerId) {
			const [c] = await tx
				.select({ id: posCustomers.id })
				.from(posCustomers)
				.where(and(eq(posCustomers.id, Number(input.customerId)), eq(posCustomers.unitId, unitId)))
				.limit(1);
			if (c) customerId = c.id;
		}
		if (!customerId && namaPelanggan) {
			const [ada] = await tx
				.select({ id: posCustomers.id })
				.from(posCustomers)
				.where(and(eq(posCustomers.unitId, unitId), eq(posCustomers.namaCustomer, namaPelanggan)))
				.limit(1);
			if (ada) {
				customerId = ada.id;
			} else {
				// insert() mengembalikan [ResultSetHeader]; dulu insertId dibaca dari array-nya → pelanggan
				// baru tidak pernah tertaut ke order pertamanya ("Pelanggan Umum" di laporan)
				const [buat] = await tx.insert(posCustomers).values({ unitId, namaCustomer: namaPelanggan, email: null, telepon: null, metadata: null });
				customerId = buat.insertId || null;
			}
		}

		// 3. Diskon: voucher divalidasi server; diskon manual hanya kalau fiturnya aktif
		let diskon = 0;
		/** @type {any} */
		let voucher = null;
		if (input.voucherId || input.voucherCode) {
			const syarat = input.voucherId
				? eq(vouchers.id, Number(input.voucherId))
				: eq(vouchers.code, String(input.voucherCode).trim());
			[voucher] = await tx.select().from(vouchers).where(and(syarat, eq(vouchers.unitId, unitId))).limit(1);
			const hariIni = todayStrWIB();
			const sah =
				voucher &&
				voucher.isActive &&
				voucher.validFrom <= hariIni &&
				voucher.validUntil >= hariIni &&
				(Number(voucher.maxUsage) === 0 || Number(voucher.currentUsage) < Number(voucher.maxUsage)) &&
				subtotal >= Number(voucher.minPurchase || 0);
			if (!sah) throw new PosError('Voucher tidak berlaku untuk transaksi ini. Hapus voucher lalu coba lagi.', 409);
			diskon =
				voucher.discountType === 'PERCENTAGE'
					? Math.floor(subtotal * (Number(voucher.discountValue) / 100))
					: Number(voucher.discountValue);
		} else if (fitur.manualDiscount && input.diskonManual) {
			diskon = Number(input.diskonManual);
		}
		if (!Number.isFinite(diskon) || diskon < 0) diskon = 0;
		diskon = Math.min(diskon, subtotal);
		let total = Math.max(0, subtotal - diskon);

		// 4. PPN penjualan: tarif dari pengaturan pajak unit (bukan dari kiriman klien)
		let ppn = 0;
		let ppnTarif = 0;
		if (input.kenaiPpn) {
			const tarif = await tarifPpnAktif(tx, unitId);
			if (!tarif || tarif.persentase <= 0) throw new PosError('Belum ada tarif PPN aktif. Atur di Pengaturan Pajak dulu.', 422);
			const h = hitungPpn(total, tarif.persentase, input.ppnInklusif ? 'INCLUSIVE' : 'EXCLUSIVE');
			ppn = h.ppn;
			ppnTarif = tarif.persentase;
			total = h.total;
		}

		// 5. Pembayaran: jumlah yang dibayar tidak boleh kurang dari total (dulu hanya dicek di layar)
		const daftarBayar = (Array.isArray(input.payments) ? input.payments : [])
			.map((p) => ({ method: normalisasiMetodeBayar(p?.method), amount: Number(p?.amount) }))
			.filter((p) => Number.isFinite(p.amount) && p.amount > 0);
		const dibayarEksplisit = daftarBayar.length
			? daftarBayar.reduce((s, p) => s + p.amount, 0)
			: input.amountPaid != null && Number(input.amountPaid) > 0
				? Number(input.amountPaid)
				: null;
		if (dibayarEksplisit != null && !Number.isFinite(dibayarEksplisit)) throw new PosError('Jumlah pembayaran tidak valid');
		if (dibayarEksplisit != null && dibayarEksplisit + 0.5 < total) {
			throw new PosError(`Uang pembayaran kurang Rp ${(total - dibayarEksplisit).toLocaleString('id-ID')}`, 400);
		}
		const dibayar = dibayarEksplisit ?? total;
		const kembalian = Math.max(0, dibayar - total);
		if (daftarBayar.length === 0) daftarBayar.push({ method: metodeUtama, amount: dibayar });

		// 6. Order
		// Masuk antrean dapur bila ada nomor meja/antrean atau unit memakai layar dapur
		const adaAntrean = Boolean(input.queueNumber || input.tableNumber || fitur.kitchenDisplay);
		const jenisOrder = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(String(input.orderType || '').toUpperCase())
			? /** @type {'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'} */ (String(input.orderType).toUpperCase())
			: 'TAKEAWAY';
		const catatan = [input.notes, ppn > 0 ? `PPN ${ppnTarif}%${input.ppnInklusif ? ' (termasuk)' : ''}: Rp ${ppn.toLocaleString('id-ID')}` : null]
			.filter(Boolean)
			.join(' | ')
			.slice(0, 1000);
		const [orderRes] = await tx.insert(posOrders).values({
			orderNumber,
			unitId,
			customerId,
			createdBy: pemilikId,
			cashierId: ctx.kasirPemilik ? pemilikId : null,
			subtotal: String(subtotal),
			discount: String(diskon),
			total: String(total),
			paymentMethod: metodeUtama,
			amountPaid: String(dibayar),
			change: String(kembalian),
			voucherId: voucher ? voucher.id : null,
			status: 'PAID',
			orderType: jenisOrder,
			tableNumber: input.tableNumber ? String(input.tableNumber).slice(0, 20) : null,
			queueNumber: input.queueNumber ? String(input.queueNumber).slice(0, 20) : null,
			fulfillmentStatus: adaAntrean ? 'PENDING' : 'COMPLETED',
			notes: catatan || null,
			createdAt: sekarang
		});
		const orderId = orderRes.insertId;
		if (!orderId) throw new Error('Gagal membuat order POS');

		// Pemakaian voucher dinaikkan secara atomik: gagal kalau kuota habis (dua kasir bersamaan)
		if (voucher && diskon > 0) {
			const [pakai] = await tx
				.update(vouchers)
				.set({ currentUsage: sql`${vouchers.currentUsage} + 1` })
				.where(and(eq(vouchers.id, voucher.id), eq(vouchers.unitId, unitId), or(eq(vouchers.maxUsage, 0), lt(vouchers.currentUsage, vouchers.maxUsage))));
			if (!pakai?.affectedRows) throw new PosError('Kuota voucher sudah habis', 409);
		}

		await tx.insert(posPayments).values(daftarBayar.map((p) => ({ orderId, method: p.method, amount: String(p.amount) })));

		// 7. Stok: dikurangi secara atomik per produk (aman untuk dua kasir bersamaan)
		/** @type {Map<string, number>} */
		const sisaStok = new Map(daftarProduk.map((p) => [String(p.id), Number(p.stok || 0)]));
		const logStok = [];
		for (const b of baris) {
			const id = String(b.produk.id);
			const stokAwal = sisaStok.get(id) ?? 0;
			const [upd] = await tx
				.update(products)
				.set({ stok: sql`${products.stok} - ${b.qty}` })
				.where(and(eq(products.id, b.produk.id), eq(products.unitId, unitId), gte(products.stok, b.qty)));
			let stokAkhir = stokAwal - b.qty;
			if (!upd?.affectedRows) {
				if (!input.izinkanStokKurang) {
					const [sisa] = await tx.select({ stok: products.stok }).from(products).where(and(eq(products.id, b.produk.id), eq(products.unitId, unitId)));
					throw new PosError(`Stok ${b.produk.nama} tidak mencukupi! (Sisa: ${sisa?.stok ?? 0})`, 409);
				}
				// Penjualan offline yang baru tersinkron: tetap dicatat, stok berhenti di 0
				await tx.update(products).set({ stok: 0 }).where(and(eq(products.id, b.produk.id), eq(products.unitId, unitId)));
				stokAkhir = 0;
			}
			sisaStok.set(id, stokAkhir);
			logStok.push({
				id: crypto.randomUUID(),
				productId: b.produk.id,
				userId: String(pemilikId),
				unitId,
				stokAwal,
				perubahan: stokAkhir - stokAwal,
				stokAkhir,
				alasan: /** @type {'PENJUALAN'} */ ('PENJUALAN'),
				keterangan: `Penjualan POS ${orderNumber}`,
				createdAt: sekarang
			});
		}

		// 8. Baris order, transaksi (arus kas), dan riwayat stok — masing-masing satu kueri
		const bersih = bagiNilaiBersih(baris.map((b) => b.bruto), total);
		await tx.insert(posOrderItems).values(
			baris.map((b) => ({
				orderId,
				productId: String(b.produk.id),
				variantId: null,
				productName: b.nama,
				sku: b.produk.sku || null,
				qty: b.qty,
				price: String(b.harga),
				total: String(b.bruto),
				costTotal: String(Number(b.produk.hargaBeli || 0) * b.qty),
				createdAt: sekarang
			}))
		);
		// Nilai transaksi = uang yang benar-benar diterima untuk baris itu (sudah dipotong diskon/voucher,
		// sudah termasuk PPN), supaya dasbor & riwayat sama dengan jurnal.
		await tx.insert(transaksi).values(
			baris.map((b, i) => ({
				userId: pemilikId,
				unitId,
				tanggal: sekarang,
				keterangan: `Penjualan POS: ${b.nama} (${b.qty}x)${diskon > 0 ? ' - setelah diskon' : ''}`.slice(0, 255),
				nominal: String(bersih[i]),
				totalHarga: String(bersih[i]),
				kategoriTrx: /** @type {'MASUK'} */ ('MASUK'),
				metodeBayar: metodeUtama,
				productId: b.produk.id,
				qty: b.qty,
				hppTotal: String(Number(b.produk.hargaBeli || 0) * b.qty)
			}))
		);
		await tx.insert(stockLogs).values(logStok);

		await tx.insert(riwayatAksi).values({
			userId: pemilikId,
			unitId,
			pesan: `Transaksi POS ${orderNumber}: ${namaPelanggan || 'Pelanggan Umum'} | Total Rp ${total.toLocaleString('id-ID')}${ctx.namaKasir ? ` | Kasir: ${ctx.namaKasir}` : ''}`,
			kategori: 'POS',
			link: unit.slug ? `/finance/${unit.slug}/history` : null,
			tipe: 'success',
			waktu: sekarang
		});

		// 9. Jurnal: Debit kas/bank sesuai metode bayar, Kredit pendapatan (+ PPN keluaran)
		if (total > 0) {
			const akun = await pilihAkunDefault(tx, unitId, 'MASUK', metodeUtama);
			if (akun.kasCoaId && akun.coaId) {
				const [jurnal] = await tx.insert(journalEntries).values({
					unitId,
					userId: pemilikId,
					tanggal: todayStrWIB(),
					nomorJurnal: `JRN-${orderNumber}`.slice(0, 50),
					referensi: orderNumber,
					memo: `Pendapatan POS ${namaPelanggan || 'Umum'}`,
					sourceType: 'POS',
					sourceId: String(orderId),
					totalDebit: String(total),
					totalKredit: String(total),
					status: 'POSTED',
					createdAt: sekarang
				});
				const journalId = jurnal.insertId;
				const garis = [
					{ journalId, coaId: akun.kasCoaId, keterangan: `Penerimaan ${metodeUtama} - ${orderNumber}`, debit: String(total), kredit: '0' },
					{ journalId, coaId: akun.coaId, keterangan: `Pendapatan Penjualan - ${orderNumber}`, debit: '0', kredit: String(total - ppn) }
				];
				if (ppn > 0) {
					const coaPpn = await pastikanAkunPpnKeluaran(tx, unitId);
					garis.push({ journalId, coaId: coaPpn, keterangan: `PPN Keluaran ${ppnTarif}% - ${orderNumber}`, debit: '0', kredit: String(ppn) });
				}
				await tx.insert(journalEntryLines).values(garis);
			}
		}

		hasil = {
			orderId,
			orderNumber,
			subtotal,
			discount: diskon,
			ppn,
			total,
			paid: dibayar,
			change: kembalian,
			paymentMethod: metodeUtama,
			customerName: namaPelanggan || null
		};
	});

	return /** @type {{ orderId: number, orderNumber: string, subtotal: number, discount: number, ppn: number, total: number, paid: number, change: number, paymentMethod: string, customerName: string | null }} */ (hasil);
}

/**
 * Setelah checkout tersimpan: bersihkan cache halaman dan siarkan event realtime.
 * SEMUA ditunggu (await) sebelum respons dikirim. Dulu event dikirim tanpa ditunggu, sehingga di
 * serverless fungsi sering berhenti sebelum event terkirim (pada pengujian hanya 5 dari 20 event sampai).
 * Dijalankan paralel supaya tidak menambah waktu respons lebih dari satu perjalanan jaringan.
 * @param {{ id: number, slug?: string | null }} unit
 * @param {{ orderNumber: string, total: number, customerName?: string | null }} hasil
 */
export async function siarkanCheckoutPos(unit, hasil) {
	const unitId = Number(unit.id);
	const room = `unit-${unitId}`;
	const slug = unit.slug || '';

	const bersihkanCache = async () => {
		if (!redis || !slug) return;
		const pola = [`finance_dash_v4:*:${slug}:*`, `history_v3:*:${slug}:*`, `cache:products_page_v4:${slug}:*`];
		const daftar = await Promise.all(pola.map((p) => redis.keys(p).catch(() => [])));
		const kunci = daftar.flat();
		if (kunci.length > 0) await redis.del(...kunci);
	};

	const tugas = [
		bersihkanCache(),
		triggerEvent(room, 'pos-transaction', { orderNumber: hasil.orderNumber, total: hasil.total, unitId, customerName: hasil.customerName || 'Pelanggan Umum', timestamp: nowWIB() }),
		triggerEvent(room, 'stats-updated', { triggerRefresh: true }),
		triggerEvent(room, 'stock-updated', { triggerRefresh: true }),
		triggerEvent(room, 'notification', {
			id: Date.now(),
			unitId,
			pesan: `Transaksi POS selesai #${hasil.orderNumber}. Total: Rp ${Number(hasil.total).toLocaleString('id-ID')}`,
			kategori: 'POS',
			tipe: 'success',
			waktu: nowWIB()
		})
	];
	const selesai = await Promise.allSettled(tugas);
	const gagal = selesai.filter((x) => x.status === 'rejected');
	if (gagal.length) log.pos.warn({ jumlah: gagal.length }, 'POS: sebagian siaran/cache gagal');
}
