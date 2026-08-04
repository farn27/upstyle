import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Fetch products for katalog with publish status
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const publishedOnly = url.searchParams.get('publishedOnly') === 'true';

        let whereConditions = [
            eq(products.unitId, Number(unitId)),
            isNull(products.deletedAt)
        ];

        if (publishedOnly) {
            whereConditions.push(eq(products.status, 'active'));
        }

        const productList = await db.select()
            .from(products)
            .where(and(...whereConditions))
            .orderBy(desc(products.createdAt));

        const data = productList.map(p => ({
            id: p.id,
            sku: p.sku || '',
            nama: p.nama,
            slug: p.slug,
            hargaJual: Number(p.hargaJual || 0),
            stok: p.stok || 0,
            status: p.status,
            isPublished: p.status === 'active',
            foto: p.foto || '',
            videoUrl: p.videoUrl || '',
            metadata: p.metadata || {},
            showInPos: p.showInPos || 1,
            createdAt: p.createdAt || ''
        }));

        return json({ success: true, products: data });

    } catch (err) {
        log.api.error({ err }, 'GET katalog error');
        return json({ success: false, message: 'Gagal mengambil katalog produk' }, { status: 500 });
    }
}

// POST: Bulk publish/unpublish products
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'bulk-publish') {
            const schema = z.object({
                action: z.literal('bulk-publish'),
                productIds: z.array(z.string()).min(1, 'Minimal 1 produk'),
                unitId: z.coerce.number().int().positive(),
                publish: z.boolean()
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { productIds, unitId, publish } = body;
            const newStatus = publish ? 'active' : 'draft';

            await db.update(products)
                .set({ status: newStatus })
                .where(and(
                    eq(products.unitId, Number(unitId)),
                    sql`${products.id} IN (${productIds.map(id => `'${id}'`).join(',')})`
                ));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `${productIds.length} produk ${publish ? 'dipublish' : 'di-unpublish'} di katalog`,
                kategori: 'KATALOG',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: `${productIds.length} produk berhasil ${publish ? 'dipublish' : 'di-unpublish'}`,
                affectedCount: productIds.length
            });
        }

        if (action === 'update-metadata') {
            const schema = z.object({
                action: z.literal('update-metadata'),
                productId: z.string().min(1),
                unitId: z.coerce.number().int().positive(),
                metadata: z.object({
                    seoTitle: z.string().optional(),
                    seoDescription: z.string().optional(),
                    tags: z.array(z.string()).optional(),
                    featured: z.boolean().optional(),
                    publishedAt: z.string().optional()
                })
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input metadata tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { productId, unitId, metadata } = body;

            // Get existing product
            const product = await db.query.products.findFirst({
                where: and(
                    eq(products.id, productId),
                    eq(products.unitId, Number(unitId))
                )
            });

            if (!product) {
                return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
            }

            // Merge with existing metadata
            const existingMetadata = product.metadata || {};
            const newMetadata = { ...existingMetadata, ...metadata };

            await db.update(products)
                .set({ metadata: newMetadata })
                .where(eq(products.id, productId));

            return json({ 
                success: true, 
                message: 'Metadata produk berhasil diperbarui' 
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'POST katalog error');
        return json({ success: false, message: 'Gagal memproses katalog: ' + err.message }, { status: 500 });
    }
}

// PUT: Toggle publish single product or update katalog settings
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'toggle-publish') {
            const { productId, unitId, publish } = body;

            if (!productId) {
                return json({ success: false, message: 'productId wajib diisi' }, { status: 400 });
            }

            const product = await db.query.products.findFirst({
                where: and(
                    eq(products.id, productId),
                    eq(products.unitId, Number(unitId))
                )
            });

            if (!product) {
                return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
            }

            const newStatus = publish ? 'active' : 'draft';
            const currentMetadata = product.metadata || {};
            const updatedMetadata = {
                ...currentMetadata,
                publishedAt: publish ? new Date().toISOString() : null,
                lastPublishAction: publish ? 'published' : 'unpublished'
            };

            await db.update(products)
                .set({ 
                    status: newStatus,
                    metadata: updatedMetadata
                })
                .where(eq(products.id, productId));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Produk ${product.nama} ${publish ? 'dipublish' : 'di-unpublish'} di katalog`,
                kategori: 'KATALOG',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: `Produk berhasil ${publish ? 'dipublish' : 'di-unpublish'}`,
                product: {
                    id: productId,
                    nama: product.nama,
                    status: newStatus,
                    isPublished: publish
                }
            });
        }

        if (action === 'update-katalog-settings') {
            const { unitId, settings } = body;

            // This could be used to update unit-level katalog settings
            // For now, just log the action
            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Pengaturan katalog diperbarui',
                kategori: 'KATALOG',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: 'Pengaturan katalog berhasil diperbarui' 
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT katalog error');
        return json({ success: false, message: 'Gagal toggle publish produk' }, { status: 500 });
    }
}

// DELETE: Remove product from katalog (soft delete or unpublish)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const productId = url.searchParams.get('productId');
    const unitId = url.searchParams.get('unitId');
    const action = url.searchParams.get('action') || 'unpublish'; // unpublish or delete

    if (!productId) {
        return json({ success: false, message: 'productId wajib diisi' }, { status: 400 });
    }

    try {
        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, productId),
                eq(products.unitId, Number(unitId))
            )
        });

        if (!product) {
            return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        }

        if (action === 'delete') {
            // Soft delete
            await db.update(products)
                .set({ 
                    deletedAt: new Date().toISOString(),
                    status: 'archived'
                })
                .where(eq(products.id, productId));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Produk ${product.nama} dihapus dari katalog`,
                kategori: 'KATALOG',
                tipe: 'warning'
            });

            return json({ success: true, message: 'Produk berhasil dihapus dari katalog' });
        } else {
            // Just unpublish
            await db.update(products)
                .set({ status: 'draft' })
                .where(eq(products.id, productId));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Produk ${product.nama} di-unpublish dari katalog`,
                kategori: 'KATALOG',
                tipe: 'info'
            });

            return json({ success: true, message: 'Produk berhasil di-unpublish dari katalog' });
        }

    } catch (err) {
        log.api.error({ err }, 'DELETE katalog error');
        return json({ success: false, message: 'Gagal menghapus produk dari katalog' }, { status: 500 });
    }
}