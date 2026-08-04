import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { quotations, quotationItems, crmContacts, products, riwayatAksi, posOrders, posOrderItems } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const quos = await db.query.quotations.findMany({
            where: eq(quotations.unitId, Number(unitId)),
            orderBy: [desc(quotations.id)],
            with: { customer: true, items: { with: { product: true } } }
        });
        const data = quos.map(q => ({
            id: q.id, unitId: q.unitId, quotationNumber: q.quotationNumber,
            customerId: q.customerId, customerName: q.customer?.nama || 'Customer',
            totalAmount: Number(q.totalAmount || 0), status: q.status,
            validUntil: q.validUntil, notes: q.notes || '', createdAt: q.createdAt || '',
            items: (q.items || []).map(i => ({
                id: i.id, productId: i.productId, productName: i.product?.nama || '',
                qty: i.qty, price: Number(i.price), total: Number(i.total)
            }))
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
        const { unitId, customerId, totalAmount, validUntil, notes, items } = body;
        if (!unitId || !totalAmount) return json({ success: false, message: 'unitId dan totalAmount wajib' }, { status: 400 });

        const quotationNumber = `QUO-${Date.now()}`;
        const [result] = await db.insert(quotations).values({
            quotationNumber, unitId: Number(unitId), customerId: customerId || null,
            totalAmount: String(totalAmount), status: 'DRAFT',
            validUntil: validUntil || new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
            notes: notes || null, createdAt: new Date().toISOString()
        });
        const quoId = result.insertId;

        if (Array.isArray(items)) {
            for (const item of items) {
                await db.insert(quotationItems).values({
                    quotationId: quoId, productId: item.productId || null,
                    qty: Number(item.qty), price: String(item.price), total: String(Number(item.qty) * Number(item.price))
                });
            }
        }
        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Penawaran baru: ${quotationNumber}`, kategori: 'CRM', tipe: 'success' });
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
            // Validation schema
            const schema = z.object({
                action: z.literal('convert-to-order'),
                quotationId: z.coerce.number().int().positive(),
                unitId: z.coerce.number().int().positive(),
                orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).default('TAKEAWAY'),
                paymentMethod: z.string().default('CASH')
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { orderType, paymentMethod } = body;

            // Get quotation with items
            const quotation = await db.query.quotations.findFirst({
                where: eq(quotations.id, Number(quotationId)),
                with: {
                    items: {
                        with: { product: true }
                    },
                    customer: true
                }
            });

            if (!quotation) {
                return json({ success: false, message: 'Quotation tidak ditemukan' }, { status: 404 });
            }

            if (quotation.status === 'CONVERTED') {
                return json({ success: false, message: 'Quotation sudah dikonversi' }, { status: 400 });
            }

            let newOrderId = null;
            await db.transaction(async (tx) => {
                // Create POS order
                const orderNumber = `ORD-${Date.now()}`;
                const [orderResult] = await tx.insert(posOrders).values({
                    orderNumber,
                    unitId: Number(unitId),
                    customerId: quotation.customerId,
                    createdBy: userId,
                    subtotal: quotation.totalAmount,
                    discount: '0',
                    total: quotation.totalAmount,
                    paymentMethod: paymentMethod || 'CASH',
                    status: 'PENDING',
                    orderType: orderType || 'TAKEAWAY',
                    fulfillmentStatus: 'PENDING',
                    notes: `Converted from quotation: ${quotation.quotationNumber}`
                });

                newOrderId = orderResult.insertId;

                // Create order items
                for (const item of quotation.items) {
                    await tx.insert(posOrderItems).values({
                        orderId: newOrderId,
                        productId: item.productId,
                        productName: item.product?.nama || 'Product',
                        qty: item.qty,
                        price: item.price,
                        total: item.total,
                        costTotal: String(Number(item.product?.hargaBeli || 0) * item.qty)
                    });
                }

                // Update quotation status
                await tx.update(quotations)
                    .set({ 
                        status: 'CONVERTED'
                    })
                    .where(eq(quotations.id, Number(quotationId)));

                // Log action
                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: Number(unitId),
                    pesan: `Quotation ${quotation.quotationNumber} dikonversi menjadi order ${orderNumber}`,
                    kategori: 'CRM',
                    tipe: 'success'
                });
            });

            return json({ 
                success: true, 
                message: 'Quotation berhasil dikonversi menjadi order',
                data: { orderId: newOrderId }
            });
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

            await db.update(quotations)
                .set({ status })
                .where(eq(quotations.id, Number(quotationId)));

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
