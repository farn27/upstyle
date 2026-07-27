import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle'; 
import { products, unitBisnis, productVariants, kategoriProduk } from '$lib/server/schema'; 
import { eq, and } from 'drizzle-orm';
import { pusherServer } from '$lib/server/pusher';
import { inngest } from '$lib/server/inngest';
import { redis } from '$lib/server/redis'; 
import { uploadFromFormFile, isStorageConfigured } from '$lib/server/storage';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

// --- LOAD FUNCTION ---
export const load = async ({ params, locals, parent }) => {
    const parentData = await parent();
    const user = locals.user || parentData.user;

    if (!user) throw redirect(302, '/auth/login');

    const { slug } = params;
    const cacheKey = `unit-data-v4:${slug}:${user.id}`; 

    try {
        // A. CEK REDIS
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
        }

        // B. DB QUERY
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, user.id)),
        });

        if (!unit) throw error(404, { message: "Unit bisnis tidak ditemukan" });

        const categories = await db.query.kategoriProduk.findMany({
            where: eq(kategoriProduk.unitId, unit.id),
            orderBy: (cat, { asc }) => [asc(cat.namaKategori)]
        });

        const resultData = JSON.parse(JSON.stringify({
            unitInfo: unit,
            categories: categories || []
        }));

        // C. SAVE REDIS
        await redis.set(cacheKey, JSON.stringify(resultData), { ex: 3600 });

        return resultData;

    } catch (err) {
        console.error("🔥 Redis/DB Load Error:", err);
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, user.id)),
        });
        const categories = await db.query.kategoriProduk.findMany({ where: eq(kategoriProduk.unitId, unit.id) });
        return JSON.parse(JSON.stringify({ unitInfo: unit, categories: categories || [] }));
    }
};

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
        // 1. Cek Login
        if (!locals.user) return fail(401, { message: "Sesi habis, login ulang lurd" });

        const formData = await request.formData();
        const slugUnit = params.slug;

        // 2. Ambil Data Dasar
        const nama = formData.get('nama');
        const sku = formData.get('sku');
        const kategoriInput = formData.get('kategori_id'); 
        const metadataRaw = formData.get('metadata');
        const variantsRaw = formData.get('variants');
        const fotoFile = formData.get('foto');

        if (!nama) return fail(400, { message: "Nama produk wajib diisi" });

        try {
            // 3. Cek Unit Bisnis
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slugUnit), eq(unitBisnis.userId, locals.user.id)),
                columns: { id: true }
            });

            if (!unit) return fail(404, { message: "Unit invalid" });

            // 4. Upload foto ke R2 (cloud) atau fallback ke local storage
            let fotoString = null;
            if (fotoFile && fotoFile.name && fotoFile.size > 0) {
                if (isStorageConfigured()) {
                    // Cloud storage (R2)
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

            // 5. URUTAN KRUSIAL: Siapkan ID & Slug SEBELUM Transaction
            const newProductId = crypto.randomUUID(); 
            const productSlug = `${createSlug(nama)}-${newProductId.slice(0, 5)}`;

            const metadata = metadataRaw ? JSON.parse(metadataRaw) : {};
            const variants = variantsRaw ? JSON.parse(variantsRaw) : [];
            const hasVariant = variants.length > 0 ? 1 : 0;

            // Hitung harga_jual & stok berdasarkan varian jika ada
            let finalHargaBeli = String(formData.get('harga_beli') || '0');
            let finalHargaJual = String(formData.get('harga_jual') || '0');
            let finalStok = Number(formData.get('stok') || 0);

            if (hasVariant) {
                finalStok = variants.reduce((sum, v) => sum + Number(v.stok || 0), 0);
                const hargaList = variants.map(v => Number(v.hargaJual || 0)).filter(h => h > 0);
                if (hargaList.length > 0) {
                    finalHargaJual = String(Math.min(...hargaList));
                }
            }

            // 6. EKSEKUSI DATABASE
            await db.transaction(async (tx) => {
                
                // A. Handle Kategori (Tetap Utuh sesuai Kode Asli)
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

                // B. Insert Produk (Mapping Slug & Foto Pendek Sudah Aman Jaya)
                await tx.insert(products).values({
                    id: newProductId,
                    userId: locals.user.id,
                    unitId: unit.id,
                    kategoriId: finalKategoriId,
                    nama: nama,
                    foto: fotoString, // Aman masuk ke VARCHAR(255) karena hanya berupa teks alamat file pendek!
                    sku: sku || `SKU-${newProductId.slice(0, 8).toUpperCase()}`,
                    slug: productSlug, 
                    hargaBeli: finalHargaBeli,
                    hargaJual: finalHargaJual,
                    stok: finalStok,
                    minStok: Number(formData.get('min_stok') || 5),
                    metadata: metadata,
                    hasVariant: hasVariant,
                    createdAt: new Date() 
                });

                // C. Insert Varian (Tetap Utuh sesuai Kode Asli)
                if (hasVariant) {
                    for (const v of variants) {
                        await tx.insert(productVariants).values({
                            id: crypto.randomUUID(),
                            productId: newProductId,
                            namaVariasi: v.namaVariasi,
                            sku: v.sku || `${sku}-${v.namaVariasi.substring(0,3).toUpperCase()}`,
                            hargaBeli: String(v.hargaBeli || finalHargaBeli),
                            hargaJual: String(v.hargaJual || finalHargaJual),
                            stok: Number(v.stok || 0),
                            createdAt: new Date()
                        });
                    }
                }
            });

            // 7. INTEGRASI & BERSIHKAN CACHE
            try {
                await redis.del(`unit-data-v4:${slugUnit}:${locals.user.id}`); 
                await redis.del(`cache:products_page_v4:${slugUnit}:none:${locals.user.id}`);
                await redis.del(`cache:products_page_v4:${slugUnit}:all:${locals.user.id}`);
                
                await pusherServer.trigger(`private-unit-${unit.id}`, 'product-added', {
                    message: `Produk baru: ${nama} ditambahkan`,
                    user: locals.user.username
                });
            } catch (e) { console.error("⚠️ Integrasi Error:", e.message); }

            return { type: 'success', message: 'Produk berhasil disimpan!' };

        } catch (err) {
            console.error("🔥 Pesan Error:", err.message);
            return fail(500, { 
                message: "Gagal menyimpan data ke Database", 
                error: err.message
            });
        }
    }
};