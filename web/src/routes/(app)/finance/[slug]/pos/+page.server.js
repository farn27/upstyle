import { db } from '$lib/server/drizzle';
import { unitBisnis, products, kategoriProduk, posCustomers, posShifts, posCashTransactions } from '$lib/server/schema';
import { eq, and, or, asc, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { getVerifiedStaffSession } from '$lib/server/portalAuth';
import { pusherServer } from '$lib/server/pusher';
import { getActivePosFeatures } from '$lib/posFeatures';

export async function load({ params, cookies, locals }) {
    const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
    const { slug } = params;
    const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });

    if (!ownerUserId && !staffSession) throw error(401, 'Unauthorized');

    try {
        let unit = null;

        if (staffSession) {
            const unitRows = await db.select({
                id: unitBisnis.id,
                user_id: unitBisnis.userId,
                slug: unitBisnis.slug,
                login_slug: unitBisnis.loginSlug
            })
            .from(unitBisnis)
            .where(eq(unitBisnis.id, staffSession.unit_id))
            .limit(1);

            if (unitRows.length === 0) {
                throw error(404, 'Unit bisnis tidak ditemukan');
            }

            unit = unitRows[0];
            if (unit.slug !== slug && unit.login_slug !== slug) {
                const fallbackRows = await db.select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug
                })
                .from(unitBisnis)
                .where(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)))
                .limit(1);

                if (fallbackRows.length > 0) {
                    const routeUnit = fallbackRows[0];
                    if (routeUnit.id !== unit.id) {
                        console.warn('POS Route slug mismatch for staff session unit, falling back to route unit for owner check', {
                            routeSlug: slug,
                            staffUnitId: unit.id,
                            staffUnitSlug: unit.slug,
                            staffLoginSlug: unit.login_slug,
                            routeUnitId: routeUnit.id,
                            routeUnitSlug: routeUnit.slug,
                            routeLoginSlug: routeUnit.login_slug
                        });
                        unit = routeUnit;
                    }
                }
            }
        } else {
            let queryNote = null;
            let unitRows = [];

            if (ownerUserId) {
                unitRows = await db.select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug
                })
                .from(unitBisnis)
                .where(and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, ownerUserId)))
                .limit(1);
                queryNote = 'owner_slug';
            }

            if (unitRows.length === 0) {
                unitRows = await db.select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug
                })
                .from(unitBisnis)
                .where(eq(unitBisnis.slug, slug))
                .limit(1);
                queryNote = queryNote || 'slug';
            }

            if (unitRows.length === 0 && ownerUserId) {
                unitRows = await db.select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug
                })
                .from(unitBisnis)
                .where(and(eq(unitBisnis.loginSlug, slug), eq(unitBisnis.userId, ownerUserId)))
                .limit(1);
                queryNote = 'owner_login_slug';
            }

            if (unitRows.length === 0) {
                unitRows = await db.select({
                    id: unitBisnis.id,
                    user_id: unitBisnis.userId,
                    slug: unitBisnis.slug,
                    login_slug: unitBisnis.loginSlug
                })
                .from(unitBisnis)
                .where(eq(unitBisnis.loginSlug, slug))
                .limit(1);
                queryNote = queryNote || 'login_slug';
            }

            if (unitRows.length === 0) {
                throw error(404, 'Unit bisnis tidak ditemukan');
            }

            unit = unitRows[0];
        }

        const normalizedRole = staffSession?.role?.toString().toLowerCase().trim() || '';
        const isOwner = ownerUserId && Number(unit.user_id) === Number(ownerUserId);
        const isStaff = staffSession && Number(staffSession.unit_id) === Number(unit.id) && !isOwner;

        if (!isOwner && !isStaff) {
            console.warn('POS Unauthorized:', {
                unitSlug: slug,
                unitId: unit.id,
                unitOwnerId: unit.user_id,
                ownerUserId,
                staffSession: staffSession ? {
                    unit_id: staffSession.unit_id,
                    owner_id: staffSession.owner_id,
                    login_slug: staffSession.login_slug,
                    unit_slug: staffSession.unit_slug,
                    role: staffSession.role
                } : null
            });
            throw error(403, 'Anda tidak memiliki akses ke unit ini');
        }

        const unitId = unit.id;
        const featureAktif = getActivePosFeatures(unit.kategori, unit.posFeatureOverride);

        // Query produk berdasarkan unit_id yang valid untuk sesi staf atau pemilik
        const productsData = await db.select({
            id: products.id,
            nama: products.nama,
            slug: products.slug,
            sku: products.sku,
            foto: products.foto,
            harga_jual: products.hargaJual,
            harga_beli: products.hargaBeli,
            stok: products.stok,
            min_stok: products.minStok,
            kategori_id: products.kategoriId,
            unit_id: products.unitId,
            user_id: products.userId,
            has_variant: products.hasVariant,
            nama_kategori: kategoriProduk.namaKategori
        })
        .from(products)
        .leftJoin(kategoriProduk, eq(products.kategoriId, kategoriProduk.id))
        .where(and(eq(products.unitId, unitId), eq(products.showInPos, 1)));

        const customersData = await db.select({
            id: posCustomers.id,
            nama_customer: posCustomers.namaCustomer,
            email: posCustomers.email,
            telepon: posCustomers.telepon
        })
        .from(posCustomers)
        .where(eq(posCustomers.unitId, unitId))
        .orderBy(asc(posCustomers.namaCustomer));

        // Cek shift aktif untuk kasir saat ini
        const activeShiftUserId = staffSession ? staffSession.user_id : (ownerUserId || 0);
        let activeShift = null;
        if (activeShiftUserId) {
            const shiftRows = await db.select()
                .from(posShifts)
                .where(and(
                    eq(posShifts.unitId, unitId),
                    eq(posShifts.userId, activeShiftUserId),
                    eq(posShifts.status, 'OPEN')
                ))
                .orderBy(desc(posShifts.id))
                .limit(1);
            if (shiftRows.length > 0) activeShift = shiftRows[0];
        }

        return {
            products: productsData,
            customers: customersData,
            activeShift,
            slug,
            unitName: unit.nama_unit,
            isStaff,
            isOwner,
            staffRole: normalizedRole || null,
            staffLoginSlug: staffSession?.login_slug || null,
            staffName: staffSession?.full_name || null,
            featureAktif
        };
    } catch (err) {
        console.error("POS Load Error:", err);
        throw error(500, 'Gagal memuat data produk');
    }
}

export const actions = {
    bukaShift: async ({ request, cookies, params, locals }) => {
        const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
        const { slug } = params;
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
        if (!ownerUserId && !staffSession) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const modalAwal = parseFloat(data.get('modal_awal') || '0');

        let unitId = null;
        let userId = staffSession ? staffSession.user_id : ownerUserId;

        if (staffSession) {
            unitId = staffSession.unit_id;
        } else if (ownerUserId) {
            const unit = await db.query.unitBisnis.findFirst({
                where: and(or(eq(unitBisnis.slug, slug), eq(unitBisnis.loginSlug, slug)), eq(unitBisnis.userId, ownerUserId))
            });
            if (unit) unitId = unit.id;
        }
        if (!unitId) return { success: false, error: 'Unit tidak ditemukan' };

        try {
            await db.insert(posShifts).values({
                unitId,
                userId,
                waktuBuka: new Date().toISOString().slice(0, 19).replace('T', ' '),
                modalAwal: modalAwal,
                kasAkhir: modalAwal,
                status: 'OPEN'
            });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
    tutupShift: async ({ request, cookies, params, locals }) => {
        const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
        const { slug } = params;
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
        if (!ownerUserId && !staffSession) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const kasAkhir = parseFloat(data.get('kas_akhir') || '0');
        const catatan = data.get('catatan') || null;
        const shiftId = Number(data.get('shift_id'));

        if (!shiftId) return { success: false, error: 'Shift ID invalid' };

        try {
            const shiftRecord = await db.query.posShifts.findFirst({
                where: eq(posShifts.id, shiftId)
            });
            if (!shiftRecord) return { success: false, error: 'Shift tidak ditemukan' };

            const selisih = kasAkhir - Number(shiftRecord.kasAkhir);

            await db.update(posShifts).set({
                waktuTutup: new Date().toISOString().slice(0, 19).replace('T', ' '),
                kasAkhirAktual: String(kasAkhir),
                selisih: String(selisih),
                catatan,
                status: 'CLOSED'
            }).where(eq(posShifts.id, shiftId));

            if (selisih !== 0) {
                try {
                    pusherServer.trigger(`finance-${slug}`, 'pos-cash-alert', {
                        cashier: staffSession ? staffSession.nama_staff : 'Owner',
                        selisih: selisih,
                        shiftId: shiftId
                    });
                } catch (e) {
                    console.error("Pusher error on tutupShift:", e);
                }
            }

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
    cashManagement: async ({ request, cookies, params, locals }) => {
        const ownerUserId = locals.user?.id ?? await getCurrentUserId(cookies);
        const { slug } = params;
        const staffSession = await getVerifiedStaffSession(cookies, { unitSlug: slug });
        if (!ownerUserId && !staffSession) return { success: false, error: 'Unauthorized' };

        const data = await request.formData();
        const shiftId = Number(data.get('shift_id'));
        const type = data.get('type'); // CASH_IN or CASH_OUT
        const amount = parseFloat(data.get('amount') || '0');
        const description = data.get('description') || null;

        if (!shiftId || !type || amount <= 0) return { success: false, error: 'Data tidak valid' };

        try {
            await db.transaction(async (tx) => {
                const shiftRecord = await tx.query.posShifts.findFirst({
                    where: eq(posShifts.id, shiftId)
                });
                if (!shiftRecord) throw new Error('Shift tidak ditemukan');

                await tx.insert(posCashTransactions).values({
                    shiftId,
                    type,
                    amount: String(amount),
                    description
                });

                // Update saldo kasAkhir (expected cash in drawer)
                let newKasAkhir = Number(shiftRecord.kasAkhir);
                if (type === 'CASH_IN') newKasAkhir += amount;
                else if (type === 'CASH_OUT') newKasAkhir -= amount;

                await tx.update(posShifts)
                    .set({ kasAkhir: String(newKasAkhir) })
                    .where(eq(posShifts.id, shiftId));
            });

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }
};
