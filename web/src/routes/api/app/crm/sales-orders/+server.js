import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { salesOrders, salesOrderItems, crmContacts, products, riwayatAksi, transaksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const orders = await db.query.salesOrders.findMany({
            where: eq(salesOrders.unitId, Number(unitId)),
            orderBy: [desc(salesOrders.id)],
            with: { customer: true, items: { with: { product: true } } }
        });
        const data = orders.map(o => ({
            id: o.id, unitId: o.unitId, orderNumber: o.orderNumber,
            customerId: o.customerId, customerName: o.customer?.nama || 'Customer',
            totalAmount: Number(o.totalAmount || 0), status: o.status,
            notes: o.notes || '', createdAt: o.createdAt || '',
            items: (o.items || []).map(i => ({
                id: i.id, productId: i.productId, productName: i.product?.nama || '',
                qty: i.qty, price: Number(i.price), total: Number(i.total)
            }))
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET crm/sales-orders');
        return json({ success: false, message: 'Gagal memuat sales orders' }, { status: 500 });
    }
}

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { unitId, customerId, totalAmount, notes, items } = body;
        if (!unitId || !totalAmount) return json({ success: false, message: 'unitId dan totalAmount wajib' }, { status: 400 });

        const orderNumber = `SO-${Date.now()}`;
        const [result] = await db.insert(salesOrders).values({
            orderNumber, unitId: Number(unitId), customerId: customerId || null,
            totalAmount: String(totalAmount), status: 'PENDING',
            notes: notes || null, createdAt: new Date().toISOString()
        });
        const soId = result.insertId;

        if (Array.isArray(items)) {
            for (const item of items) {
                await db.insert(salesOrderItems).values({
                    salesOrderId: soId, productId: item.productId || null,
                    qty: Number(item.qty), price: String(item.price),
                    total: String(Number(item.qty) * Number(item.price))
                });
            }
        }

        // Record as income transaction
        await db.insert(transaksi).values({
            userId, unitId: Number(unitId), kategoriTrx: 'MASUK',
            nominal: String(totalAmount), totalHarga: String(totalAmount),
            keterangan: `Sales Order ${orderNumber}`, metodeBayar: 'TRANSFER'
        });

        await db.insert(riwayatAksi).values({ userId, unitId: Number(unitId), pesan: `Sales Order baru: ${orderNumber}`, kategori: 'CRM', tipe: 'success' });
        return json({ success: true, message: 'Sales order berhasil dibuat', data: { id: soId, orderNumber } });
    } catch (err) {
        log.api.error({ err }, 'POST crm/sales-orders');
        return json({ success: false, message: 'Gagal buat sales order' }, { status: 500 });
    }
}

export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    try {
        const body = await request.json();
        const { orderId, status } = body;
        if (!orderId || !status) return json({ success: false, message: 'orderId dan status wajib' }, { status: 400 });
        await db.update(salesOrders).set({ status }).where(eq(salesOrders.id, Number(orderId)));
        return json({ success: true, message: 'Status diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT crm/sales-orders');
        return json({ success: false, message: 'Gagal update status' }, { status: 500 });
    }
}
