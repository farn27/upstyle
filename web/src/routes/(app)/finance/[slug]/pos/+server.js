import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { log } from '$lib/server/logger.js';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { prosesCheckoutPos, siarkanCheckoutPos, PosError } from '$lib/server/posCheckout';

/** POST /finance/[slug]/pos — checkout kasir web. Logika ada di lib/server/posCheckout.js (dipakai juga oleh app mobile). */
export async function POST({ request, cookies, params, locals }) {
    try {
        // Pemilik unit atau staf portal unit ini (404/403 kalau bukan)
        const akses = await resolvePosUnitAccess(cookies, params, locals);

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }
        const { cart, payment_method, payments, amount_paid, keterangan, customer_id, customer_name, voucher_id, discount_value, order_type, table_number, queue_number } = body || {};

        const unit = {
            id: akses.unit.id,
            slug: akses.unit.slug,
            userId: Number(akses.unit.user_id),
            kategori: akses.unit.kategori,
            posFeatureOverride: akses.unit.posFeatureOverride
        };

        const hasil = await prosesCheckoutPos(db, {
            unit,
            kasirPemilik: Boolean(akses.isOwner),
            namaKasir: akses.isStaff ? (akses.staffSession?.full_name || 'Kasir') : null
        }, {
            items: (Array.isArray(cart) ? cart : []).map((/** @type {any} */ i) => ({
                productId: String(i?.id ?? ''),
                variantId: i?.variantId ? String(i.variantId) : null,
                qty: Number(i?.qty),
                harga: i?.harga_jual ?? i?.harga ?? null,
                nama: i?.nama || null
            })),
            customerId: customer_id ? Number(customer_id) : null,
            customerName: customer_name,
            voucherId: voucher_id ? Number(voucher_id) : null,
            diskonManual: discount_value,
            paymentMethod: payment_method,
            payments: Array.isArray(payments) ? payments : null,
            amountPaid: amount_paid,
            orderType: order_type,
            tableNumber: table_number,
            queueNumber: queue_number,
            notes: keterangan
        });

        await siarkanCheckoutPos(unit, hasil);

        return json({
            success: true,
            message: 'Transaksi berhasil!',
            orderNumber: hasil.orderNumber,
            orderId: hasil.orderId,
            subtotal: hasil.subtotal,
            discount: hasil.discount,
            total: hasil.total,
            paid: hasil.paid,
            change: hasil.change
        });
    } catch (err) {
        if (err instanceof PosError) return json({ error: err.message }, { status: err.status });
        if (isHttpError(err)) return json({ error: err.body?.message || 'Akses ditolak' }, { status: err.status });
        log.pos.error({ err: err instanceof Error ? err.message : String(err) }, 'POS transaction error');
        return json({ error: 'Transaksi gagal diproses. Coba lagi.' }, { status: 500 });
    }
}
