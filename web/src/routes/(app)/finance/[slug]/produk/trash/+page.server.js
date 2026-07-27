import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, kategoriProduk, unitBisnis, productVariants } from '$lib/server/schema';
import { eq, and, not, isNull, desc } from 'drizzle-orm';

export async function load({ params, locals }) {
    const user = locals.user;
    if (!user) throw redirect(302, '/auth/login');

    const unitSlug = params.slug.toLowerCase();
    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, unitSlug), eq(unitBisnis.userId, user.id)),
        columns: { id: true, namaUnit: true, slug: true, tipe: true }
    });

    if (!unit) {
        return { unitInfo: null, products: [], categories: [], slug: unitSlug };
    }

    const deletedProducts = await db.query.products.findMany({
        where: and(eq(products.unitId, unit.id), not(isNull(products.deletedAt))),
        with: {
            productVariants: true,
            kategoriProduk: true
        },
        orderBy: [desc(products.deletedAt)]
    });

    return {
        unitInfo: unit,
        products: deletedProducts || [],
        slug: unitSlug
    };
}
