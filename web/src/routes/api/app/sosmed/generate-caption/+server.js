/**
 * POST /api/app/sosmed/generate-caption
 * Generate caption AI untuk postingan sosial media.
 */
import { json } from '@sveltejs/kit';
import { groqChatCompletion, GroqError, pesanGalatAI } from '$lib/server/groq';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';
import { cekKuotaAI } from '$lib/server/rateLimit';

const schema = z.object({
    platform: z.string().min(1),
    productName: z.string().optional(),
    tone: z.string().optional().default('energik'),
    language: z.string().optional().default('id-ID')
});

export async function POST({ request, cookies }) {
    // Dulu tanpa login sama sekali → siapa pun bisa memakai kuota Groq
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const kuota = await cekKuotaAI(userId);
    if (!kuota.allowed) return json({ success: false, message: kuota.pesan, code: 'AI_RATE_LIMITED' }, { status: 429 });

    try {
        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            const msg = parsed.error?.issues?.[0]?.message || parsed.error?.errors?.[0]?.message || 'Input tidak valid';
            return json({ success: false, message: msg }, { status: 422 });
        }

        const { platform, productName, tone, language } = parsed.data;
        const prompt = `Tuliskan 1 caption singkat untuk media sosial ${platform}. ${productName ? `Promosikan produk "${productName}".` : ''} Gunakan gaya ${tone}, bahasa ${language}, dan emoji yang cocok. Maksimal 150 kata, tanpa tagar berlebihan.`;

        const result = await groqChatCompletion({
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: 'Kamu adalah copywriter media sosial Indonesia. Jawab langsung dengan caption saja, tanpa penjelasan.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 250
        });

        const caption = result?.choices?.[0]?.message?.content?.trim() || '';
        return apiSuccess({ caption }, 'Caption berhasil dibuat');
    } catch (err) {
        log.api.error({ err }, 'POST sosmed/generate-caption');
        if (err instanceof GroqError) return apiError(pesanGalatAI(err), err.status === 429 ? 429 : 503);
        return apiError('Gagal membuat caption AI', 500);
    }
}
