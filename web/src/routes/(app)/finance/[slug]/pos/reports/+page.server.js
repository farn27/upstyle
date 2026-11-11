import { db } from '$lib/server/drizzle';
import { posOrders, posCustomers, posOrderItems } from '$lib/server/schema';
import { eq, and, sql, inArray, desc, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { resolvePosUnitAccess } from '$lib/server/posAuth';

export async function load({ params, cookies, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);
    const unitId = unit.id;

    try {
        const statsRows = await db.select({
            total_sales: sql`COALESCE(SUM(${posOrders.total}), 0)`,
            total_orders: sql`COUNT(*)`,
            average_ticket: sql`COALESCE(AVG(${posOrders.total}), 0)`
        })
        .from(posOrders)
        .where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID')));

        const recentRows = await db.select({
            id: posOrders.id,
            order_number: posOrders.orderNumber,
            tanggal: posOrders.createdAt,
            total: posOrders.total,
            status: posOrders.status,
            payment_method: posOrders.paymentMethod,
            notes: posOrders.notes,
            customer_name: sql`COALESCE(${posCustomers.namaCustomer}, 'Pelanggan Umum')`
        })
        .from(posOrders)
        .leftJoin(posCustomers, eq(posCustomers.id, posOrders.customerId))
        .where(eq(posOrders.unitId, unitId))
        .orderBy(desc(posOrders.createdAt))
        .limit(5);

        const orderIds = recentRows.map(row => row.id);
        let orderItems = [];

        if (orderIds.length > 0) {
            const placeholders = orderIds.map(() => '?').join(',');
            const itemsRows = await db.select({
                id: posOrderItems.id,
                product_id: posOrderItems.productId,
                order_id: posOrderItems.orderId,
                product_name: posOrderItems.productName,
                qty: posOrderItems.qty,
                price: posOrderItems.price,
                total: posOrderItems.total
            })
            .from(posOrderItems)
            .where(inArray(posOrderItems.orderId, orderIds))
            .orderBy(asc(posOrderItems.id));
            orderItems = itemsRows;
        }

        const recentOrders = recentRows.map((order) => ({
            ...order,
            customer: order.customer_name || 'Pelanggan Umum',
            total: Number(order.total) || 0,
            items: orderItems
                .filter(item => Number(item.order_id) === Number(order.id))
                .map(item => ({
                    order_item_id: item.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    qty: Number(item.qty),
                    price: Number(item.price),
                    total: Number(item.total)
                }))
        }));

        const topProductsRows = await db.select({
            product_name: posOrderItems.productName,
            total_qty: sql`SUM(${posOrderItems.qty})`,
            total_revenue: sql`SUM(${posOrderItems.total})`
        })
        .from(posOrderItems)
        .innerJoin(posOrders, eq(posOrders.id, posOrderItems.orderId))
        .where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID')))
        .groupBy(posOrderItems.productName)
        .orderBy(desc(sql`SUM(${posOrderItems.qty})`))
        .limit(5);

        // Tren nyata: 7 hari terakhir vs 7 hari sebelumnya + penjualan harian untuk grafik
        // (dulu angka tren "+12%", "+5%", "-2%", "Naik 15.4%" dan tinggi batang grafik ditulis tetap — F-3)
        const harianRows = await db.select({
            hari: sql`DATE(${posOrders.createdAt})`,
            total: sql`COALESCE(SUM(${posOrders.total}), 0)`,
            jumlah: sql`COUNT(*)`
        })
        .from(posOrders)
        .where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID'), sql`${posOrders.createdAt} >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)`))
        .groupBy(sql`DATE(${posOrders.createdAt})`);

        const peta = new Map(harianRows.map((r) => [String(r.hari).slice(0, 10), { total: Number(r.total) || 0, jumlah: Number(r.jumlah) || 0 }]));
        const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const sekarangWIB = new Date(Date.now() + 7 * 3600_000);
        /** @type {{ tanggal: string, label: string, total: number, jumlah: number }[]} */
        const empatBelasHari = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(sekarangWIB.getTime() - i * 86_400_000);
            const tanggal = d.toISOString().slice(0, 10);
            const v = peta.get(tanggal) || { total: 0, jumlah: 0 };
            empatBelasHari.push({ tanggal, label: NAMA_HARI[d.getUTCDay()], ...v });
        }
        const mingguLalu = empatBelasHari.slice(0, 7);
        const mingguIni = empatBelasHari.slice(7);
        const jumlahkan = (/** @type {typeof mingguIni} */ arr, /** @type {'total' | 'jumlah'} */ k) => arr.reduce((a, b) => a + b[k], 0);
        const persen = (/** @type {number} */ kini, /** @type {number} */ dulu) => (dulu > 0 ? Math.round(((kini - dulu) / dulu) * 1000) / 10 : null);
        const penjualanIni = jumlahkan(mingguIni, 'total');
        const penjualanLalu = jumlahkan(mingguLalu, 'total');
        const orderIni = jumlahkan(mingguIni, 'jumlah');
        const orderLalu = jumlahkan(mingguLalu, 'jumlah');
        const tren = {
            penjualan: persen(penjualanIni, penjualanLalu),
            pesanan: persen(orderIni, orderLalu),
            rataRata: persen(orderIni ? penjualanIni / orderIni : 0, orderLalu ? penjualanLalu / orderLalu : 0),
            penjualanMingguIni: penjualanIni,
            penjualanMingguLalu: penjualanLalu
        };

        return {
            tren,
            grafikMingguan: mingguIni,
            stats: {
                totalSales: Number(statsRows[0]?.total_sales) || 0,
                totalOrders: statsRows[0]?.total_orders || 0,
                averageTicket: Number(statsRows[0]?.average_ticket) || 0,
                topProduct: topProductsRows[0]?.product_name || 'N/A'
            },
            recentOrders,
            topProducts: topProductsRows.map(product => ({
                name: product.product_name,
                quantity: Number(product.total_qty),
                revenue: Number(product.total_revenue)
            }))
        };
    } catch (e) {
        console.error('[POS Reports]', e instanceof Error ? e.message : e);
        throw error(500, 'Gagal memuat laporan kasir. Coba muat ulang halaman.');
    }
}