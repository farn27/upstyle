import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { kategoriProduk, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function POST({ request, cookies, params }) {
    try {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { newKategoriName } = body;
        const unitSlug = params.slug;

        if (!newKategoriName) {
            return json({ error: "Nama kategori tidak boleh kosong" }, { status: 400 });
        }

        const cleanName = newKategoriName.trim().toUpperCase();
        
        let finalKategoriId;

        await db.transaction(async (tx) => {
            const unit = await tx.query.unitBisnis.findFirst({
                where: eq(unitBisnis.slug, unitSlug)
            });

            if (!unit) {
                throw new Error("Unit tidak ditemukan");
            }

            const existing = await tx.query.kategoriProduk.findFirst({
                where: eq(kategoriProduk.namaKategori, cleanName)
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
        console.error("Gagal simpan kategori:", error);
        return json({ error: error.message }, { status: 500 });
    }
}