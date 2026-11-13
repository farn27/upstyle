/**
 * Open bill (pesan dulu, bayar nanti) per meja/kendaraan dan tiket dapur per stasiun.
 * Dipakai kasir web dan layar dapur; hanya aktif untuk unit yang punya profil kasir.
 *
 *  - Harga & nama barang di bill selalu diambil dari basis data (bukan dari klien).
 *  - Dua kasir mengubah bill yang sama → kunci optimistis lewat kolom versi (409, minta muat ulang).
 *  - Satu meja hanya boleh punya satu bill terbuka.
 *  - "Kirim ke dapur" hanya mengirim jumlah yang BELUM dikirim (tambah pesanan = tiket baru berisi tambahannya).
 */
import crypto from 'crypto';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { products, productVariants, kategoriProduk } from '$lib/server/schema';
import { nowSqlWIB, todayStrWIB } from '$lib/server/dateUtils';
import { bisaDijual } from '$lib/jenisProduk';
import { stasiunUntuk, JENIS_PESANAN, teksIsian } from '$lib/posProfil';
import { pastikanTabelPos, barisDari } from '$lib/server/posProfil';
import { PosError } from '$lib/server/posCheckout';

export const STATUS_TIKET = /** @type {const} */ (['BARU', 'DIMASAK', 'SIAP', 'DISAJIKAN', 'BATAL']);

/**
 * @typedef {{ k: string, productId: string, variantId: string | null, nama: string, harga: number, qty: number, catatan: string, kategori: string, dikirim: number }} BarisBill
 */

/** @param {unknown} v */
const parse = (v) => {
	if (v == null) return null;
	if (typeof v !== 'string') return v;
	try {
		return JSON.parse(v);
	} catch {
		return null;
	}
};

/** Bentuk bill untuk klien */
function bentukBill(/** @type {any} */ r) {
	const items = /** @type {BarisBill[]} */ (parse(r.items) || []);
	return {
		id: Number(r.id),
		kode: r.kode,
		meja: r.meja || null,
		nama: r.nama || '',
		jenisPesanan: r.jenis_pesanan,
		jumlahTamu: r.jumlah_tamu == null ? null : Number(r.jumlah_tamu),
		items,
		isian: parse(r.isian) || {},
		catatan: r.catatan || '',
		status: r.status,
		versi: Number(r.versi),
		dibukaOleh: r.dibuka_oleh || '',
		dibukaPada: String(r.dibuka_pada || ''),
		diubahPada: String(r.diubah_pada || ''),
		subtotal: items.reduce((s, i) => s + i.harga * i.qty, 0),
		belumDikirim: items.reduce((s, i) => s + Math.max(0, i.qty - i.dikirim), 0)
	};
}

/** Kunci baris: produk + varian + catatan (catatan beda = baris beda, mis. "pedas" vs "tidak pedas") */
const kunciBaris = (/** @type {string} */ p, /** @type {string | null} */ v, /** @type {string} */ c) => `${p}|${v || ''}|${c.toLowerCase()}`;

/**
 * Validasi & lengkapi baris kiriman klien dengan data produk dari basis data.
 * @param {any} db @param {number} unitId
 * @param {any[]} masuk
 * @param {BarisBill[]} lama baris versi sebelumnya (untuk meneruskan jumlah yang sudah dikirim ke dapur)
 * @returns {Promise<BarisBill[]>}
 */
async function rapikanBaris(db, unitId, masuk, lama = []) {
	if (!Array.isArray(masuk)) throw new PosError('Daftar pesanan tidak valid');
	if (masuk.length > 150) throw new PosError('Terlalu banyak baris dalam satu bill');
	const ids = [...new Set(masuk.map((i) => String(i?.productId || '')))].filter(Boolean);
	/** @type {any[]} */
	const prod = ids.length
		? await db
				.select({ id: products.id, nama: products.nama, harga: products.hargaJual, jenis: products.jenis, kategori: kategoriProduk.namaKategori })
				.from(products)
				.leftJoin(kategoriProduk, eq(products.kategoriId, kategoriProduk.id))
				.where(and(eq(products.unitId, unitId), inArray(products.id, ids), isNull(products.deletedAt)))
		: [];
	const peta = new Map(prod.map((p) => [String(p.id), p]));
	const vids = [...new Set(masuk.map((i) => (i?.variantId ? String(i.variantId) : '')))].filter(Boolean);
	/** @type {any[]} */
	const varian = vids.length ? await db.select().from(productVariants).where(inArray(productVariants.id, vids)) : [];
	const petaV = new Map(varian.map((v) => [String(v.id), v]));
	// Jumlah yang sudah dikirim ke dapur dihitung per produk+varian (bukan per catatan), supaya mengubah
	// catatan item tidak membuat pesanan yang sama terkirim dua kali.
	/** @type {Map<string, number>} */
	const sudah = new Map();
	for (const b of lama) {
		const kp = `${b.productId}|${b.variantId || ''}`;
		sudah.set(kp, (sudah.get(kp) || 0) + b.dikirim);
	}

	/** @type {Map<string, BarisBill>} */
	const hasil = new Map();
	for (const it of masuk) {
		const p = peta.get(String(it?.productId || ''));
		if (!p) throw new PosError(`Menu ${String(it?.nama || '').slice(0, 40)} tidak ditemukan di unit ini`.replace(/\s+/g, ' '), 404);
		if (!bisaDijual(p.jenis)) throw new PosError(`${p.nama} bukan barang jual`);
		const qty = Number(it?.qty);
		if (!Number.isInteger(qty) || qty <= 0 || qty > 9999) throw new PosError(`Jumlah ${p.nama} tidak valid`);
		let nama = p.nama;
		let harga = Number(p.harga || 0);
		let variantId = null;
		if (it?.variantId) {
			const v = petaV.get(String(it.variantId));
			if (!v || String(v.productId) !== String(p.id)) throw new PosError(`Varian ${p.nama} tidak ditemukan`, 404);
			variantId = String(v.id);
			nama = `${p.nama} - ${v.namaVariasi}`;
			if (Number(v.hargaJual) > 0) harga = Number(v.hargaJual);
		}
		const catatan = String(it?.catatan || '').replace(/[<>]/g, '').trim().slice(0, 120);
		const k = kunciBaris(String(p.id), variantId, catatan);
		const ada = hasil.get(k);
		if (ada) {
			ada.qty += qty;
			continue;
		}
		hasil.set(k, { k, productId: String(p.id), variantId, nama, harga, qty, catatan, kategori: String(p.kategori || ''), dikirim: 0 });
	}
	for (const b of hasil.values()) {
		const kp = `${b.productId}|${b.variantId || ''}`;
		const sisa = sudah.get(kp) || 0;
		b.dikirim = Math.min(b.qty, sisa);
		sudah.set(kp, sisa - b.dikirim);
	}
	return [...hasil.values()];
}

/** @param {any} db @param {number} unitId */
export async function daftarBillTerbuka(db, unitId) {
	await pastikanTabelPos(db);
	const rows = barisDari(await db.execute(sql`SELECT * FROM pos_bill WHERE unit_id = ${unitId} AND status = 'OPEN' ORDER BY dibuka_pada`));
	return rows.map(bentukBill);
}

/** @param {any} db @param {number} unitId @param {number} id */
export async function ambilBill(db, unitId, id) {
	await pastikanTabelPos(db);
	const [r] = barisDari(await db.execute(sql`SELECT * FROM pos_bill WHERE id = ${id} AND unit_id = ${unitId} LIMIT 1`));
	return r ? bentukBill(r) : null;
}

/**
 * Buat atau ubah bill terbuka.
 * @param {any} db @param {number} unitId
 * @param {{ id?: number | null, versi?: number | null, meja?: string | null, nama?: string | null, jenisPesanan?: string | null,
 *   jumlahTamu?: number | string | null, items: any[], isian?: Record<string, unknown> | null, catatan?: string | null }} d
 * @param {{ oleh?: string | null, mejaSah?: string[] | null }} [opsi] mejaSah = kode meja dari pengaturan profil
 */
export async function simpanBill(db, unitId, d, opsi = {}) {
	await pastikanTabelPos(db);
	const meja = d.meja ? String(d.meja).trim().slice(0, 20) : null;
	if (meja && opsi.mejaSah && !opsi.mejaSah.some((m) => m.toLowerCase() === meja.toLowerCase())) throw new PosError(`Meja ${meja} tidak ada di denah`);
	const nama = String(d.nama || '').replace(/[<>]/g, '').trim().slice(0, 100);
	if (!meja && !nama) throw new PosError('Isi nomor meja atau nama untuk bill ini');
	const jenis = JENIS_PESANAN.includes(/** @type {any} */ (String(d.jenisPesanan || '').toUpperCase()))
		? String(d.jenisPesanan).toUpperCase()
		: meja
			? 'DINE_IN'
			: 'TAKEAWAY';
	const tamu = d.jumlahTamu == null || d.jumlahTamu === '' ? null : Math.max(1, Math.min(200, Math.round(Number(d.jumlahTamu)) || 1));
	/** @type {Record<string, string>} */
	const isian = {};
	for (const [k, v] of Object.entries(d.isian || {}).slice(0, 10)) isian[String(k).slice(0, 30)] = String(v ?? '').replace(/[<>]/g, '').slice(0, 120);
	const catatan = String(d.catatan || '').replace(/[<>]/g, '').trim().slice(0, 255) || null;
	const kini = nowSqlWIB();

	return db.transaction(async (/** @type {any} */ tx) => {
		if (meja) {
			const [lain] = barisDari(
				await tx.execute(sql`SELECT id FROM pos_bill WHERE unit_id = ${unitId} AND status = 'OPEN' AND meja = ${meja} AND id <> ${Number(d.id) || 0} LIMIT 1 FOR UPDATE`)
			);
			if (lain) throw new PosError(`Meja ${meja} masih punya bill terbuka`, 409);
		}
		if (d.id) {
			const [r] = barisDari(await tx.execute(sql`SELECT * FROM pos_bill WHERE id = ${Number(d.id)} AND unit_id = ${unitId} LIMIT 1 FOR UPDATE`));
			if (!r) throw new PosError('Bill tidak ditemukan', 404);
			if (r.status !== 'OPEN') throw new PosError('Bill ini sudah ditutup', 409);
			if (d.versi != null && Number(d.versi) !== Number(r.versi)) throw new PosError('Bill baru saja diubah kasir lain. Muat ulang dulu.', 409);
			const items = await rapikanBaris(tx, unitId, d.items, parse(r.items) || []);
			if (items.length === 0) throw new PosError('Bill kosong. Batalkan bill bila tidak jadi.');
			await tx.execute(sql`UPDATE pos_bill SET meja = ${meja}, nama = ${nama || null}, jenis_pesanan = ${jenis}, jumlah_tamu = ${tamu},
				items = ${JSON.stringify(items)}, isian = ${JSON.stringify(isian)}, catatan = ${catatan}, versi = versi + 1, diubah_pada = ${kini}
				WHERE id = ${Number(d.id)}`);
			return /** @type {any} */ (bentukBill({ ...r, meja, nama, jenis_pesanan: jenis, jumlah_tamu: tamu, items, isian, catatan, versi: Number(r.versi) + 1, diubah_pada: kini }));
		}
		const items = await rapikanBaris(tx, unitId, d.items);
		if (items.length === 0) throw new PosError('Pilih menu dulu');
		const kode = `B${todayStrWIB().slice(8, 10)}${crypto.randomInt(1000, 9999)}`;
		const [res] = await tx.execute(sql`INSERT INTO pos_bill (unit_id, kode, meja, nama, jenis_pesanan, jumlah_tamu, items, isian, catatan, status, versi, dibuka_oleh, dibuka_pada, diubah_pada)
			VALUES (${unitId}, ${kode}, ${meja}, ${nama || null}, ${jenis}, ${tamu}, ${JSON.stringify(items)}, ${JSON.stringify(isian)}, ${catatan}, 'OPEN', 1,
			${String(opsi.oleh || '').slice(0, 100) || null}, ${kini}, ${kini})`);
		return /** @type {any} */ (
			bentukBill({ id: res.insertId, kode, meja, nama, jenis_pesanan: jenis, jumlah_tamu: tamu, items, isian, catatan, status: 'OPEN', versi: 1, dibuka_oleh: opsi.oleh, dibuka_pada: kini, diubah_pada: kini })
		);
	});
}

/**
 * Pindah meja (mis. tamu pindah ke teras). @param {any} db @param {number} unitId @param {number} id @param {string} mejaBaru
 * @param {string[] | null} [mejaSah]
 */
export async function pindahMeja(db, unitId, id, mejaBaru, mejaSah = null) {
	const b = await ambilBill(db, unitId, id);
	if (!b || b.status !== 'OPEN') throw new PosError('Bill tidak ditemukan', 404);
	return simpanBill(db, unitId, { ...b, meja: mejaBaru, versi: null }, { mejaSah });
}

/** @param {any} db @param {number} unitId @param {number} id */
export async function batalkanBill(db, unitId, id) {
	await pastikanTabelPos(db);
	const [r] = await db.execute(sql`UPDATE pos_bill SET status = 'BATAL', diubah_pada = ${nowSqlWIB()} WHERE id = ${id} AND unit_id = ${unitId} AND status = 'OPEN'`);
	if (!r?.affectedRows) throw new PosError('Bill tidak ditemukan atau sudah ditutup', 404);
	await db.execute(sql`UPDATE pos_tiket_dapur SET status = 'BATAL', diubah_pada = ${nowSqlWIB()} WHERE bill_id = ${id} AND unit_id = ${unitId} AND status IN ('BARU','DIMASAK')`);
}

/**
 * Kelompokkan baris per stasiun lalu simpan sebagai tiket. Dipakai saat "kirim ke dapur" dan saat bayar langsung.
 * @param {any} tx @param {number} unitId
 * @param {{ nama: string, qty: number, catatan?: string, kategori?: string }[]} baris
 * @param {{ stasiun: import('$lib/posProfil').Stasiun[], label: string, billId?: number | null, orderId?: number | null }} o
 * @returns {Promise<number>} jumlah tiket
 */
export async function buatTiket(tx, unitId, baris, o) {
	/** @type {Map<string, { nama: string, qty: number, catatan: string }[]>} */
	const per = new Map();
	for (const b of baris) {
		if (!(b.qty > 0)) continue;
		const st = stasiunUntuk(b.kategori, o.stasiun);
		if (!st) continue;
		if (!per.has(st)) per.set(st, []);
		per.get(st)?.push({ nama: String(b.nama).slice(0, 80), qty: b.qty, catatan: String(b.catatan || '').slice(0, 120) });
	}
	const kini = nowSqlWIB();
	for (const [st, items] of per) {
		await tx.execute(sql`INSERT INTO pos_tiket_dapur (unit_id, bill_id, order_id, stasiun, label, items, status, dibuat_pada, diubah_pada)
			VALUES (${unitId}, ${o.billId ?? null}, ${o.orderId ?? null}, ${st}, ${o.label.slice(0, 60)}, ${JSON.stringify(items)}, 'BARU', ${kini}, ${kini})`);
	}
	return per.size;
}

/** Label tiket: "Meja 5 · Budi" / "Antrean A12" / "B 1234 CD" */
export function labelTiket(/** @type {{ meja?: string | null, nama?: string | null, antrean?: string | null, kode?: string | null }} */ x, labelBill = 'Meja') {
	const bagian = [];
	if (x.meja) bagian.push(`${labelBill === 'Meja' ? 'Meja' : labelBill} ${x.meja}`);
	if (x.antrean) bagian.push(`Antrean ${x.antrean}`);
	if (x.nama) bagian.push(x.nama);
	return bagian.join(' · ') || x.kode || 'Pesanan';
}

/**
 * Kirim tambahan pesanan bill ke dapur (hanya jumlah yang belum dikirim).
 * @param {any} db @param {number} unitId @param {number} id
 * @param {{ stasiun: import('$lib/posProfil').Stasiun[], labelBill: string }} p
 */
export async function kirimBillKeDapur(db, unitId, id, p) {
	await pastikanTabelPos(db);
	return db.transaction(async (/** @type {any} */ tx) => {
		const [r] = barisDari(await tx.execute(sql`SELECT * FROM pos_bill WHERE id = ${id} AND unit_id = ${unitId} LIMIT 1 FOR UPDATE`));
		if (!r || r.status !== 'OPEN') throw new PosError('Bill tidak ditemukan atau sudah ditutup', 404);
		const items = /** @type {BarisBill[]} */ (parse(r.items) || []);
		const kirim = items.map((b) => ({ ...b, qty: b.qty - b.dikirim })).filter((b) => b.qty > 0);
		if (kirim.length === 0) return { tiket: 0, bill: bentukBill(r) };
		const tiket = await buatTiket(tx, unitId, kirim, { stasiun: p.stasiun, label: labelTiket({ meja: r.meja, nama: r.nama, kode: r.kode }, p.labelBill), billId: id });
		const baru = items.map((b) => ({ ...b, dikirim: b.qty }));
		await tx.execute(sql`UPDATE pos_bill SET items = ${JSON.stringify(baru)}, versi = versi + 1, diubah_pada = ${nowSqlWIB()} WHERE id = ${id}`);
		return { tiket, bill: bentukBill({ ...r, items: baru, versi: Number(r.versi) + 1 }) };
	});
}

/**
 * Tiket dapur aktif (+ yang selesai 30 menit terakhir).
 * @param {any} db @param {number} unitId @param {string | null} [stasiun]
 */
export async function daftarTiket(db, unitId, stasiun = null) {
	await pastikanTabelPos(db);
	const batas = new Date(Date.now() + 7 * 3600e3 - 30 * 60e3).toISOString().slice(0, 19).replace('T', ' ');
	const rows = barisDari(
		await db.execute(sql`SELECT * FROM pos_tiket_dapur WHERE unit_id = ${unitId}
			AND (status IN ('BARU','DIMASAK','SIAP') OR (status = 'DISAJIKAN' AND diubah_pada >= ${batas}))
			${stasiun ? sql`AND stasiun = ${stasiun}` : sql``}
			ORDER BY dibuat_pada LIMIT 200`)
	);
	return rows.map((/** @type {any} */ r) => ({
		id: Number(r.id),
		stasiun: r.stasiun,
		label: r.label,
		items: parse(r.items) || [],
		status: r.status,
		billId: r.bill_id == null ? null : Number(r.bill_id),
		orderId: r.order_id == null ? null : Number(r.order_id),
		dibuatPada: String(r.dibuat_pada || ''),
		diubahPada: String(r.diubah_pada || '')
	}));
}

/** @param {any} db @param {number} unitId @param {number} id @param {string} status */
export async function ubahStatusTiket(db, unitId, id, status) {
	if (!STATUS_TIKET.includes(/** @type {any} */ (status))) throw new PosError('Status tiket tidak dikenal');
	await pastikanTabelPos(db);
	const [r] = await db.execute(sql`UPDATE pos_tiket_dapur SET status = ${status}, diubah_pada = ${nowSqlWIB()} WHERE id = ${id} AND unit_id = ${unitId}`);
	if (!r?.affectedRows) throw new PosError('Tiket tidak ditemukan', 404);
}

/**
 * Nomor antrean berikutnya hari ini (A1, A2, …) dari jumlah order unit hari ini.
 * @param {any} db @param {number} unitId
 */
export async function nomorAntreanBerikut(db, unitId) {
	const hari = todayStrWIB();
	const [r] = barisDari(
		await db.execute(sql`SELECT COUNT(*) AS n FROM pos_orders WHERE unit_id = ${unitId} AND created_at >= ${`${hari} 00:00:00`} AND created_at <= ${`${hari} 23:59:59`}`)
	);
	return `A${Number(r?.n || 0) + 1}`;
}

export { teksIsian };

/**
 * Siapkan checkout untuk unit yang punya profil kasir: bill (barang diambil dari bill tersimpan),
 * nomor antrean otomatis, isian khas usaha (wajib/tidak), dan tiket dapur + penutupan bill di
 * transaksi yang sama dengan pembayaran.
 * @param {any} db @param {number} unitId
 * @param {{ profil: string, pengaturan: import('$lib/posProfil').PengaturanPos } | null} profil
 * @param {{ billId?: number | null, billVersi?: number | null, isian?: Record<string, unknown> | null, queueNumber?: string | null,
 *   tableNumber?: string | null, customerName?: string | null, items: any[] }} masuk
 * @returns {Promise<{ items?: any[], queueNumber?: string | null, tableNumber?: string | null, orderType?: string, catatanTambahan: string,
 *   pengaturanPos: import('$lib/posProfil').PengaturanPos | null, setelahOrder: ((tx: any, o: any) => Promise<void>) | null, bill: any }>}
 */
export async function siapkanCheckoutProfil(db, unitId, profil, masuk) {
	if (!profil) {
		if (masuk.billId) throw new PosError('Pengaturan kasir tidak terbaca. Coba lagi.', 503);
		return { catatanTambahan: '', pengaturanPos: null, setelahOrder: null, bill: null };
	}
	const p = profil.pengaturan;
	const { cekIsianWajib } = await import('$lib/posProfil');
	/** @type {any} */
	let bill = null;
	if (masuk.billId) {
		bill = await ambilBill(db, unitId, Number(masuk.billId));
		if (!bill || bill.status !== 'OPEN') throw new PosError('Bill tidak ditemukan atau sudah dibayar', 409);
		if (masuk.billVersi != null && Number(masuk.billVersi) !== bill.versi) throw new PosError('Bill baru saja diubah kasir lain. Muat ulang dulu.', 409);
	}
	const isianGabung = { ...(bill?.isian || {}), ...(masuk.isian || {}) };
	const galat = cekIsianWajib(p.isian, isianGabung);
	if (galat) throw new PosError(galat, 422);

	const queueNumber = masuk.queueNumber || (p.nomorAntrean && !bill ? await nomorAntreanBerikut(db, unitId) : null);
	const catatanTambahan = teksIsian(p.isian, isianGabung);

	/** @type {any[] | undefined} */
	const items = bill ? bill.items.map((/** @type {BarisBill} */ b) => ({ productId: b.productId, variantId: b.variantId, qty: b.qty, nama: b.nama })) : undefined;
	const sisaDapur = bill
		? bill.items.map((/** @type {BarisBill} */ b) => ({ nama: b.nama, qty: b.qty - b.dikirim, catatan: b.catatan, kategori: b.kategori }))
		: null;
	const catatanItem = new Map((masuk.items || []).map((i) => [String(i?.productId || ''), String(i?.catatan || '').slice(0, 120)]));

	/** @param {any} tx @param {{ orderId: number, baris: { produkId: string, nama: string, qty: number, kategoriId: number | null }[] }} o */
	const setelahOrder = async (tx, o) => {
		if (bill) {
			const [r] = await tx.execute(sql`UPDATE pos_bill SET status = 'PAID', order_id = ${o.orderId}, versi = versi + 1, diubah_pada = ${nowSqlWIB()}
				WHERE id = ${bill.id} AND unit_id = ${unitId} AND status = 'OPEN' AND versi = ${bill.versi}`);
			if (!r?.affectedRows) throw new PosError('Bill ini sudah dibayar atau diubah di kasir lain', 409);
		}
		if (!p.dapur.aktif) return;
		/** @type {{ nama: string, qty: number, catatan?: string, kategori?: string }[]} */
		let baris;
		if (sisaDapur) baris = sisaDapur;
		else {
			const ids = [...new Set(o.baris.map((b) => b.kategoriId).filter((x) => x != null))];
			/** @type {any[]} */
			const kat = ids.length ? await tx.select({ id: kategoriProduk.id, nama: kategoriProduk.namaKategori }).from(kategoriProduk).where(inArray(kategoriProduk.id, ids)) : [];
			const petaKat = new Map(kat.map((k) => [k.id, k.nama]));
			baris = o.baris.map((b) => ({ nama: b.nama, qty: b.qty, catatan: catatanItem.get(b.produkId) || '', kategori: petaKat.get(b.kategoriId) || '' }));
		}
		await buatTiket(tx, unitId, baris, {
			stasiun: p.dapur.stasiun,
			label: labelTiket({ meja: bill?.meja || masuk.tableNumber || null, nama: bill?.nama || masuk.customerName || null, antrean: queueNumber, kode: bill?.kode }, p.labelBill),
			billId: bill?.id ?? null,
			orderId: o.orderId
		});
	};

	return {
		items,
		queueNumber,
		tableNumber: bill?.meja ?? masuk.tableNumber ?? null,
		orderType: bill?.jenisPesanan,
		catatanTambahan,
		pengaturanPos: p,
		setelahOrder,
		bill
	};
}
