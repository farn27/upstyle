/**
 * POST /api/app/sosmed/generate-caption
 * Generate caption AI untuk postingan sosial media.
 */
import { json } from '@sveltejs/kit';
import { groqChatCompletion } from '$lib/server/groq';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import { z } from 'zod';

const schema = z.object({
    platform: z.string().min(1),
    productName: z.string().optional(),
    tone: z.string().optional().default('energik'),
    language: z.string().optional().default('id-ID')
});

export async function POST({ request }) {
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
        return apiError('Gagal membuat caption AI', 500);
    }
}
