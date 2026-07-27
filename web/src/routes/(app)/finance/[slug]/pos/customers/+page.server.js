import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posCustomers } from '$lib/server/schema';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { eq, asc, and } from 'drizzle-orm';

export async function load({ params, cookies, locals }) {
    const { unit } = await resolvePosUnitAccess(cookies, params, locals);

    try {
        const customers = await db.select().from(posCustomers)
            .where(eq(posCustomers.unitId, unit.id))
            .orderBy(asc(posCustomers.namaCustomer));

        return { customers, unit };
    } catch (err) {
        console.error('POS customers load error:', err);
        return { customers: [], unit };
    }
}

export const actions = {
    create: async ({ request, params, cookies, locals }) => {
        const { unit, ownerUserId } = await resolvePosUnitAccess(cookies, params, locals);
        const form = await request.formData();
        const name = String(form.get('name') || '').trim();
        const email = String(form.get('email') || '').trim() || null;
        const phone = String(form.get('phone') || '').trim() || null;

        if (!name) {
            return fail(400, { error: 'Nama pelanggan wajib diisi', values: { name, email, phone } });
        }

        try {
            const existing = await db.select().from(posCustomers).where(and(
                eq(posCustomers.unitId, unit.id),
                eq(posCustomers.namaCustomer, name)
            ));

            if (existing.length > 0) {
                return { success: true, message: 'Pelanggan sudah ada', customer: existing[0] };
            }

            await db.insert(posCustomers).values({
                unitId: unit.id,
                namaCustomer: name,
                email,
                telepon: phone,
                metadata: null
            });

            return { success: true };
        } catch (err) {
            console.error('POS Customers create error:', err);
            throw error(500, 'Gagal menambahkan pelanggan');
        }
    }
};
