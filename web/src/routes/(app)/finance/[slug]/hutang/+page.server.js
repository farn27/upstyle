import { error, fail } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { payables, accountingContacts } from '$lib/server/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { bayarTagihan, daftarAkunKas, PengadaanError } from '$lib/server/pengadaan';
import { bulat, statusHutang } from '$lib/pengadaan';

export const load = async ({ params, cookies }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const { slug } = params;
    const unit = await db.query.unitBisnis.findFirst({
        where: (ub, { eq, and }) => and(eq(ub.slug, slug), eq(ub.userId, userId))
    });
    if (!unit) throw error(404, 'Unit tidak ditemukan');

    // 2-step query karena TiDB Cloud tidak support LATERAL JOIN yang dibuat Drizzle dari `with:`
    const invoicesRaw = await db.select().from(payables)
        .where(eq(payables.unitId, unit.id))
        .orderBy(desc(payables.id));
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
        const contactId = data.get('contactId');
        const tanggal = data.get('tanggal');
        const jatuhTempo = data.get('jatuhTempo');
        const nominal = data.get('nominal');
        const keterangan = data.get('keterangan');
        const nomorFaktur = data.get('nomorFaktur') || `INV-SUP-${Date.now()}`;

        try {
            await db.insert(payables).values({
                unitId: unit.id,
                contactId: Number(contactId),
                nomorFaktur,
                tanggal,
                jatuhTempo,
                nominal: String(nominal),
                sudahDibayar: '0',
                status: 'BELUM_BAYAR',
                keterangan: keterangan || null
            });
            return { success: true };
        } catch (err) {
            console.error('Add Payable Error:', err);
            return fail(500, { error: 'Gagal membuat tagihan hutang' });
        }
    },

    payInvoice: async ({ request, params, cookies }) => {
        const userId = await getCurrentUserId(cookies);
        if (!userId) return fail(401, { error: 'Unauthorized' });

        const unit = await db.query.unitBisnis.findFirst({
            where: (ub, { eq, and }) => and(eq(ub.slug, params.slug), eq(ub.userId, userId))
        });
        if (!unit) return fail(404, { error: 'Unit tidak ditemukan' });

        const data = await request.formData();
        const invoiceId = Number(data.get('invoiceId'));
        const nominalBayar = bulat(data.get('nominalBayar'));
        if (!(nominalBayar > 0)) return fail(422, { error: 'Nominal bayar harus lebih dari 0' });

        try {
            const [invoice] = await db.select().from(payables)
                .where(and(eq(payables.id, invoiceId), eq(payables.unitId, unit.id))).limit(1);
            if (!invoice) return fail(404, { error: 'Tagihan tidak ditemukan' });

            // Tagihan dari modul Pengadaan sudah punya jurnal hutang, jadi pembayarannya juga harus dijurnal
            if (invoice.journalId) {
                await bayarTagihan(db, { unitId: unit.id, userId }, invoiceId, { nominal: nominalBayar, kasCoaId: data.get('kasCoaId') });
                return { success: true };
            }

            await db.transaction(async (tx) => {
                const [baris] = await tx.select().from(payables).where(eq(payables.id, invoiceId)).for('update');
                const newPaid = bulat(Number(baris.sudahDibayar) + nominalBayar);
                if (newPaid > bulat(baris.nominal)) throw new PengadaanError('Nominal melebihi sisa tagihan', 409);
                await tx.update(payables).set({
                    sudahDibayar: String(newPaid),
                    status: statusHutang(Number(baris.nominal), newPaid)
                }).where(eq(payables.id, baris.id));
            });

            return { success: true };
        } catch (err) {
            if (err instanceof PengadaanError) return fail(err.status, { error: pesanAman(err) });
            console.error('Pay Payable Error:', err);
            return fail(500, { error: 'Gagal mencatat pembayaran' });
        }
    }
};
