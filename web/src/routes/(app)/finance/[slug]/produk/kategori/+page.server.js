import { db } from '$lib/server/drizzle';
import { kategoriProduk, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { redis } from '$lib/server/redis';

export async function load({ locals, params }) {
    if (!locals.user) throw redirect(302, '/auth/login');

    const slugUnit = params.slug;
    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slugUnit), eq(unitBisnis.userId, locals.user.id))
    });
    if (!unit) throw redirect(302, '/finance');

    const categories = await db.query.kategoriProduk.findMany({
        where: eq(kategoriProduk.unitId, unit.id),
        orderBy: (cat, { asc }) => [asc(cat.namaKategori)]
    });

    return { 
        categories,
        unitInfo: unit
    };
}

export const actions = {
    add: async ({ request, params, locals }) => {
        const formData = await request.formData();
        const nama = formData.get('nama')?.toString().trim().toUpperCase();
        if (!nama) return fail(400, { message: 'Nama kategori wajib diisi' });

        const slugUnit = params.slug;
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slugUnit), eq(unitBisnis.userId, locals.user.id)),
            columns: { id: true }
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

        try {
            await db.insert(kategoriProduk).values({ namaKategori: nama, unitId: unit.id });
            
            // Clear caches to sync with product list and add product pages
            await redis.del(`unit-data-v4:${slugUnit}:${locals.user.id}`);
            await redis.del(`cache:products_page_v4:${slugUnit}:none:${locals.user.id}`);
            await redis.del(`cache:products_page_v4:${slugUnit}:all:${locals.user.id}`);

            return { success: true, message: 'Kategori ditambahkan!' };
        } catch (e) {
            return fail(400, { message: 'Gagal menambah kategori (Mungkin sudah ada)' });
        }
    },
    delete: async ({ request, params, locals }) => {
        const formData = await request.formData();
        const id = formData.get('id');
        if (!id) return fail(400, { message: 'ID tidak valid' });

        const slugUnit = params.slug;
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slugUnit), eq(unitBisnis.userId, locals.user.id)),
            columns: { id: true }
        });
        if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

        try {
            await db.delete(kategoriProduk).where(
                and(eq(kategoriProduk.id, parseInt(id)), eq(kategoriProduk.unitId, unit.id))
            );
            
            // Clear caches to sync with product list and add product pages
            await redis.del(`unit-data-v4:${slugUnit}:${locals.user.id}`);
            await redis.del(`cache:products_page_v4:${slugUnit}:none:${locals.user.id}`);
            await redis.del(`cache:products_page_v4:${slugUnit}:all:${locals.user.id}`);

            return { success: true, message: 'Kategori dihapus!' };
        } catch (e) {
            return fail(400, { message: 'Kategori gagal dihapus karena sedang dipakai produk' });
        }
    }
};
