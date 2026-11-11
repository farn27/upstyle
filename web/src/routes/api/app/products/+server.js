import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants, kategoriProduk, stockLogs } from '$lib/server/schema';
import { eq, and, isNull, sql, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';
import { triggerEvent } from '$lib/server/pusher';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { nowWIB, nowSqlWIB } from '$lib/server/dateUtils';
import { normalisasiJenis } from '$lib/jenisProduk';

/** Hanya URL http(s) atau path /uploads yang boleh disimpan; URI lokal HP (content://, file://) diabaikan. */
/** Galat duplikat SKU (kolom unik) @param {unknown} err */
function skuBentrok(err) {
    const e = /** @type {any} */ (err);
    const pesan = `${e?.message || ''} ${e?.cause?.message || ''} ${e?.code || ''} ${e?.cause?.code || ''}`;
    return /ER_DUP_ENTRY|Duplicate entry/i.test(pesan) && /sku/i.test(pesan);
}

function fotoAman(v) {
    const t = typeof v === 'string' ? v.trim() : '';
    return /^https?:\/\//i.test(t) || t.startsWith('/uploads/') ? t : null;
}

// 1. GET: Ambil semua produk & variasi untuk unitId (with pagination)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        // Riwayat mutasi stok (layar Log Stok di app): ?action=stock-logs[&productId=...]
        if (url.searchParams.get('action') === 'stock-logs') {
            const uid = Number(url.searchParams.get('unitId'));
            const pid = url.searchParams.get('productId');
            const baris = await db.select().from(stockLogs)
                .where(pid ? and(eq(stockLogs.unitId, uid), eq(stockLogs.productId, pid)) : eq(stockLogs.unitId, uid))
                .orderBy(sql`${stockLogs.createdAt} DESC`)
                .limit(200);
            return json({ success: true, data: baris.map(b => ({
                id: b.id, productId: b.productId || '', userId: String(b.userId), unitId: b.unitId,
                stokAwal: b.stokAwal, perubahan: b.perubahan, stokAkhir: b.stokAkhir,
                alasan: b.alasan, keterangan: b.keterangan || '', createdAt: String(b.createdAt || '')
            })) });
        }
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
            minStok: Number(p.minStok || 5),
            kategoriId: p.kategoriId || null,
            kategori: p.kategoriProduk?.namaKategori || 'UMUM',
            unitId: p.unitId,
            foto: p.foto || '',
            barcode: p.barcode || '',
            status: p.status || 'active',
            jenis: normalisasiJenis(p.jenis),
            showInPos: p.showInPos || 0,
            hasVariant: p.hasVariant || 0,
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

        // Koreksi stok manual dari app: { action:'adjust-stock', productId, unitId, perubahan, alasan, keterangan }
        if (body?.action === 'adjust-stock') {
            const perubahan = Math.trunc(Number(body.perubahan));
            if (!body.productId || !Number.isFinite(perubahan) || perubahan === 0) {
                return json({ success: false, message: 'Produk dan jumlah perubahan (bukan 0) wajib diisi' }, { status: 400 });
            }
            const ALASAN = ['MASUK', 'KELUAR', 'PENJUALAN', 'OPNAME', 'RUSAK', 'RETUR', 'ADJUSTMENT'];
            const alasan = ALASAN.includes(String(body.alasan || '').toUpperCase()) ? String(body.alasan).toUpperCase() : 'ADJUSTMENT';
            const prod = await db.query.products.findFirst({ where: eq(products.id, String(body.productId)) });
            if (!prod || !(await unitMilikUser(db, userId, prod.unitId))) return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
            const stokBaru = Number(prod.stok || 0) + perubahan;
            if (stokBaru < 0) return json({ success: false, message: `Stok tidak cukup (tersedia ${prod.stok})` }, { status: 409 });
            await db.transaction(async (tx) => {
                await tx.update(products).set({ stok: stokBaru }).where(eq(products.id, prod.id));
                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(), productId: prod.id, userId: String(userId), unitId: prod.unitId,
                    stokAwal: Number(prod.stok || 0), perubahan, stokAkhir: stokBaru, alasan,
                    keterangan: String(body.keterangan || '').slice(0, 500) || null
                });
            });
            return json({ success: true, message: 'Stok berhasil dikoreksi', data: { stok: stokBaru } });
        }

        // ─── Zod validation ───────────────────────────────────────────────────
        const productPostSchema = z.object({
            nama: z.string().min(1, 'Nama produk wajib diisi').max(255),
            unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            sku: z.string().optional(),
            hargaBeli: z.coerce.number().min(0).default(0),
            hargaJual: z.coerce.number().min(0).default(0),
            stok: z.coerce.number().int().min(0).default(0),
            kategori: z.string().optional(),
            kategoriId: z.coerce.number().int().positive().nullable().optional(),
            minStok: z.coerce.number().int().min(0).max(1000000).optional(),
            barcode: z.string().max(100).nullable().optional(),
            foto: z.string().nullable().optional(),
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

        const newId = (id && id !== "0" && id !== 0) ? String(id) : crypto.randomUUID();
        const slug = `${nama.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')}-${newId.slice(0, 5)}`;
        
        await db.transaction(async (tx) => {
            // Find or create category
            // Kategori: id dari app (harus milik unit ini) atau nama (dibuat bila belum ada)
            let kategoriId = null;
            if (parsed.data.kategoriId) {
                const kat = await tx.query.kategoriProduk.findFirst({ where: and(eq(kategoriProduk.id, parsed.data.kategoriId), eq(kategoriProduk.unitId, Number(unitId))) });
                if (!kat) throw new Error('Kategori tidak ditemukan di unit ini');
                kategoriId = kat.id;
            } else if (kategori) {
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
                    }).then(([r]) => [{ id: r.insertId }]);
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
                jenis: normalisasiJenis(body.jenis),
                nama: nama,
                sku: String(sku || '').trim() || `SKU-${newId.slice(0, 8).toUpperCase()}`,
                slug: slug,
                hargaBeli: String(hargaBeli || 0),
                hargaJual: String(hargaJual || 0),
                stok: finalStok || 0,
                minStok: parsed.data.minStok ?? 5,
                barcode: parsed.data.barcode || null,
                foto: fotoAman(parsed.data.foto),
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

        triggerEvent(`unit-${unitId}`, 'stock-updated', { message: 'Produk ditambahkan dari HP', unitId: Number(unitId) });
        triggerEvent(`unit-${unitId}`, 'notification', { id: Date.now(), unitId: Number(unitId), pesan: `Produk baru ditambahkan: ${nama}`, kategori: 'PRODUK', tipe: 'success', waktu: new Date().toISOString() });
        return json({ success: true, message: "Produk berhasil disimpan", id: newId });
    } catch (err) {
        if (skuBentrok(err)) return json({ success: false, message: 'SKU sudah dipakai produk lain. Ganti SKU-nya.' }, { status: 409 });
        log.api.error({ err }, 'API POST PRODUCT ERROR');
        return json({ success: false, message: "Gagal menyimpan produk" }, { status: 500 });
    }
}

// 3. PUT: Update produk
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, sku, nama, hargaBeli, hargaJual, stok, kategori, variants } = body;

        const existingProduct = await db.query.products.findFirst({
            where: eq(products.id, id)
        });
        if (!existingProduct || !(await unitMilikUser(db, userId, existingProduct.unitId))) return json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });
        // Selalu pakai unit milik produk (bukan unitId kiriman klien) untuk kategori & log stok.
        // (Dulu juga mensyaratkan products.user_id == user login → produk dari impor/template/staf
        //  selalu "Akses ditolak" saat diedit dari HP; kepemilikan unit di atas sudah cukup.)
        const unitId = existingProduct.unitId;

        // Validasi server (dulu stok negatif / bukan angka / tidak dikirim langsung disimpan — F-11)
        const stokLama = Number(existingProduct.stok || 0);
        const stokBaru = stok === undefined || stok === null || stok === '' ? stokLama : Number(stok);
        if (!Number.isInteger(stokBaru) || stokBaru < 0) return json({ success: false, message: 'Stok harus bilangan bulat 0 atau lebih' }, { status: 400 });
        const hb = hargaBeli === undefined ? Number(existingProduct.hargaBeli || 0) : Number(hargaBeli);
        const hj = hargaJual === undefined ? Number(existingProduct.hargaJual || 0) : Number(hargaJual);
        if (!Number.isFinite(hb) || hb < 0 || !Number.isFinite(hj) || hj < 0) return json({ success: false, message: 'Harga harus angka 0 atau lebih' }, { status: 400 });
        const namaBaru = nama === undefined ? existingProduct.nama : String(nama || '').trim();
        if (!namaBaru) return json({ success: false, message: 'Nama produk wajib diisi' }, { status: 400 });
        const selisih = stokBaru - stokLama;

        await db.transaction(async (tx) => {
            // Kategori hanya diubah bila dikirim (dulu selalu dikosongkan jika klien tak mengirim nama kategori)
            let kategoriId = existingProduct.kategoriId;
            if (body.kategoriId !== undefined) {
                if (body.kategoriId === null) kategoriId = null;
                else {
                    const kat = await tx.query.kategoriProduk.findFirst({ where: and(eq(kategoriProduk.id, Number(body.kategoriId)), eq(kategoriProduk.unitId, Number(unitId))) });
                    if (!kat) throw new Error('Kategori tidak ditemukan di unit ini');
                    kategoriId = kat.id;
                }
            } else if (kategori) {
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
                    }).then(([r]) => [{ id: r.insertId }]);
                    kategoriId = newCat.id;
                }
            }

            await tx.update(products)
                .set({
                    nama: namaBaru,
                    // SKU kosong dari HP dulu disimpan sebagai '' → bentrok dengan produk lain ber-SKU kosong
                    // (kolom sku UNIK) dan edit gagal "Gagal memperbarui produk". Kosong = pertahankan SKU lama.
                    ...(sku !== undefined ? { sku: String(sku || '').trim() || existingProduct.sku || `SKU-${String(id).slice(0, 8).toUpperCase()}` } : {}),
                    hargaBeli: String(hb),
                    hargaJual: String(hj),
                    stok: stokBaru,
                    kategoriId: kategoriId,
                    ...(body.minStok !== undefined ? { minStok: Math.max(0, Number(body.minStok) || 0) } : {}),
                    ...(body.barcode !== undefined ? { barcode: body.barcode || null } : {}),
                    ...(body.foto === null || body.foto === '' ? { foto: null } : fotoAman(body.foto) ? { foto: fotoAman(body.foto) } : {}),
                    // App mobile versi lama tidak mengirim jenis: biarkan yang tersimpan
                    ...(body.jenis ? { jenis: normalisasiJenis(body.jenis) } : {})
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

            // Handle variants update - more intelligent approach
            if (Array.isArray(variants)) {
                // Get existing variants
                const existingVariants = await tx.select()
                    .from(productVariants)
                    .where(eq(productVariants.productId, id));

                const existingIds = existingVariants.map(v => v.id);
                const incomingIds = variants.filter(v => v.id).map(v => v.id);

                // Delete variants that are no longer in the incoming list
                const toDelete = existingIds.filter(id => !incomingIds.includes(id));
                if (toDelete.length > 0) {
                    await tx.delete(productVariants)
                        .where(and(
                            eq(productVariants.productId, id),
                            inArray(productVariants.id, toDelete)
                        ));
                }

                // Insert or update variants
                for (const v of variants) {
                    if (v.id && existingIds.includes(v.id)) {
                        // Update existing variant
                        await tx.update(productVariants)
                            .set({
                                namaVariasi: v.namaVariasi,
                                sku: v.sku || `${sku || 'SKU'}-${v.namaVariasi.substring(0, 3).toUpperCase()}`,
                                hargaBeli: String(v.hargaBeli || hargaBeli || 0),
                                hargaJual: String(v.hargaJual || hargaJual || 0),
                                stok: v.stok || 0
                            })
                            .where(and(eq(productVariants.id, v.id), eq(productVariants.productId, id)));
                    } else {
                        // Insert new variant
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

                // Update product hasVariant flag
                await tx.update(products)
                    .set({ hasVariant: variants.length > 0 ? 1 : 0 })
                    .where(eq(products.id, id));
            }
        });

        triggerEvent(`unit-${unitId}`, 'stock-updated', { message: 'Produk diperbarui dari HP', unitId: Number(unitId) });
        triggerEvent(`unit-${unitId}`, 'notification', { id: Date.now(), unitId: Number(unitId), pesan: `Produk diperbarui: ${nama}`, kategori: 'PRODUK', tipe: 'info', waktu: new Date().toISOString() });
        if (selisih !== 0) {
            triggerEvent(`unit-${unitId}`, 'stock-updated', { message: 'Stok diperbarui dari HP', unitId: Number(unitId) });
        }
        return json({ success: true, message: "Produk berhasil diperbarui" });
    } catch (err) {
        if (skuBentrok(err)) return json({ success: false, message: 'SKU sudah dipakai produk lain. Ganti SKU-nya.' }, { status: 409 });
        log.api.error({ err }, 'API PUT PRODUCT ERROR');
        return json({ success: false, message: "Gagal memperbarui produk" }, { status: 500 });
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
        if (!existingProduct || !(await unitMilikUser(db, userId, existingProduct.unitId))) return json({ success: false, message: "Produk tidak ditemukan" }, { status: 404 });

        const unitId = existingProduct.unitId;

        await db.update(products)
            .set({ deletedAt: nowSqlWIB(), status: 'archived' })
            .where(eq(products.id, productId));

        triggerEvent(`unit-${unitId}`, 'stock-updated', { message: 'Produk dihapus dari HP', unitId: Number(unitId) });
        triggerEvent(`unit-${unitId}`, 'notification', { id: Date.now(), unitId: Number(unitId), pesan: 'Produk dipindahkan ke sampah', kategori: 'PRODUK', tipe: 'warning', waktu: new Date().toISOString() });
        return json({ success: true, message: "Produk berhasil dipindahkan ke Sampah" });
    } catch (err) {
        log.api.error({ err }, 'API DELETE PRODUCT ERROR');
        return json({ success: false, message: "Gagal menghapus produk" }, { status: 500 });
    }
}
