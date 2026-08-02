import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { vouchers } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET: Fetch all vouchers for a unit
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

    try {
        const vouchersList = await db.query.vouchers.findMany({
            where: eq(vouchers.unitId, Number(unitId)),
            orderBy: [desc(vouchers.createdAt)]
        });

        const data = vouchersList.map(v => ({
            ...v,
            discountValue: Number(v.discountValue || 0),
            minPurchase: Number(v.minPurchase || 0),
            usagePercentage: v.maxUsage > 0 ? Math.min(100, Math.round((v.currentUsage / v.maxUsage) * 100)) : 0
        }));

        return json({
            success: true,
            message: "Berhasil mengambil data voucher",
            data
        });
    } catch (err) {
        log.pos.error({ err }, 'API GET VOUCHERS ERROR');
        return json({ success: false, message: "Gagal mengambil data voucher" }, { status: 500 });
    }
}

// POST: Create new voucher
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, code, discountType, discountValue, maxUsage, minPurchase, validFrom, validUntil } = body;

        if (!unitId || !code || !discountType || discountValue === undefined || !validFrom || !validUntil) {
            return json({ success: false, message: "Data voucher tidak lengkap" }, { status: 400 });
        }

        const formattedCode = String(code).trim().toUpperCase();

        // Validate code is unique for this unitId
        const existing = await db.query.vouchers.findFirst({
            where: and(eq(vouchers.unitId, Number(unitId)), eq(vouchers.code, formattedCode))
        });

        if (existing) {
            return json({ success: false, message: "Kode voucher sudah digunakan untuk unit ini" }, { status: 400 });
        }

        const [result] = await db.insert(vouchers).values({
            unitId: Number(unitId),
            code: formattedCode,
            discountType, // 'PERCENTAGE' or 'FIXED'
            discountValue: String(discountValue),
            maxUsage: maxUsage ? Number(maxUsage) : 0,
            currentUsage: 0,
            minPurchase: minPurchase ? String(minPurchase) : "0.00",
            validFrom: String(validFrom),
            validUntil: String(validUntil),
            isActive: true
        });

        const newVoucher = await db.query.vouchers.findFirst({
            where: eq(vouchers.id, result.insertId)
        });

        return json({
            success: true,
            message: "Voucher berhasil dibuat",
            data: newVoucher
        });
    } catch (err) {
        log.pos.error({ err }, 'API POST VOUCHER ERROR');
        return json({ success: false, message: err.message || "Gagal membuat voucher" }, { status: 500 });
    }
}

// PUT: Update voucher
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, discountValue, maxUsage, validUntil, isActive, code, discountType, minPurchase, validFrom } = body;

        if (!id) {
            return json({ success: false, message: "ID voucher wajib diisi" }, { status: 400 });
        }

        const existing = await db.query.vouchers.findFirst({
            where: eq(vouchers.id, Number(id))
        });

        if (!existing) {
            return json({ success: false, message: "Voucher tidak ditemukan" }, { status: 400 });
        }

        const updateData = {};
        if (discountValue !== undefined) updateData.discountValue = String(discountValue);
        if (maxUsage !== undefined) updateData.maxUsage = Number(maxUsage);
        if (validUntil !== undefined) updateData.validUntil = String(validUntil);
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);
        if (code !== undefined) updateData.code = String(code).trim().toUpperCase();
        if (discountType !== undefined) updateData.discountType = discountType;
        if (minPurchase !== undefined) updateData.minPurchase = String(minPurchase);
        if (validFrom !== undefined) updateData.validFrom = String(validFrom);

        if (Object.keys(updateData).length === 0) {
            return json({ success: false, message: "Tidak ada data yang diperbarui" }, { status: 400 });
        }

        await db.update(vouchers)
            .set(updateData)
            .where(eq(vouchers.id, Number(id)));

        const updatedVoucher = await db.query.vouchers.findFirst({
            where: eq(vouchers.id, Number(id))
        });

        return json({
            success: true,
            message: "Voucher berhasil diperbarui",
            data: updatedVoucher
        });
    } catch (err) {
        log.pos.error({ err }, 'API PUT VOUCHER ERROR');
        return json({ success: false, message: err.message || "Gagal memperbarui voucher" }, { status: 500 });
    }
}

// DELETE: ?voucherId= - set isActive=false (soft disable)
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

    const voucherId = url.searchParams.get('voucherId') || url.searchParams.get('id');
    if (!voucherId) return json({ success: false, message: "voucherId wajib diisi" }, { status: 400 });

    try {
        const existing = await db.query.vouchers.findFirst({
            where: eq(vouchers.id, Number(voucherId))
        });

        if (!existing) {
            return json({ success: false, message: "Voucher tidak ditemukan" }, { status: 400 });
        }

        await db.update(vouchers)
            .set({ isActive: false })
            .where(eq(vouchers.id, Number(voucherId)));

        return json({
            success: true,
            message: "Voucher berhasil dinonaktifkan",
            data: { id: Number(voucherId), isActive: false }
        });
    } catch (err) {
        log.pos.error({ err }, 'API DELETE VOUCHER ERROR');
        return json({ success: false, message: err.message || "Gagal me-nonaktifkan voucher" }, { status: 500 });
    }
}
