import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { journalEntries, journalEntryLines, chartOfAccounts, transaksi } from '$lib/server/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { isiCoaStandar, buatCoaDenganAi, MasterDataError, TIPE_COA } from '$lib/server/masterData';
import { groqChatCompletion } from '$lib/server/groq';
import { cekKuotaAI } from '$lib/server/rateLimit';
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
        return json({ success: false, message: 'Gagal mengambil data COA: ' + pesanAman(err), data: null }, { status: 500 });
    }
}

/** Akun induk harus ada di unit yang sama, bukan akun itu sendiri, dan tidak boleh membuat lingkaran. null = tanpa induk. */
async function cekInduk(unitId, parentId, selfId = null) {
    if (parentId === null || parentId === undefined || parentId === '' || Number(parentId) === 0) return { ok: true, id: null };
    const pid = Number(parentId);
    if (!Number.isInteger(pid) || pid < 0) return { ok: false, pesan: 'Akun induk tidak valid' };
    if (selfId !== null && pid === Number(selfId)) return { ok: false, pesan: 'Akun tidak bisa menjadi induk dirinya sendiri' };
    let kini = await db.query.chartOfAccounts.findFirst({ where: eq(chartOfAccounts.id, pid) });
    if (!kini || kini.unitId !== Number(unitId)) return { ok: false, pesan: 'Akun induk tidak ditemukan di unit ini' };
    for (let i = 0; i < 20 && kini && selfId !== null; i++) {
        if (kini.id === Number(selfId)) return { ok: false, pesan: 'Akun induk membuat lingkaran hierarki' };
        kini = kini.parentId ? await db.query.chartOfAccounts.findFirst({ where: eq(chartOfAccounts.id, kini.parentId) }) : null;
    }
    return { ok: true, id: pid };
}

// POST: Create a new COA
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized', data: null }, { status: 401 });

    try {
        const body = await request.json();

        // Isi COA standar sesuai jenis usaha (sama dengan tombol "COA Standar" di web)
        if (body?.action === 'seed-default') {
            if (!body.unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });
            try {
                const jumlah = await isiCoaStandar(db, Number(body.unitId), body.type);
                return json({ success: true, message: `${jumlah} akun COA standar dibuat`, data: { created: jumlah } });
            } catch (e) {
                if (e instanceof MasterDataError) return json({ success: false, message: pesanAman(e), data: { pilihan: TIPE_COA } }, { status: e.status });
                throw e;
            }
        }

        // Buat COA otomatis dari deskripsi bisnis (AI). tambahkan=true → lengkapi COA yang sudah ada
        if (body?.action === 'generate-ai') {
            if (!body.unitId) return json({ success: false, message: 'unitId wajib diisi', data: null }, { status: 400 });
            const kuota = await cekKuotaAI(userId);
            if (!kuota.allowed) return json({ success: false, message: kuota.pesan, data: null }, { status: 429 });
            try {
                const jumlah = await buatCoaDenganAi(db, Number(body.unitId), body.deskripsi, {
                    tambahkan: body.tambahkan === true,
                    panggilAi: async (sistem, pengguna) => {
                        const res = await groqChatCompletion({
                            model: 'llama-3.1-8b-instant',
                            messages: [{ role: 'system', content: sistem }, { role: 'user', content: pengguna }],
                            temperature: 0.2, max_tokens: 2200
                        });
                        return res.choices?.[0]?.message?.content || '';
                    }
                });
                return json({ success: true, message: `${jumlah} akun COA dibuat oleh AI`, data: { created: jumlah } });
            } catch (e) {
                if (e instanceof MasterDataError) return json({ success: false, message: pesanAman(e), data: null }, { status: e.status });
                throw e;
            }
        }

        const { unitId, kodeAkun, namaAkun, tipeAkun, normalBalance, deskripsi } = body;

        if (!unitId || !kodeAkun || !namaAkun || !tipeAkun || !normalBalance) {
            return json({
                success: false,
                message: 'Data input tidak lengkap (unitId, kodeAkun, namaAkun, tipeAkun, normalBalance wajib diisi)',
                data: null
            }, { status: 400 });
        }

        const TIPE_OK = ['ASET_LANCAR', 'ASET_TETAP', 'LIABILITAS_LANCAR', 'LIABILITAS_JANGKA_PANJANG', 'EKUITAS', 'PENDAPATAN', 'HPP', 'BEBAN_OPERASIONAL', 'BEBAN_LAINNYA', 'PENDAPATAN_LAINNYA'];
        if (!TIPE_OK.includes(tipeAkun)) return json({ success: false, message: 'Jenis akun tidak valid', data: null }, { status: 422 });
        if (!['DEBIT', 'KREDIT'].includes(normalBalance)) return json({ success: false, message: 'Saldo normal harus DEBIT atau KREDIT', data: null }, { status: 422 });

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

        const induk = await cekInduk(unitId, body.parentId);
        if (!induk.ok) return json({ success: false, message: induk.pesan, data: null }, { status: 422 });

        const [result] = await db.insert(chartOfAccounts).values({
            parentId: induk.id,
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
            parentId: induk.id,
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
        return json({ success: false, message: 'Gagal membuat COA: ' + pesanAman(err), data: null }, { status: 500 });
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
        const akun = await db.query.chartOfAccounts.findFirst({ where: eq(chartOfAccounts.id, Number(id)) });
        if (!akun || !(await unitMilikUser(db, userId, akun.unitId))) {
            return json({ success: false, message: 'COA tidak ditemukan' }, { status: 404 });
        }

        const updateData = {};
        if (namaAkun !== undefined) updateData.namaAkun = String(namaAkun);
        if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
        if (isActive !== undefined) updateData.isActive = isActive ? 1 : 0;
        if (body.parentId !== undefined) {
            const induk = await cekInduk(akun.unitId, body.parentId, akun.id);
            if (!induk.ok) return json({ success: false, message: induk.pesan, data: null }, { status: 422 });
            updateData.parentId = induk.id;
        }

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
        return json({ success: false, message: 'Gagal memperbarui COA: ' + pesanAman(err), data: null }, { status: 500 });
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
        const akun = await db.query.chartOfAccounts.findFirst({ where: eq(chartOfAccounts.id, Number(coaId)) });
        if (!akun || !(await unitMilikUser(db, userId, akun.unitId))) {
            return json({ success: false, message: 'COA tidak ditemukan' }, { status: 404 });
        }

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
        return json({ success: false, message: 'Gagal menonaktifkan COA: ' + pesanAman(err), data: null }, { status: 500 });
    }
}
