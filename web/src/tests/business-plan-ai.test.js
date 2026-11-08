/**
 * Business plan AI assist: mode review/canvas memakai ringkasan konteks lengkap (modal & biaya tidak terpotong)
 * dan meminta JSON; mode tak dikenal tetap aman. Tanpa jaringan: Groq di-mock.
 */
import { describe, it, expect, vi } from 'vitest';

const panggilan = vi.hoisted(() => /** @type {any[]} */ ([]));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser.js', () => ({ getCurrentUserId: async () => 7 }));
vi.mock('$lib/server/rateLimit.js', () => ({
	checkRateLimit: async () => ({ allowed: true }), getClientIP: () => '1.1.1.1', cekKuotaAI: async () => ({ allowed: true })
}));
vi.mock('$lib/server/groq.js', () => ({
	groqChatCompletion: async (/** @type {any} */ p) => { panggilan.push(p); return { choices: [{ message: { content: '{"siap":true,"skor":80,"kekuatan":["a"],"perbaikan":["b"]}' } }], usage: { total_tokens: 10 } }; }
}));

describe('business-plan ai-assist', () => {
	it('review & canvas memuat seluruh isian penting', async () => {
		const api = await import('../routes/api/app/business-plan/ai-assist/+server.js');
		const konteks = {
			namaBisnis: 'Warung Bu Sari', deskripsi: 'x'.repeat(250), visi: 'v', misi: 'm', targetPasar: 'Ibu rumah tangga', problemSolving: 'p', nilaiUtama: 'n', keunggulan: 'k',
			kompetitorUtama: 'Warung Pak Joko', modelPendapatan: 'JUAL_PRODUK', estimasiHarga: 25000, estimasiVolumePerBulan: 300, modalAwal: 10000000, biayaOperasionalPerBulan: 5000000,
			channelPenjualan: ['offline', 'whatsapp'], platformOnline: []
		};
		const req = (mode) => ({ request: new Request('http://x/', { method: 'POST', body: JSON.stringify({ step: 7, field: 'x', kategori: 'FNB_RESTO', context: konteks, mode }), headers: { 'content-type': 'application/json' } }), cookies: { get() {} } });
		for (const mode of ['review', 'canvas']) {
			const r = await api.POST(req(mode));
			expect(r.status).toBe(200);
			const isi = panggilan.at(-1).messages.at(-1).content;
			expect(isi).toContain('Modal awal (Rp): 10000000');
			expect(isi).toContain('Biaya operasional per bulan (Rp): 5000000');
			expect(isi).toContain('Channel: offline, whatsapp');
			expect(isi).toContain(mode === 'review' ? '"siap"' : '"executive_summary"');
		}
		const j = await (await api.POST(req('review'))).json();
		expect(JSON.parse(j.data.result.match(/\{[\s\S]*\}/)[0]).skor).toBe(80);
	});
});
