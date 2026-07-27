import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, kategoriProduk, riwayatAksi } from '$lib/server/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';

// 1. GET: Ambil List Bisnis
export async function GET({ cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Unauthorized", data: [] }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const pagination = parsePagination(url);

        // Get total count
        const [totalResult] = await db.select({ count: count() }).from(unitBisnis).where(eq(unitBisnis.userId, userId));
        const total = totalResult.count;

        // Get paginated data
        const unitsQuery = db.query.unitBisnis.findMany({
            where: eq(unitBisnis.userId, userId),
            orderBy: [desc(unitBisnis.id)]
        });

        const units = await applyPagination(unitsQuery, pagination);

        const data = units.map(u => ({
            id: u.id,
            name: u.namaUnit,
            type: u.kategori || 'UMUM',
            uid: String(u.id)
        }));

        return json(paginatedResponse(data, total, pagination));

    } catch (err) {
        console.error("API GET ERROR:", err);
        return json({ success: false, message: "Server Error", data: [] }, { status: 500 });
    }
}

// 2. POST: Tambah Bisnis Baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Sesi berakhir" }, { status: 401 });
    }

    const body = await request.json();
    
    const nama_unit = body.name;
    const kategori = body.type;
    const is_cabang = body.is_cabang || false;
    const cabang_dari = body.cabang_dari || null;
    
    const modal_awal = 0;
    const alamat = "Alamat default dari App";
    const telepon = null;
    const email = null;

    if (!nama_unit) return json({ success: false, message: "Nama unit wajib diisi" }, { status: 400 });

    try {
        const slug = nama_unit.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        
        let kategori_akhir = kategori;
        
        if (is_cabang && cabang_dari) {
            const parentUnit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.id, cabang_dari), eq(unitBisnis.userId, userId))
            });
            if (!parentUnit) return json({ success: false, message: "Unit induk tidak ditemukan" }, { status: 400 });
            kategori_akhir = parentUnit.kategori;
        }

        const [result] = await db.insert(unitBisnis).values({
            userId, namaUnit: nama_unit, slug, kategori: kategori_akhir, modalAwal: String(modal_awal), alamat, telepon, email, isCabang: is_cabang ? 1 : 0, cabangDari: cabang_dari
        });

        const unitId = result.insertId;

        if (!is_cabang) {
            let defaultProdCats = ['UMUM'];
            if (kategori_akhir.startsWith('FNB')) defaultProdCats = ['MAKANAN', 'MINUMAN', 'SNACK'];
            else if (kategori_akhir.includes('FASHION')) defaultProdCats = ['BAJU', 'CELANA', 'AKSESORIS'];
            else if (kategori_akhir.includes('RETAIL')) defaultProdCats = ['BARANG JADI', 'BAHAN BAKU'];

            for (const catName of defaultProdCats) {
                try {
                    await db.insert(kategoriProduk).values({ unitId, namaKategori: catName.toUpperCase() });
                } catch (e) {
                    // ignore duplicate
                }
            }
        }

        const pesanToast = is_cabang ? `Cabang Baru: ${nama_unit}` : `Bisnis Baru: ${nama_unit}`;
        await db.insert(riwayatAksi).values({
            userId, unitId, pesan: pesanToast, kategori: 'Unit Bisnis', link: '/finance', tipe: 'success'
        });

        return json({ success: true, message: "Berhasil disimpan" });

    } catch (err) {
        console.error("API POST ERROR:", err);
        return json({ 
            success: false, 
            message: err.code === 'ER_DUP_ENTRY' ? "Nama unit sudah ada" : "Gagal menyimpan data" 
        }, { status: 500 });
    }
}

// 3. DELETE: Hapus Bisnis
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const unitId = url.searchParams.get('unitId');
    if (!unitId) {
        return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });
    }

    try {
        await db.delete(unitBisnis).where(and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId)));
        return json({ success: true, message: "Unit bisnis berhasil dihapus" });
    } catch (err) {
        console.error("API DELETE UNIT ERROR:", err);
        return json({ success: false, message: "Gagal menghapus unit bisnis" }, { status: 500 });
    }
}