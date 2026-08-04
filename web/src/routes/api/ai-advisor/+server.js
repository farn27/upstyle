/**
 * API: AI Financial Advisor
 * POST /api/ai-advisor
 * Body: { unitId: number, question?: string }
 * Returns: { success, data: { analysis: string } }
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { getAIFinancialAdvice } from '$lib/server/aiAdvisor.js';

const schema = z.object({
    unitId: z.coerce.number().int().positive(),
    question: z.string().optional().default('')
});

export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return apiUnauthorized();

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tidak valid';
            return apiError(msg, 422);
        }

        const { unitId, question } = parsed.data;

        const unit = await db.query.unitBisnis.findFirst({
            where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId))
        });
        if (!unit) return apiError('Unit tidak ditemukan', 404);

        const analysis = await getAIFinancialAdvice(
            Number(unitId),
            unit.namaUnit,
            unit.kategori || '',
            question
        );

        return apiSuccess({ analysis }, 'Analisis siap');
    } catch (err) {
        log.api.error({ err }, 'POST ai-advisor');
        return apiError('Gagal memproses permintaan advisor', 500);
    }
}
