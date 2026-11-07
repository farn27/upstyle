import { db } from '$lib/server/drizzle';
import { unitBisnis, kategoriProduk, riwayatAksi } from '$lib/server/schema';
import { eq, and, or, isNull, asc, sql } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger';
import { redis } from '$lib/server/redis';
import { getCurrentUserId } from '$lib/server/getUser';
import { cekBatasUnit } from '$lib/server/planLimits';
import { nowWIB, nowSqlWIB } from '$lib/server/dateUtils';
import { buatUnit, UnitError } from '$lib/server/unitBaru';

export async function load({ cookies }) {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw redirect(303, '/auth/login');
    
    const existingUnits = await db.select({
        id: unitBisnis.id,
        nama_unit: unitBisnis.namaUnit,
        kategori: unitBisnis.kategori
    })
    .from(unitBisnis)
    .where(and(
        eq(unitBisnis.userId, userId),
        or(eq(unitBisnis.isCabang, 0), isNull(unitBisnis.isCabang))
    ))
    .orderBy(asc(unitBisnis.namaUnit));
    
    return { existingUnits };
}

export const actions = {
    default: async ({ request, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) throw error(401, 'Sesi berakhir');

        const formData = await request.formData();
        const nama_unit = formData.get('nama_unit');
        const kategori = formData.get('kategori');
        const modal_awal = Number(formData.get('modal_awal')) || 0;
        const alamat = formData.get('alamat') || '';
        const telepon = formData.get('telepon') || null;
        const email = formData.get('email') || null;
        const is_cabang = formData.get('is_cabang') === 'true';
        const cabang_dari = formData.get('cabang_dari') || null;
        
        // 1. Validasi
        if (!nama_unit?.trim()) throw error(400, 'Nama unit wajib diisi');
        if (!alamat?.trim()) throw error(400, 'Alamat wajib diisi');
        if (!is_cabang && !kategori) throw error(400, 'Kategori harus dipilih');

        const batas = await cekBatasUnit(db, userId);
        if (!batas.boleh) throw error(403, batas.pesan);

        try {
            // 2-5. Buat unit (slug unik, induk cabang, kategori produk awal) — logika bersama dengan API app
            const unit = await buatUnit(db, userId, {
                nama: nama_unit, kategori, alamat, telepon, email, modalAwal: modal_awal,
                isCabang: is_cabang, cabangDari: cabang_dari ? Number(cabang_dari) : null
            });
            const unitId = unit.id;
            const kategori_akhir = unit.kategori;

            // 6. Riwayat & Redirect
// 6. Riwayat & Redirect
// 6. Riwayat & Redirect
const pesanToast = is_cabang 
    ? `Cabang "${nama_unit}" berhasil dibuat!` 
    : `Unit "${nama_unit}" (${kategori_akhir}) berhasil terdaftar!`;

const linkSorot = `/finance?sorot=${unitId}`; 

// --- 1. SIMPAN PERMANEN KE DATABASE (WAJIB lurd!) ---
await db.insert(riwayatAksi).values({
    userId,
    unitId,
    pesan: pesanToast,
    kategori: 'Unit Bisnis',
    link: linkSorot,
    tipe: 'success'
});

// --- 2. TEMBAK REAL-TIME KE PUSHER ---
await pusherServer.trigger(`unit-${unitId}`, 'notification', {
    id: unitId,
    pesan: pesanToast,
    kategori: 'Unit Bisnis',
    link: linkSorot,
    tipe: 'success',
    waktu: nowSqlWIB()
});

// --- 3. BERSIHKAN CACHE REDIS ---
const cacheKey = `layout_session:${userId}`;
await redis.del(cacheKey);

// --- 4. REDIRECT DENGAN PARAMETER SOROT ---
throw redirect(303, `/finance?sorot=${unitId}&pesan=${encodeURIComponent(pesanToast)}`);


        } catch (err) {
            if (err.status === 303 || err.status === 302) throw err;
            if (err instanceof UnitError) throw error(err.status, err.message);
            
            log.api.error({ err }, '❌ ERROR OBJECT:');
            // Error Handling untuk Data Truncated
            if (err.code === 'WARN_DATA_TRUNCATED' || err.errno === 1265) {
                log.api.error({ err }, '❌ DB ERROR: Data truncated.');
                throw error(500, `Database error: Data truncated/kurang lebar. Detail: ${err.message || err}`);
            }

            log.api.error({ err }, '❌ GAGAL SIMPAN:');
            throw error(500, err.code === 'ER_DUP_ENTRY' ? `Nama unit "${nama_unit}" sudah ada.` : `Gagal menyimpan unit: ${err.message}`);
        }
    }
};