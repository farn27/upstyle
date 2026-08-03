import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { quotations, quotationItems, crmContacts, products, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

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
