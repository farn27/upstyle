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
