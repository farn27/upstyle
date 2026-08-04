import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { transaksi, journalEntries, journalEntryLines, chartOfAccounts } from '$lib/server/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) {
        return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const unitIdStr = url.searchParams.get('unitId');
    if (!unitIdStr) {
        return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
    }

    const unitId = Number(unitIdStr);
    if (isNaN(unitId)) {
        return json({ success: false, message: 'unitId tidak valid' }, { status: 400 });
    }

    const type = url.searchParams.get('type') || 'summary';
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    try {
        if (type === 'laba-rugi') {
            const whereConditions = [eq(transaksi.unitId, unitId)];
            if (start && end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) BETWEEN ${start} AND ${end}`);
            } else if (start) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) >= ${start}`);
            } else if (end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) <= ${end}`);
            }

            const [agg] = await db.select({
                totalPendapatan: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
                totalPengeluaran: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
            })
            .from(transaksi)
            .where(and(...whereConditions));

            const totalPendapatan = Number(agg?.totalPendapatan || 0);
            const totalPengeluaran = Number(agg?.totalPengeluaran || 0);
            const labaKotor = totalPendapatan - totalPengeluaran;
            const labaPersentase = totalPendapatan > 0 ? Number(((labaKotor / totalPendapatan) * 100).toFixed(2)) : 0;

            const transactions = await db.select()
                .from(transaksi)
                .where(and(...whereConditions))
                .orderBy(desc(transaksi.tanggal), desc(transaksi.id));

            return json({
                success: true,
                data: {
                    totalPendapatan,
                    totalPengeluaran,
                    labaKotor,
                    labaPersentase,
                    transactions: transactions.map(t => ({
                        ...t,
                        nominal: Number(t.nominal || 0)
                    }))
                }
            });
        }

        if (type === 'arus-kas') {
            const whereConditions = [eq(transaksi.unitId, unitId)];
            if (start && end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) BETWEEN ${start} AND ${end}`);
            } else if (start) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) >= ${start}`);
            } else if (end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) <= ${end}`);
            }

            const grouped = await db.select({
                period: sql`DATE_FORMAT(${transaksi.tanggal}, '%Y-%m')`,
                kategoriTrx: transaksi.kategoriTrx,
                total: sql`COALESCE(SUM(${transaksi.nominal}), 0)`
            })
            .from(transaksi)
            .where(and(...whereConditions))
            .groupBy(sql`DATE_FORMAT(${transaksi.tanggal}, '%Y-%m')`, transaksi.kategoriTrx)
            .orderBy(sql`DATE_FORMAT(${transaksi.tanggal}, '%Y-%m')`);

            const periodMap = {};
            for (const row of grouped) {
                const p = row.period || 'Unknown';
                if (!periodMap[p]) {
                    periodMap[p] = { period: p, masuk: 0, keluar: 0 };
                }
                const val = Number(row.total || 0);
                if (row.kategoriTrx === 'MASUK') {
                    periodMap[p].masuk += val;
                } else if (row.kategoriTrx === 'KELUAR') {
                    periodMap[p].keluar += val;
                }
            }

            const sortedPeriods = Object.keys(periodMap).sort();
            const masuk = sortedPeriods.map(p => ({ period: p, total: periodMap[p].masuk, amount: periodMap[p].masuk }));
            const keluar = sortedPeriods.map(p => ({ period: p, total: periodMap[p].keluar, amount: periodMap[p].keluar }));

            const totalMasuk = masuk.reduce((acc, curr) => acc + curr.total, 0);
            const totalKeluar = keluar.reduce((acc, curr) => acc + curr.total, 0);
            const netFlow = totalMasuk - totalKeluar;

            return json({
                success: true,
                data: {
                    masuk,
                    keluar,
                    netFlow
                }
            });
        }

        if (type === 'neraca') {
            // Balance Sheet - Assets, Liabilities, Equity
            const whereConditions = [eq(transaksi.unitId, unitId)];
            if (start && end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) BETWEEN ${start} AND ${end}`);
            } else if (start) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) >= ${start}`);
            } else if (end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) <= ${end}`);
            }

            const [agg] = await db.select({
                totalPendapatan: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
                totalPengeluaran: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
            })
            .from(transaksi)
            .where(and(...whereConditions));

            const totalAset = Number(agg?.totalPendapatan || 0);
            const totalLiabilitas = Number(agg?.totalPengeluaran || 0);
            const totalEkuitas = totalAset - totalLiabilitas;

            // Breakdown by category
            const categoryBreakdown = await db.select({
                kategori: transaksi.kategori,
                kategoriTrx: transaksi.kategoriTrx,
                total: sql`COALESCE(SUM(${transaksi.nominal}), 0)`
            })
            .from(transaksi)
            .where(and(...whereConditions))
            .groupBy(transaksi.kategori, transaksi.kategoriTrx);

            const aset = [];
            const liabilitas = [];
            
            for (const row of categoryBreakdown) {
                const item = {
                    kategori: row.kategori || 'Lain-lain',
                    total: Number(row.total || 0)
                };
                
                if (row.kategoriTrx === 'MASUK') {
                    aset.push(item);
                } else if (row.kategoriTrx === 'KELUAR') {
                    liabilitas.push(item);
                }
            }

            return json({
                success: true,
                data: {
                    totalAset,
                    totalLiabilitas,
                    totalEkuitas,
                    aset,
                    liabilitas
                }
            });
        }

        if (type === 'analytics') {
            const whereConditions = [eq(transaksi.unitId, unitId)];
            let daysCount = 30;

            if (start && end) {
                whereConditions.push(sql`DATE(${transaksi.tanggal}) BETWEEN ${start} AND ${end}`);
                const startDateObj = new Date(start);
                const endDateObj = new Date(end);
                const diffTime = Math.abs(endDateObj - startDateObj);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                if (diffDays > 0) daysCount = diffDays;
            } else {
                whereConditions.push(sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
            }

            const [analyticsRow] = await db.select({
                totalRevenue30d: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
                totalExpense30d: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
            })
            .from(transaksi)
            .where(and(...whereConditions));

            const totalRevenue30d = Number(analyticsRow?.totalRevenue30d || 0);
            const totalExpense30d = Number(analyticsRow?.totalExpense30d || 0);
            const netProfit30d = totalRevenue30d - totalExpense30d;
            const avgDailyRevenue = Number((totalRevenue30d / daysCount).toFixed(2));

            return json({
                success: true,
                data: {
                    avgDailyRevenue,
                    totalRevenue30d,
                    totalExpense30d,
                    netProfit30d,
                    daysCount
                }
            });
        }

        // Default or type === 'summary'
        const whereConditions = [eq(transaksi.unitId, unitId)];
        if (start && end) {
            whereConditions.push(sql`DATE(${transaksi.tanggal}) BETWEEN ${start} AND ${end}`);
        } else if (start) {
            whereConditions.push(sql`DATE(${transaksi.tanggal}) >= ${start}`);
        } else if (end) {
            whereConditions.push(sql`DATE(${transaksi.tanggal}) <= ${end}`);
        }

        const [summaryRow] = await db.select({
            totalMasuk: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            totalKeluar: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
        })
        .from(transaksi)
        .where(and(...whereConditions));

        const [last30Row] = await db.select({
            last30dMasuk: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            last30dKeluar: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`
        })
        .from(transaksi)
        .where(and(
            eq(transaksi.unitId, unitId),
            sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
        ));

        const totalMasuk = Number(summaryRow?.totalMasuk || 0);
        const totalKeluar = Number(summaryRow?.totalKeluar || 0);
        const saldo = totalMasuk - totalKeluar;
        const last30dMasuk = Number(last30Row?.last30dMasuk || 0);
        const last30dKeluar = Number(last30Row?.last30dKeluar || 0);

        return json({
            success: true,
            data: {
                totalMasuk,
                totalKeluar,
                saldo,
                last30dMasuk,
                last30dKeluar
            }
        });

    } catch (err) {
        log.finance.error({ err }, 'API GET LAPORAN FINANCE ERROR');
        return json({ success: false, message: 'Gagal mengambil data laporan: ' + err.message }, { status: 500 });
    }
}
