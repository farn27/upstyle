import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, stockLogs, productVariants, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';
import { log } from '$lib/server/logger';

export const load = async ({ params, locals }) => {
    if (!locals.user) throw redirect(302, '/auth/login');
    const { productSlug } = params;

    // Cari pakai SLUG dan sertakan Varian
    const product = await db.query.products.findFirst({
        where: eq(products.slug, productSlug),
        with: { 
            productVariants: true
        }
    });

    if (!product) throw error(404, { message: "Produk ga ketemu" });

    // Validasi: pastikan produk ini milik unit milik user yang login
    const unitOwner = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.id, product.unitId), eq(unitBisnis.userId, locals.user.id)),
    });
    if (!unitOwner) throw error(403, { message: "Produk bukan milik unit Anda" });

    // Ambil riwayat log stok untuk produk ini
    const logs = await db.query.stockLogs.findMany({
        where: eq(stockLogs.productId, product.id),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 50
    });

    return { product, logs: logs || [] };
};

export const actions = {
    default: async ({ request, params, locals }) => {
        const formData = await request.formData();
        const { slug } = params; // Slug Unit
        
        // ID Produk dari Hidden Input
        const productId = formData.get('id');
        const stokBaru = Number(formData.get('stokBaru'));
        const keterangan = formData.get('keterangan');
        const alasan = formData.get('alasan');
        const variantsRaw = formData.get('variants'); // Mengambil data varian dari form

        try {
            // Cek data produk lama dan pastikan milik user
            const product = await db.query.products.findFirst({
                where: eq(products.id, productId),
                with: { unitBisni: true }
            });
            if (!product) return fail(404, { message: "Produk tidak ditemukan" });
            if (product.unitBisni.userId !== locals.user.id) return fail(403, { message: "Produk bukan milik Anda" });

            const stokLama = Number(product.stok);
            const selisih = stokBaru - stokLama;

            if (selisih === 0) return fail(400, { message: "Stok tidak berubah" });

            // Transaksi Database
            await db.transaction(async (tx) => {
                // A. Update stok produk utama
                await tx.update(products)
                    .set({ stok: stokBaru, updatedAt: new Date() })
                    .where(eq(products.id, productId));

                // B. Update stok per varian jika dikirim
                if (variantsRaw) {
                    const variants = JSON.parse(variantsRaw);
                    for (const v of variants) {
                        await tx.update(productVariants)
                            .set({ stok: Number(v.stokBaru), updatedAt: new Date() })
                            .where(eq(productVariants.id, v.id));
                    }
                }

                // C. Insert ke Stock Logs
                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(),
                    productId: productId,
                    userId: String(locals.user.id),
                    unitId: product.unitId,
                    stokAwal: stokLama,
                    perubahan: selisih,
                    stokAkhir: stokBaru,
                    alasan: alasan,
                    keterangan: keterangan || `Manual via Stock Log: ${selisih >= 0 ? '+' : ''}${selisih}`,
                    createdAt: new Date()
                });
            });

            // Integrasi & Hapus Cache dengan format v4 yang baru
            try {
                await redis.del(`cache:products_page_v4:${slug}:none:${locals.user.id}`);
                await redis.del(`cache:products_page_v4:${slug}:all:${locals.user.id}`);
                
                await pusherServer.trigger(`private-unit-${product.unitId}`, 'stock-updated', {
                    message: `${product.nama}: Stok Updated`,
                    user: locals.user.username
                });
            } catch (e) {
                log.api.warn({ err: e.message }, '[stock_logs] Integrasi/Cache Error');
            }

            return { success: true, selisih };

        } catch (err) {
            log.api.error({ err }, '[stock_logs] Error Stock Update');
            return fail(500, { message: err.message });
        }
    }
};