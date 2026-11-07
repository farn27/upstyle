import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { transaksi, riwayatAksi, unitBisnis, products, receivables, payables, chartOfAccounts, journalEntries, journalEntryLines } from '$lib/server/schema';
import { eq, and, desc, sql, lte, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { triggerEvent } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { nowWIB, todayStrWIB } from '$lib/server/dateUtils';
import { hitungSaldoKas, targetBulananOtomatis, labelMetodeBayar } from '$lib/financeDashboard';
import { z } from 'zod';
import { log } from '$lib/server/logger.js';
import { catatTransaksi, pastikanCoaStandar, pilihAkunDefault, TransaksiError } from '$lib/server/catatTransaksi';
import { hapusTransaksi } from '$lib/server/hapusTransaksi';
import { inngest } from '$lib/server/inngest';

const createTransactionSchema = z.object({
    transaction: z.object({
        unitId: z.coerce.number().int().positive(),
        kategoriTrx: z.enum(['MASUK', 'KELUAR']),
        nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
        keterangan: z.string().min(1).max(500),
        metodeBayar: z.string().optional().default('KAS'),
        abcCategoryId: z.coerce.number().int().nullable().optional(),
        productId: z.string().optional(),
        qty: z.coerce.number().int().positive().optional().default(1),
        hppTotal: z.coerce.number().min(0).optional().default(0), // diabaikan: HPP dihitung server dari harga beli
        coaId: z.coerce.number().int().positive().optional(),     // akun pendapatan/beban (opsional)
        kasCoaId: z.coerce.number().int().positive().optional(),  // akun kas/bank (opsional)
    })
});

// 1. GET: Ambil transaksi, audit trail logs, dan kalkulasi BI metrics untuk unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        // Fetch unit info for modalAwal
        const unit = await db.query.unitBisnis.findFirst({
            where: eq(unitBisnis.id, Number(unitId))
        });
        const modalAwal = Number(unit?.modalAwal || 10000000.0);

        // Rentang tanggal opsional (YYYY-MM-DD) — sama seperti filter periode di dashboard web
        const mulai = url.searchParams.get('start');
        const akhir = url.searchParams.get('end');
        const tglValid = (v) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
        const adaRentang = tglValid(mulai) && tglValid(akhir);
        let filterTrx = eq(transaksi.unitId, Number(unitId));
        if (adaRentang) {
            filterTrx = and(filterTrx, sql`DATE(${transaksi.tanggal}) >= ${mulai}`, sql`DATE(${transaksi.tanggal}) <= ${akhir}`);
        }

        // Fetch transactions (100 terbaru pada rentang yang dipilih)
        const txList = await db.select().from(transaksi).where(filterTrx).orderBy(desc(transaksi.tanggal), desc(transaksi.id)).limit(100);

        // metodeBayar dari form entry berisi ID akun kas → ambil nama akunnya
        const idAkunKas = [...new Set(txList.map(t => String(t.metodeBayar || '')).filter(v => /^\d+$/.test(v)))];
        const namaAkunById = {};
        if (idAkunKas.length > 0) {
            const akun = await db.select({ id: chartOfAccounts.id, namaAkun: chartOfAccounts.namaAkun })
                .from(chartOfAccounts)
                .where(and(eq(chartOfAccounts.unitId, Number(unitId)), inArray(chartOfAccounts.id, idAkunKas.map(Number))));
            for (const a of akun) namaAkunById[String(a.id)] = a.namaAkun;
        }

        // ── Ringkasan periode (sama dengan dashboard web) ──
        const [ringkas] = await db.select({
            total_masuk: sql`COALESCE(SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            total_keluar: sql`COALESCE(SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%keluar%' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            total_hpp: sql`COALESCE(SUM(COALESCE(${transaksi.hppTotal}, 0)), 0)`
        }).from(transaksi).where(filterTrx);

        // Fetch audit logs
        const logsList = await db.query.riwayatAksi.findMany({
            where: eq(riwayatAksi.unitId, Number(unitId)),
            orderBy: [desc(riwayatAksi.id)],
            limit: 50
        });

        // Map transactions to mobile DTO
        const mappedTransactions = txList.map(t => ({
            id: t.id,
            unitId: t.unitId,
            kategoriTrx: t.kategoriTrx,
            nominal: Number(t.nominal || 0),
            tanggal: t.tanggal ? new Date(t.tanggal).getTime() : Date.now(),
            keterangan: t.keterangan || '',
            metodeBayar: t.metodeBayar || 'KAS',
            abcCategoryId: t.abcCategoryId || null,
            productId: t.productId || '',
            qty: Number(t.qty || 1),
            hppTotal: Number(t.hppTotal || 0),
            metodeLabel: labelMetodeBayar(t.metodeBayar, namaAkunById)
        }));

        // Map audit logs to mobile DTO
        const mappedLogs = logsList.map(l => ({
            id: l.id,
            unitId: l.unitId,
            pesan: l.pesan,
            tipe: (l.tipe || 'INFO').toUpperCase(),
            waktu: l.waktu ? new Date(l.waktu).getTime() : Date.now(),
            kategori: l.kategori || 'SYSTEM'
        }));

        // Calculate BI metrics matching mobile logic
        const totalMasuk = Number(ringkas?.total_masuk || 0);
        const totalKeluar = Number(ringkas?.total_keluar || 0);
        const netProfit = totalMasuk - totalKeluar;
        const margin = totalMasuk > 0 ? (netProfit / totalMasuk * 100) : 0.0;
        const efficiency = totalMasuk > 0 ? (totalKeluar / totalMasuk * 100) : 0.0;
        const runwayMonths = totalKeluar > 0 ? (modalAwal / (totalKeluar / 3.0)) : 99.0;

        let integrityScore = 5;
        if (margin > 30.0) integrityScore = 9;
        else if (margin > 15.0) integrityScore = 7;
        else if (margin > 0.0) integrityScore = 5;
        else integrityScore = 3;

        if (efficiency < 40.0) integrityScore += 1;
        if (efficiency > 80.0) integrityScore -= 1;
        integrityScore = Math.max(1, Math.min(10, integrityScore));

        const outlook = netProfit > 5000000.0 ? "STABLE" : (netProfit > 0.0 ? "MODERATE" : "CRITICAL WATCH");
        const riskAssessment = runwayMonths < 3.0 ? "HIGH" : (runwayMonths < 6.0 ? "MEDIUM" : "LOW");
        const aiConfidence = Math.min(95, 45 + (mappedTransactions.length * 3));

        const biMetrics = {
            totalMasuk,
            totalKeluar,
            netProfit,
            margin,
            efficiency,
            cashRunway: runwayMonths,
            integrityScore,
            outlook,
            riskAssessment,
            aiConfidence
        };

        // Saldo kas = sepanjang waktu; KPI = bulan berjalan (WIB) — tidak ikut filter periode
        const awalBulanIni = `${todayStrWIB().slice(0, 7)}-01`;
        const [totalUnit] = await db.select({
            masukSemua: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            keluarSemua: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            masukBulanIni: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' AND DATE(${transaksi.tanggal}) >= ${awalBulanIni} THEN ${transaksi.nominal} ELSE 0 END), 0)`
        }).from(transaksi).where(eq(transaksi.unitId, Number(unitId)));

        const summary = {
            total_masuk: Number(ringkas?.total_masuk || 0),
            total_keluar: Number(ringkas?.total_keluar || 0),
            total_hpp: Number(ringkas?.total_hpp || 0),
            saldoKas: hitungSaldoKas({ modalAwal: unit?.modalAwal, totalMasuk: totalUnit?.masukSemua, totalKeluar: totalUnit?.keluarSemua })
        };

        // Peringatan: stok menipis, piutang & hutang jatuh tempo
        const produkUnit = await db.select({ id: products.id, nama: products.nama, stok: products.stok, minStok: products.minStok })
            .from(products).where(eq(products.unitId, Number(unitId)));
        const stokMenipis = produkUnit.filter(p => p.stok <= (p.minStok ?? 5));
        const hariIni = todayStrWIB();
        const piutangLewat = await db.select({ id: receivables.id }).from(receivables)
            .where(and(eq(receivables.unitId, Number(unitId)), inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN']), lte(receivables.jatuhTempo, hariIni)));
        const hutangLewat = await db.select({ id: payables.id }).from(payables)
            .where(and(eq(payables.unitId, Number(unitId)), inArray(payables.status, ['BELUM_BAYAR', 'SEBAGIAN']), lte(payables.jatuhTempo, hariIni)));

        // Rincian saldo kas & bank dari jurnal (double entry)
        const bankRaw = await db.select({
            namaAkun: chartOfAccounts.namaAkun,
            kodeAkun: chartOfAccounts.kodeAkun,
            totalDebit: sql`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
            totalKredit: sql`COALESCE(SUM(${journalEntryLines.kredit}), 0)`
        })
            .from(journalEntryLines)
            .innerJoin(journalEntries, eq(journalEntryLines.journalId, journalEntries.id))
            .innerJoin(chartOfAccounts, eq(journalEntryLines.coaId, chartOfAccounts.id))
            .where(and(eq(journalEntries.unitId, Number(unitId)), eq(chartOfAccounts.tipeAkun, 'ASET_LANCAR')))
            .groupBy(chartOfAccounts.id, chartOfAccounts.kodeAkun, chartOfAccounts.namaAkun);
        const bankBalances = bankRaw.map(b => ({ nama: b.namaAkun, kode: b.kodeAkun, saldo: Number(b.totalDebit) - Number(b.totalKredit) }));

        return json({
            success: true,
            data: {
                transactions: mappedTransactions,
                riwayatAksi: mappedLogs,
                biMetrics,
                summary,
                alerts: { receivables: piutangLewat.length, payables: hutangLewat.length, lowStock: stokMenipis.length },
                lowStockItems: stokMenipis.slice(0, 20).map(p => ({ nama: p.nama, stok: p.stok })),
                bankBalances,
                kpi: { target: targetBulananOtomatis(unit?.modalAwal), current: Number(totalUnit?.masukBulanIni || 0) }
            }
        });

    } catch (err) {
        log.finance.error({ err }, 'API GET FINANCE ERROR');
        return json({ success: false, message: "Gagal mengambil data keuangan: " + err.message }, { status: 500 });
    }
}

// 2. POST: Tambah transaksi manual
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();

        // Zod validation
        const parsed = createTransactionSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { unitId, kategoriTrx, nominal, keterangan, metodeBayar, abcCategoryId, productId, qty, coaId } = parsed.data.transaction;
        // App versi lama mengirim akun kas sebagai metodeBayar "COA:<id>"
        const kasLama = /^COA:(\d+)$/i.exec(String(metodeBayar || ''));
        const kasCoaId = parsed.data.transaction.kasCoaId ?? (kasLama ? Number(kasLama[1]) : undefined);

        // Unit harus milik user yang login
        const unitMilikUser = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId))
        });
        if (!unitMilikUser) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });

        // Sama dengan form entry web: stok, jurnal double-entry, transaksi, riwayat
        const hasil = await db.transaction(async (tx) => {
            let akun = { coaId: coaId ?? null, kasCoaId: kasCoaId ?? null };
            if (!akun.coaId || !akun.kasCoaId) {
                await pastikanCoaStandar(tx, Number(unitId));
                const def = await pilihAkunDefault(tx, Number(unitId), kategoriTrx, metodeBayar);
                akun = { coaId: akun.coaId ?? def.coaId, kasCoaId: akun.kasCoaId ?? def.kasCoaId };
            }
            return catatTransaksi(tx, {
                unitId: Number(unitId),
                userId,
                kategori: kategoriTrx,
                nominal,
                keterangan,
                coaId: Number(akun.coaId),
                kasCoaId: Number(akun.kasCoaId),
                productId: productId || null,
                qty,
                abcCategoryId: abcCategoryId ?? null
            });
        });

        const slug = unitMilikUser.slug || '';

        if (slug) {
            // Await is critical on Vercel to prevent process freezing before the fetch completes
            await Promise.allSettled([
                triggerEvent(`unit-${unitId}`, 'notification', {
                    id: Date.now(),
                    unitId: Number(unitId),
                    pesan: `Transaksi ${kategoriTrx}: Rp ${String(nominal)}`,
                    kategori: 'FINANCE',
                    tipe: 'success',
                    waktu: new Date().toISOString()
                }),
                triggerEvent(`unit-${unitId}`, 'stats-updated', { unitId: Number(unitId) })
            ]);

            // Hapus cache redis agar web langsung menampilkan data terbaru
            try {
                const keys = await redis.keys(`finance_dash_v4:${userId}:${slug}:*`);
                if (keys.length > 0) await redis.del(...keys);
                const historyKeys = await redis.keys(`history_v3:${userId}:${slug}:*`);
                if (historyKeys.length > 0) await redis.del(...historyKeys);
                
                // Hapus juga cache beranda dan layout
                await redis.del(`home_dash_v2:${userId}`);
                await redis.del(`layout_session_v2:${userId}`);
            } catch (err) {
                log.finance.warn({ err }, 'Gagal menghapus cache Redis (POST)');
            }
        }

        return json({ success: true, message: "Transaksi berhasil disimpan", data: { id: hasil.trxId, journalId: hasil.journalId } });
    } catch (err) {
        if (err instanceof TransaksiError) {
            return json({ success: false, message: err.message }, { status: err.status });
        }
        log.finance.error({ err }, 'API POST FINANCE ERROR');
        return json({ success: false, message: "Gagal menyimpan transaksi: " + err.message }, { status: 500 });
    }
}

// 3. DELETE: Hapus transaksi
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const transactionId = url.searchParams.get('transactionId');
    const unitId = url.searchParams.get('unitId');
    if (!transactionId || !unitId) return json({ success: false, message: "transactionId dan unitId wajib diisi" }, { status: 400 });

    const trxId = Number(transactionId);
    const unitIdNum = Number(unitId);
    if (!Number.isInteger(trxId) || !Number.isInteger(unitIdNum)) {
        return json({ success: false, message: "transactionId dan unitId harus angka" }, { status: 400 });
    }

    try {
        // Unit harus milik user yang login
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, unitIdNum), eq(unitBisnis.userId, userId))
        });
        if (!unit) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });

        // Sama dengan hapus di halaman Riwayat web: stok penjualan kembali + jurnal ikut terhapus
        const namaTerhapus = await db.transaction(async (tx) => {
            const hasil = await hapusTransaksi(tx, { unitId: unitIdNum, trxId });
            if (!hasil) return null;
            const nama = hasil.trx.keterangan || 'TRANSAKSI TANPA NAMA';
            await tx.insert(riwayatAksi).values({
                userId, unitId: unitIdNum, pesan: `MENGHAPUS: ${nama.toUpperCase()}`, kategori: 'FINANCE', tipe: 'info', waktu: nowWIB()
            });
            return nama;
        });
        if (namaTerhapus === null) {
            return json({ success: false, message: 'Transaksi tidak ditemukan' }, { status: 404 });
        }

        const slug = unit.slug || '';

        if (slug) {
            await Promise.allSettled([
                triggerEvent(`unit-${unitId}`, 'notification', {
                    id: Date.now(),
                    unitId: Number(unitId),
                    pesan: `MENGHAPUS: ${namaTerhapus.toUpperCase()}`,
                    kategori: 'FINANCE',
                    tipe: 'warning',
                    waktu: new Date().toISOString()
                }),
                triggerEvent(`unit-${unitId}`, 'stats-updated', { unitId: Number(unitId) })
            ]);

            // Hapus cache redis agar web langsung menampilkan data terbaru
            try {
                const keys = await redis.keys(`finance_dash_v4:${userId}:${slug}:*`);
                if (keys.length > 0) await redis.del(...keys);
                const historyKeys = await redis.keys(`history_v3:${userId}:${slug}:*`);
                if (historyKeys.length > 0) await redis.del(...historyKeys);
                
                await redis.del(`home_dash_v2:${userId}`);
                await redis.del(`layout_session_v2:${userId}`);
            } catch (err) {
                log.finance.warn({ err }, 'Gagal menghapus cache Redis (DELETE)');
            }
            try {
                await inngest.send({ name: 'app/transaction.changed', data: { userId, slug } });
            } catch (err) {
                log.finance.warn({ err }, 'Gagal kirim event Inngest (DELETE)');
            }
        }

        return json({ success: true, message: `"${namaTerhapus.toUpperCase()}" berhasil dihapus` });
    } catch (err) {
        log.finance.error({ err }, 'API DELETE FINANCE ERROR');
        return json({ success: false, message: "Gagal menghapus transaksi" }, { status: 500 });
    }
}
