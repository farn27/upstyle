import { db } from '$lib/server/drizzle';
import { vouchers } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { resolvePosUnitAccess } from '$lib/server/posAuth';

/**
 * Hanya pemilik unit, atau karyawan unit ini dengan peran owner/manager/admin, yang boleh kelola promo.
 * Dulu unit dicari dari slug saja → user mana pun bisa melihat/membuat/menghapus voucher unit lain.
 * @param {any} event
 */
async function unitPromo({ cookies, params, locals }) {
    const akses = await resolvePosUnitAccess(cookies, params, locals);
    if (akses.isStaff && !['owner', 'manager', 'admin'].includes(String(akses.staffSession?.role || ''))) {
        throw error(403, 'Hanya manajer yang boleh mengelola promo');
    }
    return akses.unit;
}

export async function load(event) {
    const unit = await unitPromo(event);
    const promos = await db.select()
        .from(vouchers)
        .where(eq(vouchers.unitId, unit.id));

    return {
        promos
    };
}

export const actions = {
    create: async (event) => {
        const { request } = event;
        const unit = await unitPromo(event);
        
        const data = await request.formData();
        const code = data.get('code')?.toString().toUpperCase();
        const discountType = data.get('discountType');
        const discountValue = data.get('discountValue');
        const validFrom = data.get('validFrom');
        const validUntil = data.get('validUntil');
        const maxUsage = data.get('maxUsage') || 0;
        const minPurchase = data.get('minPurchase') || 0;

        try {
            await db.insert(vouchers).values({
                unitId: unit.id,
                code,
                discountType,
                discountValue,
                validFrom,
                validUntil,
                maxUsage,
                minPurchase
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Kode promo sudah dipakai atau data tidak valid' };
        }
    },
    toggle: async (event) => {
        const unit = await unitPromo(event);
        const data = await event.request.formData();
        const id = Number(data.get('id'));
        const isActive = data.get('isActive') === 'true';

        try {
            await db.update(vouchers)
                .set({ isActive })
                .where(and(eq(vouchers.id, id), eq(vouchers.unitId, unit.id)));
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Gagal mengubah status promo' };
        }
    },
    delete: async (event) => {
        const unit = await unitPromo(event);
        const data = await event.request.formData();
        const id = Number(data.get('id'));

        try {
            await db.delete(vouchers).where(and(eq(vouchers.id, id), eq(vouchers.unitId, unit.id)));
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Gagal menghapus promo' };
        }
    }
};
