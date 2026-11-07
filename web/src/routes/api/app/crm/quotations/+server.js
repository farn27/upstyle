import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { quotations, quotationItems, crmContacts, products, riwayatAksi, salesOrders, salesOrderItems } from '$lib/server/schema';
import { eq, and, desc, inArray, like } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { siapkanItem, pelangganValid } from '$lib/server/penjualanItem';
import { tanggalWIBPlusHari, nowSqlWIB } from '$lib/server/dateUtils';

/** Baris item (penawaran / sales order) beserta nama produknya — tanpa LATERAL JOIN. */
async function itemDenganProduk(rows) {
    const ids = [...new Set(rows.map((i) => i.productId).filter(Boolean))];
    const prod = ids.length ? await db.select({ id: products.id, nama: products.nama }).from(products).where(inArray(products.id, ids)) : [];
    const peta = new Map(prod.map((p) => [p.id, p.nama]));
    return rows.map((i) => ({
        id: i.id, productId: i.productId, productName: peta.get(i.productId) || '',
        qty: i.qty, price: Number(i.price), total: Number(i.total)
    }));
}

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const quos = await db.select().from(quotations).where(eq(quotations.unitId, Number(unitId))).orderBy(desc(quotations.id)).limit(200);
        const idK = [...new Set(quos.map((q) => q.customerId).filter((x) => x != null))];
        const kontak = idK.length ? await db.select().from(crmContacts).where(inArray(crmContacts.id, /** @type {number[]} */ (idK))) : [];
        const petaK = new Map(kontak.map((c) => [c.id, c.nama]));
        const idQ = quos.map((q) => q.id);
        const semuaItem = idQ.length ? await db.select().from(quotationItems).where(inArray(quotationItems.quotationId, idQ)) : [];
        const itemUI = await itemDenganProduk(semuaItem);
        const perQ = new Map();
        semuaItem.forEach((r, i) => { const a = perQ.get(r.quotationId) || []; a.push(itemUI[i]); perQ.set(r.quotationId, a); });
        const data = quos.map((q) => ({
            id: q.id, unitId: q.unitId, quotationNumber: q.quotationNumber,
            customerId: q.customerId, customerName: (q.customerId != null && petaK.get(q.customerId)) || '',
            totalAmount: Number(q.totalAmount || 0), status: q.status,
            validUntil: q.validUntil, notes: q.notes || '', createdAt: q.createdAt || '',
            items: perQ.get(q.id) || []
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET crm/quotations');
        return json({ success: false, message: 'Gagal memuat penawaran' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { customerId, validUntil, notes, items } = body;
        const unitId = Number(body.unitId);
        if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
        if (!(await pelangganValid(unitId, customerId))) return json({ success: false, message: 'Pelanggan tidak ditemukan di unit ini' }, { status: 404 });
        const siap = await siapkanItem(unitId, items);
        if (siap.error) return json({ success: false, message: siap.error }, { status: 400 });
        if (validUntil && !/^\d{4}-\d{2}-\d{2}/.test(String(validUntil))) return json({ success: false, message: 'Format tanggal berlaku harus YYYY-MM-DD' }, { status: 400 });

        const quotationNumber = `QUO-${unitId}-${Date.now()}`;
        let quoId = 0;
        await db.transaction(async (tx) => {
            const [result] = await tx.insert(quotations).values({
                quotationNumber, unitId, customerId: customerId ? Number(customerId) : null,
                totalAmount: String(siap.total), status: 'DRAFT',
                validUntil: validUntil ? String(validUntil).slice(0, 10) : tanggalWIBPlusHari(7),
                notes: notes || null, createdAt: nowSqlWIB()
            });
            quoId = result.insertId;
            for (const r of siap.rows || []) {
                await tx.insert(quotationItems).values({ quotationId: quoId, productId: r.productId, qty: r.qty, price: String(r.price), total: String(r.total) });
            }
            await tx.insert(riwayatAksi).values({ userId, unitId, pesan: `Penawaran baru: ${quotationNumber}`, kategori: 'CRM', tipe: 'success' });
        });
        return json({ success: true, message: 'Penawaran berhasil dibuat', data: { id: quoId, quotationNumber } });
    } catch (err) {
        log.api.error({ err }, 'POST crm/quotations');
        return json({ success: false, message: 'Gagal buat penawaran' }, { status: 500 });
    }
}

export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { action, quotationId, unitId } = body;

        if (action === 'convert-to-order') {
            const schema = z.object({
                action: z.literal('convert-to-order'),
                quotationId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive()
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                return json({ success: false, message: parsed.error?.issues?.[0]?.message || 'Input tidak valid' }, { status: 400 });
            }

            const quotation = await db.query.quotations.findFirst({
                where: and(eq(quotations.id, Number(quotationId)), eq(quotations.unitId, Number(unitId)))
            });
            if (!quotation) return json({ success: false, message: 'Quotation tidak ditemukan' }, { status: 404 });
            // Sama dengan web: hanya penawaran yang sudah DITERIMA pelanggan yang bisa jadi sales order.
            if (quotation.status !== 'ACCEPTED') {
                return json({ success: false, message: 'Hanya penawaran berstatus ACCEPTED yang bisa dijadikan sales order' }, { status: 400 });
            }
            const penanda = `Dari Quotation #${quotation.quotationNumber}`;
            const sudah = await db.query.salesOrders.findFirst({ where: and(eq(salesOrders.unitId, Number(unitId)), like(salesOrders.notes, `${penanda}%`)), columns: { id: true, orderNumber: true } });
            if (sudah) return json({ success: false, message: `Penawaran ini sudah dijadikan sales order ${sudah.orderNumber}` }, { status: 400 });

            const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotation.id));
            let soId = 0;
            const orderNumber = `SO-${Number(unitId)}-${Date.now()}`;
            await db.transaction(async (tx) => {
                const [res] = await tx.insert(salesOrders).values({
                    orderNumber, unitId: Number(unitId), customerId: quotation.customerId,
                    totalAmount: quotation.totalAmount, status: 'PENDING', notes: penanda, createdAt: nowSqlWIB()
                });
                soId = res.insertId;
                for (const it of items) {
                    await tx.insert(salesOrderItems).values({ salesOrderId: soId, productId: it.productId, qty: it.qty, price: it.price, total: it.total });
                }
                await tx.insert(riwayatAksi).values({
                    userId, unitId: Number(unitId),
                    pesan: `Quotation ${quotation.quotationNumber} dijadikan sales order ${orderNumber}`, kategori: 'CRM', tipe: 'success'
                });
            });
            return json({ success: true, message: 'Sales order berhasil dibuat dari penawaran', data: { orderId: soId, orderNumber } });
        }

        if (action === 'update-status') {
            const schema = z.object({
                action: z.literal('update-status'),
                quotationId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { status } = body;

            const [hasil] = await db.update(quotations)
                .set({ status })
                .where(and(eq(quotations.id, Number(quotationId)), eq(quotations.unitId, Number(unitId))));
            if (!hasil?.affectedRows) {
                return json({ success: false, message: 'Quotation tidak ditemukan' }, { status: 404 });
            }

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Status quotation diubah ke ${status}`,
                kategori: 'CRM',
                tipe: 'info'
            });

            return json({ success: true, message: `Status berhasil diubah ke ${status}` });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT crm/quotations');
        return json({ success: false, message: 'Gagal memproses quotation' }, { status: 500 });
    }
}
