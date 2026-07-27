import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, ecommerceSettings } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');
    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');
    const settings = await db.query.ecommerceSettings.findFirst({ where: eq(ecommerceSettings.unitId, unit.id) });
    const paymentConfig = settings?.paymentConfigJson || {};
    return { unit, settings, paymentConfig };
};

export const actions = {
    savePaymentConfig: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });
        const { slug } = params;
        const data = await request.formData();
        const midtransClientKey = String(data.get('midtrans_client_key') || '').trim();
        const midtransServerKey = String(data.get('midtrans_server_key') || '').trim();
        const midtransSandbox = data.get('midtrans_sandbox') === 'true';

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });
            const s = await db.query.ecommerceSettings.findFirst({ where: eq(ecommerceSettings.unitId, unit.id) });
            const newConfig = { midtrans: { clientKey: midtransClientKey, serverKey: midtransServerKey ? '***' : '', sandbox: midtransSandbox, configured: Boolean(midtransClientKey && midtransServerKey) } };
            if (s) {
                await db.update(ecommerceSettings).set({ paymentConfigJson: newConfig }).where(eq(ecommerceSettings.unitId, unit.id));
            } else {
                await db.insert(ecommerceSettings).values({ unitId: unit.id, storefrontName: unit.namaUnit, domainSlug: unit.slug, paymentConfigJson: newConfig, isActive: false });
            }
            return { success: true, message: 'Konfigurasi pembayaran disimpan' };
        } catch (err) {
            return fail(500, { error: 'Gagal simpan konfigurasi: ' + err.message });
        }
    }
};
