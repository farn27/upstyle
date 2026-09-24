/**
 * API: AI Transaction Entry Parser
 * POST /api/app/ai-entry
 * Body: { unitId: number, teksInput: string }
 * Returns: { success, data: { hasil: { product_id, qty, kategori, coa_id, kas_coa_id, nominal, catatan } } }
 *
 * Memproses teks natural language transaksi dan mengembalikan data terstruktur
 * menggunakan Groq AI (llama-3.1-8b-instant).
 */
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitBisnis, products, chartOfAccounts } from '$lib/server/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { groqChatCompletion } from '$lib/server/groq';
import { log } from '$lib/server/logger';
import { z } from 'zod';

const schema = z.object({
	unitId: z.coerce.number().int().positive(),
	teksInput: z.string().min(5, 'Teks terlalu pendek').max(500, 'Teks terlalu panjang')
});

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Invalid JSON', 400);
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		const msg =
			parsed.error?.issues?.[0]?.message ||
			parsed.error?.errors?.[0]?.message ||
			'Input tidak valid';
		return apiError(msg, 422);
	}

	const { unitId, teksInput } = parsed.data;

	// Verifikasi unit milik user
	const unit = await db.query.unitBisnis.findFirst({
		where: and(eq(unitBisnis.id, Number(unitId)), eq(unitBisnis.userId, userId))
	});
	if (!unit) return apiError('Unit tidak ditemukan', 404);

	try {
		// Query produk unit (id, nama, hargaJual, hargaBeli)
		const produkList = await db
			.select({
				id: products.id,
				nama: products.nama,
				hargaJual: products.hargaJual,
				hargaBeli: products.hargaBeli
			})
			.from(products)
			.where(and(eq(products.unitId, Number(unitId)), isNull(products.deletedAt)))
			.orderBy(asc(products.nama))
			.limit(50);

		// Query COA unit (id, namaAkun, tipeAkun)
		const coaList = await db
			.select({
				id: chartOfAccounts.id,
				namaAkun: chartOfAccounts.namaAkun,
				tipeAkun: chartOfAccounts.tipeAkun
			})
			.from(chartOfAccounts)
			.where(and(eq(chartOfAccounts.unitId, Number(unitId)), eq(chartOfAccounts.isActive, 1)))
			.orderBy(asc(chartOfAccounts.kodeAkun));

		// Bangun system prompt dengan konteks produk & COA
		const produkStr =
			produkList.length > 0
				? JSON.stringify(
						produkList.map((p) => ({
							id: p.id,
							nama: p.nama,
							harga_jual: Number(p.hargaJual),
							harga_beli: Number(p.hargaBeli)
						}))
					)
				: '[]';

		const coaStr =
			coaList.length > 0
				? JSON.stringify(
						coaList.map((c) => ({
							id: c.id,
							nama_akun: c.namaAkun,
							tipe_akun: c.tipeAkun
						}))
					)
				: '[]';

		const systemPrompt = `Kamu adalah parser transaksi keuangan untuk aplikasi UMKM Indonesia.
Tugasmu: membaca teks transaksi natural language dan mengembalikan data JSON terstruktur.

DAFTAR PRODUK UNIT (JSON):
${produkStr}

DAFTAR COA UNIT (JSON):
${coaStr}

PANDUAN PENGISIAN:
- "kategori": "Masuk" jika transaksi adalah penjualan/pendapatan, "Keluar" jika pembelian/pengeluaran
- "product_id": string ID produk jika ada yang cocok, null jika tidak ada
- "qty": jumlah item (default 1)
- "coa_id": ID akun COA yang paling relevan (PENDAPATAN/PENDAPATAN_LAINNYA untuk Masuk; BEBAN_OPERASIONAL/BEBAN_LAINNYA/HPP untuk Keluar), null jika tidak ada COA yang cocok
- "kas_coa_id": ID akun kas/bank dari COA bertipe ASET_LANCAR, null jika tidak ada
- "nominal": total nilai transaksi dalam Rupiah (hitung dari harga produk x qty jika memungkinkan)
- "catatan": deskripsi singkat transaksi dalam Bahasa Indonesia

Output HANYA JSON valid dengan format persis:
{"product_id": null, "qty": 1, "kategori": "Masuk", "coa_id": null, "kas_coa_id": null, "nominal": 0, "catatan": ""}`;

		// Panggil Groq AI
		const result = await groqChatCompletion({
			model: 'llama-3.1-8b-instant',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: teksInput }
			],
			temperature: 0,
			max_tokens: 300,
			response_format: { type: 'json_object' }
		});

		let hasil;
		try {
			hasil = JSON.parse(result.choices[0].message.content);
		} catch {
			log.ai.error({ content: result.choices[0]?.message?.content }, '[AI Entry] Gagal parse JSON dari Groq');
			return apiError('AI mengembalikan format yang tidak valid, coba ulangi', 500);
		}

		// Normalisasi dan pastikan semua field hadir
		const hasilNormalized = {
			product_id: hasil.product_id ?? null,
			qty: typeof hasil.qty === 'number' ? hasil.qty : 1,
			kategori: hasil.kategori === 'Keluar' ? 'Keluar' : 'Masuk',
			coa_id: typeof hasil.coa_id === 'number' ? hasil.coa_id : null,
			kas_coa_id: typeof hasil.kas_coa_id === 'number' ? hasil.kas_coa_id : null,
			nominal: typeof hasil.nominal === 'number' ? hasil.nominal : 0,
			catatan: typeof hasil.catatan === 'string' ? hasil.catatan : ''
		};

		return apiSuccess({ hasil: hasilNormalized }, 'Transaksi berhasil diproses');
	} catch (err) {
		log.ai.error({ err }, '[AI Entry] POST /api/app/ai-entry');
		return apiError('Gagal memproses transaksi AI. Periksa koneksi dan coba lagi.', 500);
	}
}
