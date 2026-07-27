import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis, products, abcCategories, riwayatAksi, receivables, payables, chartOfAccounts, journalEntryLines, journalEntries } from '$lib/server/schema';
import { eq, and, desc, sql, lte, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { getCurrentUserId } from '$lib/server/getUser';
import { buildStrategicBI } from '$lib/server/strategicBI';
import { todayStrWIB } from '$lib/server/dateUtils';

export const load = async ({ params, url, depends, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const startDate = url.searchParams.get('start') || "all"; 
    const endDate = url.searchParams.get('end') || "all"; 

    // --- STRATEGI CACHE: Unik per User, Unit, dan Filter Tanggal ---
    const cacheKey = `finance_dash_v4:${userId}:${slug}:${startDate}:${endDate}`;

    try {
        depends('app:finance');

        let cachedData = null;
        if (redis) {
            try {
                cachedData = await redis.get(cacheKey);
            } catch (redisErr) {
                console.error('[Redis] Gagal get cache dashboard:', redisErr.message);
            }
        }
        if (cachedData) return cachedData;

        // --- MULAI QUERY DATABASE (Drizzle) ---
        const unitData = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unitData) throw error(404, 'Unit tidak ditemukan');

        const abcCats = await db.select().from(abcCategories).orderBy(abcCategories.id);
        const productsData = await db.select({
            id: products.id, nama: products.nama, harga_jual: products.hargaJual, stok: products.stok
        }).from(products).where(eq(products.unitId, unitData.id));

        // Peringatan Stok Menipis (Low Stock <= 5)
        const lowStockProducts = productsData.filter(p => p.stok <= 5);

        let baseFilter = eq(transaksi.unitId, unitData.id);
        if (startDate !== "all" && endDate !== "all") {
            baseFilter = and(
                baseFilter, 
                sql`DATE(${transaksi.tanggal}) >= ${startDate}`,
                sql`DATE(${transaksi.tanggal}) <= ${endDate}`
            );
        }

        // Kalkulasi Summary
        const summaryRows = await db.select({
            total_masuk: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END)`,
            total_keluar: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%keluar%' THEN ${transaksi.nominal} ELSE 0 END)`,
            total_hpp: sql`SUM(COALESCE(${transaksi.hppTotal}, 0))`
        }).from(transaksi).where(baseFilter);
        
        const summary = summaryRows[0] || { total_masuk: 0, total_keluar: 0, total_hpp: 0 };
        const transactionList = await db.select().from(transaksi).where(baseFilter).orderBy(desc(transaksi.tanggal), desc(transaksi.id));

        const logs = await db.select({ pesan: riwayatAksi.pesan, tipe: riwayatAksi.tipe, waktu: riwayatAksi.waktu })
            .from(riwayatAksi)
            .where(and(eq(riwayatAksi.userId, userId), eq(riwayatAksi.unitId, unitData.id)))
            .orderBy(desc(riwayatAksi.waktu))
            .limit(15); // Diperbanyak untuk panel Audit Log

        // AR/AP — gunakan todayStrWIB() dari dateUtils (WIB-aware, bukan UTC)
        // Catatan: TiDB tidak support LATERAL JOIN, jadi tidak pakai `with:` relational query
        const todayStr = todayStrWIB();
        const overdueReceivables = await db.select().from(receivables)
            .where(and(eq(receivables.unitId, unitData.id), inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN']), lte(receivables.jatuhTempo, todayStr)));
        const overduePayables = await db.select().from(payables)
            .where(and(eq(payables.unitId, unitData.id), inArray(payables.status, ['BELUM_BAYAR', 'SEBAGIAN']), lte(payables.jatuhTempo, todayStr)));

        // Rincian Saldo Bank & Kas (Dari Double Entry)
        const bankBalancesRaw = await db.select({
            namaAkun: chartOfAccounts.namaAkun,
            kodeAkun: chartOfAccounts.kodeAkun,
            totalDebit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
            totalKredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
        })
        .from(journalEntryLines)
        .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
        .innerJoin(chartOfAccounts, eq(journalEntryLines.coaId, chartOfAccounts.id))
        .where(and(eq(journalEntries.unitId, unitData.id), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR')))
        .groupBy(chartOfAccounts.id, chartOfAccounts.kodeAkun, chartOfAccounts.namaAkun);

        const bankBalances = bankBalancesRaw.map(b => {
            // Aset Lancar normal balance = DEBIT
            return {
                nama: b.namaAkun,
                kode: b.kodeAkun,
                saldo: Number(b.totalDebit) - Number(b.totalKredit)
            };
        }).filter(b => b.saldo > 0); // Hanya tampilkan yang bersaldo

        // Monthly Target KPI (Asumsikan target = Modal Awal * 1.5 atau statis 50jt)
        const targetPendapatan = Math.max(unitData.modalAwal * 1.5, 10000000); 
        const currentPendapatan = Number(summary.total_masuk || 0);

        const finalData = {
            unit: unitData, 
            summary, 
            transactions: transactionList, 
            products: productsData, 
            riwayat: logs, 
            abcCategories: abcCats, 
            startDate, 
            endDate,
            alerts: {
                receivables: overdueReceivables,
                payables: overduePayables,
                lowStock: lowStockProducts
            },
            bankBalances,
            kpi: { target: targetPendapatan, current: currentPendapatan },
            strategicBI: buildStrategicBI({
                totalMasuk: summary.total_masuk,
                totalKeluar: summary.total_keluar,
                directCosts: summary.total_hpp, 
                modalAwal: unitData.modalAwal
            })
        };

        if (redis) {
            try {
                await redis.set(cacheKey, finalData, { ex: 300 });
            } catch (redisErr) {
                console.error('[Redis] Gagal set cache dashboard:', redisErr.message);
            }
        }

        return finalData;

    } catch (err) { 
        console.error('[Dashboard Error]', err);
        throw error(500, "Gagal memuat data"); 
    }
};

export const actions = {
    deleteTransaction: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        const { slug } = params;
        const formData = await request.formData();
        const id = formData.get('id');

        try {
            await db.transaction(async (tx) => {
                const unit = await tx.query.unitBisnis.findFirst({
                    where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
                });
                if (!unit) throw new Error('Unit tidak ditemukan');

                const trxData = await tx.query.transaksi.findFirst({
                    where: and(eq(transaksi.id, id), eq(transaksi.unitId, unit.id))
                });
                if (trxData && trxData.productId) {
                    const produk = await tx.query.products.findFirst({ where: eq(products.id, trxData.productId) });
                    if (produk) await tx.update(products).set({ stok: produk.stok + trxData.qty }).where(eq(products.id, trxData.productId));
                }
                if (trxData) {
                    await tx.delete(transaksi).where(eq(transaksi.id, id));
                }
            });

            if (redis) {
                try {
                    const keys = await redis.keys(`finance_dash_v4:${userId}:${slug}:*`);
                    if (keys.length > 0) await redis.del(...keys);
                    const historyKeys = await redis.keys(`history_v3:${userId}:${slug}:*`);
                    if (historyKeys.length > 0) await redis.del(...historyKeys);
                } catch (redisErr) {
                    console.error('[Redis] Gagal invalidate cache:', redisErr.message);
                }
            }

            return { success: true };
        } catch (err) { return fail(500, { message: 'Gagal hapus transaksi' }); }
    }
};