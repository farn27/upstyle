import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { vouchers, unitBisnis } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { getCurrentUserId } from '$lib/server/getUser';

export async function POST({ request, cookies, params, locals }) {
    try {
        const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
        const { slug } = params;
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
        
        let unitId = null;
        if (staffSession) {
            unitId = staffSession.unit_id;
        } else if (ownerUserId) {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, ownerUserId))
            });
            if (unit) unitId = unit.id;
        }

        if (!unitId) return json({ error: 'Akses ditolak' }, { status: 403 });

        const { code, subtotal } = await request.json();
        if (!code) return json({ error: 'Kode voucher kosong' }, { status: 400 });

        const voucher = await db.query.vouchers.findFirst({
            where: and(eq(vouchers.unitId, unitId), eq(vouchers.code, code))
        });

        if (!voucher) return json({ error: 'Voucher tidak ditemukan' }, { status: 404 });
        if (!voucher.isActive) return json({ error: 'Voucher sudah tidak aktif' }, { status: 400 });

        const today = new Date().toISOString().split('T')[0];
        if (voucher.validFrom > today) return json({ error: 'Voucher belum berlaku' }, { status: 400 });
        if (voucher.validUntil < today) return json({ error: 'Voucher sudah kedaluwarsa' }, { status: 400 });

        if (voucher.maxUsage > 0 && voucher.currentUsage >= voucher.maxUsage) {
            return json({ error: 'Voucher sudah melebihi batas penggunaan' }, { status: 400 });
        }

        if (subtotal < Number(voucher.minPurchase)) {
            return json({ error: \`Minimal transaksi untuk voucher ini adalah Rp \${Number(voucher.minPurchase).toLocaleString('id-ID')}\` }, { status: 400 });
        }

        return json({
            success: true,
            voucher: {
                id: voucher.id,
                code: voucher.code,
                discountType: voucher.discountType, // 'PERCENTAGE' or 'FIXED'
                discountValue: Number(voucher.discountValue)
            }
        });
    } catch (e) {
        return json({ error: e.message }, { status: 500 });
    }
}
