import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { vouchers, riwayatAksi, marketingCampaigns } from '$lib/server/schema';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET /api/app/pos/vouchers?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const includeMarketing = url.searchParams.get('includeMarketing') === 'true';

        // Get POS vouchers
        const list = await db.query.vouchers.findMany({
            where: eq(vouchers.unitId, Number(unitId)),
            orderBy: [desc(vouchers.id)]
        });

        let data = list.map(v => ({
            id: v.id, unitId: v.unitId, code: v.code,
            discountType: v.discountType, discountValue: Number(v.discountValue),
            maxUsage: v.maxUsage || 0, currentUsage: v.currentUsage || 0,
            minPurchase: Number(v.minPurchase || 0),
            validFrom: v.validFrom, validUntil: v.validUntil,
            isActive: v.isActive ? 1 : 0,
            source: 'POS'
        }));

        // Include marketing vouchers if requested
        if (includeMarketing) {
            const marketingVouchers = await db.query.vouchers.findMany({
                where: and(
                    eq(vouchers.unitId, Number(unitId)),
                    eq(vouchers.isActive, true)
                ),
                orderBy: [desc(vouchers.id)]
            });

            // Add marketing source tag
            const marketingData = marketingVouchers.map(v => ({
                id: v.id, unitId: v.unitId, code: v.code,
                discountType: v.discountType, discountValue: Number(v.discountValue),
                maxUsage: v.maxUsage || 0, currentUsage: v.currentUsage || 0,
                minPurchase: Number(v.minPurchase || 0),
                validFrom: v.validFrom, validUntil: v.validUntil,
                isActive: v.isActive ? 1 : 0,
                source: 'MARKETING'
            }));

            // Merge and remove duplicates (by code)
            const allVouchers = [...data, ...marketingData];
            const uniqueCodes = new Set();
            data = allVouchers.filter(v => {
                if (uniqueCodes.has(v.code)) {
                    return false;
                }
                uniqueCodes.add(v.code);
                return true;
            });
        }

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET pos/vouchers');
        return json({ success: false, message: 'Gagal memuat voucher' }, { status: 500 });
    }
}

// POST /api/app/pos/vouchers — buat voucher baru
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const schema = z.object({
        code: z.string().min(3).max(50).toUpperCase(),
        discountType: z.enum(['PERCENTAGE','FIXED']),
        discountValue: z.coerce.number().positive(),
        maxUsage: z.coerce.number().int().min(0).default(0),
        minPurchase: z.coerce.number().min(0).default(0),
        validFrom: z.string().min(1),
        validUntil: z.string().min(1),
        unitId: z.coerce.number().int().positive()
    });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body.voucher || body);
        if (!parsed.success) return json({ success: false, message: parsed.error.errors[0].message }, { status: 422 });
        const { code, discountType, discountValue, maxUsage, minPurchase, validFrom, validUntil, unitId } = parsed.data;

        // Check unique code
        const existing = await db.query.vouchers.findFirst({ where: and(eq(vouchers.unitId, Number(unitId)), eq(vouchers.code, code)) });
        if (existing) return json({ success: false, message: `Kode voucher "${code}" sudah digunakan` }, { status: 409 });

        const [result] = await db.insert(vouchers).values({
            unitId: Number(unitId), code, discountType,
            discountValue: String(discountValue), maxUsage, currentUsage: 0,
            minPurchase: String(minPurchase), validFrom, validUntil, isActive: true
        });

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Voucher baru: ${code} (${discountType === 'PERCENTAGE' ? discountValue + '%' : 'Rp ' + discountValue.toLocaleString('id-ID')})`,
            kategori: 'POS', tipe: 'success'
        });

        return json({ success: true, message: 'Voucher berhasil dibuat', data: { id: result.insertId, code } });
    } catch (err) {
        log.api.error({ err }, 'POST pos/vouchers');
        return json({ success: false, message: 'Gagal buat voucher' }, { status: 500 });
    }
}

// PUT /api/app/pos/vouchers - sync, validate, atau update voucher
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'sync-marketing') {
            const { unitId } = body;
            
            if (!unitId) {
                return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
            }

            // Get all active marketing campaigns that are voucher-based
            const marketingCamps = await db.query.marketingCampaigns.findMany({
                where: and(
                    eq(marketingCampaigns.unitId, Number(unitId)),
                    eq(marketingCampaigns.status, 'ACTIVE')
                )
            });

            let syncedCount = 0;
            for (const camp of marketingCamps) {
                // Check if voucher already exists for this campaign
                const existing = await db.query.vouchers.findFirst({
                    where: and(
                        eq(vouchers.unitId, Number(unitId)),
                        eq(vouchers.code, `CAMP-${camp.id}`)
                    )
                });

                if (!existing) {
                    // Create voucher based on campaign
                    await db.insert(vouchers).values({
                        unitId: Number(unitId),
                        code: `CAMP-${camp.id}`,
                        discountType: 'PERCENTAGE',
                        discountValue: '10.00', // Default 10%
                        maxUsage: 100,
                        currentUsage: 0,
                        minPurchase: '50000.00',
                        validFrom: new Date().toISOString().split('T')[0],
                        validUntil: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                        isActive: true
                    });
                    syncedCount++;
                }
            }

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Sinkronisasi voucher marketing: ${syncedCount} voucher baru`,
                kategori: 'POS',
                tipe: 'info'
            });

            return json({ 
                success: true, 
                message: `${syncedCount} voucher berhasil disinkronisasi dari marketing`,
                syncedCount 
            });
        }

        if (action === 'validate-voucher') {
            const { voucherCode, unitId, purchaseAmount } = body;

            if (!voucherCode || !unitId || purchaseAmount === undefined) {
                return json({ success: false, message: 'voucherCode, unitId, dan purchaseAmount wajib diisi' }, { status: 400 });
            }

            const voucher = await db.query.vouchers.findFirst({
                where: and(
                    eq(vouchers.unitId, Number(unitId)),
                    eq(vouchers.code, voucherCode),
                    eq(vouchers.isActive, true)
                )
            });

            if (!voucher) {
                return json({ success: false, message: 'Voucher tidak ditemukan atau tidak aktif' }, { status: 404 });
            }

            // Check validity dates
            const now = new Date();
            const validFrom = new Date(voucher.validFrom);
            const validUntil = new Date(voucher.validUntil);

            if (now < validFrom || now > validUntil) {
                return json({ success: false, message: 'Voucher sudah kedaluwarsa atau belum berlaku' }, { status: 400 });
            }

            // Check usage limit
            if (voucher.maxUsage > 0 && voucher.currentUsage >= voucher.maxUsage) {
                return json({ success: false, message: 'Voucher sudah mencapai batas penggunaan' }, { status: 400 });
            }

            // Check minimum purchase
            if (Number(purchaseAmount) < Number(voucher.minPurchase)) {
                return json({ 
                    success: false, 
                    message: `Minimum pembelian Rp ${Number(voucher.minPurchase).toLocaleString('id-ID')}` 
                }, { status: 400 });
            }

            // Calculate discount
            let discountAmount = 0;
            if (voucher.discountType === 'PERCENTAGE') {
                discountAmount = (Number(voucher.discountValue) / 100) * Number(purchaseAmount);
            } else {
                discountAmount = Number(voucher.discountValue);
            }

            return json({
                success: true,
                message: 'Voucher valid',
                voucher: {
                    id: voucher.id,
                    code: voucher.code,
                    discountType: voucher.discountType,
                    discountValue: Number(voucher.discountValue),
                    discountAmount,
                    finalAmount: Number(purchaseAmount) - discountAmount
                }
            });
        }

        if (action === 'use-voucher') {
            const { voucherId, unitId } = body;

            if (!voucherId) {
                return json({ success: false, message: 'voucherId wajib diisi' }, { status: 400 });
            }

            // Increment usage count
            await db.update(vouchers)
                .set({ 
                    currentUsage: sql`${vouchers.currentUsage} + 1` 
                })
                .where(eq(vouchers.id, Number(voucherId)));

            return json({ success: true, message: 'Voucher berhasil digunakan' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT pos/vouchers');
        return json({ success: false, message: 'Gagal memproses voucher: ' + err.message }, { status: 500 });
    }
}

// DELETE /api/app/pos/vouchers?voucherId=X
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const voucherId = url.searchParams.get('voucherId');
    if (!voucherId) return json({ success: false, message: 'voucherId wajib' }, { status: 400 });
    try {
        await db.update(vouchers).set({ isActive: false }).where(eq(vouchers.id, Number(voucherId)));
        return json({ success: true, message: 'Voucher dinonaktifkan' });
    } catch (err) {
        log.api.error({ err }, 'DELETE pos/vouchers');
        return json({ success: false, message: 'Gagal hapus voucher' }, { status: 500 });
    }
}
