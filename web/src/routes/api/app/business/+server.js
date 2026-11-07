import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, kategoriProduk, riwayatAksi } from '$lib/server/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { cekBatasUnit } from '$lib/server/planLimits';
import { buatUnit, slugUnik, UnitError } from '$lib/server/unitBaru';
import { parsePagination, applyPagination, paginatedResponse } from '$lib/server/pagination';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// 1. GET: Ambil List Bisnis
export async function GET({ cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Unauthorized", data: [] }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const pagination = parsePagination(url);

        // Get total count
        const [totalResult] = await db.select({ count: sql`count(*)` }).from(unitBisnis).where(eq(unitBisnis.userId, userId));
        const total = Number(totalResult.count) || 0;

        // Get paginated data
        const units = await db.query.unitBisnis.findMany({
            where: eq(unitBisnis.userId, userId),
            orderBy: [desc(unitBisnis.id)],
            limit: pagination.limit,
            offset: pagination.offset
        });

        const data = units.map(u => ({
            id: u.id,
            name: u.namaUnit,
            type: u.kategori || 'UMUM',
            uid: String(u.id),
            slug: u.slug || '',
            alamat: u.alamat || '',
            telepon: u.telepon || '',
            email: u.email || '',
            modalAwal: Number(u.modalAwal || 0),
            isCabang: u.isCabang || 0,
            cabangDari: u.cabangDari || null,
            posFeatureOverride: u.posFeatureOverride || null,
            loginSlug: u.loginSlug || '',
            settings: {
                alamat: u.alamat || '',
                telepon: u.telepon || '',
                email: u.email || '',
                modalAwal: Number(u.modalAwal || 0),
                isCabang: u.isCabang || 0,
                posFeatureOverride: u.posFeatureOverride || null
            }
        }));

        return json(paginatedResponse(data, total, pagination));

    } catch (err) {
        log.api.error({ err }, 'API GET BUSINESS ERROR');
        return json({ success: false, message: "Server Error", data: [] }, { status: 500 });
    }
}

// 2. POST: Tambah Bisnis Baru (pusat atau cabang) — logika sama dengan form web /finance/create
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Sesi berakhir" }, { status: 401 });
    }

    const body = await request.json();

    const businessPostSchema = z.object({
        name: z.string().trim().min(2, 'Nama bisnis minimal 2 karakter').max(255),
        type: z.string().min(1, 'Tipe bisnis wajib diisi').max(50).nullable().optional(),
        is_cabang: z.boolean().optional().default(false),
        cabang_dari: z.coerce.number().int().positive().nullable().optional(),
        alamat: z.string().max(500).nullable().optional(),
        telepon: z.string().max(20).nullable().optional(),
        email: z.string().email('Format email tidak valid').max(100).nullable().optional().or(z.literal('')),
        modal_awal: z.coerce.number().min(0).nullable().optional()
    });
    const parsed = businessPostSchema.safeParse(body);
    if (!parsed.success) {
        const errorMsg = parsed.error?.issues?.[0]?.message || 'Input bisnis tidak valid';
        return json({ success: false, message: errorMsg }, { status: 400 });
    }
    const d = parsed.data;

    const batas = await cekBatasUnit(db, userId);
    if (!batas.boleh) return json({ success: false, message: batas.pesan, code: 'PLAN_LIMIT' }, { status: 403 });

    try {
        const unit = await buatUnit(db, userId, {
            nama: d.name, kategori: d.type, alamat: d.alamat, telepon: d.telepon, email: d.email || null,
            modalAwal: d.modal_awal ?? 0, isCabang: d.is_cabang, cabangDari: d.cabang_dari
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: unit.id,
            pesan: d.is_cabang ? `Cabang "${d.name}" berhasil dibuat!` : `Unit "${d.name}" (${unit.kategori}) berhasil terdaftar!`,
            kategori: 'Unit Bisnis', link: `/finance?sorot=${unit.id}`, tipe: 'success'
        });

        return json({ success: true, message: "Berhasil disimpan", data: { id: unit.id, slug: unit.slug } });

    } catch (err) {
        if (err instanceof UnitError) return json({ success: false, message: err.message }, { status: err.status });
        log.api.error({ err }, 'API POST BUSINESS ERROR');
        return json({ success: false, message: "Gagal menyimpan data" }, { status: 500 });
    }
}

// 3. DELETE: Hapus Bisnis
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const unitId = url.searchParams.get('unitId');
    if (!unitId) {
        return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });
    }

    try {
        await db.delete(unitBisnis).where(and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId)));
        return json({ success: true, message: "Unit bisnis berhasil dihapus" });
    } catch (err) {
        log.api.error({ err }, 'API DELETE UNIT ERROR');
        return json({ success: false, message: "Gagal menghapus unit bisnis" }, { status: 500 });
    }
}

// 4. PUT: Update Business dan Generate Portal Slug
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);

    if (!userId) {
        return json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'updatePortal') {
            const schema = z.object({
                action: z.literal('updatePortal'),
                unitId: z.coerce.number().int().positive(),
                generateNewSlug: z.boolean().default(false)
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { unitId, generateNewSlug } = body;

            // Verify ownership
            const unit = await db.query.unitBisnis.findFirst({
                where: and(
                    eq(unitBisnis.id, Number(unitId)),
                    eq(unitBisnis.userId, userId)
                )
            });

            if (!unit) {
                return json({ success: false, message: 'Unit bisnis tidak ditemukan' }, { status: 404 });
            }

            let newSlug = unit.slug;
            if (generateNewSlug || !unit.slug) {
                // Generate new unique slug
                const baseSlug = unit.namaUnit.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .slice(0, 50);
                
                const timestamp = Date.now().toString().slice(-6);
                newSlug = `${baseSlug}-${timestamp}`;

                // Ensure uniqueness
                let counter = 1;
                let finalSlug = newSlug;
                while (true) {
                    const existing = await db.query.unitBisnis.findFirst({
                        where: eq(unitBisnis.slug, finalSlug)
                    });
                    if (!existing) break;
                    finalSlug = `${newSlug}-${counter}`;
                    counter++;
                }
                newSlug = finalSlug;

                await db.update(unitBisnis)
                    .set({ slug: newSlug })
                    .where(eq(unitBisnis.id, Number(unitId)));
            }

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: generateNewSlug ? `Portal slug diperbarui: ${newSlug}` : 'Portal diaktifkan',
                kategori: 'PORTAL',
                tipe: 'success'
            });

            return json({ 
                success: true, 
                message: 'Portal berhasil diperbarui',
                data: {
                    slug: newSlug,
                    portalUrl: `https://portal.bizgrow.id/${newSlug}` // adjust domain as needed
                }
            });
        }

        if (action === 'updateBusiness') {
            const schema = z.object({
                action: z.literal('updateBusiness'),
                unitId: z.coerce.number().int().positive(),
                namaUnit: z.string().min(2).max(255).optional(),
                kategori: z.string().optional(),
                alamat: z.string().optional(),
                telepon: z.string().optional(),
                email: z.string().email().optional().or(z.literal('')),
                modalAwal: z.coerce.number().min(0).optional()
            });

            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }

            const { unitId, namaUnit, kategori, alamat, telepon, email, modalAwal } = body;

            // Verify ownership
            const unit = await db.query.unitBisnis.findFirst({
                where: and(
                    eq(unitBisnis.id, Number(unitId)),
                    eq(unitBisnis.userId, userId)
                )
            });

            if (!unit) {
                return json({ success: false, message: 'Unit bisnis tidak ditemukan' }, { status: 404 });
            }

            // Build update data
            const updateData = {};
            if (namaUnit !== undefined) updateData.namaUnit = namaUnit;
            if (kategori !== undefined) updateData.kategori = kategori;
            if (alamat !== undefined) updateData.alamat = alamat;
            if (telepon !== undefined) updateData.telepon = telepon;
            if (email !== undefined) updateData.email = email || null;
            if (modalAwal !== undefined) updateData.modalAwal = String(modalAwal);

            if (Object.keys(updateData).length === 0) {
                return json({ success: false, message: 'Tidak ada data yang diubah' }, { status: 400 });
            }

            // Update slug if name changed
            if (namaUnit && namaUnit !== unit.namaUnit) {
                updateData.slug = await slugUnik(db, userId, namaUnit, unit.id);
            }

            await db.update(unitBisnis)
                .set(updateData)
                .where(eq(unitBisnis.id, Number(unitId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Data bisnis diperbarui: ${updateData.namaUnit || unit.namaUnit}`,
                kategori: 'Unit Bisnis',
                tipe: 'info'
            });

            return json({ success: true, message: 'Data bisnis berhasil diperbarui' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'API PUT BUSINESS ERROR');
        return json({ success: false, message: 'Gagal memperbarui data bisnis: ' + err.message }, { status: 500 });
    }
}