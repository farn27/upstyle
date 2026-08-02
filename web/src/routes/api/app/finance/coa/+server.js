import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts, transaksi } from '$lib/server/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch all active COAs for unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });

    try {
        const coaList = await db.query.chartOfAccounts.findMany({
            where: and(
                eq(chartOfAccounts.unitId, Number(unitId)),
                eq(chartOfAccounts.isActive, 1)
            ),
            orderBy: [asc(chartOfAccounts.kodeAkun)]
        });

        return json({
            success: true,
            message: 'Berhasil mengambil daftar COA',
            data: coaList
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API GET COA Error');
        else if (log?.error) log.error({ err }, 'API GET COA Error');
        return json({ success: false, message: 'Gagal mengambil data COA: ' + err.message, data: null }, { status: 500 });
    }
}

// POST: Create a new COA
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, kodeAkun, namaAkun, tipeAkun, normalBalance, deskripsi } = body;

        if (!unitId || !kodeAkun || !namaAkun || !tipeAkun || !normalBalance) {
            return json({
                success: false,
                message: 'Data input tidak lengkap (unitId, kodeAkun, namaAkun, tipeAkun, normalBalance wajib diisi)',
                data: null
            }, { status: 400 });
        }

        const existing = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.unitId, Number(unitId)),
                eq(chartOfAccounts.kodeAkun, String(kodeAkun))
            )
        });

        if (existing) {
            return json({
                success: false,
                message: `Kode akun ${kodeAkun} sudah digunakan`,
                data: null
            }, { status: 400 });
        }

        const [result] = await db.insert(chartOfAccounts).values({
            unitId: Number(unitId),
            kodeAkun: String(kodeAkun),
            namaAkun: String(namaAkun),
            tipeAkun: tipeAkun,
            normalBalance: normalBalance,
            deskripsi: deskripsi || null,
            isActive: 1
        });

        const newCoa = {
            id: result.insertId,
            unitId: Number(unitId),
            kodeAkun: String(kodeAkun),
            namaAkun: String(namaAkun),
            tipeAkun,
            normalBalance,
            deskripsi: deskripsi || null,
            isActive: 1
        };

        return json({
            success: true,
            message: 'COA berhasil dibuat',
            data: newCoa
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API POST COA Error');
        else if (log?.error) log.error({ err }, 'API POST COA Error');
        return json({ success: false, message: 'Gagal membuat COA: ' + err.message, data: null }, { status: 500 });
    }
}

// PUT: Update a COA
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();
        const { id, namaAkun, deskripsi, isActive } = body;

        if (!id) {
            return json({ success: false, message: 'id COA wajib diisi', data: null }, { status: 400 });
        }

        const updateData = {};
        if (namaAkun !== undefined) updateData.namaAkun = String(namaAkun);
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
        if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: 'Tidak ada data yang diubah', data: null }, { status: 400 });
        }

        await db.update(chartOfAccounts)
            .set(updateData)
            .where(eq(chartOfAccounts.id, Number(id)));

        return json({
            success: true,
            message: 'COA berhasil diperbarui',
            data: { id: Number(id), ...updateData }
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API PUT COA Error');
        else if (log?.error) log.error({ err }, 'API PUT COA Error');
        return json({ success: false, message: 'Gagal memperbarui COA: ' + err.message, data: null }, { status: 500 });
    }
}

// DELETE: Soft-deactivate a COA
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    const coaId = url.searchParams.get('coaId');
    if (!coaId) {
        return json({ success: false, message: 'coaId wajib diisi', data: null }, { status: 400 });
    }

    try {
        await db.update(chartOfAccounts)
            .set({ isActive: 0 })
            .where(eq(chartOfAccounts.id, Number(coaId)));

        return json({
            success: true,
            message: 'COA berhasil dinonaktifkan',
            data: { id: Number(coaId), isActive: 0 }
        });
    } catch (err) {
        if (log?.finance?.error) log.finance.error({ err }, 'API DELETE COA Error');
        else if (log?.error) log.error({ err }, 'API DELETE COA Error');
        return json({ success: false, message: 'Gagal menonaktifkan COA: ' + err.message, data: null }, { status: 500 });
    }
}
