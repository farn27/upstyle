import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, quotations, quotationItems, salesOrders, salesOrderItems, crmContacts, products, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { todayStrWIB, nowWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('sales:quotation');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const cacheKey = `sales_quotation:${unit.id}`;
    const cached = await redis.get(cacheKey);

    let quotationList, contactList, productList;
    if (cached) {
        quotationList = cached.quotationList;
        contactList = cached.contactList;
        productList = cached.productList;
    } else {
        [quotationList, contactList, productList] = await Promise.all([
            db.query.quotations.findMany({
                where: eq(quotations.unitId, unit.id),
                orderBy: [desc(quotations.createdAt)],
                with: { customer: true, items: { with: { product: true } } }
            }),
            db.query.crmContacts.findMany({
                where: eq(crmContacts.unitId, unit.id),
                columns: { id: true, nama: true, telepon: true }
            }),
            db.query.products.findMany({
                where: eq(products.unitId, unit.id),
                columns: { id: true, nama: true, hargaJual: true, stok: true }
            })
        ]);
        await redis.set(cacheKey, { quotationList, contactList, productList }, { ex: 180 });
    }

    return { unit, quotationList, contactList, productList };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();

        const customerId = data.get('customer_id') ? Number(data.get('customer_id')) : null;
        const validUntil = String(data.get('valid_until') || todayStrWIB());
        const notes = String(data.get('notes') || '');
        const itemsRaw = String(data.get('items_json') || '[]');

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            const items = JSON.parse(itemsRaw);
            if (!items.length) return fail(400, { error: 'Minimal 1 item produk' });

            const totalAmount = items.reduce((s, i) => s + Number(i.total || 0), 0);
            const quotationNumber = `QUO-${unit.id}-${Date.now()}`;

            await db.transaction(async (tx) => {
                const [result] = await tx.insert(quotations).values({
                    quotationNumber, unitId: unit.id, customerId,
                    totalAmount: String(totalAmount), status: 'DRAFT',
                    validUntil, notes
                });
                const qId = result.insertId;
                for (const item of items) {
                    await tx.insert(quotationItems).values({
                        quotationId: qId,
                        productId: item.product_id || null,
                        productName: item.product_name || 'Item',
                        qty: Number(item.qty),
                        price: String(item.price),
                        total: String(item.total)
                    });
                }
            });
            await redis.del(`sales_quotation:${unit.id}`);
            pusherServer.trigger(`sales-${slug}`, 'quotation-created', {}).catch(() => {});
            return { success: true };
        } catch (err) {
            console.error(err);
            return fail(500, { error: 'Gagal buat penawaran: ' + err.message });
        }
    },

    updateStatus: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const qId = Number(data.get('quotation_id'));
        const status = String(data.get('status'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.update(quotations).set({ status }).where(and(eq(quotations.id, qId), eq(quotations.unitId, unit.id)));
            await redis.del(`sales_quotation:${unit.id}`);
            pusherServer.trigger(`sales-${slug}`, 'quotation-updated', { qId, status }).catch(() => {});
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal update status' });
        }
    },

    // ─── CONVERT QUOTATION → SALES ORDER ─────────────────────────────────────
    convertToOrder: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const qId = Number(data.get('quotation_id'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            const q = await db.query.quotations.findFirst({
                where: and(eq(quotations.id, qId), eq(quotations.unitId, unit.id)),
                with: { items: true }
            });
            if (!q) return fail(404, { error: 'Quotation tidak ditemukan' });
            if (q.status !== 'ACCEPTED') return fail(400, { error: 'Hanya quotation ACCEPTED yang bisa dikonversi' });

            let soId;
            await db.transaction(async (tx) => {
                const orderNumber = `SO-${unit.id}-${Date.now()}`;
                const [res] = await tx.insert(salesOrders).values({
                    orderNumber,
                    unitId: unit.id,
                    customerId: q.customerId,
                    totalAmount: q.totalAmount,
                    status: 'PENDING',
                    notes: `Dari Quotation #${q.quotationNumber}`
                });
                soId = res.insertId;

                for (const item of q.items) {
                    await tx.insert(salesOrderItems).values({
                        salesOrderId: soId,
                        productId: item.productId,
                        productName: item.productName || 'Item',
                        qty: item.qty,
                        price: item.price,
                        total: item.total
                    });
                }

                await tx.update(quotations)
                    .set({ status: 'ACCEPTED' })
                    .where(eq(quotations.id, qId));

                await tx.insert(riwayatAksi).values({
                    userId,
                    unitId: unit.id,
                    pesan: `Quotation #${q.quotationNumber} → Sales Order #${orderNumber}`,
                    tipe: 'success',
                    kategori: 'SALES',
                    link: `/ecommerce/${slug}/sales/order`
                });
            });

            await redis.del(`sales_quotation:${unit.id}`);
            const soKeys = await redis.keys(`sales_orders:${unit.id}:*`);
            if (soKeys.length) await redis.del(...soKeys);
            pusherServer.trigger(`sales-${slug}`, 'order-created', { soId }).catch(() => {});

            return { success: true, message: `Sales Order berhasil dibuat dari Quotation!`, soId };
        } catch (err) {
            console.error('[Convert Quotation]', err);
            return fail(500, { error: 'Gagal konversi: ' + err.message });
        }
    }
};
