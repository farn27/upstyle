import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { kategoriProduk, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function POST({ request, cookies, params }) {
    try {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { newKategoriName } = body;
        const unitSlug = params.slug;

        if (!newKategoriName || typeof newKategoriName !== 'string' || !newKategoriName.trim()) {
            return json({ error: "Nama kategori tidak boleh kosong" }, { status: 400 });
        }

        const cleanName = newKategoriName.trim().toUpperCase().slice(0, 100);
        
        let finalKategoriId;

        await db.transaction(async (tx) => {
            // Unit harus milik user yang login (dulu cukup slug → bisa menambah kategori di unit orang)
            const unit = await tx.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, unitSlug), eq(unitBisnis.userId, userId))
            });

            if (!unit) {
                throw new Error("Unit tidak ditemukan");
            }

            // Kategori dicari DI UNIT INI saja (dulu tanpa unit → bisa mengembalikan id kategori unit lain)
            const existing = await tx.query.kategoriProduk.findFirst({
                where: and(eq(kategoriProduk.namaKategori, cleanName), eq(kategoriProduk.unitId, unit.id))
            });

            if (existing) {
                finalKategoriId = existing.id;
            } else {
                const [katResult] = await tx.insert(kategoriProduk).values({
                    namaKategori: cleanName,
                    unitId: unit.id
                });
                finalKategoriId = katResult.insertId;
            }
        });

        return json({ 
            success: true, 
            kategori_id: finalKategoriId,
            kategori_nama: cleanName
        });

    } catch (error) {
        log.api.error({ err: error.message }, '[kategori] Gagal simpan kategori');
        const tidakAda = error.message === 'Unit tidak ditemukan';
        return json({ error: tidakAda ? error.message : 'Gagal menyimpan kategori' }, { status: tidakAda ? 404 : 500 });
    }
}