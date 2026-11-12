import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { tandaiBerubah } from '$lib/server/cacheVersi';
import { db } from '$lib/server/drizzle';
import { transaksi, riwayatAksi, unitBisnis, products, receivables, payables, chartOfAccounts, journalEntries, journalEntryLines, abcCategories } from '$lib/server/schema';
import { eq, and, asc, desc, sql, lte, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { triggerEvent } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { nowWIB, nowSqlWIB, todayStrWIB } from '$lib/server/dateUtils';
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
        tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // mis. tanggal nota (opsional)
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

        // Filter riwayat (opsional): jenis, kata kunci, kategori ABC
        const jenis = (url.searchParams.get('jenis') || '').toLowerCase();
        if (jenis === 'masuk' || jenis === 'keluar') filterTrx = and(filterTrx, sql`LOWER(${transaksi.kategoriTrx}) LIKE ${'%' + jenis + '%'}`);
        const kataKunci = (url.searchParams.get('q') || '').trim().slice(0, 100);
        if (kataKunci) filterTrx = and(filterTrx, sql`LOWER(${transaksi.keterangan}) LIKE ${'%' + kataKunci.toLowerCase().replace(/[%_]/g, '') + '%'}`);
        const abcId = Number(url.searchParams.get('abcId') || 0);
        if (abcId > 0) filterTrx = and(filterTrx, eq(transaksi.abcCategoryId, abcId));

        // Halaman transaksi: default 100 terbaru, bisa dimuat bertahap (limit maks 300 + offset)
        const batas = Math.min(Math.max(Number(url.searchParams.get('limit') || 100), 1), 300);
        const geser = Math.max(Number(url.searchParams.get('offset') || 0), 0);
        const urut = url.searchParams.get('urut') || 'terbaru';
        const urutan = urut === 'terlama' ? [asc(transaksi.tanggal), asc(transaksi.id)]
            : urut === 'nominal_desc' ? [desc(transaksi.nominal), desc(transaksi.id)]
            : urut === 'nominal_asc' ? [asc(transaksi.nominal), desc(transaksi.id)]
            : [desc(transaksi.tanggal), desc(transaksi.id)];
        const txPlus = await db.select().from(transaksi).where(filterTrx).orderBy(...urutan).limit(batas + 1).offset(geser);
        const adaLagi = txPlus.length > batas;
        const txList = txPlus.slice(0, batas);

        // Saldo kas setelah tiap transaksi (modal awal + akumulasi seluruh transaksi unit sampai baris itu),
        // dihitung dari akumulasi sebelum baris paling lama pada halaman ini — tetap benar walau difilter/dipaginasi
        const delta = sql`CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK' THEN ${transaksi.nominal} WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN -${transaksi.nominal} ELSE 0 END`;
        const saldoSetelah = new Map();
        if (txList.length > 0) {
            const kronologis = [...txList].sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || a.id - b.id);
            const tertua = kronologis[0];
            const [sebelum] = await db.select({ total: sql`COALESCE(SUM(${delta}), 0)` }).from(transaksi).where(and(
                eq(transaksi.unitId, Number(unitId)),
                sql`(${transaksi.tanggal} < ${tertua.tanggal} OR (${transaksi.tanggal} = ${tertua.tanggal} AND ${transaksi.id} < ${tertua.id}))`
            ));
            // Baris di antara yang difilter tetap dihitung: ambil seluruh baris unit dari 'tertua' ke 'terbaru'
            const terbaru = kronologis[kronologis.length - 1];
            const rentangPenuh = await db.select({ id: transaksi.id, kategoriTrx: transaksi.kategoriTrx, nominal: transaksi.nominal }).from(transaksi).where(and(
                eq(transaksi.unitId, Number(unitId)),
                sql`(${transaksi.tanggal} > ${tertua.tanggal} OR (${transaksi.tanggal} = ${tertua.tanggal} AND ${transaksi.id} >= ${tertua.id}))`,
                sql`(${transaksi.tanggal} < ${terbaru.tanggal} OR (${transaksi.tanggal} = ${terbaru.tanggal} AND ${transaksi.id} <= ${terbaru.id}))`
            )).orderBy(transaksi.tanggal, transaksi.id);
            let berjalan = modalAwal + Number(sebelum?.total || 0);
            for (const r of rentangPenuh) {
                const k = String(r.kategoriTrx || '').toUpperCase();
                berjalan += k === 'MASUK' ? Number(r.nominal) : k === 'KELUAR' ? -Number(r.nominal) : 0;
                saldoSetelah.set(r.id, berjalan);
            }
        }

        // Nama & level kategori ABC
        const abcList = await db.select({ id: abcCategories.id, nama: abcCategories.namaKategori, level: abcCategories.abcLevel }).from(abcCategories);
        const abcById = new Map(abcList.map((a) => [a.id, a]));

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
            tanggal: t.tanggal ? String(t.tanggal) : nowSqlWIB(),
            keterangan: t.keterangan || '',
            metodeBayar: t.metodeBayar || 'KAS',
            abcCategoryId: t.abcCategoryId || null,
            productId: t.productId || '',
            qty: Number(t.qty || 1),
            hppTotal: Number(t.hppTotal || 0),
            metodeLabel: labelMetodeBayar(t.metodeBayar, namaAkunById),
            abcNama: abcById.get(t.abcCategoryId)?.nama || null,
            abcLevel: abcById.get(t.abcCategoryId)?.level || null,
            saldoSetelah: saldoSetelah.has(t.id) ? saldoSetelah.get(t.id) : null
        }));

        // Map audit logs to mobile DTO
        const mappedLogs = logsList.map(l => ({
            id: l.id,
            unitId: l.unitId,
            pesan: l.pesan,
            tipe: (l.tipe || 'INFO').toUpperCase(),
            waktu: l.waktu ? String(l.waktu) : nowSqlWIB(),
            kategori: l.kategori || 'SYSTEM'
        }));

        // Grafik arus kas periode ini: per jam bila satu hari (Hari Ini/Kemarin), selain itu per tanggal
        const perJam = adaRentang && mulai === akhir;
        const kunciWaktu = perJam ? sql`DATE_FORMAT(${transaksi.tanggal}, '%H:00')` : sql`DATE_FORMAT(${transaksi.tanggal}, '%Y-%m-%d')`;
        const grafikRaw = await db.select({
            label: sql`${kunciWaktu}`.as('label'),
            masuk: sql`COALESCE(SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
            keluar: sql`COALESCE(SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%keluar%' THEN ${transaksi.nominal} ELSE 0 END), 0)`
        }).from(transaksi).where(filterTrx).groupBy(sql`${kunciWaktu}`).orderBy(sql`${kunciWaktu} DESC`).limit(60);
        const grafik = grafikRaw.reverse().map(g => ({ label: String(g.label), masuk: Number(g.masuk), keluar: Number(g.keluar) }));

        // Produk terlaris (pendapatan per produk, 5 teratas)
        const terlarisRaw = await db.select({
            nama: products.nama,
            total: sql`COALESCE(SUM(${transaksi.nominal}), 0)`,
            qty: sql`COALESCE(SUM(${transaksi.qty}), 0)`
        }).from(transaksi)
            .innerJoin(products, eq(products.id, transaksi.productId))
            .where(and(filterTrx, sql`LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%'`))
            .groupBy(products.id, products.nama)
            .orderBy(sql`SUM(${transaksi.nominal}) DESC`)
            .limit(5);
        const produkTerlaris = terlarisRaw.map(p => ({ nama: p.nama, total: Number(p.total), qty: Number(p.qty) }));

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
                lowStockItems: stokMenipis.slice(0, 20).map(p => ({ nama: p.nama, stok: p.stok, minStok: p.minStok ?? 5 })),
                grafik,
                produkTerlaris,
                perJam,
                adaLagi,
                abcOptions: abcList.map((a) => ({ id: a.id, nama: a.nama, level: a.level || 'C' })),
                bankBalances,
                kpi: { target: targetBulananOtomatis(unit?.modalAwal), current: Number(totalUnit?.masukBulanIni || 0) }
            }
        });

    } catch (err) {
        log.finance.error({ err }, 'API GET FINANCE ERROR');
        return json({ success: false, message: "Gagal mengambil data keuangan: " + pesanAman(err) }, { status: 500 });
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
                abcCategoryId: abcCategoryId ?? null,
                tanggal: parsed.data.transaction.tanggal ?? null
            });
        });

        const slug = unitMilikUser.slug || '';

        if (slug) {
            // Await is critical on Vercel to prevent process freezing before the fetch completes
            await Promise.allSettled([
                triggerEvent(`unit-${unitId}`, 'notification', {
                    id: Date.now(),
                    unitId: Number(unitId),
                    pesan: `Transaksi ${kategoriTrx}: Rp ${Number(nominal || 0).toLocaleString('id-ID')}`,
                    kategori: 'FINANCE',
                    tipe: 'success',
                    waktu: new Date().toISOString()
                }),
                triggerEvent(`unit-${unitId}`, 'stats-updated', { unitId: Number(unitId) })
            ]);

            // Hapus cache redis agar web langsung menampilkan data terbaru
            await tandaiBerubah({ userId, slug });
        }

        return json({ success: true, message: "Transaksi berhasil disimpan", data: { id: hasil.trxId, journalId: hasil.journalId } });
    } catch (err) {
        if (err instanceof TransaksiError) {
            return json({ success: false, message: pesanAman(err) }, { status: err.status });
        }
        log.finance.error({ err }, 'API POST FINANCE ERROR');
        return json({ success: false, message: "Gagal menyimpan transaksi: " + pesanAman(err) }, { status: 500 });
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
            await tandaiBerubah({ userId, slug });
            try {
                await inngest.send({ name: 'app/transaction.changed', data: { userId, slug } });
            } catch (err) {
                log.finance.warn({ err }, 'Gagal kirim event Inngest (DELETE)');
            }
        }

        return json({ success: true, message: `"${namaTerhapus.toUpperCase()}" berhasil dihapus` });
    } catch (err) {
        if (err instanceof TransaksiError) return json({ success: false, message: pesanAman(err) }, { status: err.status });
        log.finance.error({ err }, 'API DELETE FINANCE ERROR');
        return json({ success: false, message: "Gagal menghapus transaksi" }, { status: 500 });
    }
}
