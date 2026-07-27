import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { receivables, accountingContacts } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    const invoices = await db.query.receivables.findMany({
        where: eq(receivables.unitId, unit.id),
        orderBy: [desc(receivables.id)],
        with: {
            contact: true
        }
    });

    const contacts = await db.query.accountingContacts.findMany({
        where: and(
            eq(accountingContacts.unitId, unit.id), 
            eq(accountingContacts.isActive, 1)
        ),
        orderBy: [accountingContacts.namaKontak]
    });

    return {
        unit,
        invoices: JSON.parse(JSON.stringify(invoices)),
        contacts: JSON.parse(JSON.stringify(contacts))
    };
};

export const actions = {
    addInvoice: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const { slug } = params;
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit not found' });

        const data = await request.formData();
        const contactId = data.get('contactId');
        const tanggal = data.get('tanggal');
        const jatuhTempo = data.get('jatuhTempo');
        const nominal = data.get('nominal');
        const keterangan = data.get('keterangan');
        const nomorInvoice = `INV-${Date.now()}`;

        try {
            await db.insert(receivables).values({
                unitId: unit.id,
                contactId: Number(contactId),
                nomorInvoice,
                tanggal,
                jatuhTempo,
                nominal: String(nominal),
                sudahDibayar: '0',
                status: 'BELUM_BAYAR',
                keterangan: keterangan || null
            });
            return { success: true };
        } catch (err) {
            console.error('Add Receivable Error:', err);
            return fail(500, { error: 'Gagal membuat invoice piutang' });
        }
    },

    payInvoice: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const invoiceId = data.get('invoiceId');
        const nominalBayar = Number(data.get('nominalBayar'));

        try {
            // Drizzle transaction to update payment
            await db.transaction(async (tx) => {
                const invoiceRaw = await tx.query.receivables.findFirst({
                    where: eq(receivables.id, Number(invoiceId))
                });
                
                if (!invoiceRaw) throw new Error('Invoice tidak ditemukan');

                const currentPaid = Number(invoiceRaw.sudahDibayar);
                const totalNominal = Number(invoiceRaw.nominal);
                const newPaid = currentPaid + nominalBayar;
                let newStatus = 'SEBAGIAN';

                if (newPaid >= totalNominal) {
                    newStatus = 'LUNAS';
                }

                await tx.update(receivables).set({
                    sudahDibayar: String(newPaid),
                    status: newStatus
                }).where(eq(receivables.id, invoiceRaw.id));
            });

            return { success: true };
        } catch (err) {
            console.error('Pay Receivable Error:', err);
            return fail(500, { error: 'Gagal mencatat pembayaran' });
        }
    }
};
