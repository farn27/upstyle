import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { crmDeals, crmContacts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// 1. GET: Ambil semua deals (dengan kontak info) untuk unitId (with pagination)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const pagination = parsePagination(url);

        // Get total count
        const [totalResult] = await db.select({ count: sql`count(*)` }).from(crmDeals).where(eq(crmDeals.unitId, Number(unitId)));
        const total = Number(totalResult.count) || 0;

        // Get paginated deals
        const dealsList = await db.query.crmDeals.findMany({
            where: eq(crmDeals.unitId, Number(unitId)),
            orderBy: [desc(crmDeals.id)],
            limit: pagination.limit,
            offset: pagination.offset,
            with: {
                contact: true
            }
        });

        // Map to mobile CrmDeal structure
        const data = dealsList.map(d => ({
            id: d.id,
            contactName: d.contact?.nama || 'Pelanggan',
            companyName: d.contact?.perusahaan || 'Perusahaan',
            dealValue: Number(d.nilai || 0),
            stage: (d.stage || 'PROSPECT').toUpperCase(),
            phone: d.contact?.telepon || '',
            unitId: d.unitId
        }));

        return json(paginatedResponse(data, total, pagination));
    } catch (err) {
        log.crm.error({ err }, 'API GET CRM ERROR');
        return json({ success: false, message: "Gagal mengambil data CRM" }, { status: 500 });
    }
}

// 2. POST: Tambah deal baru (dan kontak jika belum ada)
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();

        // ─── Zod validation ────────────────────────────────────────────────────
        const crmPostSchema = z.object({
            deal: z.object({
                contactName: z.string().min(1, 'Nama kontak wajib diisi').max(150),
                companyName: z.string().optional(),
                dealValue: z.coerce.number().min(0).default(0),
                stage: z.string().default('lead'),
                phone: z.string().optional(),
                unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            })
        });
        const parsed = crmPostSchema.safeParse(body);
        if (!parsed.success) {
            return json({ success: false, message: parsed.error.errors[0].message }, { status: 400 });
        }
        // ──────────────────────────────────────────────────────────────────────

        const { contactName, companyName, dealValue, stage, phone, unitId } = body.deal;

        let dealId = null;

        await db.transaction(async (tx) => {
            // Find or create contact
            let contactId = null;
            const existingContact = await tx.query.crmContacts.findFirst({
                where: and(
                    eq(crmContacts.unitId, Number(unitId)),
                    eq(crmContacts.nama, contactName)
                )
            });

            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const [newContact] = await tx.insert(crmContacts).values({
                    ownerId: userId,
                    unitId: Number(unitId),
                    nama: contactName,
                    telepon: phone || null,
                    perusahaan: companyName || null,
                    stage: stage?.toLowerCase() || 'lead'
                }).$returningId();
                contactId = newContact.id;
            }

            // Insert deal
            const [newDeal] = await tx.insert(crmDeals).values({
                ownerId: userId,
                unitId: Number(unitId),
                kontakId: contactId,
                namaDeal: `${companyName || contactName} - Deal`,
                nilai: String(dealValue || 0),
                stage: stage?.toLowerCase() || 'prospek',
                status: 'open'
            }).$returningId();
            
            dealId = newDeal.id;

            // Log action
            await tx.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Pipeline Deal baru ditambahkan: ${contactName} - Rp ${String(dealValue || 0)}`,
                kategori: 'CRM',
                tipe: 'success'
            });
        });

        return json({ success: true, message: "Deal berhasil ditambahkan", id: dealId });
    } catch (err) {
        log.crm.error({ err }, 'API POST CRM ERROR');
        return json({ success: false, message: "Gagal menambahkan deal: " + err.message }, { status: 500 });
    }
}

// 3. PUT: Update stage deal crm
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { dealId, stage, unitId } = body;

        if (!dealId || !stage) {
            return json({ success: false, message: "dealId dan stage wajib diisi" }, { status: 400 });
        }

        const deal = await db.query.crmDeals.findFirst({
            where: eq(crmDeals.id, Number(dealId)),
            with: {
                crmContact: true
            }
        });
        if (!deal) return json({ success: false, message: "Deal tidak ditemukan" }, { status: 404 });

        await db.transaction(async (tx) => {
            const nextStageLower = stage.toLowerCase();
            const statusVal = nextStageLower === 'won' ? 'won' : (nextStageLower === 'lost' ? 'lost' : 'open');

            await tx.update(crmDeals)
                .set({
                    stage: nextStageLower,
                    status: statusVal
                })
                .where(eq(crmDeals.id, Number(dealId)));

            // Log action
            await tx.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId || deal.unitId),
                pesan: `Deal ${deal.crmContact?.nama || 'Pelanggan'} (Rp ${String(deal.nilai || 0)}) diperbarui ke tahap: ${stage.toUpperCase()}`,
                kategori: 'CRM',
                tipe: stage.toUpperCase() === 'WON' ? 'success' : 'info'
            });
        });

        return json({ success: true, message: "Stage deal berhasil diperbarui" });
    } catch (err) {
        log.crm.error({ err }, 'API PUT CRM ERROR');
        return json({ success: false, message: "Gagal memperbarui deal: " + err.message }, { status: 500 });
    }
}

// 4. DELETE: Hapus deal crm
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const dealId = url.searchParams.get('dealId');
    const unitId = url.searchParams.get('unitId');
    if (!dealId || !unitId) return json({ success: false, message: "dealId dan unitId wajib diisi" }, { status: 400 });

    try {
        await db.delete(crmDeals).where(and(eq(crmDeals.id, Number(dealId)), eq(crmDeals.unitId, Number(unitId))));

        // Save log
        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId), pesan: 'Deal dihapus', kategori: 'CRM', tipe: 'warning'
        });

        return json({ success: true, message: "Deal berhasil dihapus" });
    } catch (err) {
        log.crm.error({ err }, 'API DELETE CRM ERROR');
        return json({ success: false, message: "Gagal menghapus deal" }, { status: 500 });
    }
}
