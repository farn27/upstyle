import { error, fail } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { receivables, accountingContacts } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { buatPiutang, bayarPiutang, PiutangError } from '$lib/server/piutang';
import { daftarAkunKas } from '$lib/server/pengadaan';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // 2-step query karena TiDB Cloud tidak support LATERAL JOIN yang dibuat Drizzle dari `with:`
    const invoicesRaw = await db.select().from(receivables)
        .where(eq(receivables.unitId, unit.id))
        .orderBy(desc(receivables.id));
    const contactIds = [...new Set(invoicesRaw.map(i => i.contactId).filter(Boolean))];
    const contactsMap = {};
    if (contactIds.length > 0) {
        const cl = await db.select().from(accountingContacts).where(inArray(accountingContacts.id, contactIds));
        cl.forEach(c => { contactsMap[c.id] = c; });
    }
    const invoices = invoicesRaw.map(inv => ({ ...inv, contact: contactsMap[inv.contactId] || null }));

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
        contacts: JSON.parse(JSON.stringify(contacts)),
        akunKas: await daftarAkunKas(db, unit.id)
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
        try {
            await buatPiutang(db, { unitId: unit.id, userId }, {
                contactId: data.get('contactId'),
                tanggal: data.get('tanggal'),
                jatuhTempo: data.get('jatuhTempo'),
                nominal: data.get('nominal'),
                keterangan: data.get('keterangan')
            });
            return { success: true };
        } catch (err) {
            if (err instanceof PiutangError) return fail(err.status, { error: pesanAman(err) });
            log.finance.error({ err }, 'Add Receivable Error');
            return fail(500, { error: 'Gagal membuat invoice piutang' });
        }
    },

    payInvoice: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        // Invoice HARUS milik unit user ini (dulu siapa pun yang login bisa melunasi invoice unit lain)
        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

        const data = await request.formData();
        try {
            await bayarPiutang(db, { unitId: unit.id, userId }, Number(data.get('invoiceId')), {
                nominal: data.get('nominalBayar'),
                kasCoaId: data.get('kasCoaId')
            });
            return { success: true };
        } catch (err) {
            if (err instanceof PiutangError) return fail(err.status, { error: pesanAman(err) });
            log.finance.error({ err }, 'Pay Receivable Error');
            return fail(500, { error: 'Gagal mencatat pembayaran' });
        }
    }
};
