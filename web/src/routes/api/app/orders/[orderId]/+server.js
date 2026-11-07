import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { ecommerceOrders, ecommerceOrderItems, unitBisnis, products } from '$lib/server/schema';
import { bentukPesanan } from '$lib/server/pesananOnline';
import { inArray } from 'drizzle-orm';
import { eq, and } from 'drizzle-orm';
import { log } from '$lib/server/logger';

// GET /api/app/orders/:orderId
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const orderId = parseInt(params.orderId);
    if (!orderId) return json({ success: false, message: 'orderId tidak valid' }, { status: 400 });

    try {
        const [order] = await db.select({
                order: ecommerceOrders,
                unitOwnerId: unitBisnis.userId
            })
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(eq(ecommerceOrders.id, orderId))
            .limit(1);

        if (!order) return json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
        if (order.unitOwnerId !== userId) return json({ success: false, message: 'Access denied' }, { status: 403 });

        const items = await db.select()
            .from(ecommerceOrderItems)
            .where(eq(ecommerceOrderItems.ecommerceOrderId, orderId));

        const idProduk = [...new Set(items.map((i) => i.productId).filter(Boolean))];
        const prod = idProduk.length ? await db.select({ id: products.id, nama: products.nama }).from(products).where(inArray(products.id, /** @type {string[]} */ (idProduk))) : [];
        return json({ success: true, data: bentukPesanan(order.order, items, new Map(prod.map((p) => [p.id, p.nama]))) });
    } catch (err) {
        log.api.error({ err }, 'GET order detail');
        return json({ success: false, message: 'Gagal memuat detail pesanan' }, { status: 500 });
    }
}

// PUT /api/app/orders/:orderId  — update status
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const orderId = parseInt(params.orderId);
    if (!orderId) return json({ success: false, message: 'orderId tidak valid' }, { status: 400 });

    const body = await request.json();
    const { status, paymentStatus, shippingStatus } = body;

    try {
        // Verify ownership
        const [order] = await db.select({
                id: ecommerceOrders.id,
                unitOwnerId: unitBisnis.userId
            })
            .from(ecommerceOrders)
            .innerJoin(unitBisnis, eq(ecommerceOrders.unitId, unitBisnis.id))
            .where(eq(ecommerceOrders.id, orderId))
            .limit(1);

        if (!order) return json({ success: false, message: 'Pesanan tidak ditemukan' }, { status: 404 });
        if (order.unitOwnerId !== userId) return json({ success: false, message: 'Access denied' }, { status: 403 });

        const BAYAR = ['PENDING', 'PAID', 'FAILED', 'EXPIRED'];
        const KIRIM = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
        const up = (v) => String(v ?? '').trim().toUpperCase();
        /** @type {Record<string, string>} */
        const updates = {};
        // status gabungan lama dari app (Pending/Processing/Shipped/Completed/Cancelled) → pemetaan ke dua status web
        const LAMA = {
            PENDING: { paymentStatus: 'PENDING', shippingStatus: 'PENDING' },
            PAID: { paymentStatus: 'PAID' },
            PROCESSING: { shippingStatus: 'PROCESSING' },
            SHIPPED: { shippingStatus: 'SHIPPED' },
            COMPLETED: { paymentStatus: 'PAID', shippingStatus: 'DELIVERED' },
            DELIVERED: { shippingStatus: 'DELIVERED' },
            CANCELLED: { paymentStatus: 'FAILED' }
        };
        if (status) {
            const peta = LAMA[up(status)];
            if (!peta) return json({ success: false, message: 'Status tidak dikenali' }, { status: 400 });
            Object.assign(updates, peta);
        }
        if (paymentStatus) {
            if (!BAYAR.includes(up(paymentStatus))) return json({ success: false, message: `paymentStatus harus salah satu dari ${BAYAR.join(', ')}` }, { status: 400 });
            updates.paymentStatus = up(paymentStatus);
        }
        if (shippingStatus) {
            if (!KIRIM.includes(up(shippingStatus))) return json({ success: false, message: `shippingStatus harus salah satu dari ${KIRIM.join(', ')}` }, { status: 400 });
            updates.shippingStatus = up(shippingStatus);
        }

        if (Object.keys(updates).length === 0) {
            return json({ success: false, message: 'Tidak ada field untuk diupdate' }, { status: 400 });
        }

        await db.update(ecommerceOrders).set(updates).where(eq(ecommerceOrders.id, orderId));

        return json({ success: true, message: 'Status pesanan diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT order status');
        return json({ success: false, message: 'Gagal update pesanan' }, { status: 500 });
    }
}
