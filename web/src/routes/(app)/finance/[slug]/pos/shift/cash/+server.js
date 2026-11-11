import { json, isHttpError } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { posShifts, posCashTransactions } from '$lib/server/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { log } from '$lib/server/logger';

/** POST /finance/[slug]/pos/shift/cash — setor/tarik kas pada shift yang sedang terbuka (pemilik atau staf unit) */
export async function POST({ request, cookies, params, locals }) {
    try {
        // Dulu hanya pemilik (staf selalu 401) dan shift dicari per user, bukan per unit
        const { unit } = await resolvePosUnitAccess(cookies, params, locals);

        let body;
        try {
            body = await request.json();
        } catch {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }
        const type = String(body?.type || '');
        const amount = Number(body?.amount);
        const description = body?.description ? String(body.description).slice(0, 255) : null;

        if (!['CASH_IN', 'CASH_OUT'].includes(type) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
            return json({ error: 'Data tidak valid' }, { status: 400 });
        }

        const [activeShift] = await db.select()
            .from(posShifts)
            .where(and(eq(posShifts.unitId, unit.id), eq(posShifts.status, 'OPEN')))
            .orderBy(desc(posShifts.id))
            .limit(1);
        if (!activeShift) {
            return json({ error: 'Tidak ada shift aktif, silakan buka shift dari POS' }, { status: 400 });
        }
        if (type === 'CASH_OUT' && amount > Number(activeShift.kasAkhir || 0)) {
            return json({ error: 'Kas di laci tidak cukup untuk ditarik sebesar itu' }, { status: 400 });
        }

        await db.transaction(async (tx) => {
            await tx.insert(posCashTransactions).values({
                shiftId: activeShift.id,
                type: /** @type {'CASH_IN' | 'CASH_OUT'} */ (type),
                amount: String(amount),
                description
            });
            const delta = type === 'CASH_IN' ? amount : -amount;
            await tx.update(posShifts)
                .set({ kasAkhir: sql`${posShifts.kasAkhir} + ${delta}` })
                .where(eq(posShifts.id, activeShift.id));
        });

        return json({ success: true });
    } catch (e) {
        if (isHttpError(e)) return json({ error: e.body?.message || 'Akses ditolak' }, { status: e.status });
        log.pos.error({ err: e }, 'Kas shift gagal');
        return json({ error: 'Gagal mencatat kas. Coba lagi.' }, { status: 500 });
    }
}
