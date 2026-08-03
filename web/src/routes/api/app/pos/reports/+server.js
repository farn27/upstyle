import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posOrderItems, posShifts, products } from '$lib/server/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/pos/reports?unitId=X&shiftId=Y
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    const shiftId = url.searchParams.get('shiftId');

    try {
        let ordersQuery = db.query.posOrders.findMany({
            where: eq(posOrders.unitId, Number(unitId)),
            orderBy: [desc(posOrders.id)],
            with: { items: true }
        });

        const orders = await ordersQuery;

        // Filter by shift if provided
        const filteredOrders = shiftId
            ? orders // would need cashierId / shiftId link, filter by date range for now
            : orders;

        const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
        const totalOrders = filteredOrders.length;
        const averageOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Top products
        const productCounts = {};
        for (const order of filteredOrders) {
            for (const item of order.items || []) {
                const key = item.productId || item.productName;
                if (!productCounts[key]) productCounts[key] = { name: item.productName, qty: 0, revenue: 0 };
                productCounts[key].qty += item.qty || 0;
                productCounts[key].revenue += Number(item.total || 0);
            }
        }
        const topProducts = Object.values(productCounts)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        // Payment method breakdown
        const paymentBreakdown = {};
        for (const order of filteredOrders) {
            const method = order.paymentMethod || 'CASH';
            if (!paymentBreakdown[method]) paymentBreakdown[method] = 0;
            paymentBreakdown[method] += Number(order.total || 0);
        }

        // Shifts report
        const shifts = await db.query.posShifts.findMany({
            where: eq(posShifts.unitId, Number(unitId)),
            orderBy: [desc(posShifts.id)],
            limit: 10
        });

        return json({
            success: true,
            data: {
                summary: {
                    totalRevenue, totalOrders, averageOrder,
                    paidOrders: filteredOrders.filter(o => o.status === 'PAID').length,
                    cancelledOrders: filteredOrders.filter(o => o.status === 'CANCELLED').length
                },
                topProducts,
                paymentBreakdown,
                recentShifts: shifts.map(s => ({
                    id: s.id, status: s.status, waktuBuka: s.waktuBuka || '',
                    waktuTutup: s.waktuTutup || '', modalAwal: Number(s.modalAwal || 0),
                    kasAkhir: Number(s.kasAkhir || 0), kasAkhirAktual: Number(s.kasAkhirAktual || 0),
                    selisih: Number(s.selisih || 0)
                }))
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET pos/reports');
        return json({ success: false, message: 'Gagal memuat laporan POS' }, { status: 500 });
    }
}
