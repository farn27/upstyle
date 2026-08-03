import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmContacts, crmActivities, crmDeals, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/crm/contacts/[contactId]
export async function GET({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const contactId = Number(params.contactId);
    if (!contactId) return json({ success: false, message: 'contactId tidak valid' }, { status: 400 });

    try {
        const contact = await db.query.crmContacts.findFirst({ where: eq(crmContacts.id, contactId) });
        if (!contact) return json({ success: false, message: 'Kontak tidak ditemukan' }, { status: 404 });

        const [activities, deals] = await Promise.all([
            db.query.crmActivities.findMany({ where: eq(crmActivities.kontakId, contactId), orderBy: [desc(crmActivities.id)], limit: 20 }),
            db.query.crmDeals.findMany({ where: eq(crmDeals.kontakId, contactId), orderBy: [desc(crmDeals.id)] })
        ]);

        return json({
            success: true,
            data: {
                contact: {
                    id: contact.id, unitId: contact.unitId, nama: contact.nama,
                    telepon: contact.telepon || '', email: contact.email || '',
                    perusahaan: contact.perusahaan || '', stage: contact.stage || 'lead',
                    sumber: contact.sumber || 'manual', tags: contact.tags || '',
                    createdAt: contact.createdAt || ''
                },
                activities: activities.map(a => ({
                    id: a.id, tipe: a.tipe, catatan: a.catatan || '', tanggal: a.tanggal || ''
                })),
                deals: deals.map(d => ({
                    id: d.id, namaDeal: d.namaDeal, nilai: Number(d.nilai || 0),
                    stage: d.stage, status: d.status
                }))
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET crm/contacts/[contactId]');
        return json({ success: false, message: 'Gagal memuat kontak' }, { status: 500 });
    }
}

// PUT /api/app/crm/contacts/[contactId]
export async function PUT({ params, request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const contactId = Number(params.contactId);
    if (!contactId) return json({ success: false, message: 'contactId tidak valid' }, { status: 400 });

    try {
        const body = await request.json();
        const { nama, telepon, email, perusahaan, stage } = body;

        const updateData = {};
        if (nama) updateData.nama = nama;
        if (telepon !== undefined) updateData.telepon = telepon;
        if (email !== undefined) updateData.email = email;
        if (perusahaan !== undefined) updateData.perusahaan = perusahaan;
        if (stage) updateData.stage = stage;

        await db.update(crmContacts).set(updateData).where(eq(crmContacts.id, contactId));
        return json({ success: true, message: 'Kontak berhasil diperbarui' });
    } catch (err) {
        log.api.error({ err }, 'PUT crm/contacts/[contactId]');
        return json({ success: false, message: 'Gagal update kontak' }, { status: 500 });
    }
}

// DELETE /api/app/crm/contacts/[contactId]
export async function DELETE({ params, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const contactId = Number(params.contactId);
    if (!contactId) return json({ success: false, message: 'contactId tidak valid' }, { status: 400 });

    try {
        const contact = await db.query.crmContacts.findFirst({ where: eq(crmContacts.id, contactId) });
        if (!contact) return json({ success: false, message: 'Kontak tidak ditemukan' }, { status: 404 });

        await db.delete(crmContacts).where(eq(crmContacts.id, contactId));

        await db.insert(riwayatAksi).values({
            userId, unitId: contact.unitId,
            pesan: `Kontak CRM dihapus: ${contact.nama}`, kategori: 'CRM', tipe: 'warning'
        });

        return json({ success: true, message: 'Kontak berhasil dihapus' });
    } catch (err) {
        log.api.error({ err }, 'DELETE crm/contacts/[contactId]');
        return json({ success: false, message: 'Gagal hapus kontak' }, { status: 500 });
    }
}
