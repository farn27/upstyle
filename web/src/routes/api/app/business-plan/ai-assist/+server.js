/**
 * POST /api/app/business-plan/ai-assist
 * AI helper untuk wizard — dipanggil HANYA saat user minta hint.
 * Hemat token: pakai llama-3.1-8b-instant, max 300 token output.
 *
 * Body:
 * {
 *   step: number,          // step wizard saat ini (1-7)
 *   field: string,         // field yang minta bantuan
 *   kategori: string,      // kategori bisnis
 *   context: object,       // data wizard yang sudah diisi user
 *   mode: 'hint' | 'validate' | 'review' | 'canvas'
 * }
 */
import { json } from '@sveltejs/kit';
import { groqChatCompletion } from '$lib/server/groq.js';
import { getCurrentUserId } from '$lib/server/getUser.js';
import { apiUnauthorized, apiError, apiSuccess } from '$lib/server/apiResponse.js';
import { checkRateLimit, getClientIP, cekKuotaAI } from '$lib/server/rateLimit.js';
import { ALL_BUSINESS_CATEGORIES } from '$lib/server/businessPlanTemplates.js';
import { log } from '$lib/server/logger';

export async function POST({ request, cookies }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  const kuota = await cekKuotaAI(userId);
  if (!kuota.allowed) return new Response(JSON.stringify({ success: false, message: kuota.pesan, code: 'AI_RATE_LIMITED' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(kuota.retryAfter) } });

  // Rate limit: max 20 AI call per jam per user (hemat token)
  const ip = getClientIP(request);
  const rl = await checkRateLimit({ key: `user:${userId}`, prefix: 'rl:bp-ai', limit: 20, windowSec: 3600 });
  if (!rl.allowed) return json({ success: false, message: `Terlalu banyak request AI. Coba lagi dalam ${rl.retryAfter} detik.` }, { status: 429 });

  let body;
  try { body = await request.json(); } catch { return apiError('Invalid JSON', 400); }

  const { step, field, kategori, context = {}, mode = 'hint' } = body;

  const kategoriLabel = ALL_BUSINESS_CATEGORIES.find(c => c.value === kategori)?.label || kategori;

  try {
    let prompt = '';
    let maxTokens = 250;

    if (mode === 'hint') {
      // Mode: bantu isi satu field
      prompt = buildHintPrompt(step, field, kategoriLabel, context);
      maxTokens = 250;
    } else if (mode === 'validate') {
      // Mode: validasi & saran perbaikan satu step
      prompt = buildValidatePrompt(step, kategoriLabel, context);
      maxTokens = 350;
    } else if (mode === 'review') {
      // Mode: konfirmasi akhir seluruh rencana sebelum di-generate (verdict + skor + kekuatan + perbaikan)
      prompt = buildReviewPrompt(kategoriLabel, context);
      maxTokens = 600;
    } else if (mode === 'canvas') {
      // Mode: generate Business Model Canvas di akhir wizard
      prompt = buildCanvasPrompt(kategoriLabel, context);
      maxTokens = 700;
    }

    const res = await groqChatCompletion({
      model: 'llama-3.1-8b-instant', // Model ringan, lebih hemat
      messages: [
        { role: 'system', content: 'Kamu adalah konsultan bisnis UMKM Indonesia yang ringkas dan praktis. Jawab dalam Bahasa Indonesia, to the point, tanpa basa-basi.' },
        { role: 'user', content: prompt }
      ],
      temperature: mode === 'canvas' || mode === 'review' ? 0.2 : 0.4,
      max_tokens: maxTokens,
    });

    const result = res.choices?.[0]?.message?.content || '';
    return apiSuccess({ result, mode, tokensUsed: res.usage?.total_tokens || 0 });

  } catch (err) {
    log.ai.error({ err }, '[BP AI Assist]');
    return apiError('AI tidak tersedia saat ini', 500);
  }
}

function buildHintPrompt(step, field, kategoriLabel, ctx) {
  const stepNames = ['', 'Identitas Bisnis', 'Target Pasar', 'Proposisi Nilai', 'Model Pendapatan', 'Modal & Biaya', 'Channel Penjualan', 'Review'];
  return `Bisnis: ${kategoriLabel}. Step ${step}: ${stepNames[step] || ''}.
User mengisi field "${field}". Data sejauh ini: ${JSON.stringify(ctx, null, 0).substring(0, 300)}.
Berikan 2-3 contoh spesifik untuk field "${field}" yang relevan dengan bisnis ${kategoriLabel}. Format: poin pendek.`;
}

/** Ringkas isi wizard jadi baris berlabel (tidak memotong di tengah field seperti JSON.slice). */
function ringkasKonteks(ctx, batas = 1800) {
  const label = {
    namaBisnis: 'Nama bisnis', deskripsi: 'Deskripsi', visi: 'Visi', misi: 'Misi', targetPasar: 'Target pasar',
    problemSolving: 'Masalah yang diselesaikan', targetUsia: 'Usia target', targetLokasi: 'Lokasi target',
    nilaiUtama: 'Nilai utama', keunggulan: 'Keunggulan', kompetitorUtama: 'Kompetitor', modelPendapatan: 'Model pendapatan',
    estimasiHarga: 'Estimasi harga jual (Rp)', estimasiVolumePerBulan: 'Volume per bulan', modalAwal: 'Modal awal (Rp)',
    biayaOperasionalPerBulan: 'Biaya operasional per bulan (Rp)', channelPenjualan: 'Channel', platformOnline: 'Platform online'
  };
  const baris = [];
  for (const [k, l] of Object.entries(label)) {
    const v = ctx?.[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    baris.push(`${l}: ${Array.isArray(v) ? v.join(', ') : String(v).slice(0, 300)}`);
  }
  return baris.join('\n').slice(0, batas) || '(belum ada data)';
}

function buildValidatePrompt(step, kategoriLabel, ctx) {
  return `Bisnis: ${kategoriLabel}. Review isian wizard berikut:
${ringkasKonteks(ctx, 900)}
Berikan feedback singkat: apa yang sudah bagus dan 1-2 hal yang perlu diperbaiki/ditambahkan. Maksimal 4 poin.`;
}

function buildReviewPrompt(kategoriLabel, ctx) {
  return `Kamu menilai kelayakan rencana bisnis UMKM sebelum dibuatkan dokumen final.
Kategori: ${kategoriLabel}.
${ringkasKonteks(ctx)}

Periksa konsistensi (harga x volume vs biaya vs modal, target pasar vs channel, keunggulan vs kompetitor) dan kelengkapan.
Balas HANYA JSON:
{"siap": true/false, "skor": 0-100, "kekuatan": ["..."], "perbaikan": ["..."]}
"siap" true bila rencana cukup lengkap & masuk akal untuk di-generate. Maksimal 3 kekuatan dan 4 perbaikan, masing-masing satu kalimat pendek.`;
}

function buildCanvasPrompt(kategoriLabel, ctx) {
  return `Buat Business Model Canvas ringkas untuk: ${kategoriLabel}.
${ringkasKonteks(ctx)}
Balas HANYA JSON valid (tanpa teks lain, tanpa markdown):
{
  "value_proposition": "...",
  "customer_segments": "...",
  "channels": "...",
  "customer_relationships": "...",
  "revenue_streams": "...",
  "key_resources": "...",
  "key_activities": "...",
  "key_partners": "...",
  "cost_structure": "...",
  "executive_summary": "2-3 kalimat ringkasan"
}`;
}
