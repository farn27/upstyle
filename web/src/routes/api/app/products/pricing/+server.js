import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch products with pricing info for unit (?unitId=)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const productRows = await db.query.products.findMany({
            where: and(
                eq(products.unitId, Number(unitId)),
                isNull(products.deletedAt)
            ),
            with: {
                kategoriProduk: true,
                productVariants: true
            },
            orderBy: [products.nama]
        });

        const data = productRows.map(p => ({
            id: p.id,
            nama: p.nama,
            sku: p.sku || '',
            hargaBeli: Number(p.hargaBeli || 0),
            hargaJual: Number(p.hargaJual || 0),
            stok: p.stok || 0,
            minStok: p.minStok || 0,
            kategoriId: p.kategoriId || null,
            kategoriNama: p.kategoriProduk?.namaKategori || null,
            hasVariant: Boolean(p.hasVariant),
            variants: (p.productVariants || []).map(v => ({
                id: v.id,
                productId: v.productId,
                namaVariasi: v.namaVariasi,
                sku: v.sku || '',
                hargaBeli: Number(v.hargaBeli || 0),
                hargaJual: Number(v.hargaJual || 0),
                stok: v.stok || 0,
                minStok: v.minStok || 0
            }))
        }));

        return json({
            success: true,
            message: "Berhasil mengambil data harga produk",
            data
        });
    } catch (err) {
        log.product.error({ err }, 'API GET PRODUCT PRICING ERROR');
        return json({ success: false, message: "Gagal mengambil data harga produk" }, { status: 500 });
    }
}

// PUT: Update product pricing (single or bulk update)
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, hargaBeli, hargaJual, minStok, items } = body;

        // Support bulk update if items array exists
        if (items && Array.isArray(items) && items.length > 0) {
            const updatedItems = await db.transaction(async (tx) => {
                const results = [];
                for (const item of items) {
                    if (!item.id) continue;

                    const updateFields = {};
                    if (item.hargaBeli !== undefined && item.hargaBeli !== null) {
                        updateFields.hargaBeli = String(item.hargaBeli);
                    }
                    if (item.hargaJual !== undefined && item.hargaJual !== null) {
                        updateFields.hargaJual = String(item.hargaJual);
                    }
                    if (item.minStok !== undefined && item.minStok !== null) {
                        updateFields.minStok = Number(item.minStok);
                    }

                    if (Object.keys(updateFields).length > 0) {
                        if (item.isVariant) {
                            await tx.update(productVariants)
                                .set(updateFields)
                                .where(eq(productVariants.id, String(item.id)));
                        } else {
                            await tx.update(products)
                                .set(updateFields)
                                .where(eq(products.id, String(item.id)));
                        }
                        results.push({ id: item.id, ...updateFields });
                    }
                }
                return results;
            });

            return json({
                success: true,
                message: "Berhasil memperbarui harga produk secara masal",
                data: updatedItems
            });
        }

        // Single product/variant update
        if (!id) {
            return json({ success: false, message: "ID produk atau items wajib diisi" }, { status: 400 });
        }

        const updateFields = {};
        if (hargaBeli !== undefined && hargaBeli !== null) {
            updateFields.hargaBeli = String(hargaBeli);
        }
        if (hargaJual !== undefined && hargaJual !== null) {
            updateFields.hargaJual = String(hargaJual);
        }
        if (minStok !== undefined && minStok !== null) {
            updateFields.minStok = Number(minStok);
        }

        if (Object.keys(updateFields).length === 0) {
            return json({ success: false, message: "Tidak ada data harga yang diubah" }, { status: 400 });
        }

        if (body.isVariant) {
            await db.update(productVariants)
                .set(updateFields)
                .where(eq(productVariants.id, String(id)));

            const updatedVariant = await db.query.productVariants.findFirst({
                where: eq(productVariants.id, String(id))
            });

            return json({
                success: true,
                message: "Berhasil memperbarui harga variasi produk",
                data: updatedVariant
            });
        } else {
            await db.update(products)
                .set(updateFields)
                .where(eq(products.id, String(id)));

            const updatedProduct = await db.query.products.findFirst({
                where: eq(products.id, String(id))
            });

            return json({
                success: true,
                message: "Berhasil memperbarui harga produk",
                data: updatedProduct
            });
        }
    } catch (err) {
        log.product.error({ err }, 'API PUT PRODUCT PRICING ERROR');
        return json({ success: false, message: err.message || "Gagal memperbarui harga produk" }, { status: 500 });
    }
}
