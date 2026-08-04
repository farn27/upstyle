import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { accountingContacts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/finance/contacts?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const contacts = await db.query.accountingContacts.findMany({
            where: and(eq(accountingContacts.unitId, Number(unitId)), eq(accountingContacts.isActive, 1)),
            orderBy: [desc(accountingContacts.id)]
        });
        const data = contacts.map(c => ({
            id: c.id, unitId: c.unitId, namaKontak: c.namaKontak,
            tipeKontak: c.tipeKontak, email: c.email || '', telepon: c.telepon || '',
            alamat: c.alamat || '', npwp: c.npwp || '',
            limitKredit: Number(c.limitKredit || 0), termPembayaran: c.termPembayaran || 30
        }));
        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET finance/contacts');
        return json({ success: false, message: 'Gagal memuat kontak' }, { status: 500 });
    }
}

// POST /api/app/finance/contacts — tambah kontak akuntansi
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        namaKontak: z.string().min(1).max(150),
        tipeKontak: z.enum(['CUSTOMER','SUPPLIER','BOTH']).default('CUSTOMER'),
        unitId: z.coerce.number().int().positive(),
        email: z.string().email().optional().or(z.literal('')),
        telepon: z.string().optional(),
        alamat: z.string().optional(),
        termPembayaran: z.coerce.number().optional().default(30)
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.contact || body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input kontak akuntansi tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }
        const { namaKontak, tipeKontak, unitId, email, telepon, alamat, termPembayaran } = parsed.data;

        const [result] = await db.insert(accountingContacts).values({
            unitId: Number(unitId), namaKontak, tipeKontak,
            email: email || null, telepon: telepon || null, alamat: alamat || null,
            termPembayaran: termPembayaran || 30, isActive: 1
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Kontak akuntansi baru: ${namaKontak} (${tipeKontak})`,
            kategori: 'FINANCE', tipe: 'success'
        });

        return json({ success: true, message: 'Kontak berhasil ditambahkan', data: { id: result.insertId } });
    } catch (err) {
        log.api.error({ err }, 'POST finance/contacts');
        return json({ success: false, message: 'Gagal tambah kontak' }, { status: 500 });
    }
}

// PUT /api/app/finance/contacts - edit kontak akuntansi
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { contactId, unitId, namaKontak, tipeKontak, email, telepon, alamat, termPembayaran, limitKredit, npwp } = body;

        if (!contactId) {
            return json({ success: false, message: 'contactId wajib diisi' }, { status: 400 });
        }

        // Verify contact exists and belongs to user's unit
        const contact = await db.query.accountingContacts.findFirst({
            where: eq(accountingContacts.id, Number(contactId))
        });

        if (!contact) {
            return json({ success: false, message: 'Kontak tidak ditemukan' }, { status: 404 });
        }

        // Build update data
        const updateData = {};
        if (namaKontak !== undefined) updateData.namaKontak = namaKontak;
        if (tipeKontak !== undefined) updateData.tipeKontak = tipeKontak;
        if (email !== undefined) updateData.email = email || null;
        if (telepon !== undefined) updateData.telepon = telepon || null;
        if (alamat !== undefined) updateData.alamat = alamat || null;
        if (termPembayaran !== undefined) updateData.termPembayaran = Number(termPembayaran);
        if (limitKredit !== undefined) updateData.limitKredit = String(limitKredit);
        if (npwp !== undefined) updateData.npwp = npwp || null;

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: 'Tidak ada data yang diubah' }, { status: 400 });
        }

        await db.update(accountingContacts)
            .set(updateData)
            .where(eq(accountingContacts.id, Number(contactId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId || contact.unitId),
            pesan: `Kontak akuntansi diperbarui: ${updateData.namaKontak || contact.namaKontak}`,
            kategori: 'FINANCE',
            tipe: 'info'
        });

        return json({ success: true, message: 'Kontak berhasil diperbarui' });

    } catch (err) {
        log.api.error({ err }, 'PUT finance/contacts');
        return json({ success: false, message: 'Gagal memperbarui kontak: ' + err.message }, { status: 500 });
    }
}

// DELETE /api/app/finance/contacts?contactId=X&unitId=Y - hapus kontak akuntansi
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const contactId = url.searchParams.get('contactId');
    const unitId = url.searchParams.get('unitId');

    if (!contactId) {
        return json({ success: false, message: 'contactId wajib diisi' }, { status: 400 });
    }

    try {
        // Verify contact exists
        const contact = await db.query.accountingContacts.findFirst({
            where: eq(accountingContacts.id, Number(contactId))
        });

        if (!contact) {
            return json({ success: false, message: 'Kontak tidak ditemukan' }, { status: 404 });
        }

        // Soft delete - set isActive to 0
        await db.update(accountingContacts)
            .set({ isActive: 0 })
            .where(eq(accountingContacts.id, Number(contactId)));

        await db.insert(riwayatAksi).values({
            userId,
            unitId: Number(unitId || contact.unitId),
            pesan: `Kontak akuntansi dihapus: ${contact.namaKontak}`,
            kategori: 'FINANCE',
            tipe: 'warning'
        });

        return json({ success: true, message: 'Kontak berhasil dihapus' });

    } catch (err) {
        log.api.error({ err }, 'DELETE finance/contacts');
        return json({ success: false, message: 'Gagal menghapus kontak: ' + err.message }, { status: 500 });
    }
}
