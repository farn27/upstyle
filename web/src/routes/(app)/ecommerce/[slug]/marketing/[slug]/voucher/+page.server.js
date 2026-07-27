import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, vouchers } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { todayStrWIB } from '$lib/server/dateUtils';
import { redis } from '$lib/server/redis';
import { pusherServer } from '$lib/server/pusher';

function genCode() {
    return 'PROMO-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const load = async ({ params, cookies, depends }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    depends('marketing:voucher');
    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');
    const cacheKey = `marketing_voucher:${unit.id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return { unit, voucherList: cached };
    const voucherList = await db.query.vouchers.findMany({
        where: eq(vouchers.unitId, unit.id),
        orderBy: [desc(vouchers.createdAt)]
    });
    await redis.set(cacheKey, voucherList, { ex: 300 });
    return { unit, voucherList };
};

export const actions = {
    create: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const code = String(data.get('code') || genCode()).toUpperCase().trim();
        const discountType = String(data.get('discount_type') || 'PERCENTAGE');
        const discountValue = Number(data.get('discount_value') || 0);
        const maxUsage = Number(data.get('max_usage') || 0);
        const minPurchase = Number(data.get('min_purchase') || 0);
        const validFrom = String(data.get('valid_from') || todayStrWIB());
        const validUntil = String(data.get('valid_until') || todayStrWIB());

        if (!code || !discountValue) return fail(400, { error: 'Kode dan nilai diskon wajib diisi' });
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            await db.insert(vouchers).values({ unitId: unit.id, code, discountType, discountValue: String(discountValue), maxUsage, minPurchase: String(minPurchase), validFrom, validUntil, isActive: true });
            await redis.del(`marketing_voucher:${unit.id}`);
            pusherServer.trigger(`marketing-${slug}`, 'voucher-created', { code }).catch(() => {});
            return { success: true };
        } catch (err) {
            if (err.code === 'ER_DUP_ENTRY') return fail(400, { error: 'Kode voucher sudah digunakan' });
            return fail(500, { error: 'Gagal buat voucher' });
        }
    },

    toggle: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const id = Number(data.get('id'));
        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const v = await db.query.vouchers.findFirst({ where: and(eq(vouchers.id, id), eq(vouchers.unitId, unit.id)) });
            if (!v) return fail(404, { error: 'Voucher tidak ditemukan' });
            await db.update(vouchers).set({ isActive: !v.isActive }).where(eq(vouchers.id, id));
            await redis.del(`marketing_voucher:${unit.id}`);
            return { success: true };
        } catch (err) {
            return fail(500, { error: 'Gagal toggle voucher' });
        }
    }
};
