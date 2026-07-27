import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, ecommerceSettings, ecommerceOrders } from '$lib/server/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    try {
        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
        });
        if (!unit) throw error(404, 'Unit bisnis tidak ditemukan');

        let storeSettings = await db.query.ecommerceSettings.findFirst({
            where: eq(ecommerceSettings.unitId, unit.id)
        });

        // Initialize default store settings if not exist
        if (!storeSettings) {
            await db.insert(ecommerceSettings).values({
                unitId: unit.id,
                storefrontName: unit.namaUnit + " Store",
                domainSlug: unit.slug,
                isActive: false
            });
            storeSettings = await db.query.ecommerceSettings.findFirst({
                where: eq(ecommerceSettings.unitId, unit.id)
            });
        }

        // Stats: Total Orders
        const totalOrdersRow = await db.select({
            count: sql`COUNT(*)`
        }).from(ecommerceOrders)
        .where(eq(ecommerceOrders.unitId, unit.id));
        const totalOrders = Number(totalOrdersRow[0]?.count || 0);

        // Stats: Pending Orders
        const pendingOrdersRow = await db.select({
            count: sql`COUNT(*)`
        }).from(ecommerceOrders)
        .where(and(
            eq(ecommerceOrders.unitId, unit.id),
            eq(ecommerceOrders.paymentStatus, 'PENDING')
        ));
        const pendingOrders = Number(pendingOrdersRow[0]?.count || 0);

        // Stats: Total Revenue (PAID)
        const revenueRow = await db.select({
            total: sql`SUM(total_amount)`
        }).from(ecommerceOrders)
        .where(and(
            eq(ecommerceOrders.unitId, unit.id),
            eq(ecommerceOrders.paymentStatus, 'PAID')
        ));
        const totalRevenue = Number(revenueRow[0]?.total || 0);

        // Recent Orders
        const recentOrders = await db.query.ecommerceOrders.findMany({
            where: eq(ecommerceOrders.unitId, unit.id),
            orderBy: [desc(ecommerceOrders.createdAt)],
            limit: 5
        });

        return {
            unit,
            storeSettings,
            stats: {
                totalOrders,
                pendingOrders,
                totalRevenue
            },
            recentOrders
        };
    } catch (err) {
        console.error("LOAD ECOMMERCE ERROR:", err);
        throw error(500, 'Database error');
    }
};

export const actions = {
    updateSettings: async ({ request, params, cookies }) => {
        const { slug } = params;
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const storefrontName = formData.get('storefrontName');
        const description = formData.get('description');
        const domainSlug = formData.get('domainSlug');
        const isActive = formData.get('isActive') === 'true';

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

            await db.update(ecommerceSettings)
                .set({
                    storefrontName,
                    description,
                    domainSlug,
                    isActive
                })
                .where(eq(ecommerceSettings.unitId, unit.id));

            return { success: true, message: 'Pengaturan toko berhasil diperbarui!' };
        } catch (err) {
            console.error("UPDATE STORE SETTINGS ERROR:", err);
            return fail(500, { error: 'Gagal memperbarui pengaturan toko.' });
        }
    }
};
