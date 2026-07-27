import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { landingPages, marketingLeads, products, unitBisnis } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const load = async ({ params }) => {
    const { pageSlug } = params;
    const page = await db.query.landingPages.findFirst({
        where: eq(landingPages.pageSlug, pageSlug)
    });
    if (!page || !page.isActive) throw error(404, 'Halaman tidak ditemukan atau tidak aktif');

    // Load produk dari unit yang sama
    const productList = await db.query.products.findMany({
        where: and(eq(products.unitId, page.unitId), isNull(products.deletedAt)),
        columns: { id: true, nama: true, hargaJual: true, foto: true, stok: true },
        limit: 12
    });

    return { page, productList };
};

export const actions = {
    submitLead: async ({ request, params }) => {
        const { pageSlug } = params;
        const data = await request.formData();
        const firstName = String(data.get('first_name') || '').trim();
        const lastName = String(data.get('last_name') || '').trim();
        const email = String(data.get('email') || '').trim();
        const phone = String(data.get('phone') || '').trim();
        const notes = String(data.get('notes') || '');

        if (!firstName && !email) return fail(400, { error: 'Nama atau email wajib diisi' });
        try {
            const page = await db.query.landingPages.findFirst({ where: eq(landingPages.pageSlug, pageSlug) });
            if (!page) return fail(404, { error: 'Halaman tidak ditemukan' });
            await db.insert(marketingLeads).values({ landingPageId: page.id, firstName, lastName: lastName || null, email: email || null, phone: phone || null, notes });
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal submit form' });
        }
    }
};
