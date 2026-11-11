import { json } from '@sveltejs/kit';
import { pesanAman } from '$lib/server/pesanAman';
import { db } from '$lib/server/drizzle';
import { crmDeals, crmContacts, riwayatAksi } from '$lib/server/schema';
import { eq, and, desc, sql, or, like, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { log } from '$lib/server/logger';
import { unitMilikUser } from '$lib/server/apiUnitGuard';
import { z } from 'zod';

/** Nama tahap dari app lama → id tahap yang dipakai pipeline web */
const PETA_TAHAP = { prospect: 'prospek', lead: 'prospek', qualified: 'follow-up', proposal: 'follow-up', negotiation: 'negosiasi' };
const normTahap = (s) => { const k = String(s || '').trim().toLowerCase(); return PETA_TAHAP[k] || k || 'prospek'; };

// 1. GET: Ambil semua deals (dengan kontak info) untuk unitId (with pagination)
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const pagination = parsePagination(url);

        // Daftar kontak CRM (tab Kontak di app): ?type=contacts[&q=cari]
        if (url.searchParams.get('type') === 'contacts') {
            const q = (url.searchParams.get('q') || '').trim();
            const kondisi = q
                ? and(eq(crmContacts.unitId, Number(unitId)), or(
                    like(crmContacts.nama, `%${q}%`), like(crmContacts.telepon, `%${q}%`),
                    like(crmContacts.email, `%${q}%`), like(crmContacts.perusahaan, `%${q}%`)))
                : eq(crmContacts.unitId, Number(unitId));
            const [jumlah] = await db.select({ count: sql`count(*)` }).from(crmContacts).where(kondisi);
            const baris = await db.select().from(crmContacts).where(kondisi)
                .orderBy(desc(crmContacts.id)).limit(pagination.limit).offset(pagination.offset);
            const data = baris.map((c) => ({
                id: c.id, ownerId: c.ownerId, unitId: c.unitId, nama: c.nama || '',
                telepon: c.telepon || '', email: c.email || '', perusahaan: c.perusahaan || '',
                stage: c.stage || 'lead', sumber: c.sumber || 'manual', tags: c.tags || null,
                createdAt: c.createdAt || ''
            }));
            return json(paginatedResponse(data, Number(jumlah.count) || 0, pagination));
        }

        // Get total count
        const [totalResult] = await db.select({ count: sql`count(*)` }).from(crmDeals).where(eq(crmDeals.unitId, Number(unitId)));
        const total = Number(totalResult.count) || 0;

        // Get paginated deals (kontak diambil terpisah — tanpa LATERAL JOIN, jalan di MySQL/TiDB/MariaDB)
        const dealsRaw = await db.select().from(crmDeals)
            .where(eq(crmDeals.unitId, Number(unitId)))
            .orderBy(desc(crmDeals.id))
            .limit(pagination.limit).offset(pagination.offset);
        const idKontak = [...new Set(dealsRaw.map((d) => d.kontakId).filter((x) => x != null))];
        const kontakRows = idKontak.length
            ? await db.select().from(crmContacts).where(and(eq(crmContacts.unitId, Number(unitId)), inArray(crmContacts.id, /** @type {number[]} */ (idKontak))))
            : [];
        const petaKontak = new Map(kontakRows.map((c) => [c.id, c]));
        const dealsList = dealsRaw.map((d) => ({ ...d, contact: d.kontakId != null ? petaKontak.get(d.kontakId) || null : null }));

        // Map to mobile CrmDeal structure
        const data = dealsList.map(d => ({
            id: d.id,
            namaDeal: d.namaDeal || '',
            contactName: d.contact?.nama || '',
            companyName: d.contact?.perusahaan || '',
            dealValue: Number(d.nilai || 0),
            stage: normTahap(d.stage).toUpperCase(),
            phone: d.contact?.telepon || '',
            unitId: d.unitId,
            kontakId: d.kontakId || null,
            status: d.status || 'open',
            createdAt: d.createdAt || '',
            contact: d.contact ? {
                id: d.contact.id,
                ownerId: d.contact.ownerId,
                unitId: d.contact.unitId,
                sumber: d.contact.sumber || 'manual',
                nama: d.contact.nama || '',
                telepon: d.contact.telepon || '',
                email: d.contact.email || '',
                perusahaan: d.contact.perusahaan || '',
                stage: d.contact.stage || 'lead',
                alamat: d.contact.alamat || '',
                catatan: d.contact.catatan || ''
            } : null
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

        // Tambah kontak CRM dari app: { action:'create-contact', contact:{ nama, telepon, email, perusahaan, stage, sumber, unitId } }
        if (body?.action === 'create-contact') {
            const c = z.object({
                nama: z.string().trim().min(1, 'Nama kontak wajib diisi').max(150),
                telepon: z.string().max(30).optional().default(''),
                email: z.union([z.literal(''), z.string().email('Format email tidak valid')]).optional().default(''),
                perusahaan: z.string().max(150).optional().default(''),
                stage: z.string().max(50).optional().default('lead'),
                sumber: z.string().max(80).optional().default('manual'),
                unitId: z.coerce.number().int().positive('unitId wajib diisi')
            }).safeParse(body.contact || {});
            if (!c.success) return json({ success: false, message: c.error.issues[0]?.message || 'Input kontak tidak valid' }, { status: 400 });
            const d = c.data;
            const [hasil] = await db.insert(crmContacts).values({
                ownerId: userId, unitId: d.unitId, nama: d.nama, telepon: d.telepon || null, email: d.email || null,
                perusahaan: d.perusahaan || null, stage: d.stage.toLowerCase(), sumber: d.sumber
            });
            await db.insert(riwayatAksi).values({ userId, unitId: d.unitId, pesan: `Kontak CRM baru: ${d.nama}`, kategori: 'CRM', tipe: 'success' });
            return json({ success: true, message: 'Kontak berhasil ditambahkan', id: hasil.insertId });
        }

        // ─── Zod validation ────────────────────────────────────────────────────
        const crmPostSchema = z.object({
            deal: z.object({
                contactName: z.string().min(1, 'Nama kontak wajib diisi').max(150),
                companyName: z.string().optional(),
                dealValue: z.coerce.number().min(0).default(0),
                stage: z.string().default('lead'),
                phone: z.string().optional(),
                namaDeal: z.string().trim().max(200).optional(),
                kontakId: z.coerce.number().int().positive().optional().nullable(),
                unitId: z.coerce.number().int().positive('unitId wajib diisi'),
            })
        });
        const parsed = crmPostSchema.safeParse(body);
        if (!parsed.success) {
            const errorMsg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input CRM tidak valid';
            return json({ success: false, message: errorMsg }, { status: 400 });
        }
        // ──────────────────────────────────────────────────────────────────────

        const { contactName, companyName, dealValue, stage, phone, unitId } = body.deal;
        const namaDealKustom = String(body.deal.namaDeal || '').trim();
        const kontakDipilih = Number(body.deal.kontakId) || null;

        let dealId = null;

        await db.transaction(async (tx) => {
            // Find or create contact
            let contactId = null;
            // Kontak yang dipilih dari daftar harus milik unit yang sama (cegah kontak unit orang lain).
            const dipilih = kontakDipilih
                ? await tx.query.crmContacts.findFirst({ where: and(eq(crmContacts.id, kontakDipilih), eq(crmContacts.unitId, Number(unitId))) })
                : null;
            if (kontakDipilih && !dipilih) throw new Error('Kontak tidak ditemukan di unit ini');
            const existingContact = dipilih || await tx.query.crmContacts.findFirst({
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
                }).then(([r]) => [{ id: r.insertId }]);
                contactId = newContact.id;
            }

            // Insert deal
            const [newDeal] = await tx.insert(crmDeals).values({
                ownerId: userId,
                unitId: Number(unitId),
                kontakId: contactId,
                namaDeal: namaDealKustom || `${companyName || contactName} - Deal`,
                nilai: String(dealValue || 0),
                stage: normTahap(stage),
                status: 'open'
            }).then(([r]) => [{ id: r.insertId }]);
            
            dealId = newDeal.id;

            // Log action
            await tx.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Pipeline Deal baru ditambahkan: ${contactName} - Rp ${Number(dealValue || 0).toLocaleString('id-ID')}`,
                kategori: 'CRM',
                tipe: 'success'
            });
        });

        return json({ success: true, message: "Deal berhasil ditambahkan", id: dealId });
    } catch (err) {
        if (err instanceof Error && err.message.startsWith('Kontak tidak ditemukan')) {
            return json({ success: false, message: pesanAman(err) }, { status: 404 });
        }
        log.crm.error({ err }, 'API POST CRM ERROR');
        return json({ success: false, message: "Gagal menambahkan deal: " + pesanAman(err) }, { status: 500 });
    }
}

// 3. PUT: Update deal — pindah tahap dan/atau ubah nama / nilai
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { dealId, stage, namaDeal, nilai } = body;

        if (!dealId || (!stage && namaDeal === undefined && nilai === undefined)) {
            return json({ success: false, message: "dealId dan stage (atau nama / nilai) wajib diisi" }, { status: 400 });
        }

        const deal = await db.query.crmDeals.findFirst({
            where: eq(crmDeals.id, Number(dealId))
        });
        if (!deal || !(await unitMilikUser(db, userId, deal.unitId))) {
            return json({ success: false, message: "Deal tidak ditemukan" }, { status: 404 });
        }

        /** @type {Record<string, any>} */
        const ubah = {};
        if (namaDeal !== undefined) {
            const nama = String(namaDeal).trim();
            if (!nama) return json({ success: false, message: 'Nama deal tidak boleh kosong' }, { status: 400 });
            ubah.namaDeal = nama.slice(0, 200);
        }
        if (nilai !== undefined) {
            const n = Number(nilai);
            if (!Number.isFinite(n) || n < 0) return json({ success: false, message: 'Nilai deal tidak valid' }, { status: 400 });
            ubah.nilai = String(n);
        }
        if (stage) {
            const tahap = normTahap(stage);
            ubah.stage = tahap;
            ubah.status = tahap === 'won' ? 'won' : (tahap === 'lost' ? 'lost' : 'open');
        }

        await db.transaction(async (tx) => {
            await tx.update(crmDeals).set(ubah)
                .where(and(eq(crmDeals.id, Number(dealId)), eq(crmDeals.unitId, deal.unitId)));

            await tx.insert(riwayatAksi).values({
                userId,
                unitId: deal.unitId,
                pesan: stage
                    ? `Deal ${deal.namaDeal || 'Pelanggan'} (Rp ${Number(deal.nilai || 0).toLocaleString('id-ID')}) diperbarui ke tahap: ${String(stage).toUpperCase()}`
                    : `Deal ${deal.namaDeal || 'Pelanggan'} diperbarui`,
                kategori: 'CRM',
                tipe: String(stage || '').toUpperCase() === 'WON' ? 'success' : 'info'
            });
        });

        return json({ success: true, message: stage ? "Stage deal berhasil diperbarui" : "Deal berhasil diperbarui" });
    } catch (err) {
        log.crm.error({ err }, 'API PUT CRM ERROR');
        return json({ success: false, message: "Gagal memperbarui deal: " + pesanAman(err) }, { status: 500 });
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
            userId, unitId: Number(unitId), pesan: 'Deal dihapus', kategori: 'CRM', tipe: 'info'
        });

        return json({ success: true, message: "Deal berhasil dihapus" });
    } catch (err) {
        log.crm.error({ err }, 'API DELETE CRM ERROR');
        return json({ success: false, message: "Gagal menghapus deal" }, { status: 500 });
    }
}
