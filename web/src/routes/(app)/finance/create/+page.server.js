import { db } from '$lib/server/drizzle';
import { unitBisnis, kategoriProduk, riwayatAksi } from '$lib/server/schema';
import { eq, and, or, isNull, asc, sql } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger';
import { redis } from '$lib/server/redis';
import { getCurrentUserId } from '$lib/server/getUser';
import { nowWIB } from '$lib/server/dateUtils';

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

        // 2. Generate slug
        const slug = nama_unit.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        
        try {
            let kategori_akhir = kategori;
            let parentNama = '';
            
            // 3. Logika Cabang
            if (is_cabang && cabang_dari) {
                const parentUnit = await db.select({ nama_unit: unitBisnis.namaUnit, kategori: unitBisnis.kategori })
                    .from(unitBisnis)
                    .where(and(eq(unitBisnis.id, Number(cabang_dari)), eq(unitBisnis.userId, userId)));
                if (parentUnit.length === 0) throw error(400, 'Unit induk tidak ditemukan');
                kategori_akhir = parentUnit[0].kategori || 'LAINNYA';
                parentNama = parentUnit[0].nama_unit;
            }

            // 4. Insert Unit Bisnis
            const [result] = await db.insert(unitBisnis).values({
                userId,
                namaUnit: nama_unit,
                slug,
                kategori: kategori_akhir,
                modalAwal: String(modal_awal),
                alamat,
                telepon,
                email,
                isCabang: is_cabang ? 1 : 0,
                cabangDari: cabang_dari ? Number(cabang_dari) : null
            });
            
            const unitId = result.insertId;

            // 5. Logika Kategori Produk Dinamis
            if (!is_cabang) {
                let defaultProdCats = ['UMUM']; // Default awal

                // Cek KATEGORI BISNIS untuk menentukan KATEGORI PRODUK awal
                if (kategori_akhir.startsWith('FNB')) {
                    defaultProdCats = ['MAKANAN', 'MINUMAN', 'SNACK', 'BAHAN BAKU'];
                } else if (kategori_akhir.includes('FASHION')) {
                    defaultProdCats = ['ATASAN', 'BAWAHAN', 'AKSESORIS', 'SEPATU'];
                } else if (kategori_akhir.includes('RETAIL')) {
                    defaultProdCats = ['BARANG JADI', 'ATK', 'KEBUTUHAN POKOK'];
                } else if (kategori_akhir === 'JASA_TEKNIK' || kategori_akhir === 'AUTOMOTIVE') {
                    defaultProdCats = ['SPAREPART', 'OLI & CAIRAN', 'JASA / SERVICE', 'AKSESORIS KENDARAAN'];
                } else if (kategori_akhir === 'JASA_LAUNDRY') {
                    defaultProdCats = ['LAYANAN KILOAN', 'LAYANAN SATUAN', 'PARFUM & KIMIA'];
                } else if (kategori_akhir === 'JASA_BARBER') {
                    defaultProdCats = ['JASA PANGKAS', 'POMADE / PRODUK RAMBUT', 'TREATMENT'];
                } else if (kategori_akhir === 'HEALTH_CLINIC' || kategori_akhir === 'PHARMA_MEDICAL') {
                    defaultProdCats = ['OBAT BEBAS', 'OBAT RESEP', 'ALAT KESEHATAN', 'JASA MEDIS / KONSULTASI'];
                } else if (kategori_akhir.startsWith('TECH_') || kategori_akhir === 'DIGITAL_AGENCY') {
                    defaultProdCats = ['LISENSI SOFTWARE', 'JASA DEVELOPMENT', 'SUBSCRIPTION', 'MAINTENANCE'];
                } else if (kategori_akhir === 'MANUFAKTUR' || kategori_akhir === 'CONSTRUCTION') {
                    defaultProdCats = ['BAHAN BAKU', 'BARANG SETENGAH JADI', 'BARANG JADI', 'MATERIAL BANGUNAN'];
                } else if (kategori_akhir === 'AGRIBISNIS') {
                    defaultProdCats = ['HASIL PANEN', 'PUPUK & KIMIA', 'BIBIT', 'ALAT PERTANIAN'];
                } else if (kategori_akhir === 'EDUCATION_COURSE') {
                    defaultProdCats = ['BIAYA KURSUS / SPP', 'BUKU / MODUL', 'MERCHANDISE'];
                }

                // Masukkan ke tabel kategori_produk SECARA PRIVAT (Tertaut ke Unit) dengan batch insert untuk mengurangi latency
                if (defaultProdCats.length > 0) {
                    await db.insert(kategoriProduk).values(
                        defaultProdCats.map(cat => ({
                            unitId,
                            namaKategori: cat.toUpperCase()
                        }))
                    ).onDuplicateKeyUpdate({ set: { id: sql`id` } });
                }
            }


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
await pusherServer.trigger('channel-bizgrow', 'notif-baru', {
    id: unitId,
    pesan: pesanToast,
    kategori: 'Unit Bisnis',
    link: linkSorot,
    tipe: 'success',
    waktu: nowWIB().toISOString()
});

// --- 3. BERSIHKAN CACHE REDIS ---
const cacheKey = `layout_session:${userId}`;
await redis.del(cacheKey);

// --- 4. REDIRECT DENGAN PARAMETER SOROT ---
throw redirect(303, `/finance?sorot=${unitId}&pesan=${encodeURIComponent(pesanToast)}`);


        } catch (err) {
            if (err.status === 303 || err.status === 302) throw err;
            
            log.api.error({ err: "❌ ERROR OBJECT:", err);
            // Error Handling untuk Data Truncated
            if (err.code === 'WARN_DATA_TRUNCATED' || err.errno === 1265) {
                log.api.error({ err: "❌ DB ERROR: Data truncated.", err);
                throw error(500, `Database error: Data truncated/kurang lebar. Detail: ${err.message || err}`);
            }

            log.api.error({ err: "❌ GAGAL SIMPAN:", err);
            throw error(500, err.code === 'ER_DUP_ENTRY' ? `Nama unit "${nama_unit}" sudah ada.` : `Gagal menyimpan unit: ${err.message}`);
        }
    }
};