import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { kategoriProduk, products } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Get all categories for unitId
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const categories = await db.select()
            .from(kategoriProduk)
            .where(eq(kategoriProduk.unitId, Number(unitId)))
            .orderBy(kategoriProduk.namaKategori);

        return json({ success: true, categories });
    } catch (err) {
        log.api.error({ err }, 'API GET CATEGORIES ERROR');
        return json({ success: false, message: "Gagal mengambil kategori" }, { status: 500 });
    }
}

// POST: Create new category
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            namaKategori: z.string().min(1, 'Nama kategori wajib diisi').max(100)
        });
        
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
            return json({ success: false, message: msg }, { status: 400 });
        }

        const { unitId, namaKategori } = body;
        const cleanName = namaKategori.trim().toUpperCase();

        // Check if category exists
        const existing = await db.select()
            .from(kategoriProduk)
            .where(and(
                eq(kategoriProduk.unitId, Number(unitId)),
                eq(kategoriProduk.namaKategori, cleanName)
            ))
            .limit(1);

        if (existing.length > 0) {
            return json({ success: false, message: "Kategori sudah ada" }, { status: 400 });
        }

        const [result] = await db.insert(kategoriProduk).values({
            unitId: Number(unitId),
            namaKategori: cleanName
        });

        return json({ 
            success: true, 
            message: "Kategori berhasil dibuat",
            category: {
                id: result.insertId,
                unitId: Number(unitId),
                namaKategori: cleanName
            }
        });
    } catch (err) {
        log.api.error({ err }, 'API POST CATEGORY ERROR');
        return json({ success: false, message: "Gagal membuat kategori: " + err.message }, { status: 500 });
    }
}

// DELETE: Delete category (check if used by products first)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const categoryId = url.searchParams.get('categoryId');
    if (!categoryId) {
        return json({ success: false, message: "categoryId wajib diisi" }, { status: 400 });
    }

    try {
        // Check if category is used by any products
        const [productCount] = await db.select({ count: sql`count(*)` })
            .from(products)
            .where(eq(products.kategoriId, Number(categoryId)));

        if (Number(productCount.count) > 0) {
            return json({ 
                success: false, 
                message: `Kategori tidak dapat dihapus karena masih digunakan oleh ${productCount.count} produk` 
            }, { status: 400 });
        }

        await db.delete(kategoriProduk)
            .where(eq(kategoriProduk.id, Number(categoryId)));

        return json({ success: true, message: "Kategori berhasil dihapus" });
    } catch (err) {
        log.api.error({ err }, 'API DELETE CATEGORY ERROR');
        return json({ success: false, message: "Gagal menghapus kategori: " + err.message }, { status: 500 });
    }
}