import { json } from '@sveltejs/kit';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { db } from '$lib/server/drizzle';
import { salesOrders, salesOrderItems, crmContacts, products, riwayatAksi } from '$lib/server/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { log } from '$lib/server/logger';
import { siapkanItem, pelangganValid } from '$lib/server/penjualanItem';

const STATUS_SO = ['DRAFT', 'PENDING', 'PROCESSING', 'SHIPPED', 'CLOSED', 'CANCELLED'];

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
    try {
        const orders = await db.select().from(salesOrders).where(eq(salesOrders.unitId, Number(unitId))).orderBy(desc(salesOrders.id)).limit(200);
        const idK = [...new Set(orders.map((o) => o.customerId).filter((x) => x != null))];
        const kontak = idK.length ? await db.select().from(crmContacts).where(inArray(crmContacts.id, /** @type {number[]} */ (idK))) : [];
        const petaK = new Map(kontak.map((c) => [c.id, c.nama]));
        const idO = orders.map((o) => o.id);
        const semuaItem = idO.length ? await db.select().from(salesOrderItems).where(inArray(salesOrderItems.salesOrderId, idO)) : [];
        const idP = [...new Set(semuaItem.map((i) => i.productId).filter(Boolean))];
        const prod = idP.length ? await db.select({ id: products.id, nama: products.nama }).from(products).where(inArray(products.id, /** @type {string[]} */ (idP))) : [];
        const petaP = new Map(prod.map((p) => [p.id, p.nama]));
        const perO = new Map();
        for (const i of semuaItem) {
            const a = perO.get(i.salesOrderId) || [];
            a.push({ id: i.id, productId: i.productId, productName: petaP.get(i.productId) || '', qty: i.qty, price: Number(i.price), total: Number(i.total) });
            perO.set(i.salesOrderId, a);
        }
        const data = orders.map((o) => ({
            id: o.id, unitId: o.unitId, orderNumber: o.orderNumber,
            customerId: o.customerId, customerName: (o.customerId != null && petaK.get(o.customerId)) || '',
            totalAmount: Number(o.totalAmount || 0), status: o.status,
            notes: o.notes || '', createdAt: o.createdAt || '',
            items: perO.get(o.id) || []
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
        const { customerId, notes, items } = body;
        const unitId = Number(body.unitId);
        if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
        if (!(await pelangganValid(unitId, customerId))) return json({ success: false, message: 'Pelanggan tidak ditemukan di unit ini' }, { status: 404 });
        const siap = await siapkanItem(unitId, items);
        if (siap.error) return json({ success: false, message: siap.error }, { status: 400 });

        const orderNumber = `SO-${unitId}-${Date.now()}`;
        let soId = 0;
        // Catatan: sales order belum mencatat pemasukan — uang baru masuk saat dibayar (sama dengan web).
        await db.transaction(async (tx) => {
            const [result] = await tx.insert(salesOrders).values({
                orderNumber, unitId, customerId: customerId ? Number(customerId) : null,
                totalAmount: String(siap.total), status: 'PENDING', notes: notes || null, createdAt: nowSqlWIB()
            });
            soId = result.insertId;
            for (const r of siap.rows || []) {
                await tx.insert(salesOrderItems).values({ salesOrderId: soId, productId: r.productId, qty: r.qty, price: String(r.price), total: String(r.total) });
            }
            await tx.insert(riwayatAksi).values({ userId, unitId, pesan: `Sales Order baru: ${orderNumber}`, kategori: 'CRM', tipe: 'success' });
        });
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
        if (!STATUS_SO.includes(status)) return json({ success: false, message: `Status harus salah satu dari ${STATUS_SO.join(', ')}` }, { status: 400 });
        const order = await db.query.salesOrders.findFirst({ where: eq(salesOrders.id, Number(orderId)) });
        if (!order || !(await unitMilikUser(db, userId, order.unitId))) {
            return json({ success: false, message: 'Sales order tidak ditemukan' }, { status: 404 });
        }
        await db.update(salesOrders).set({ status }).where(eq(salesOrders.id, Number(orderId)));
        await db.insert(riwayatAksi).values({ userId, unitId: order.unitId, pesan: `Sales order ${order.orderNumber} → ${status}`, kategori: 'CRM', tipe: 'info' }).catch(() => {});
        return json({ success: true, message: 'Status diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT crm/sales-orders');
        return json({ success: false, message: 'Gagal update status' }, { status: 500 });
    }
}
