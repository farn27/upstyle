import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, stockLogs, productVariants, unitBisnis } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
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

const ALASAN_SAH = new Set(['MASUK', 'KELUAR', 'OPNAME', 'RUSAK', 'RETUR', 'ADJUSTMENT']);
const STOK_MAKS = 100_000_000;

/** Stok harus bilangan bulat ≥ 0 (dulu hanya dijaga di peramban — F-11). @param {unknown} v */
export function _stokSah(v) {
    const teks = String(v ?? '').trim();
    if (!/^\d+$/.test(teks)) return null;
    const n = Number(teks);
    return n <= STOK_MAKS ? n : null;
}

export const actions = {
    default: async ({ request, params, locals }) => {
        if (!locals.user) return fail(401, { message: 'Silakan login ulang' });
        const formData = await request.formData();
        const { slug } = params;

        const productId = String(formData.get('id') || '');
        const stokBaru = _stokSah(formData.get('stokBaru'));
        const keterangan = String(formData.get('keterangan') || '').trim().slice(0, 500);
        const alasan = String(formData.get('alasan') || 'ADJUSTMENT').toUpperCase();
        const variantsRaw = formData.get('variants');

        if (!productId) return fail(400, { message: 'Produk tidak valid' });
        if (stokBaru === null) return fail(400, { message: 'Stok baru harus bilangan bulat 0 atau lebih' });
        if (!ALASAN_SAH.has(alasan)) return fail(400, { message: 'Alasan penyesuaian tidak valid' });

        /** @type {{ id: string, stok: number }[]} */
        let variants = [];
        if (variantsRaw) {
            try {
                const mentah = JSON.parse(String(variantsRaw));
                if (!Array.isArray(mentah)) throw new Error('bukan array');
                for (const v of mentah) {
                    const stok = _stokSah(v?.stokBaru);
                    const id = String(v?.id ?? '').trim();
                    if (!id || id.length > 50 || stok === null) {
                        return fail(400, { message: 'Stok varian harus bilangan bulat 0 atau lebih' });
                    }
                    variants.push({ id, stok });
                }
            } catch {
                return fail(400, { message: 'Data varian tidak valid' });
            }
        }

        try {
            const [product] = await db
                .select({ id: products.id, nama: products.nama, stok: products.stok, unitId: products.unitId, pemilik: unitBisnis.userId, slugUnit: unitBisnis.slug })
                .from(products)
                .innerJoin(unitBisnis, eq(unitBisnis.id, products.unitId))
                .where(and(eq(products.id, productId), isNull(products.deletedAt)))
                .limit(1);
            if (!product || Number(product.pemilik) !== Number(locals.user.id) || (slug && product.slugUnit !== slug)) {
                return fail(404, { message: 'Produk tidak ditemukan' });
            }

            // Varian yang dikirim harus milik produk ini (dulu id varian produk/unit lain ikut terubah)
            if (variants.length) {
                const milik = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, productId));
                const idMilik = new Set(milik.map((m) => String(m.id)));
                if (variants.some((v) => !idMilik.has(v.id))) return fail(400, { message: 'Varian tidak sesuai dengan produk ini' });
                // Stok produk ber-varian = jumlah stok varian
                const total = variants.reduce((a, v) => a + v.stok, 0);
                if (milik.length === variants.length && total !== stokBaru) {
                    return fail(400, { message: `Stok produk (${stokBaru}) harus sama dengan jumlah stok varian (${total})` });
                }
            }

            const stokLama = Number(product.stok);
            const selisih = stokBaru - stokLama;
            if (selisih === 0 && !variants.length) return fail(400, { message: 'Stok tidak berubah' });

            await db.transaction(async (tx) => {
                await tx.update(products)
                    .set({ stok: stokBaru, updatedAt: new Date() })
                    .where(and(eq(products.id, productId), eq(products.unitId, product.unitId)));

                for (const v of variants) {
                    await tx.update(productVariants)
                        .set({ stok: v.stok, updatedAt: new Date() })
                        .where(and(eq(productVariants.id, v.id), eq(productVariants.productId, productId)));
                }

                await tx.insert(stockLogs).values({
                    id: crypto.randomUUID(),
                    productId: productId,
                    userId: String(locals.user.id),
                    unitId: product.unitId,
                    stokAwal: stokLama,
                    perubahan: selisih,
                    stokAkhir: stokBaru,
                    alasan: /** @type {any} */ (alasan),
                    keterangan: keterangan || `Manual via Stock Log: ${selisih >= 0 ? '+' : ''}${selisih}`,
                    createdAt: new Date()
                });
            });

            try {
                await pusherServer.trigger(`unit-${product.unitId}`, 'stock-updated', {
                    message: `${product.nama}: Stok Updated`,
                    user: locals.user.username
                });
            } catch (e) {
                log.api.warn({ err: e instanceof Error ? e.message : String(e) }, '[stock_logs] Gagal kirim event');
            }

            return { success: true, selisih };
        } catch (err) {
            log.api.error({ err }, '[stock_logs] Error Stock Update');
            return fail(500, { message: 'Gagal menyimpan penyesuaian stok' });
        }
    }
};
