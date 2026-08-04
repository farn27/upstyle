import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { salesTargets, salesCommissions, salesOrders, riwayatAksi, users } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { z } from 'zod';

// GET: Fetch sales targets and commissions
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    try {
        const type = url.searchParams.get('type') || 'all';

        if (type === 'targets') {
            const targets = await db.query.salesTargets.findMany({
                where: eq(salesTargets.unitId, Number(unitId)),
                orderBy: [desc(salesTargets.periodYear), desc(salesTargets.periodMonth)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            namaLengkap: true,
                            email: true
                        }
                    }
                }
            });

            return json({ 
                success: true, 
                targets: targets.map(t => ({
                    id: t.id,
                    unitId: t.unitId,
                    userId: t.userId,
                    userName: t.user?.namaLengkap || 'User',
                    targetAmount: Number(t.targetAmount || 0),
                    periodMonth: t.periodMonth,
                    periodYear: t.periodYear,
                    komisiPersen: Number(t.komisiPersen || 0),
                    createdAt: t.createdAt || ''
                }))
            });
        }

        if (type === 'commissions') {
            const commissions = await db.query.salesCommissions.findMany({
                where: eq(salesCommissions.unitId, Number(unitId)),
                orderBy: [desc(salesCommissions.id)],
                with: {
                    user: {
                        columns: {
                            id: true,
                            namaLengkap: true
                        }
                    },
                    salesOrder: {
                        columns: {
                            orderNumber: true,
                            totalAmount: true
                        }
                    }
                }
            });

            return json({ 
                success: true, 
                commissions: commissions.map(c => ({
                    id: c.id,
                    unitId: c.unitId,
                    salesOrderId: c.salesOrderId,
                    orderNumber: c.salesOrder?.orderNumber || '',
                    userId: c.userId,
                    userName: c.user?.namaLengkap || 'User',
                    amount: Number(c.amount || 0),
                    status: c.status || 'UNPAID',
                    createdAt: c.createdAt || ''
                }))
            });
        }

        // Default: return both
        const targets = await db.query.salesTargets.findMany({
            where: eq(salesTargets.unitId, Number(unitId)),
            orderBy: [desc(salesTargets.periodYear), desc(salesTargets.periodMonth)],
            limit: 50,
            with: {
                user: {
                    columns: {
                        id: true,
                        namaLengkap: true
                    }
                }
            }
        });

        const commissions = await db.query.salesCommissions.findMany({
            where: eq(salesCommissions.unitId, Number(unitId)),
            orderBy: [desc(salesCommissions.id)],
            limit: 50,
            with: {
                user: {
                    columns: {
                        id: true,
                        namaLengkap: true
                    }
                }
            }
        });

        return json({ 
            success: true, 
            data: {
                targets: targets.map(t => ({
                    id: t.id,
                    userId: t.userId,
                    userName: t.user?.namaLengkap || 'User',
                    targetAmount: Number(t.targetAmount || 0),
                    periodMonth: t.periodMonth,
                    periodYear: t.periodYear,
                    komisiPersen: Number(t.komisiPersen || 0)
                })),
                commissions: commissions.map(c => ({
                    id: c.id,
                    userId: c.userId,
                    userName: c.user?.namaLengkap || 'User',
                    amount: Number(c.amount || 0),
                    status: c.status
                }))
            }
        });

    } catch (err) {
        log.api.error({ err }, 'GET sales/targets error');
        return json({ success: false, message: 'Gagal mengambil data target sales' }, { status: 500 });
    }
}

// POST: Create sales target or commission
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        // ─── Zod validation ──────────────────────────────────────────────────
        if (action === 'create-target') {
            const schema = z.object({
                action: z.literal('create-target'),
                target: z.object({
                    unitId: z.coerce.number().int().positive(),
                    targetUserId: z.coerce.number().int().positive(),
                    targetAmount: z.coerce.number().min(0),
                    periodMonth: z.coerce.number().int().min(1).max(12),
                    periodYear: z.coerce.number().int().min(2020),
                    komisiPersen: z.coerce.number().min(0).max(100).default(0)
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input target tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }

        if (action === 'create-commission') {
            const schema = z.object({
                action: z.literal('create-commission'),
                commission: z.object({
                    unitId: z.coerce.number().int().positive(),
                    salesOrderId: z.coerce.number().int().positive(),
                    targetUserId: z.coerce.number().int().positive(),
                    amount: z.coerce.number().min(0),
                    status: z.enum(['UNPAID', 'PAID']).default('UNPAID')
                })
            });
            const parsed = schema.safeParse(body);
            if (!parsed.success) {
                const msg = parsed.error?.issues?.[0]?.message || 'Input komisi tidak valid';
                return json({ success: false, message: msg }, { status: 400 });
            }
        }
        // ──────────────────────────────────────────────────────────────────────

        if (action === 'create-target') {
            const { unitId, targetUserId, targetAmount, periodMonth, periodYear, komisiPersen } = body.target;

            // Check if target already exists for this user and period
            const existing = await db.query.salesTargets.findFirst({
                where: and(
                    eq(salesTargets.unitId, Number(unitId)),
                    eq(salesTargets.userId, Number(targetUserId)),
                    eq(salesTargets.periodMonth, Number(periodMonth)),
                    eq(salesTargets.periodYear, Number(periodYear))
                )
            });

            if (existing) {
                return json({ 
                    success: false, 
                    message: 'Target untuk user dan periode ini sudah ada' 
                }, { status: 400 });
            }

            const [result] = await db.insert(salesTargets).values({
                unitId: Number(unitId),
                userId: Number(targetUserId),
                targetAmount: String(targetAmount),
                periodMonth: Number(periodMonth),
                periodYear: Number(periodYear),
                komisiPersen: String(komisiPersen || 0)
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Target sales dibuat untuk periode ${periodMonth}/${periodYear}`,
                kategori: 'SALES',
                tipe: 'success'
            });

            return json({ 
                success: true, 
                message: 'Target sales berhasil dibuat',
                data: { id: result.insertId }
            });
        }

        if (action === 'create-commission') {
            const { unitId, salesOrderId, targetUserId, amount, status } = body.commission;

            const [result] = await db.insert(salesCommissions).values({
                unitId: Number(unitId),
                salesOrderId: Number(salesOrderId),
                userId: Number(targetUserId),
                amount: String(amount),
                status: status || 'UNPAID'
            });

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: `Komisi sales ditambahkan: Rp ${String(amount)}`,
                kategori: 'SALES',
                tipe: 'success'
            });

            return json({ 
                success: true, 
                message: 'Komisi berhasil ditambahkan',
                data: { id: result.insertId }
            });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'POST sales/targets error');
        return json({ success: false, message: 'Gagal memproses target sales: ' + err.message }, { status: 500 });
    }
}

// PUT: Update target or commission status
export async function PUT({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const action = body.action;

        if (action === 'update-target') {
            const { targetId, targetAmount, komisiPersen, unitId } = body;

            if (!targetId) {
                return json({ success: false, message: 'targetId wajib diisi' }, { status: 400 });
            }

            const updates = {};
            if (targetAmount !== undefined) updates.targetAmount = String(targetAmount);
            if (komisiPersen !== undefined) updates.komisiPersen = String(komisiPersen);

            if (Object.keys(updates).length === 0) {
                return json({ success: false, message: 'Tidak ada data yang diubah' }, { status: 400 });
            }

            await db.update(salesTargets)
                .set(updates)
                .where(eq(salesTargets.id, Number(targetId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Target sales diperbarui',
                kategori: 'SALES',
                tipe: 'info'
            });

            return json({ success: true, message: 'Target berhasil diperbarui' });
        }

        if (action === 'pay-commission') {
            const { commissionId, unitId } = body;

            if (!commissionId) {
                return json({ success: false, message: 'commissionId wajib diisi' }, { status: 400 });
            }

            await db.update(salesCommissions)
                .set({ status: 'PAID' })
                .where(eq(salesCommissions.id, Number(commissionId)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Komisi sales dibayarkan',
                kategori: 'SALES',
                tipe: 'success'
            });

            return json({ success: true, message: 'Komisi berhasil dibayarkan' });
        }

        return json({ success: false, message: 'Action tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'PUT sales/targets error');
        return json({ success: false, message: 'Gagal update target sales' }, { status: 500 });
    }
}

// DELETE: Delete target or commission
export async function DELETE({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const type = url.searchParams.get('type');
    const id = url.searchParams.get('id');
    const unitId = url.searchParams.get('unitId');

    if (!type || !id) {
        return json({ success: false, message: 'type dan id wajib diisi' }, { status: 400 });
    }

    try {
        if (type === 'target') {
            await db.delete(salesTargets)
                .where(eq(salesTargets.id, Number(id)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Target sales dihapus',
                kategori: 'SALES',
                tipe: 'warning'
            });

            return json({ success: true, message: 'Target berhasil dihapus' });
        }

        if (type === 'commission') {
            await db.delete(salesCommissions)
                .where(eq(salesCommissions.id, Number(id)));

            await db.insert(riwayatAksi).values({
                userId,
                unitId: Number(unitId),
                pesan: 'Komisi sales dihapus',
                kategori: 'SALES',
                tipe: 'warning'
            });

            return json({ success: true, message: 'Komisi berhasil dihapus' });
        }

        return json({ success: false, message: 'Type tidak dikenali' }, { status: 400 });

    } catch (err) {
        log.api.error({ err }, 'DELETE sales/targets error');
        return json({ success: false, message: 'Gagal menghapus data' }, { status: 500 });
    }
}
