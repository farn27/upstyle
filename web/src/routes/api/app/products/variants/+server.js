import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants } from '$lib/server/schema';
import { eq, and, isNull, desc, asc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import crypto from 'crypto';

// GET /api/app/products/variants?productId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const productId = url.searchParams.get('productId');
    if (!productId) return json({ success: false, message: 'productId wajib diisi' }, { status: 400 });

    try {
        const existingProduct = await db.query.products.findFirst({
            where: eq(products.id, productId),
            columns: { userId: true, unitId: true }
        });

        if (!existingProduct || Number(existingProduct.userId) !== Number(userId)) {
            return json({ success: false, message: 'Akses ditolak' }, { status: 403 });
        }

        const variantRows = await db.query.productVariants.findMany({
            where: eq(productVariants.productId, productId),
            orderBy: [asc(productVariants.namaVariasi)]
        });

        const data = variantRows.map(v => ({
            id: v.id,
            productId: v.productId,
            namaVariasi: v.namaVariasi,
            sku: v.sku || '',
            hargaBeli: Number(v.hargaBeli || 0),
            hargaJual: Number(v.hargaJual || 0),
            stok: Number(v.stok || 0),
            minStok: Number(v.minStok || 0)
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET products/variants');
        return json({ success: false, message: 'Gagal memuat variasi produk' }, { status: 500 });
    }
}

// POST /api/app/products/variants — create variant
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            productId: z.string().min(1),
            namaVariasi: z.string().min(1),
            sku: z.string().optional(),
            hargaBeli: z.coerce.number().min(0).default(0),
            hargaJual: z.coerce.number().min(0).default(0),
            stok: z.coerce.number().int().min(0).default(0),
            minStok: z.coerce.number().int().min(0).default(0)
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Input variasi tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { productId, namaVariasi, sku, hargaBeli, hargaJual, stok, minStok } = parsed.data;

        const existingProduct = await db.query.products.findFirst({
            where: eq(products.id, productId),
            columns: { userId: true, unitId: true }
        });

        if (!existingProduct || Number(existingProduct.userId) !== Number(userId)) {
            return json({ success: false, message: 'Produk tidak ditemukan atau akses ditolak' }, { status: 403 });
        }

        const [created] = await db.insert(productVariants).values({
            id: crypto.randomUUID(),
            productId,
            namaVariasi,
            sku: sku || null,
            hargaBeli: String(hargaBeli),
            hargaJual: String(hargaJual),
            stok: Number(stok || 0),
            minStok: Number(minStok || 0)
        });

        const newVariant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, String(created.insertId))
        });

        return json({ success: true, message: 'Variasi produk berhasil ditambahkan', data: newVariant });
    } catch (err) {
        log.api.error({ err }, 'POST products/variants');
        return json({ success: false, message: 'Gagal menambahkan variasi produk' }, { status: 500 });
    }
}

// PUT /api/app/products/variants — update variant
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();

        const schema = z.object({
            id: z.string().min(1),
            namaVariasi: z.string().optional(),
            sku: z.string().optional(),
            hargaBeli: z.coerce.number().min(0).optional(),
            hargaJual: z.coerce.number().min(0).optional(),
            stok: z.coerce.number().int().min(0).optional(),
            minStok: z.coerce.number().int().min(0).optional()
        });

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || 'Input variasi tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { id, namaVariasi, sku, hargaBeli, hargaJual, stok, minStok } = parsed.data;

        const existing = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, id),
            with: { product: true }
        });

        if (!existing) return json({ success: false, message: 'Variasi tidak ditemukan' }, { status: 404 });
        if (Number(existing.product.userId) !== Number(userId)) {
            return json({ success: false, message: 'Akses ditolak' }, { status: 403 });
        }

        await db.update(productVariants)
            .set({
                namaVariasi: namaVariasi ?? existing.namaVariasi,
                sku: sku ?? existing.sku,
                hargaBeli: hargaBeli !== undefined ? String(hargaBeli) : existing.hargaBeli,
                hargaJual: hargaJual !== undefined ? String(hargaJual) : existing.hargaJual,
                stok: stok !== undefined ? Number(stok) : existing.stok,
                minStok: minStok !== undefined ? Number(minStok) : existing.minStok
            })
            .where(eq(productVariants.id, id));

        const updated = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, id)
        });

        return json({ success: true, message: 'Variasi produk berhasil diperbarui', data: updated });
    } catch (err) {
        log.api.error({ err }, 'PUT products/variants');
        return json({ success: false, message: 'Gagal memperbarui variasi produk' }, { status: 500 });
    }
}

// DELETE /api/app/products/variants — delete variant
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const variantId = url.searchParams.get('variantId');
    if (!variantId) return json({ success: false, message: 'variantId wajib diisi' }, { status: 400 });

    try {
        const existing = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, variantId),
            with: { product: true }
        });

        if (!existing) return json({ success: false, message: 'Variasi tidak ditemukan' }, { status: 404 });
        if (Number(existing.product.userId) !== Number(userId)) {
            return json({ success: false, message: 'Akses ditolak' }, { status: 403 });
        }

        await db.delete(productVariants).where(eq(productVariants.id, variantId));
        return json({ success: true, message: 'Variasi produk berhasil dihapus' });
    } catch (err) {
        log.api.error({ err }, 'DELETE products/variants');
        return json({ success: false, message: 'Gagal menghapus variasi produk' }, { status: 500 });
    }
}
