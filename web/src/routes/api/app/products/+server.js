import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants, kategoriProduk, stockLogs } from '$lib/server/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { triggerEvent } from '$lib/server/pusher';
import { nowWIB } from '$lib/server/dateUtils';

// 1. GET: Ambil semua produk & variasi untuk unitId (with pagination)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const pagination = parsePagination(url);

        // Get total count
        const [totalResult] = await db.select({ count: sql`count(*)` }).from(products).where(
            and(eq(products.unitId, Number(unitId)), isNull(products.deletedAt))
        );
        const total = Number(totalResult.count) || 0;

        // Get paginated products
        const productRows = await db.query.products.findMany({
            where: and(eq(products.unitId, Number(unitId)), isNull(products.deletedAt)),
            with: {
                productVariants: true,
                kategoriProduk: true
            },
            orderBy: [products.id],
            limit: pagination.limit,
            offset: pagination.offset
        });

        // Map to structure expected by mobile app
        const data = productRows.map(p => ({
            id: p.id,
            sku: p.sku || '',
            nama: p.nama,
            hargaBeli: Number(p.hargaBeli || 0),
            hargaJual: Number(p.hargaJual || 0),
            stok: p.stok || 0,
            kategori: p.kategoriProduk?.namaKategori || 'UMUM',
            unitId: p.unitId,
            variants: (p.productVariants || []).map(v => ({
                id: v.id,
                productId: v.productId,
                namaVariasi: v.namaVariasi,
                sku: v.sku || '',
                hargaBeli: Number(v.hargaBeli || p.hargaBeli || 0),
                hargaJual: Number(v.hargaJual || p.hargaJual || 0),
                stok: v.stok || 0
            }))
        }));

        return json(paginatedResponse(data, total, pagination));
    } catch (err) {
        log.api.error({ err }, 'API GET PRODUCTS ERROR');
        return json({ success: false, message: "Gagal mengambil data produk" }, { status: 500 });
    }
}

// 2. POST: Tambah produk baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();

        // ─── Zod validation ───────────────────────────────────────────────────
        const productPostSchema = z.object({
            nama: z.string().min(1, 'Nama produk wajib diisi').max(255),
            unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            sku: z.string().optional(),
            hargaBeli: z.coerce.number().min(0).default(0),
            hargaJual: z.coerce.number().min(0).default(0),
            stok: z.coerce.number().int().min(0).default(0),
            kategori: z.string().optional(),
            variants: z.array(z.object({
                namaVariasi: z.string().min(1),
                sku: z.string().optional(),
                hargaBeli: z.coerce.number().min(0).default(0),
                hargaJual: z.coerce.number().min(0).default(0),
                stok: z.coerce.number().int().min(0).default(0),
            })).optional().default([]),
        });
        const parsed = productPostSchema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input produk tidak valid';
            return json({ success: false, message: msg }, { status: 400 });
        }
        // ─────────────────────────────────────────────────────────────────────

        const { id, sku, nama, hargaBeli, hargaJual, stok, kategori, unitId, variants } = body;

        const newId = id || crypto.randomUUID();
        const slug = `${nama.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${newId.slice(0, 5)}`;
        
        await db.transaction(async (tx) => {
            // Find or create category
            let kategoriId = null;
            if (kategori) {
                const cleanCatName = kategori.trim().toUpperCase();
                const existingCat = await tx.query.kategoriProduk.findFirst({
                    where: and(eq(kategoriProduk.namaKategori, cleanCatName), eq(kategoriProduk.unitId, Number(unitId)))
                });
                if (existingCat) {
                    kategoriId = existingCat.id;
                } else {
                    const [newCat] = await tx.insert(kategoriProduk).values({
                        unitId: Number(unitId),
                        namaKategori: cleanCatName
                    }).$returningId();
                    kategoriId = newCat.id;
                }
            }

            const hasVariant = Array.isArray(variants) && variants.length > 0;
            const finalStok = hasVariant ? variants.reduce((sum, v) => sum + (v.stok || 0), 0) : stok;

            // Insert main product
            await tx.insert(products).values({
                id: newId,
                userId: userId,
                unitId: Number(unitId),
                kategoriId: kategoriId,
                nama: nama,
                sku: sku || `SKU-${newId.slice(0, 8).toUpperCase()}`,
                slug: slug,
                hargaBeli: String(hargaBeli || 0),
                hargaJual: String(hargaJual || 0),
                stok: finalStok || 0,
                minStok: 5,
                hasVariant: hasVariant ? 1 : 0
            });

            // Insert variants
            if (hasVariant) {
                for (const v of variants) {
                    await tx.insert(productVariants).values({
                        id: v.id || crypto.randomUUID(),
                        productId: newId,
                        namaVariasi: v.namaVariasi,
                        sku: v.sku || `${sku || 'SKU'}-${v.namaVariasi.substring(0, 3).toUpperCase()}`,
                        hargaBeli: String(v.hargaBeli || hargaBeli || 0),
                        hargaJual: String(v.hargaJual || hargaJual || 0),
                        stok: v.stok || 0
                    });
                }
            }
        });

        triggerEvent(`private-unit-${unitId}`, 'product-added', { message: 'Produk ditambahkan dari HP' });
        return json({ success: true, message: "Produk berhasil disimpan", id: newId });
    } catch (err) {
        log.api.error({ err }, 'API POST PRODUCT ERROR');
        return json({ success: false, message: "Gagal menyimpan produk: " + err.message }, { status: 500 });
    }
}

// 3. PUT: Update produk
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, sku, nama, hargaBeli, hargaJual, stok, kategori, unitId, variants } = body;

        const existingProduct = await db.query.products.findFirst({
            where: eq(products.id, id)
        });
        if (!existingProduct) return json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
        if (Number(existingProduct.userId) !== Number(userId)) return json({ success: false, message: "Akses ditolak" }, { status: 403 });

        const stokLama = Number(existingProduct.stok || 0);
        const stokBaru = Number(stok || 0);
        const selisih = stokBaru - stokLama;

        await db.transaction(async (tx) => {
            let kategoriId = null;
            if (kategori) {
                const cleanCatName = kategori.trim().toUpperCase();
                const existingCat = await tx.query.kategoriProduk.findFirst({
                    where: and(eq(kategoriProduk.namaKategori, cleanCatName), eq(kategoriProduk.unitId, Number(unitId)))
                });
                if (existingCat) {
                    kategoriId = existingCat.id;
                } else {
                    const [newCat] = await tx.insert(kategoriProduk).values({
                        unitId: Number(unitId),
                        namaKategori: cleanCatName
                    }).$returningId();
                    kategoriId = newCat.id;
                }
            }

            await tx.update(products)
                .set({
                    nama: nama,
                    sku: sku,
                    hargaBeli: String(hargaBeli || 0),
                    hargaJual: String(hargaJual || 0),
                    stok: stokBaru,
                    kategoriId: kategoriId
                })
                .where(eq(products.id, id));

            // Write stock change log if stock changed
            if (selisih !== 0) {
                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(),
                    productId: id,
                    userId: String(userId),
                    unitId: Number(unitId),
                    stokAwal: stokLama,
                    perubahan: selisih,
                    stokAkhir: stokBaru,
                    alasan: 'OPNAME',
                    keterangan: 'Penyesuaian stok via mobile app'
                });
            }

            // Sync variants: simple approach, delete old and insert new
            await tx.delete(productVariants).where(eq(productVariants.productId, id));
            if (Array.isArray(variants) && variants.length > 0) {
                for (const v of variants) {
                    await tx.insert(productVariants).values({
                        id: v.id || crypto.randomUUID(),
                        productId: id,
                        namaVariasi: v.namaVariasi,
                        sku: v.sku || `${sku || 'SKU'}-${v.namaVariasi.substring(0, 3).toUpperCase()}`,
                        hargaBeli: String(v.hargaBeli || hargaBeli || 0),
                        hargaJual: String(v.hargaJual || hargaJual || 0),
                        stok: v.stok || 0
                    });
                }
            }
        });

        triggerEvent(`private-unit-${unitId}`, 'product-added', { message: 'Produk diperbarui dari HP' });
        if (selisih !== 0) {
            triggerEvent(`private-unit-${unitId}`, 'stock-updated', { message: 'Stok diperbarui dari HP' });
        }
        return json({ success: true, message: "Produk berhasil diperbarui" });
    } catch (err) {
        log.api.error({ err }, 'API PUT PRODUCT ERROR');
        return json({ success: false, message: "Gagal memperbarui produk: " + err.message }, { status: 500 });
    }
}

// 4. DELETE: Hapus produk (soft-delete)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const productId = url.searchParams.get('productId');
    if (!productId) return json({ success: false, message: "productId wajib diisi" }, { status: 400 });

    try {
        const existingProduct = await db.query.products.findFirst({
            where: eq(products.id, productId)
        });
        if (!existingProduct) return json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
        if (Number(existingProduct.userId) !== Number(userId)) return json({ success: false, message: "Akses ditolak" }, { status: 403 });

        const unitId = existingProduct.unitId;

        await db.update(products)
            .set({ deletedAt: nowWIB().toISOString(), status: 'archived' })
            .where(eq(products.id, productId));

        triggerEvent(`private-unit-${unitId}`, 'product-added', { message: 'Produk dihapus dari HP' });
        return json({ success: true, message: "Produk berhasil dipindahkan ke Sampah" });
    } catch (err) {
        log.api.error({ err }, 'API DELETE PRODUCT ERROR');
        return json({ success: false, message: "Gagal menghapus produk" }, { status: 500 });
    }
}
