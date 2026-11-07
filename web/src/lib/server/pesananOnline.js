/** Bentuk pesanan toko online untuk app: status gabungan dari status bayar + kirim. */

/** @param {{ paymentStatus?: string | null, shippingStatus?: string | null }} o */
export function statusGabungan(o) {
	const bayar = o.paymentStatus || 'PENDING';
	const kirim = o.shippingStatus || 'PENDING';
	if (bayar === 'FAILED' || bayar === 'EXPIRED') return 'CANCELLED';
	if (kirim === 'DELIVERED') return 'COMPLETED';
	if (kirim === 'SHIPPED') return 'SHIPPED';
	if (kirim === 'PROCESSING') return 'PROCESSING';
	if (bayar === 'PAID') return 'PAID';
	return 'PENDING';
}

/**
 * @param {any} o baris ecommerce_orders
 * @param {any[]} items baris ecommerce_order_items
 * @param {Map<string, string>} petaProduk id produk → nama
 */
export function bentukPesanan(o, items, petaProduk) {
	return {
		id: o.id,
		unitId: o.unitId,
		orderNumber: o.orderNumber,
		customerName: o.customerName || '',
		customerEmail: o.customerEmail || '',
		customerPhone: o.customerPhone || '',
		shippingAddress: o.shippingAddress || '',
		subtotal: Number(o.subtotal || 0),
		discountAmount: Number(o.discountAmount || 0),
		totalAmount: Number(o.totalAmount || 0),
		paymentStatus: o.paymentStatus || 'PENDING',
		shippingStatus: o.shippingStatus || 'PENDING',
		status: statusGabungan(o),
		source: 'toko online',
		createdAt: o.createdAt || '',
		items: items.map((i) => ({
			id: i.id,
			ecommerceOrderId: i.ecommerceOrderId,
			productId: i.productId || null,
			productName: (i.productId && petaProduk.get(i.productId)) || '',
			qty: i.qty,
			price: Number(i.price || 0),
			total: Number(i.total || 0)
		}))
	};
}
