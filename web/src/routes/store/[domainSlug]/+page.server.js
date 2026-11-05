import { db } from '$lib/server/drizzle';
import { products, kategoriProduk } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';

export const load = async ({ parent }) => {
    const { store } = await parent();

    // Fetch active products for this store's unitId
    const productsList = await db.query.products.findMany({
        where: (p, { eq, and, isNull }) => and(eq(p.unitId, store.unitId), eq(p.status, 'active'), eq(p.jenis, 'BARANG_JADI'), isNull(p.deletedAt)),
        orderBy: [desc(products.createdAt)],
        with: {
            kategori: true
        }
    });

    const categories = await db.query.kategoriProduk.findMany({
        where: eq(kategoriProduk.unitId, store.unitId)
    });

    return {
        productsList,
        categories
    };
};
