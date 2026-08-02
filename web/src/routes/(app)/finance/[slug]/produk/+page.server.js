import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle'; 
import { products, kategoriProduk, unitBisnis, stockLogs, productVariants } from '$lib/server/schema'; 
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { pusherServer } from '$lib/server/pusher';
import { redis } from '$lib/server/redis'; 
import { uploadFromFormFile, isStorageConfigured } from '$lib/server/storage';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { log } from '$lib/server/logger';

// --- LOAD FUNCTION ---
export async function load({ params, url, locals }) {
    // 1. Cek Login
    const user = locals.user;
    if (!user) throw redirect(302, '/auth/login');

    const unitSlug = params.slug.toLowerCase(); // Dipaksa lowercase biar konsisten
    const historyId = url.searchParams.get('history');

    // 2. STRATEGI CACHE KEY: Menggunakan struktur v4 yang bersih
    const cacheKey = `cache:products_page_v4:${unitSlug}:${historyId || 'none'}:${user.id}`;

    try {
        // 3. PINTU UTAMA REDIS: Cek cache
        let cachedPageData = null;
        if (redis) {
            try {
                cachedPageData = await redis.get(cacheKey);
            } catch (redisErr) {
                log.api.warn({ err: redisErr.message }, '[Redis] Gagal get cache products');
            }
        }
        if (cachedPageData) {
            return typeof cachedPageData === 'string'
                ? JSON.parse(cachedPageData)
                : cachedPageData;
        }

        // 4. Ambil Data Unit Bisnis
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, unitSlug), eq(unitBisnis.userId, user.id)),
        });

        if (!unit) {
            log.api.warn({ unitSlug }, 'UNIT NOT FOUND');
            return { unitInfo: null, products: [], categories: [], stockHistory: [] };
        }

        // 5. Ambil Produk & Kategori secara Paralel
        const [categoryRows, allProductsRaw, stockHistory] = await Promise.all([
            db.query.kategoriProduk.findMany({
                where: eq(kategoriProduk.unitId, unit.id),
                orderBy: (cat, { asc }) => [asc(cat.namaKategori)]
            }),
            
            // 2-step: TiDB tidak support LATERAL JOIN dari Drizzle `with:`
            db.select().from(products)
                .where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)))
                .orderBy(desc(products.createdAt)),

            historyId ? fetchStockLogs(historyId, unit.id) : []
        ]);

        // Fetch variants & kategori secara terpisah (2-step pattern)
        const productIds = allProductsRaw.map(p => p.id);
        let variantsMap = {}, kategoriMap = {};
        if (productIds.length > 0) {
            const [variantsList, kategoriList] = await Promise.all([
                db.select().from(productVariants).where(inArray(productVariants.productId, productIds)),
                db.select().from(kategoriProduk).where(eq(kategoriProduk.unitId, unit.id))
            ]);
            variantsList.forEach(v => {
                if (!variantsMap[v.productId]) variantsMap[v.productId] = [];
                variantsMap[v.productId].push(v);
            });
            kategoriList.forEach(k => { kategoriMap[k.id] = k; });
        }
        const allProducts = allProductsRaw.map(p => ({
            ...p,
            productVariants: variantsMap[p.id] || [],
            kategoriProduk: kategoriMap[p.kategoriId] || null
        }));


        // 6. FILTER SERIALIZATION (Anti Lemot)
        const finalPageData = JSON.parse(JSON.stringify({
            unitInfo: unit,
            products: allProducts || [],
            categories: categoryRows || [],
            stockHistory: stockHistory || [],
            historyId: historyId,
            slug: unitSlug
        }));

        // 7. SIMPAN KE REDIS
        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(finalPageData), { ex: 300 });
            } catch (redisErr) {
                log.api.warn({ err: redisErr.message }, '[Redis] Gagal set cache products');
            }
        }

        return finalPageData;

    } catch (err) {
        log.api.error({ err }, 'SERVER ERROR LOAD PRODUCT');
        return { unitInfo: null, products: [], categories: [], stockHistory: [] };
    }
}

function createSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     
        .replace(/[^\w\-]+/g, '') 
        .replace(/\-\-+/g, '-');  
}

// --- ACTIONS ---
export const actions = {
    createProduct: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: "Sesi habis, login ulang lurd" });

        const formData = await request.formData();
        const slugUnit = params.slug.toLowerCase(); // Dipaksa lowercase

        const nama = formData.get('nama');
        const sku = formData.get('sku');
        const kategoriInput = formData.get('kategoriId'); 
        const metadataRaw = formData.get('metadata');
        const variantsRaw = formData.get('variants');
        const fotoFile = formData.get('foto');

        if (!nama) return fail(400, { message: "Nama produk wajib diisi" });

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slugUnit), eq(unitBisnis.userId, locals.user.id)),
                columns: { id: true }
            });

            if (!unit) return fail(404, { message: "Unit invalid" });

            // File Upload — R2 cloud atau local fallback
            let fotoString = null;
            if (fotoFile && fotoFile.name && fotoFile.size > 0) {
                if (isStorageConfigured()) {
                    const { url } = await uploadFromFormFile(fotoFile, 'products');
                    fotoString = url;
                } else {
                    // Fallback local (development only)
                    const uploadDir = join(process.cwd(), 'static', 'uploads');
                    mkdirSync(uploadDir, { recursive: true });
                    const namaFileUnik = `${Date.now()}-${fotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                    const fullPath = join(uploadDir, namaFileUnik);
                    const buffer = Buffer.from(await fotoFile.arrayBuffer());
                    writeFileSync(fullPath, buffer);
                    fotoString = `/uploads/${namaFileUnik}`;
                }
            }

            const newProductId = crypto.randomUUID(); 
            const productSlug = `${createSlug(nama)}-${newProductId.slice(0, 5)}`;

            const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
            const variants = variantsRaw ? JSON.parse(variantsRaw) : [];
            const hasVariant = variants.length > 0 ? 1 : 0;

            await db.transaction(async (tx) => {
                let finalKategoriId = null;
                if (kategoriInput) {
                    if (!isNaN(kategoriInput)) {
                        finalKategoriId = parseInt(kategoriInput);
                    } else {
                        const existingCat = await tx.query.kategoriProduk.findFirst({
                            where: and(eq(kategoriProduk.namaKategori, kategoriInput), eq(kategoriProduk.unitId, unit.id))
                        });
                        if (existingCat) {
                            finalKategoriId = existingCat.id;
                        } else {
                            const [newCat] = await tx.insert(kategoriProduk).values({
                                unitId: unit.id,
                                namaKategori: kategoriInput
                            }).$returningId();
                            finalKategoriId = newCat.id;
                        }
                    }
                }

                await tx.insert(products).values({
                    id: newProductId,
                    userId: locals.user.id,
                    unitId: unit.id,
                    kategoriId: finalKategoriId,
                    nama: nama,
                    foto: fotoString,
                    sku: sku || `SKU-${newProductId.slice(0, 8).toUpperCase()}`,
                    slug: productSlug, 
                    hargaBeli: String(formData.get('hargaBeli') || '0'),
                    hargaJual: String(formData.get('hargaJual') || '0'),
                    stok: Number(formData.get('stok') || 0),
                    minStok: Number(formData.get('minStok') || 5),
                    metadata: metadata,
                    hasVariant: hasVariant,
                    createdAt: new Date() 
                });

                if (hasVariant) {
                    for (const v of variants) {
                        await tx.insert(productVariants).values({
                            id: crypto.randomUUID(),
                            productId: newProductId,
                            namaVariasi: v.namaVariasi,
                            sku: v.sku || `${sku}-${v.namaVariasi.substring(0,3).toUpperCase()}`,
                            hargaBeli: String(v.hargaBeli || 0),
                            hargaJual: String(v.hargaJual || formData.get('hargaJual') || 0),
                            stok: Number(v.stok || 0),
                            createdAt: new Date()
                        });
                    }
                }
            });

            // 7. INTEGRASI & HAPUS AUTOMATIC PAGE CACHE
            try {
                // Di-loop/hapus menggunakan pola key yang sama persis dengan load function
                if (redis) {
                    await redis.del(`cache:products_page_v4:${slugUnit}:none:${locals.user.id}`);
                    await redis.del(`cache:products_page_v4:${slugUnit}:all:${locals.user.id}`);
                }

                if (pusherServer) {
                    await pusherServer.trigger(`private-unit-${unit.id}`, 'product-added', {
                        message: `Produk baru: ${nama} ditambahkan`,
                        user: locals.user.username
                    });
                }
            } catch (e) { log.api.warn({ err: e.message }, 'Produk createProduct: integrasi error'); }

            return { type: 'success', message: 'Produk berhasil disimpan!' };

        } catch (err) {
            log.api.error({ err: err.message }, 'Produk createProduct: DB error');
            return fail(500, { message: "Gagal menyimpan data ke Database", error: err.message });
        }
    }
};

// Fungsi Helper Stok
async function fetchStockLogs(hid, uid) {
    try {
        const baseQuery = db.select({
            id: stockLogs.id,
            perubahan: stockLogs.perubahan,
            stokAwal: stockLogs.stokAwal,
            stokAkhir: stockLogs.stokAkhir,
            keterangan: stockLogs.keterangan,
            alasan: stockLogs.alasan,
            createdAt: stockLogs.createdAt,
            productName: products.nama
        })
        .from(stockLogs)
        .innerJoin(products, eq(stockLogs.productId, products.id))
        .where(eq(products.unitId, uid));

        if (hid !== 'all') {
            return await baseQuery.where(eq(stockLogs.productId, hid)).orderBy(desc(stockLogs.createdAt));
        }
        return await baseQuery.orderBy(desc(stockLogs.createdAt)).limit(50);
    } catch (e) {
        log.api.error({ err: e }, 'Gagal load stock logs');
        return [];
    }
}