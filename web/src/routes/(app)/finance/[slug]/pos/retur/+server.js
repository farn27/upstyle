import { json, isHttpError } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger';
import { prosesReturPos, ReturError } from '$lib/server/posRetur';

/**
 * POST /finance/[slug]/pos/retur  body: { order_id, items: [{ order_item_id, product_id, qty_returned }], reason }
 * Nominal refund dihitung server (refund_amount kiriman klien diabaikan).
 */
export async function POST({ request, cookies, params, locals }) {
    try {
        const { unit, isStaff, staffSession } = await resolvePosUnitAccess(cookies, params, locals);

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }
        const { order_id, items, reason } = body || {};
        if (!order_id || !Array.isArray(items) || !items.length) {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }

        const hasil = await prosesReturPos(db, {
            unitId: unit.id,
            pemilikId: Number(unit.user_id),
            handledBy: isStaff && staffSession ? `staff:${staffSession.id}` : String(unit.user_id)
        }, {
            orderId: order_id,
            reason,
            items: items.map((/** @type {any} */ i) => ({ orderItemId: i.order_item_id, productId: i.product_id, qty: i.qty_returned }))
        });

        // Sinkron stok & statistik realtime untuk semua yang membuka POS
        try {
            pusherServer.trigger(`unit-${unit.id}`, 'stock-updated', { triggerRefresh: true });
            pusherServer.trigger(`unit-${unit.id}`, 'stats-updated', { triggerRefresh: true });
        } catch (signalErr) {
            log.pos.warn({ err: signalErr.message }, 'Pusher trigger error retur');
        }

        return json({ success: true, returnNumber: hasil.returnNumber, totalRefund: hasil.totalRefund, status: hasil.statusOrder });
    } catch (e) {
        if (e instanceof ReturError) return json({ error: pesanAman(e) }, { status: e.status });
        if (isHttpError(e)) return json({ error: e.body?.message || 'Akses ditolak' }, { status: e.status });
        log.pos.error({ err: e }, 'POS retur gagal');
        return json({ error: 'Retur gagal diproses. Coba lagi.' }, { status: 500 });
    }
}
