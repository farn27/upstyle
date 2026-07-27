import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { accountingContacts, unitBisnis } from '$lib/server/schema';
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

    const contacts = await db.select()
        .from(accountingContacts)
        .where(eq(accountingContacts.unitId, unit.id))
        .orderBy(accountingContacts.namaKontak);

    return { unit, contacts };
};

export const actions = {
    addContact: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const namaKontak = formData.get('namaKontak')?.toString().trim();
        const tipeKontak = formData.get('tipeKontak')?.toString();
        const email = formData.get('email')?.toString().trim() || null;
        const telepon = formData.get('telepon')?.toString().trim() || null;
        const alamat = formData.get('alamat')?.toString().trim() || null;
        const limitKredit = formData.get('limitKredit') ? formData.get('limitKredit').toString() : '0.00';
        const termPembayaran = parseInt(formData.get('termPembayaran')) || 30;

        if (!namaKontak || !tipeKontak) {
            return fail(400, { message: 'Nama kontak dan Tipe wajib diisi!' });
        }

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.insert(accountingContacts).values({
                unitId: unit.id,
                namaKontak,
                tipeKontak,
                email,
                telepon,
                alamat,
                limitKredit,
                termPembayaran,
                isActive: 1
            });

            return { success: true, message: `Kontak "${namaKontak}" berhasil didaftarkan!` };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    editContact: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));
        const namaKontak = formData.get('namaKontak')?.toString().trim();
        const tipeKontak = formData.get('tipeKontak')?.toString();
        const email = formData.get('email')?.toString().trim() || null;
        const telepon = formData.get('telepon')?.toString().trim() || null;
        const alamat = formData.get('alamat')?.toString().trim() || null;
        const limitKredit = formData.get('limitKredit') ? formData.get('limitKredit').toString() : '0.00';
        const termPembayaran = parseInt(formData.get('termPembayaran')) || 30;

        if (!id || !namaKontak || !tipeKontak) {
            return fail(400, { message: 'Nama kontak dan Tipe wajib diisi!' });
        }

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.update(accountingContacts)
                .set({ namaKontak, tipeKontak, email, telepon, alamat, limitKredit, termPembayaran })
                .where(and(eq(accountingContacts.id, id), eq(accountingContacts.unitId, unit.id)));

            return { success: true, message: `Kontak "${namaKontak}" berhasil diperbarui!` };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    },

    deleteContact: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { message: 'Unauthorized' });

        const { slug } = params;
        const formData = await request.formData();
        const id = parseInt(formData.get('id'));

        try {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
            });
            if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

            await db.delete(accountingContacts)
                .where(and(eq(accountingContacts.id, id), eq(accountingContacts.unitId, unit.id)));

            return { success: true, message: 'Kontak berhasil dihapus!' };
        } catch (err) {
            return fail(500, { message: err.message });
        }
    }
};
