import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, products } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals }) {
    const user = locals.user;
    if (!user) throw redirect(302, '/auth/login');

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, user.id)),
    });
    if (!unit) throw redirect(302, '/finance');

    const productsData = await db.query.products.findMany({
        where: eq(products.unitId, unit.id),
        columns: { id: true, nama: true, slug: true, hargaBeli: true, hargaJual: true, stok: true },
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        limit: 50,
    });

    return {
        unit: { id: unit.id, nama: unit.namaUnit, slug: unit.slug },
        products: productsData || [],
    };
}
