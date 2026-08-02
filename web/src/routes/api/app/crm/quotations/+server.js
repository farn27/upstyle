import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmDeals, crmActivities, crmTasks, quotations, quotationItems, salesOrders, salesOrderItems, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET: ?unitId= - fetch quotations with items, ordered by createdAt desc
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    try {
        const data = await db.query.quotations.findMany({
            where: eq(quotations.unitId, Number(unitId)),
            orderBy: [desc(quotations.createdAt)],
            with: {
                items: true
            }
        });

        return json({ success: true, message: 'Berhasil mengambil data quotation', data });
    } catch (err) {
        log.crm.error({ err }, 'API GET QUOTATIONS ERROR');
        return json({ success: false, message: 'Gagal mengambil data quotation: ' + err.message, data: null }, { status: 500 });
    }
}

// POST: Create quotation. Body: { unitId, customerId, validUntil, notes, items: [{productId, qty, price, total}] }
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, customerId, validUntil, notes, items } = body;

        if (!unitId || !validUntil || !Array.isArray(items) || items.length === 0) {
            return json({ success: false, message: 'unitId, validUntil, dan items (min 1) wajib diisi', data: null }, { status: 400 });
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        const random4 = crypto.randomInt(1000, 10000);
        const quotationNumber = `QUO-${dateStr}-${random4}`;

        const totalAmount = items.reduce((sum, item) => {
            const itemTotal = item.total !== undefined ? Number(item.total) : (Number(item.qty || 0) * Number(item.price || 0));
            return sum + itemTotal;
        }, 0);

        let newQuotationId = null;

        await db.transaction(async (tx) => {
            const [qResult] = await tx.insert(quotations).values({
                quotationNumber,
                unitId: Number(unitId),
                customerId: customerId ? Number(customerId) : null,
                totalAmount: String(totalAmount.toFixed(2)),
                status: 'DRAFT',
                validUntil: String(validUntil),
                notes: notes || null
            });

            newQuotationId = qResult.insertId;

            const itemInserts = items.map(item => ({
                quotationId: newQuotationId,
                productId: item.productId ? String(item.productId) : null,
                qty: Number(item.qty || 1),
                price: String(item.price || 0),
                total: String(item.total !== undefined ? item.total : (Number(item.qty || 1) * Number(item.price || 0)))
            }));

            await tx.insert(quotationItems).values(itemInserts);
        });

        return json({
            success: true,
            message: 'Quotation berhasil dibuat',
            data: { id: newQuotationId, quotationNumber }
        });
    } catch (err) {
        log.crm.error({ err }, 'API POST QUOTATIONS ERROR');
        return json({ success: false, message: 'Gagal membuat quotation: ' + err.message, data: null }, { status: 500 });
    }
}

// PUT: Update quotation status. Body: { id, status }.
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return json({ success: false, message: 'id dan status wajib diisi', data: null }, { status: 400 });
        }

        await db.update(quotations)
            .set({ status })
            .where(eq(quotations.id, Number(id)));

        return json({ success: true, message: 'Status quotation berhasil diperbarui', data: null });
    } catch (err) {
        log.crm.error({ err }, 'API PUT QUOTATIONS ERROR');
        return json({ success: false, message: 'Gagal memperbarui status quotation: ' + err.message, data: null }, { status: 500 });
    }
}
