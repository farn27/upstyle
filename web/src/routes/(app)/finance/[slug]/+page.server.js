import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis, products, riwayatAksi, receivables, payables, chartOfAccounts, journalEntryLines, journalEntries } from '$lib/server/schema';
import { eq, and, desc, sql, lte, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { getCurrentUserId } from '$lib/server/getUser';
import { buildStrategicBI } from '$lib/server/strategicBI';
import { todayStrWIB } from '$lib/server/dateUtils';
import { versiCache } from '$lib/server/cacheVersi';
import { hitungSaldoKas, targetBulananOtomatis, labelMetodeBayar } from '$lib/financeDashboard';

export const load = async ({ params, url, depends, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const startDate = url.searchParams.get('start') || "all"; 
    const endDate = url.searchParams.get('end') || "all"; 

    // --- STRATEGI CACHE: Unik per User, Unit, dan Filter Tanggal ---
    const cacheKey = `finance_dash_v5:${userId}:${slug}:${startDate}:${endDate}:${await versiCache(userId, slug)}`;

    try {
        depends('app:finance');

        let cachedData = null;
        if (redis) {
            try {
                cachedData = await redis.get(cacheKey);
            } catch (redisErr) {
                log.api.warn({ err: redisErr.message }, '[Redis] Gagal get cache dashboard');
            }
        }
        if (cachedData) return cachedData;

        // --- MULAI QUERY DATABASE (Drizzle) ---
        const unitData = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unitData) throw error(404, 'Unit tidak ditemukan');

        const productsData = await db.select({
            id: products.id, nama: products.nama, harga_jual: products.hargaJual, stok: products.stok, minStok: products.minStok
        }).from(products).where(eq(products.unitId, unitData.id));

        // Peringatan Stok Menipis (Low Stock <= 5)
        const lowStockProducts = productsData.filter(p => p.stok <= (p.minStok ?? 5));

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
        
        // Saldo kas & KPI TIDAK ikut filter periode: saldo = sepanjang waktu, KPI = bulan berjalan (WIB)
        const awalBulanIni = `${todayStrWIB().slice(0, 7)}-01`;
        const [totalUnit] = await db.select({
            masukSemua: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            keluarSemua: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            masukBulanIni: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' AND DATE(${transaksi.tanggal}) >= ${awalBulanIni} THEN ${transaksi.nominal} ELSE 0 END), 0)`
        }).from(transaksi).where(eq(transaksi.unitId, unitData.id));

        const summary = {
            ...(summaryRows[0] || { total_masuk: 0, total_keluar: 0, total_hpp: 0 }),
            saldoKas: hitungSaldoKas({
                modalAwal: unitData.modalAwal,
                totalMasuk: /** @type {string} */ (totalUnit?.masukSemua),
                totalKeluar: /** @type {string} */ (totalUnit?.keluarSemua)
            })
        };

        const transactionRows = await db.select().from(transaksi).where(baseFilter).orderBy(desc(transaksi.tanggal), desc(transaksi.id)).limit(100);

        // metodeBayar dari form entry berisi ID akun kas → ambil nama akunnya
        const idAkunKas = [...new Set(transactionRows.map(t => String(t.metodeBayar || '')).filter(v => /^\d+$/.test(v)))];
        /** @type {Record<string, string>} */
        const namaAkunById = {};
        if (idAkunKas.length > 0) {
            const akun = await db.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun })
                .from(chartOfAccounts)
                .where(and(eq(chartOfAccounts.unitId, unitData.id), inArray(chartOfAccounts.id, idAkunKas.map(Number))));
            for (const a of akun) namaAkunById[String(a.id)] = a.namaAkun;
        }
        const transactionList = transactionRows.map(t => ({ ...t, metodeLabel: labelMetodeBayar(t.metodeBayar, namaAkunById) }));

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
        }); // Bug 2.6: Show all balances including negative (overdrawn accounts)

        // Target bulanan belum bisa diatur per unit → estimasi otomatis (ditandai di UI)
        const targetPendapatan = targetBulananOtomatis(unitData.modalAwal);
        const currentPendapatan = Number(/** @type {string} */ (totalUnit?.masukBulanIni) || 0);

        const finalData = {
            unit: unitData, 
            summary, 
            transactions: transactionList, 
            products: productsData, 
            riwayat: logs, 
            startDate, 
            endDate,
            alerts: {
                receivables: overdueReceivables,
                payables: overduePayables,
                lowStock: lowStockProducts
            },
            bankBalances,
            kpi: { target: targetPendapatan, current: currentPendapatan, estimasi: true },
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
                log.api.warn({ err: redisErr.message }, '[Redis] Gagal set cache dashboard');
            }
        }

        return finalData;

    } catch (err) {
        // Bug 4.2: Re-throw SvelteKit HTTP errors (404, 401) — don't convert to 500
        if (err.status) throw err;
        log.finance.error({ err }, '[Dashboard Error]');
        throw error(500, "Gagal memuat data");
    }
};

// Hapus transaksi dilakukan dari halaman Riwayat (history) → lihat $lib/server/hapusTransaksi.js
