/**
 * GET /api/invoice/[orderId]
 * Generate HTML invoice dari POS order
 * Query param: ?type=pos (default) | ?type=manual (dari transaksi biasa)
 */
import { db } from '$lib/server/drizzle';
import { unitBisnis, posOrders, posCustomers, posOrderItems, transaksi } from '$lib/server/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { generateInvoiceHTML, generateInvoiceNumber } from '$lib/server/invoiceGenerator';
import { apiUnauthorized, apiError } from '$lib/server/apiResponse';

export async function GET({ params, url, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) return apiUnauthorized();

	const { orderId } = params;
	const type = url.searchParams.get('type') || 'pos';

	try {
		if (type === 'pos') {
			return await generatePosInvoice(orderId, userId);
		} else {
			return await generateManualInvoice(orderId, userId);
		}
	} catch (err) {
		console.error('[Invoice] Error:', err);
		return apiError('Gagal generate invoice: ' + err.message, 500);
	}
}

async function generatePosInvoice(orderId, userId) {
	// Ambil order + items + unit + customer
	const orderRows = await db.select({
		id: posOrders.id,
		order_number: posOrders.orderNumber,
		created_at: posOrders.createdAt,
		subtotal: posOrders.subtotal,
		discount: posOrders.discount,
		total: posOrders.total,
		payment_method: posOrders.paymentMethod,
		status: posOrders.status,
		notes: posOrders.notes,
		nama_unit: unitBisnis.namaUnit,
		alamat: unitBisnis.alamat,
		telepon: unitBisnis.telepon,
		email: unitBisnis.email,
		nama_customer: posCustomers.namaCustomer,
		customer_telepon: posCustomers.telepon,
		customer_email: posCustomers.email
	})
	.from(posOrders)
	.innerJoin(unitBisnis, eq(unitBisnis.id, posOrders.unitId))
	.leftJoin(posCustomers, eq(posCustomers.id, posOrders.customerId))
	.where(and(eq(posOrders.id, Number(orderId)), eq(unitBisnis.userId, userId)))
	.limit(1);

	if (!orderRows.length) return apiError('Order tidak ditemukan', 404);
	const order = orderRows[0];

	const itemRows = await db.select({
		nama: posOrderItems.productName,
		qty: posOrderItems.qty,
		harga: posOrderItems.price,
		total: posOrderItems.total
	})
	.from(posOrderItems)
	.where(eq(posOrderItems.orderId, Number(orderId)))
	.orderBy(asc(posOrderItems.id));

	// Hitung sequence dari order number
	const seqMatch = String(order.order_number || '').match(/(\d+)$/);
	const seq = seqMatch ? parseInt(seqMatch[1]) : order.id;

	const html = generateInvoiceHTML({
		unit: {
			namaUnit: order.nama_unit,
			alamat: order.alamat,
			telepon: order.telepon,
			email: order.email
		},
		customer: {
			nama: order.nama_customer || 'Pelanggan Umum',
			telepon: order.customer_telepon,
			email: order.customer_email
		},
		invoiceNumber: generateInvoiceNumber('INV', seq),
		tanggal: order.created_at,
		items: itemRows,
		subtotal: Number(order.subtotal),
		discount: Number(order.discount || 0),
		total: Number(order.total),
		metodeBayar: order.payment_method,
		status: order.status === 'PAID' ? 'LUNAS' : 'BELUM_BAYAR',
		catatan: order.notes || ''
	});

	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
}

async function generateManualInvoice(trxId, userId) {
	const rows = await db.select({
		id: transaksi.id,
		keterangan: transaksi.keterangan,
		qty: transaksi.qty,
		nominal: transaksi.nominal,
		total_harga: transaksi.totalHarga,
		metode_bayar: transaksi.metodeBayar,
		tanggal: transaksi.tanggal,
		created_at: transaksi.createdAt,
		nama_unit: unitBisnis.namaUnit,
		alamat: unitBisnis.alamat,
		telepon: unitBisnis.telepon,
		email: unitBisnis.email
	})
	.from(transaksi)
	.innerJoin(unitBisnis, eq(unitBisnis.id, transaksi.unitId))
	.where(and(eq(transaksi.id, Number(trxId)), eq(transaksi.userId, userId)))
	.limit(1);

	if (!rows.length) return apiError('Transaksi tidak ditemukan', 404);
	const trx = rows[0];

	const html = generateInvoiceHTML({
		unit: {
			namaUnit: trx.nama_unit,
			alamat: trx.alamat,
			telepon: trx.telepon,
			email: trx.email
		},
		customer: { nama: 'Pelanggan' },
		invoiceNumber: generateInvoiceNumber('TRX', trx.id),
		tanggal: trx.tanggal || trx.created_at,
		items: [{
			nama: trx.keterangan || 'Transaksi',
			qty: Number(trx.qty || 1),
			harga: Number(trx.nominal || trx.total_harga),
			total: Number(trx.total_harga || trx.nominal)
		}],
		subtotal: Number(trx.total_harga || trx.nominal),
		total: Number(trx.total_harga || trx.nominal),
		metodeBayar: trx.metode_bayar || 'KAS',
		status: 'LUNAS'
	});

	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
}
