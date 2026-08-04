import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants } from '$lib/server/schema';
import { eq, and, desc, isNotNull, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/products/trash?unitId=X — list soft-deleted products
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const deletedProducts = await db.query.products.findMany({
            where: and(
                eq(products.unitId, Number(unitId)),
                isNotNull(products.deletedAt)
            ),
            with: {
                productVariants: true
            },
            orderBy: [desc(products.deletedAt)]
        });

        const data = deletedProducts.map(p => ({
            id: p.id,
            nama: p.nama,
            sku: p.sku || '',
            hargaJual: Number(p.hargaJual || 0),
            stok: Number(p.stok || 0),
            deletedAt: p.deletedAt || '',
            variants: (p.productVariants || []).map(v => ({
                id: v.id,
                namaVariasi: v.namaVariasi,
                sku: v.sku || '',
                hargaJual: Number(v.hargaJual || 0),
                stok: Number(v.stok || 0)
            }))
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET products/trash');
        return json({ success: false, message: 'Gagal memuat produk terhapus' }, { status: 500 });
    }
}

// POST /api/app/products/trash — restore product
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            productId: z.string().min(1, 'productId wajib diisi')
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const existing = await db.query.products.findFirst({
            where: eq(products.id, parsed.data.productId)
        });

        if (!existing) return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        if (Number(existing.userId) !== Number(userId)) {
            return json({ success: false, message: 'Akses ditolak' }, { status: 403 });
        }

        await db.update(products)
            .set({ deletedAt: null, status: 'active' })
            .where(eq(products.id, parsed.data.productId));

        return json({ success: true, message: 'Produk berhasil dipulihkan' });
    } catch (err) {
        log.api.error({ err }, 'POST products/trash');
        return json({ success: false, message: 'Gagal memulihkan produk' }, { status: 500 });
    }
}

// DELETE /api/app/products/trash?productId=X — permanent delete
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const productId = url.searchParams.get('productId');
    if (!productId) return json({ success: false, message: 'productId wajib' }, { status: 400 });

    try {
        const existing = await db.query.products.findFirst({
            where: eq(products.id, productId)
        });

        if (!existing) return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
        if (Number(existing.userId) !== Number(userId)) {
            return json({ success: false, message: 'Akses ditolak' }, { status: 403 });
        }

        await db.delete(products).where(eq(products.id, productId));
        return json({ success: true, message: 'Produk berhasil dihapus permanen' });
    } catch (err) {
        log.api.error({ err }, 'DELETE products/trash');
        return json({ success: false, message: 'Gagal menghapus permanen' }, { status: 500 });
    }
}
