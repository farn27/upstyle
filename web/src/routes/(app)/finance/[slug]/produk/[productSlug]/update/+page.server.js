import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, unitBisnis, productVariants, kategoriProduk } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { uploadFromFormFile, isStorageConfigured, extractKeyFromUrl, deleteFile } from '$lib/server/storage';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { processProductImage, validateImage } from '$lib/server/imageProcessor.js';
import { log } from '$lib/server/logger.js';

// 1. LOAD DATA BERDASARKAN SLUG PRODUK
export const load = async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');

    const { slug, productSlug } = params;

    const product = await db.query.products.findFirst({
        where: eq(products.slug, productSlug),
        with: {
            unitBisni: true,
            productVariants: true
        }
    });

    if (!product) throw error(404, { message: "Produk tidak ditemukan" });

    const categories = await db.query.kategoriProduk.findMany({
        where: eq(kategoriProduk.unitId, product.unitId),
        orderBy: (cat, { asc }) => [asc(cat.namaKategori)]
    });

    if (product.unitBisni.slug !== slug) throw error(403, { message: "Salah unit bos!" });
    if (product.unitBisni.userId !== locals.user.id) throw error(403, { message: "Bukan unit Anda" });

    return { product, categories };
};

// 2. ACTION UPDATE
export const actions = {
    default: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: "Sesi habis, login ulang lurd" });

        const formData = await request.formData();
        const { slug } = params;

        const productId = formData.get('id');
        const nama = formData.get('nama');
        const sku = formData.get('sku');
        const hargaBeli = formData.get('hargaBeli');
        const hargaJual = formData.get('hargaJual');
        const minStok = formData.get('minStok');
        const fotoFile = formData.get('foto');
        const kategoriId = formData.get('kategoriId');
        const variantsRaw = formData.get('variants');

        if (!nama) return fail(400, { message: "Nama produk wajib diisi" });
        if (!productId) return fail(400, { message: "ID produk tidak ditemukan" });

        try {
            // Validasi kepemilikan produk
            const existingProduct = await db.query.products.findFirst({
                where: eq(products.id, productId),
                with: { unitBisni: true }
            });
            if (!existingProduct) return fail(404, { message: "Produk tidak ditemukan" });
            if (existingProduct.unitBisni.userId !== locals.user.id) return fail(403, { message: "Bukan produk Anda" });

            const variants = variantsRaw ? JSON.parse(variantsRaw) : [];
            const hasVariant = variants.length > 0 ? 1 : 0;

            // 1. File Upload Logic — Sharp process, lalu R2 cloud atau local fallback
            let fotoString = null;
            if (fotoFile && fotoFile.name && fotoFile.size > 0) {
                const rawBuffer = Buffer.from(await fotoFile.arrayBuffer());

                // Validasi gambar
                const validation = await validateImage(rawBuffer, { maxSizeMB: 5 });
                if (!validation.valid) return fail(400, { message: validation.error });

                // Compress & resize dengan Sharp → WebP
                const processedBuffer = await processProductImage(rawBuffer, { width: 800, height: 800, quality: 80 });

                if (isStorageConfigured()) {
                    if (existingProduct.foto) {
                        const oldKey = extractKeyFromUrl(existingProduct.foto);
                        if (oldKey) deleteFile(oldKey).catch(() => {});
                    }
                    const processedFile = new File([processedBuffer], fotoFile.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
                    const { url } = await uploadFromFormFile(processedFile, 'products');
                    fotoString = url;
                } else {
                    const uploadDir = join(process.cwd(), 'static', 'uploads');
                    mkdirSync(uploadDir, { recursive: true });
                    const namaFileUnik = `${Date.now()}-${fotoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '.webp')}`;
                    const fullPath = join(uploadDir, namaFileUnik);
                    writeFileSync(fullPath, processedBuffer);
                    fotoString = `/uploads/${namaFileUnik}`;
                }
            }

            // 2. Database Transaction
            await db.transaction(async (tx) => {

                // A. Handle Kategori
                let finalKategoriId = null;
                if (kategoriId && kategoriId.trim() !== '') {
                    const parsed = parseInt(kategoriId);
                    if (!isNaN(parsed)) {
                        finalKategoriId = parsed;
                    } else {
                        // Teks baru => cek atau buat kategori baru
                        const existingCat = await tx.query.kategoriProduk.findFirst({
                            where: and(eq(kategoriProduk.namaKategori, kategoriId.trim()), eq(kategoriProduk.unitId, existingProduct.unitId))
                        });
                        if (existingCat) {
                            finalKategoriId = existingCat.id;
                        } else {
                            const [newCat] = await tx.insert(kategoriProduk).values({
                                unitId: existingProduct.unitId,
                                namaKategori: kategoriId.trim()
                            }).$returningId();
                            finalKategoriId = newCat.id;
                        }
                    }
                }

                // B. Hitung stok & harga dari semua varian (jika ada varian)
                let stokUpdate = {};
                let hargaJualUpdate = {};
                if (hasVariant) {
                    const totalStokVarian = variants.reduce((sum, v) => sum + Number(v.stok || 0), 0);
                    stokUpdate = { stok: totalStokVarian };

                    // Harga jual produk utama = harga terendah dari semua varian
                    const hargaJualList = variants
                        .map(v => Number(v.hargaJual || 0))
                        .filter(h => h > 0);
                    if (hargaJualList.length > 0) {
                        hargaJualUpdate = { hargaJual: String(Math.min(...hargaJualList)) };
                    }
                }

                // C. Update Produk
                let updateData = {
                    nama,
                    sku: sku || `SKU-${productId.slice(0, 8).toUpperCase()}`,
                    hargaBeli: String(hargaBeli || '0'),
                    hargaJual: String(hargaJual || '0'),
                    minStok: Number(minStok || 5),
                    kategoriId: finalKategoriId,
                    hasVariant: hasVariant,
                    updatedAt: new Date(),
                    ...stokUpdate,
                    ...hargaJualUpdate  // override hargaJual dengan min varian jika ada varian
                };

                if (fotoString) {
                    updateData.foto = fotoString;
                }

                await tx.update(products)
                    .set(updateData)
                    .where(eq(products.id, productId));

                // D. Update Varian: hapus lama, insert baru
                await tx.delete(productVariants).where(eq(productVariants.productId, productId));

                if (hasVariant) {
                    for (const v of variants) {
                        await tx.insert(productVariants).values({
                            id: crypto.randomUUID(),
                            productId: productId,
                            namaVariasi: v.namaVariasi || 'Default',
                            sku: v.sku || `${sku}-${(v.namaVariasi || 'VAR').substring(0, 3).toUpperCase()}`,
                            hargaBeli: String(v.hargaBeli || 0),
                            hargaJual: String(v.hargaJual || hargaJual || 0),
                            stok: Number(v.stok || 0),
                            createdAt: new Date()
                        });
                    }
                }
            });

            // 3. Hapus SEMUA cache yang relevan
            try {
                const cacheKeysToDelete = [
                    `unit-data-v4:${slug}:${locals.user.id}`,
                    `cache:products_page_v4:${slug}:none:${locals.user.id}`,
                    `cache:products_page_v4:${slug}:all:${locals.user.id}`,
                ];
                await Promise.all(cacheKeysToDelete.map(k => redis.del(k)));
            } catch (e) {
                log.api.warn({ err: e.message }, 'Produk update: cache invalidation failed');
            }

            return { success: true };
        } catch (err) {
            log.api.error({ err: err.message }, 'Produk update: DB error');
            return fail(500, { message: err.message });
        }
    }
};