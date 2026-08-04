import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants, kategoriProduk } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';

// POST /api/app/products/import
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            items: z.array(z.object({
                nama: z.string().min(1),
                sku: z.string().optional(),
                hargaBeli: z.coerce.number().min(0).default(0),
                hargaJual: z.coerce.number().min(0).default(0),
                stok: z.coerce.number().int().min(0).default(0),
                kategori: z.string().optional(),
                hasVariant: z.coerce.number().int().min(0).max(1).optional().default(0),
                variants: z.array(z.object({
                    namaVariasi: z.string().min(1),
                    sku: z.string().optional(),
                    hargaBeli: z.coerce.number().min(0).default(0),
                    hargaJual: z.coerce.number().min(0).default(0),
                    stok: z.coerce.number().int().min(0).default(0)
                })).optional().default([])
            })).min(1, 'items wajib diisi')
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Data import tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { unitId, items } = parsed.data;

        const results = await db.transaction(async (tx) => {
            const imported = [];
            const errors = [];

            for (const item of items) {
                try {
                    let kategoriId = null;
                    if (item.kategori && item.kategori.trim()) {
                        const cleanName = item.kategori.trim().toUpperCase();
                        const existingCat = await tx.query.kategoriProduk.findFirst({
                            where: and(
                                eq(kategoriProduk.namaKategori, cleanName),
                                eq(kategoriProduk.unitId, Number(unitId))
                            )
                        });

                        if (existingCat) {
                            kategoriId = existingCat.id;
                        } else {
                            const [newCat] = await tx.insert(kategoriProduk).values({
                                unitId: Number(unitId),
                                namaKategori: cleanName
                            }).$returningId();
                            kategoriId = newCat.id;
                        }
                    }

                    const hasVariant = Array.isArray(item.variants) && item.variants.length > 0;
                    const finalStok = hasVariant
                        ? item.variants.reduce((sum, v) => sum + Number(v.stok || 0), 0)
                        : Number(item.stok || 0);

                    const newId = crypto.randomUUID();
                    const slug = `${item.nama.toLowerCase().replace(/[^a-z0-9\\s-]/g, '').replace(/\\s+/g, '-')}-${newId.slice(0, 5)}`;
                    const sku = item.sku || `SKU-${newId.slice(0, 8).toUpperCase()}`;

                    await tx.insert(products).values({
                        id: newId,
                        userId,
                        unitId: Number(unitId),
                        kategoriId,
                        nama: item.nama,
                        sku,
                        slug,
                        hargaBeli: String(Number(item.hargaBeli || 0)),
                        hargaJual: String(Number(item.hargaJual || 0)),
                        stok: Number(finalStok || 0),
                        minStok: 5,
                        hasVariant: hasVariant ? 1 : 0
                    });

                    if (hasVariant) {
                        for (const v of item.variants) {
                            await tx.insert(productVariants).values({
                                id: crypto.randomUUID(),
                                productId: newId,
                                namaVariasi: v.namaVariasi,
                                sku: v.sku || `${sku}-${v.namaVariasi.substring(0, 3).toUpperCase()}`,
                                hargaBeli: String(Number(v.hargaBeli || item.hargaBeli || 0)),
                                hargaJual: String(Number(v.hargaJual || item.hargaJual || 0)),
                                stok: Number(v.stok || 0)
                            });
                        }
                    }

                    imported.push({ nama: item.nama, sku, id: newId });
                } catch (itemErr) {
                    errors.push({ nama: item.nama, message: itemErr.message || 'Gagal import' });
                }
            }

            return { imported, errors };
        });

        return json({
            success: true,
            message: `Import selesai. Berhasil: ${results.imported.length}, Gagal: ${results.errors.length}`,
            data: {
                imported: results.imported,
                errors: results.errors
            }
        });
    } catch (err) {
        log.api.error({ err }, 'POST products/import');
        return json({ success: false, message: 'Gagal import produk' }, { status: 500 });
    }
}
