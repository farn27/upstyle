/**
 * Retur POS — SATU logika untuk web (/finance/[slug]/pos/retur) dan mobile (/api/app/pos/returns).
 *
 * - Barang yang diretur HARUS baris dari order tersebut, dan qty tidak boleh melebihi sisa yang belum diretur.
 * - Nominal refund dihitung server dari harga di order (dikurangi diskon order secara proporsional),
 *   bukan dari kiriman klien.
 * - Stok dikembalikan + stock log; refund dijurnal Debit Pendapatan / Kredit Kas lewat catatTransaksi.
 */
import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { posOrders, posOrderItems, posReturns, posReturnItems, products, stockLogs } from '$lib/server/schema';
import { catatTransaksi, pilihAkunDefault } from '$lib/server/catatTransaksi';

export class ReturError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 400) {
		super(message);
		this.name = 'ReturError';
		this.status = status;
	}
}

/** @param {unknown} n */
const bulat = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * @param {any} db
 * @param {{ unitId: number, pemilikId: number, handledBy: string }} ctx  pemilikId = users.id pemilik unit
 * @param {{ orderId: unknown, reason?: unknown, items: { orderItemId?: unknown, productId?: unknown, qty: unknown }[] }} input
 * @returns {Promise<{ returnId: number, returnNumber: string, totalRefund: number, statusOrder: string }>}
 */
export async function prosesReturPos(db, ctx, input) {
	const orderId = Number(input.orderId);
	if (!Number.isInteger(orderId) || orderId <= 0) throw new ReturError('Order tidak valid');
	if (!Array.isArray(input.items) || input.items.length === 0) throw new ReturError('Pilih minimal 1 barang untuk diretur');

	return db.transaction(async (/** @type {any} */ tx) => {
		const [order] = await tx
			.select()
			.from(posOrders)
			.where(and(eq(posOrders.id, orderId), eq(posOrders.unitId, ctx.unitId)))
			.for('update');
		if (!order) throw new ReturError('Order tidak ditemukan atau bukan milik unit ini', 404);
		if (order.status === 'REFUNDED' || order.status === 'CANCELLED') throw new ReturError('Order ini sudah diretur / dibatalkan', 409);

		/** @type {any[]} */
		const barisOrder = await tx.select().from(posOrderItems).where(eq(posOrderItems.orderId, orderId));
		if (barisOrder.length === 0) throw new ReturError('Order tidak punya barang', 409);

		// Sudah diretur sebelumnya per baris order
		/** @type {Map<number, number>} */
		const sudahDiretur = new Map();
		const terdahulu = await tx
			.select({ orderItemId: posReturnItems.orderItemId, qty: sql`COALESCE(SUM(${posReturnItems.qtyReturned}), 0)` })
			.from(posReturnItems)
			.where(inArray(posReturnItems.orderItemId, barisOrder.map((b) => b.id)))
			.groupBy(posReturnItems.orderItemId);
		for (const t of terdahulu) sudahDiretur.set(Number(t.orderItemId), Number(t.qty));

		// Diskon order dibagi proporsional ke tiap barang
		const subtotal = Number(order.subtotal || 0);
		const rasio = subtotal > 0 ? Math.min(1, Math.max(0, Number(order.total || 0) / subtotal)) : 1;

		/** @type {{ baris: any, qty: number, refund: number }[]} */
		const rencana = [];
		for (const item of input.items) {
			const qty = Number(item?.qty);
			if (!Number.isInteger(qty) || qty <= 0) throw new ReturError('Jumlah retur tidak valid');
			const idBaris = Number(item?.orderItemId);
			const baris = idBaris
				? barisOrder.find((b) => b.id === idBaris)
				: barisOrder.find((b) => item?.productId && String(b.productId) === String(item.productId));
			if (!baris) throw new ReturError('Barang tidak ada di order ini', 404);
			const dipakai = (sudahDiretur.get(baris.id) || 0) + rencana.filter((r) => r.baris.id === baris.id).reduce((s, r) => s + r.qty, 0);
			const sisa = Number(baris.qty) - dipakai;
			if (qty > sisa) throw new ReturError(`Retur ${baris.productName || 'barang'} melebihi jumlah yang dibeli (sisa ${sisa})`, 409);
			rencana.push({ baris, qty, refund: bulat(Number(baris.price) * qty * rasio) });
		}
		const totalRefund = bulat(rencana.reduce((s, r) => s + r.refund, 0));

		const returnNumber = `RET-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
		const [ret] = await tx.insert(posReturns).values({
			returnNumber,
			orderId,
			unitId: ctx.unitId,
			handledBy: String(ctx.handledBy).slice(0, 50),
			totalRefund: String(totalRefund),
			reason: input.reason ? String(input.reason) : null,
			status: 'COMPLETED'
		});
		const returnId = ret.insertId;

		for (const { baris, qty, refund } of rencana) {
			await tx.insert(posReturnItems).values({
				returnId,
				orderItemId: baris.id,
				productId: baris.productId ? String(baris.productId) : null,
				qtyReturned: qty,
				refundAmount: String(refund)
			});
			if (!baris.productId) continue;
			const [produk] = await tx
				.select({ id: products.id, stok: products.stok })
				.from(products)
				.where(and(eq(products.id, String(baris.productId)), eq(products.unitId, ctx.unitId)))
				.for('update');
			if (!produk) continue; // produk sudah dihapus permanen: refund tetap dicatat
			await tx.update(products).set({ stok: sql`${products.stok} + ${qty}` }).where(eq(products.id, produk.id));
			await tx.insert(stockLogs).values({
				id: randomUUID(),
				productId: produk.id,
				userId: String(ctx.pemilikId),
				unitId: ctx.unitId,
				stokAwal: Number(produk.stok || 0),
				perubahan: qty,
				stokAkhir: Number(produk.stok || 0) + qty,
				alasan: 'RETUR',
				keterangan: `Retur POS ${returnNumber} (order ${order.orderNumber})`
			});
		}

		// Jurnal refund: Debit Pendapatan / Kredit Kas (sama dengan akun yang dipakai saat penjualan)
		if (totalRefund > 0) {
			const { coaId: pendapatanId, kasCoaId } = await pilihAkunDefault(tx, ctx.unitId, 'MASUK', order.paymentMethod);
			if (pendapatanId && kasCoaId) {
				await catatTransaksi(tx, {
					unitId: ctx.unitId,
					userId: ctx.pemilikId,
					kategori: 'KELUAR',
					nominal: totalRefund,
					keterangan: `Refund retur POS ${returnNumber} (order ${order.orderNumber})`,
					coaId: pendapatanId,
					kasCoaId
				});
			}
		}

		// Order dianggap REFUNDED kalau semua barangnya sudah diretur penuh
		const semuaKembali = barisOrder.every((b) => {
			const total = (sudahDiretur.get(b.id) || 0) + rencana.filter((r) => r.baris.id === b.id).reduce((s, r) => s + r.qty, 0);
			return total >= Number(b.qty);
		});
		const statusOrder = semuaKembali ? 'REFUNDED' : order.status;
		if (semuaKembali) await tx.update(posOrders).set({ status: 'REFUNDED' }).where(eq(posOrders.id, orderId));

		return { returnId, returnNumber, totalRefund, statusOrder };
	});
}
