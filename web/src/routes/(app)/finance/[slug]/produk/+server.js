import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants, stockLogs, unitBisnis, riwayatAksi, kategoriProduk } from '$lib/server/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import crypto from 'crypto';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { nowWIB } from '$lib/server/dateUtils';
import { log } from '$lib/server/logger';

/**
 * @param {unknown} error
 */
function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Helper Riwayat (Non-Blocking / Fire-and-Forget style)
 * @param {number|null} userId
 * @param {number} unitId
 * @param {string} pesan
 * @param {string} kategori
 * @param {string} link
 * @param {string} [tipe]
 */
async function simpanRiwayat(userId, unitId, pesan, kategori, link, tipe = 'info') {
    try {
        const actorId = Number(userId || 0);
        await db.insert(riwayatAksi).values({
            userId: actorId,
            unitId: Number(unitId),
            pesan,
            kategori,
            link,
            tipe
        });
    } catch (e) {
        log.api.error({ err: e?.message }, '[riwayat] Gagal simpan riwayat');
    }
}

export async function POST({ request, cookies }) {
    try {
        const ownerUserId = await getCurrentUserId(cookies);
        const body = await request.json();
        const {
            nama,
            unit_id: unitSlug,
            foto,
            sku,
            harga_beli,
            harga_jual,
            stok,
            min_stok,
            variasi,
            kategori_id,
            metadata,
            unit_id_real,
            newKategoriName
        } = body;
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug });
        if (!ownerUserId && !staffSession) return json({ error: "Unauthorized" }, { status: 401 });

        // Validasi Unit & Ambil ID Unit jika belum ada
        let realUnitId = unit_id_real;
        
        if (!realUnitId) {
            const unitRow = await db.query.unitBisnis.findFirst({
                where: eq(unitBisnis.slug, unitSlug),
                columns: { id: true, userId: true }
            });
            if (!unitRow) return json({ error: "Unit tidak ditemukan atau akses ditolak" }, { status: 404 });
            // Validate access: owner or staff of the same unit
            const isOwner = ownerUserId && Number(unitRow.userId) === Number(ownerUserId);
            const isStaff = staffSession && Number(staffSession.unit_id) === Number(unitRow.id) && Number(staffSession.owner_id) === Number(unitRow.userId);
            if (!isOwner && !isStaff) return json({ error: "Akses ditolak ke unit ini" }, { status: 403 });
            realUnitId = unitRow.id;
        }

        const newProductId = crypto.randomUUID();
        const hasVariasi = Array.isArray(variasi) && variasi.length > 0;
        
        let skuFinal = (sku && sku.trim() !== "") 
            ? sku.trim() 
            : `${nama.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-5)}`;
            
        const totalStok = hasVariasi 
            ? variasi.reduce((acc, curr) => acc + (Number(curr.stok) || 0), 0) 
            : (Number(stok) || 0);
            
        const metadataString = metadata || {};
        const productOwnerId = ownerUserId || (staffSession && staffSession.owner_id);
        const actorIdPost = ownerUserId || (staffSession && staffSession.id) || null;

        await db.transaction(async (tx) => {
            // --- LOGIKA KATEGORI ---
            let finalKategoriId = kategori_id;

            if (!finalKategoriId && newKategoriName) {
                const cleanName = newKategoriName.trim().toUpperCase();
                
                const existing = await tx.query.kategoriProduk.findFirst({
                    where: eq(kategoriProduk.namaKategori, cleanName)
                });

                if (existing) {
                    finalKategoriId = existing.id;
                } else {
                    const [katResult] = await tx.insert(kategoriProduk).values({
                        namaKategori: cleanName,
                        unitId: realUnitId
                    });
                    finalKategoriId = katResult.insertId;
                }
            }
            
            finalKategoriId = (isNaN(Number(finalKategoriId)) || !finalKategoriId) ? null : Number(finalKategoriId);

            // --- INSERT PRODUCT ---
            await tx.insert(products).values({
                id: newProductId,
                userId: productOwnerId,
                unitId: realUnitId,
                kategoriId: finalKategoriId,
                nama,
                slug: `${skuFinal}-${Date.now().toString().slice(-4)}`,
                foto: foto || '',
                sku: skuFinal,
                hargaBeli: harga_beli || 0,
                hargaJual: harga_jual || 0,
                stok: totalStok,
                minStok: min_stok || 0,
                metadata: metadataString,
                hasVariant: hasVariasi ? 1 : 0
            });

            // --- INSERT VARIANTS ---
            if (hasVariasi) {
                for (let i = 0; i < variasi.length; i++) {
                    const v = variasi[i];
                    await tx.insert(productVariants).values({
                        id: crypto.randomUUID(),
                        productId: newProductId,
                        namaVariasi: v.nama_variasi,
                        sku: `${skuFinal}-V${i + 1}`,
                        hargaBeli: harga_beli || 0,
                        hargaJual: v.harga_jual || 0,
                        stok: v.stok || 0,
                        minStok: v.min_stok || 0
                    });
                }
            }
        });
        
        simpanRiwayat(actorIdPost, realUnitId, `Menambah produk baru: ${nama}`, 'Produk', `/finance/${unitSlug}/produk`, 'success');
        return json({ success: true, message: "Produk berhasil dibuat", id: newProductId });

    } catch (error) {
        log.api.error({ err: getErrorMessage(error) }, '[produk] Gagal POST Produk');
        return json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PUT({ request, cookies }) {
    try {
        const ownerUserId = await getCurrentUserId(cookies);
        const staffSession = await getVerifiedStaffSession(cookies);
        if (!ownerUserId && !staffSession) return json({ error: "Unauthorized" }, { status: 401 });

        const actorIdPut = ownerUserId || (staffSession && staffSession.id) || null;
        const body = await request.json();
        const { 
            id, nama, foto, sku, harga_beli, harga_jual, 
            stok, min_stok, kategori_id, metadata, status, barcode, videoUrl,
            weightGrams, lengthCm, widthCm, heightCm
        } = body;

        // Cek Data Lama & Validasi Kepemilikan
        const oldData = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: { unitBisni: true }
        });

        if (!oldData) return json({ error: "Produk tidak ditemukan" }, { status: 404 });

        const isOwner = ownerUserId && Number(oldData.userId) === Number(ownerUserId);
        const isStaff = staffSession && Number(staffSession.owner_id) === Number(oldData.userId) && Number(staffSession.unit_id) === Number(oldData.unitId);
        if (!isOwner && !isStaff) return json({ error: "Produk tidak ditemukan atau akses ditolak" }, { status: 404 });

        const stokLama = Number(oldData.stok);
        const realUnitId = oldData.unitId;
        const unitSlug = oldData.unitBisni?.slug || '';
        const stokInputBaru = Number(stok);
        const selisih = stokInputBaru - stokLama;
        
        const metadataString = metadata || {};
        const productOwnerId = ownerUserId || (staffSession && staffSession.owner_id);

        await db.transaction(async (tx) => {
            await tx.update(products)
                .set({
                    nama, foto: foto || '', sku: sku || '', barcode: barcode || '', 
                    status: status || 'active', videoUrl: videoUrl || '',
                    weightGrams: weightGrams || 0, lengthCm: lengthCm || 0, 
                    widthCm: widthCm || 0, heightCm: heightCm || 0,
                    hargaBeli: harga_beli || 0, hargaJual: harga_jual || 0, 
                    stok: stokInputBaru, minStok: min_stok || 0, 
                    kategoriId: (isNaN(Number(kategori_id)) || !kategori_id) ? null : Number(kategori_id), 
                    metadata: metadataString
                })
                .where(and(eq(products.id, id), eq(products.userId, productOwnerId)));

            if (selisih !== 0) {
                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(),
                    productId: id,
                    userId: String(actorIdPut),
                    unitId: realUnitId,
                    stokAwal: stokLama,
                    perubahan: selisih,
                    stokAkhir: stokInputBaru,
                    alasan: 'OPNAME',
                    keterangan: 'Penyesuaian stok manual via edit produk'
                });
            }
        });

        simpanRiwayat(actorIdPut, realUnitId, `Update produk: ${nama}`, 'Produk', `/finance/${unitSlug}/produk`, 'info');
        return json({ success: true, message: "Produk diperbarui" });
    } catch (error) {
        log.api.error({ err: getErrorMessage(error) }, '[produk] Gagal PUT Produk');
        return json({ error: getErrorMessage(error) }, { status: 500 });
    }
}

export async function PATCH({ request, cookies }) {
    const ownerUserId = await getCurrentUserId(cookies);
    const staffSession = await getVerifiedStaffSession(cookies);
    if (!ownerUserId && !staffSession) return json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const action = typeof body.action === 'string' ? body.action : '';
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
        return json({ error: "Missing product IDs" }, { status: 400 });
    }

    if (!['soft-delete', 'restore'].includes(action)) {
        return json({ error: "Unknown action" }, { status: 400 });
    }

    const effectiveUserId = ownerUserId || (staffSession && staffSession.owner_id);
    const productsList = await db.query.products.findMany({
        where: and(eq(products.userId, effectiveUserId), inArray(products.id, ids)),
        columns: { id: true, unitId: true }
    });

    if (productsList.length === 0) {
        return json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const unitIds = [...new Set(productsList.map((p) => p.unitId).filter(Boolean))];

    try {
        await db.transaction(async (tx) => {
            await tx.update(products)
                .set({
                    deletedAt: action === 'soft-delete' ? nowWIB().toISOString() : null,
                    status: action === 'soft-delete' ? 'archived' : 'active'
                })
                .where(and(eq(products.userId, effectiveUserId), inArray(products.id, ids)));
        });

        if (unitIds.length > 0) {
            const units = await db.query.unitBisnis.findMany({
                where: inArray(unitBisnis.id, unitIds),
                columns: { slug: true, userId: true }
            });

            const cacheKeys = units.flatMap((unit) => [
                `unit-data-v3:${unit.slug}:${effectiveUserId}`,
                `cache:products_page_v4:${unit.slug}:none:${effectiveUserId}`,
                `cache:products_page_v4:${unit.slug}:all:${effectiveUserId}`
            ]);

            if (redis) {
                await Promise.all(cacheKeys.map((key) => redis.del(key)));
            }
        }
    } catch (error) {
        log.api.error({ err: getErrorMessage(error) }, '[produk] Gagal PATCH Produk');
        return json({ error: "Gagal memproses aksi produk" }, { status: 500 });
    }

    const actionText = action === 'soft-delete' ? 'dipindahkan ke Sampah' : 'dikembalikan';
    return json({ success: true, message: `${productsList.length} produk berhasil ${actionText}` });
}

export async function DELETE({ url, locals, cookies }) {
    try {
        const ownerUserId = locals.user?.id;
        const staffSession = await getVerifiedStaffSession(cookies);
        if (!ownerUserId && !staffSession) return json({ error: "Unauthorized" }, { status: 401 });

        const actorIdDel = ownerUserId || (staffSession && staffSession.id) || null;

        const id = url.searchParams.get('id');
        if (!id) return json({ error: "Missing ID" }, { status: 400 });

        const produk = await db.query.products.findFirst({
            where: eq(products.id, id),
            with: { unitBisni: true }
        });

        if (!produk) return json({ error: "Produk tidak ditemukan" }, { status: 404 });

        const unitSlug = produk.unitBisni?.slug || '';

        // Validate permission: owner or staff of the unit who matches owner_id
        const productOwnerId = produk.userId || null;
        const productUnitId = produk.unitBisni?.id || produk.unitId || null;
        const isOwner = ownerUserId && Number(productOwnerId) === Number(ownerUserId);
        const isStaff = staffSession && Number(staffSession.owner_id) === Number(productOwnerId) && Number(staffSession.unit_id) === Number(productUnitId);
        if (!isOwner && !isStaff) return json({ error: "Unauthorized" }, { status: 403 });

        await db.transaction(async (tx) => {
            await tx.update(products)
                .set({ deletedAt: nowWIB().toISOString(), status: 'archived' })
                .where(eq(products.id, id));
        });

        try {
            if (redis) {
                await Promise.all([
                    redis.del(`unit-data-v3:${unitSlug}:${actorIdDel}`),
                    redis.del(`cache:products_page_v4:${unitSlug}:none:${actorIdDel}`),
                    redis.del(`cache:products_page_v4:${unitSlug}:all:${actorIdDel}`),
                ]);
            }
        } catch (e) {}

        return json({ success: true, message: `Produk berhasil dipindahkan ke Sampah` });
    } catch (error) {
        log.api.error({ err: getErrorMessage(error) }, '[produk] Gagal DELETE Produk');
        return json({ error: getErrorMessage(error) }, { status: 500 });
    }
}