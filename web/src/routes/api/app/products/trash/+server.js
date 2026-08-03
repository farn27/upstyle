import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products } from '$lib/server/schema';
import { eq, and, desc, isNotNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/products/trash?unitId=X — produk yang sudah dihapus (soft delete)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const deletedProducts = await db.query.products.findMany({
            where: and(eq(products.unitId, Number(unitId)), isNotNull(products.deletedAt)),
            orderBy: [desc(products.deletedAt)]
        });

        const data = deletedProducts.map(p => ({
            id: p.id, nama: p.nama, sku: p.sku || '', hargaJual: Number(p.hargaJual),
            stok: p.stok || 0, deletedAt: p.deletedAt || ''
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET products/trash');
        return json({ success: false, message: 'Gagal memuat produk terhapus' }, { status: 500 });
    }
}

// POST /api/app/products/trash — restore produk
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { productId } = body;
        if (!productId) return json({ success: false, message: 'productId wajib' }, { status: 400 });

        await db.update(products).set({ deletedAt: null }).where(eq(products.id, productId));
        return json({ success: true, message: 'Produk berhasil dipulihkan' });
    } catch (err) {
        log.api.error({ err }, 'POST products/trash restore');
        return json({ success: false, message: 'Gagal pulihkan produk' }, { status: 500 });
    }
}

// DELETE /api/app/products/trash?productId=X — hapus permanen
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const productId = url.searchParams.get('productId');
    if (!productId) return json({ success: false, message: 'productId wajib' }, { status: 400 });

    try {
        await db.delete(products).where(eq(products.id, productId));
        return json({ success: true, message: 'Produk berhasil dihapus permanen' });
    } catch (err) {
        log.api.error({ err }, 'DELETE products/trash permanent');
        return json({ success: false, message: 'Gagal hapus permanen' }, { status: 500 });
    }
}
