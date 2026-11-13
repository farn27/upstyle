import { json, isHttpError } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { log } from '$lib/server/logger.js';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { prosesCheckoutPos, siarkanCheckoutPos, PosError } from '$lib/server/posCheckout';
import { ambilProfilPos } from '$lib/server/posProfil';
import { siapkanCheckoutProfil } from '$lib/server/posResto';

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
        const { cart, bill_id, bill_versi, isian, payment_method, payments, amount_paid, keterangan, customer_id, customer_name, voucher_id, discount_value, order_type, table_number, queue_number, kenai_ppn, ppn_inklusif } = body || {};

        const unit = {
            id: akses.unit.id,
            slug: akses.unit.slug,
            userId: Number(akses.unit.user_id),
            kategori: akses.unit.kategori,
            posFeatureOverride: akses.unit.posFeatureOverride
        };

        const itemsKlien = (Array.isArray(cart) ? cart : []).map((/** @type {any} */ i) => ({
            productId: String(i?.id ?? ''),
            variantId: i?.variantId ? String(i.variantId) : null,
            qty: Number(i?.qty),
            harga: i?.harga_jual ?? i?.harga ?? null,
            nama: i?.nama || null,
            catatan: i?.catatan || ''
        }));

        // Unit dengan profil kasir: bill, antrean otomatis, isian khas, tiket dapur, servis & PB1.
        // Unit tanpa profil (unit lama) → semua nilai kosong, checkout sama persis seperti sebelumnya.
        const profil = await ambilProfilPos(db, unit.id);
        const ekstra = await siapkanCheckoutProfil(db, unit.id, profil, {
            billId: bill_id ? Number(bill_id) : null,
            billVersi: bill_versi ?? null,
            isian: isian && typeof isian === 'object' ? isian : null,
            queueNumber: queue_number || null,
            tableNumber: table_number || null,
            customerName: customer_name || null,
            items: itemsKlien
        });

        const hasil = await prosesCheckoutPos(db, {
            unit,
            kasirPemilik: Boolean(akses.isOwner),
            namaKasir: akses.isStaff ? (akses.staffSession?.full_name || 'Kasir') : null,
            pengaturanPos: ekstra.pengaturanPos,
            setelahOrder: ekstra.setelahOrder
        }, {
            items: ekstra.items || itemsKlien,
            customerId: customer_id ? Number(customer_id) : null,
            customerName: customer_name,
            voucherId: voucher_id ? Number(voucher_id) : null,
            diskonManual: discount_value,
            paymentMethod: payment_method,
            payments: Array.isArray(payments) ? payments : null,
            amountPaid: amount_paid,
            orderType: ekstra.orderType || order_type,
            tableNumber: ekstra.tableNumber ?? table_number,
            queueNumber: ekstra.queueNumber ?? queue_number,
            notes: [ekstra.catatanTambahan, keterangan].filter(Boolean).join(' | '),
            kenaiPpn: kenai_ppn === true,
            ppnInklusif: ppn_inklusif === true
        });

        await siarkanCheckoutPos(unit, hasil);

        return json({
            success: true,
            message: 'Transaksi berhasil!',
            orderNumber: hasil.orderNumber,
            orderId: hasil.orderId,
            subtotal: hasil.subtotal,
            discount: hasil.discount,
            servis: hasil.servis,
            pajakResto: hasil.pajakResto,
            queueNumber: ekstra.queueNumber ?? queue_number ?? null,
            total: hasil.total,
            paid: hasil.paid,
            change: hasil.change
        });
    } catch (err) {
        if (err instanceof PosError) return json({ error: pesanAman(err) }, { status: err.status });
        if (isHttpError(err)) return json({ error: err.body?.message || 'Akses ditolak' }, { status: err.status });
        log.pos.error({ err: err instanceof Error ? err.message : String(err) }, 'POS transaction error');
        return json({ error: 'Transaksi gagal diproses. Coba lagi.' }, { status: 500 });
    }
}
