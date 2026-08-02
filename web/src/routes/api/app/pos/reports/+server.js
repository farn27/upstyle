import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posOrders, posShifts } from '$lib/server/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch POS report for unitId (shift detail or 30 days summary)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    const shiftId = url.searchParams.get('shiftId');

    try {
        if (shiftId) {
            // Fetch shift details
            const shift = await db.query.posShifts.findFirst({
                where: and(eq(posShifts.id, Number(shiftId)), eq(posShifts.unitId, Number(unitId)))
            });

            if (!shift) {
                return json({ success: false, message: "Shift tidak ditemukan" }, { status: 404 });
            }

            // Build conditions to filter orders in shift timeframe
            const orderConditions = [eq(posOrders.unitId, Number(unitId))];
            if (shift.waktuBuka) {
                orderConditions.push(gte(posOrders.createdAt, shift.waktuBuka));
            }
            if (shift.waktuTutup) {
                orderConditions.push(lte(posOrders.createdAt, shift.waktuTutup));
            }

            const ordersList = await db.query.posOrders.findMany({
                where: and(...orderConditions),
                orderBy: [desc(posOrders.id)]
            });

            const totalSales = ordersList.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalTransactions = ordersList.length;

            return json({
                success: true,
                message: "Berhasil mengambil laporan shift POS",
                data: {
                    shift,
                    orders: ordersList,
                    totalSales,
                    totalTransactions
                }
            });
        } else {
            // Last 30 days summary
            const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 19)
                .replace('T', ' ');

            const recentOrders = await db.query.posOrders.findMany({
                where: and(
                    eq(posOrders.unitId, Number(unitId)),
                    gte(posOrders.createdAt, thirtyDaysAgoStr)
                ),
                orderBy: [desc(posOrders.id)]
            });

            const totalRevenue = recentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalOrders = recentOrders.length;

            const recentShifts = await db.query.posShifts.findMany({
                where: eq(posShifts.unitId, Number(unitId)),
                orderBy: [desc(posShifts.id)],
                limit: 20
            });

            return json({
                success: true,
                message: "Berhasil mengambil ringkasan laporan POS 30 hari",
                data: {
                    totalRevenue,
                    totalOrders,
                    recentShifts
                }
            });
        }
    } catch (err) {
        log.pos.error({ err }, 'API GET POS REPORTS ERROR');
        return json({ success: false, message: "Gagal mengambil laporan POS" }, { status: 500 });
    }
}
