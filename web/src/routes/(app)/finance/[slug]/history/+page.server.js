import { error, fail } from '@sveltejs/kit';
import { hapusTransaksi } from '$lib/server/hapusTransaksi';
import { db } from '$lib/server/drizzle'; 
import { transaksi, unitBisnis, products, abcCategories , riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, between, lt, getTableColumns, sql } from 'drizzle-orm';
import { pusherServer } from '$lib/server/pusher';
import { redis } from '$lib/server/redis';
import { inngest } from '$lib/server/inngest';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowWIB } from '$lib/server/dateUtils';
import { log } from '$lib/server/logger';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);

    if (!userId) throw error(401, 'Unauthorized');

    const start = url.searchParams.get('start') || 'all';
    const end = url.searchParams.get('end') || 'all';

    // 👇 BARU: versi cache key dinaikkan ke v3 karena bentuk payload berubah (nambah openingBalance)
    const cacheKey = `history_v3:${userId}:${slug}:${start}:${end}`;

    try {
        const cachedHistory = redis ? await redis.get(cacheKey) : null;
        if (cachedHistory) {
            return cachedHistory;
        }

        const units = await db.select({ id: unitBisnis.id })
            .from(unitBisnis)
            .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId)))
            .limit(1);

        const unit = units[0];
        if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

        let filterLogic = eq(transaksi.unitId, unit.id);

        if (start !== 'all' && end !== 'all') {
            filterLogic = and(filterLogic, between(transaksi.tanggal, `${start} 00:00:00`, `${end} 23:59:59`));
        }

        const transactionList = await db.select({
                ...getTableColumns(transaksi)
            })
            .from(transaksi)
            .where(filterLogic)
            .orderBy(desc(transaksi.tanggal), desc(transaksi.id));

        // ─── OPENING BALANCE — SQL aggregate, bukan JS loop ───────────────────
        // Jauh lebih efisien: 1 query SUM di DB vs ambil semua row ke memory
        let openingBalance = 0;
        if (start !== 'all') {
            const [obRow] = await db.select({
                balance: sql`COALESCE(SUM(
                    CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK'  THEN ${transaksi.nominal}
                         WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN -${transaksi.nominal}
                         ELSE 0
                    END
                ), 0)`
            })
            .from(transaksi)
            .where(and(
                eq(transaksi.unitId, unit.id),
                sql`${transaksi.tanggal} < ${start + ' 00:00:00'}`
            ));
            openingBalance = Number(obRow?.balance || 0);
        }

        const finalData = { transactions: transactionList, slug, openingBalance };
        if (redis) {
            await redis.set(cacheKey, finalData, { ex: 600 });
        }

        return finalData;

    } catch (err) {
        if (err.status) throw err;
        log.finance.error({ err }, 'Load History Error');
        throw error(500, "Gagal memuat riwayat transaksi");
    }
};

/** @type {import('./$types').Actions} */
export const actions = {
    delete: async ({ request, cookies, params }) => {
        const userId = await getCurrentUserId(cookies);
        const { slug } = params;
        const formData = await request.formData();
        const id = formData.get('id');

        try {
            const numericId = Number(id);
            let namaTerhapus = ""; // Penampung nama transaksi

            await db.transaction(async (tx) => {
                const unit = await tx.query.unitBisnis.findFirst({
                    where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
                });
                if (!unit) throw new Error('Unit tidak ditemukan');

                // Hapus transaksi + kembalikan stok penjualan + hapus jurnalnya
                const hasil = await hapusTransaksi(tx, { unitId: unit.id, trxId: numericId });
                const trxData = hasil?.trx;
                if (!trxData) return; // sudah terhapus / bukan milik unit ini

                namaTerhapus = trxData.keterangan || "TRANSAKSI TANPA NAMA";

                // Audit Trail (Notification Dropdown)
                await tx.insert(riwayatAksi).values({ 
                    userId, 
                    unitId: trxData.unitId, 
                    pesan: `MENGHAPUS: ${namaTerhapus.toUpperCase()}`, 
                    tipe: 'info',
                    waktu: nowWIB()
                });
            });

            // Bersihkan cache SETELAH data aman terhapus. Best-effort: kalau Redis / Inngest
            // sedang tidak bisa dihubungi, penghapusan TIDAK ikut dibatalkan.
            if (redis) {
                try {
                    for (const pola of [`finance_dash_v4:${userId}:${slug}:*`, `history_v3:${userId}:${slug}:*`]) {
                        const keys = await redis.keys(pola);
                        if (keys.length > 0) await redis.del(...keys);
                    }
                } catch (redisErr) {
                    log.finance.warn({ err: redisErr instanceof Error ? redisErr.message : String(redisErr) }, '[Redis] Gagal hapus cache setelah delete');
                }
            }
            try {
                await inngest.send({ name: "app/transaction.changed", data: { userId, slug } });
            } catch (inngestErr) {
                log.finance.warn({ err: inngestErr instanceof Error ? inngestErr.message : String(inngestErr) }, '[Inngest] Gagal kirim event setelah delete');
            }

            // Return pesan yang lebih manusiawi lurd!
            return { 
                success: true, 
                message: `"${namaTerhapus.toUpperCase()}" BERHASIL DIHAPUS!` 
            };
        } catch (e) {
            if (e?.name === 'TransaksiError') return fail(e.status || 400, { message: e.message });
            log.finance.error({ err: e.message }, 'Delete Error');
            return fail(500, { message: "Gagal memproses sinkronisasi data" });
        }
    }
};