import { env } from '$env/dynamic/private';
import { db } from '$lib/server/drizzle';
import { products, abcCategories, unitBisnis, transaksi } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { groqChatCompletion } from '$lib/server/groq';
import { normalizeKategoriTrx, isKategoriMasuk } from '$lib/server/kategoriTrx';
import { apiError, apiSuccess, apiRateLimit } from '$lib/server/apiResponse';
import { checkRateLimit, getClientIP, WA_WEBHOOK_LIMIT } from '$lib/server/rateLimit';
import { waWebhookSchema } from '$lib/server/validation';

/**
 * @param {string} teksInput
 * @param {number} unitId
 */
async function prosesTeksLewatAI(teksInput, unitId) {
	const productsRows = await db.select({ id: products.id, nama: products.nama, harga_jual: products.hargaJual })
		.from(products)
		.where(eq(products.unitId, unitId));
	const abcRows = await db.select({ id: abcCategories.id, nama_kategori: abcCategories.namaKategori, jenis: abcCategories.jenis })
		.from(abcCategories)
		.orderBy(abcCategories.id);

	const listProduk = productsRows.map((p) => `- ID=${p.id} | NAMA="${p.nama}"`).join('\n');
	const contextABC = abcRows
		.map((c) => `- ID=${c.id} | KAT="${c.nama_kategori}" | JENIS="${c.jenis}"`)
		.join('\n');

	const systemPrompt = `Anda adalah Mesin Pencocokan Data ERP.
            DAFTAR PRODUK:\n${listProduk}\n
            DAFTAR KATEGORI ABC:\n${contextABC}\n
            TUGAS: Analisis teks "${teksInput}". 
            LOGIKA: 
            1. Jika teks mengacu pada penjualan/pemasukan, set kategori="Masuk" dan cari abc_id dengan JENIS="masuk".
            2. Jika teks mengacu pada biaya/pembelian, set kategori="Keluar" dan cari abc_id dengan JENIS="keluar".
            OUTPUT JSON: { "product_id": string|null, "qty": number, "kategori": "Masuk"|"Keluar", "abc_id": number|null, "nominal_manual": number }`;

	const resJson = await groqChatCompletion({
		model: 'llama-3.1-8b-instant',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: String(teksInput) }
		],
		temperature: 0.1,
		response_format: { type: 'json_object' }
	});

	const hasilAI = JSON.parse(resJson.choices[0].message.content);
	let finalNominal = hasilAI.nominal_manual || 0;
	let catatanOtomatis = String(teksInput).toUpperCase();
	let finalAbcId = hasilAI.abc_id || null;
	let productId = hasilAI.product_id ? String(hasilAI.product_id) : null;

	if (productId) {
		const p = productsRows.find((prod) => String(prod.id) === productId);
		if (p) {
			finalNominal = (hasilAI.qty || 1) * Number(p.harga_jual);
			catatanOtomatis = `PENJUALAN ${p.nama.toUpperCase()} (${hasilAI.qty || 1}x)`;
			hasilAI.kategori = 'Masuk';

			const autoCat = abcRows.find(
				(c) => c.jenis === 'masuk' && String(c.nama_kategori).toLowerCase().includes('retail')
			);
			if (autoCat) finalAbcId = autoCat.id;
		}
	}

	const kategoriTrx = normalizeKategoriTrx(hasilAI.kategori);

	return {
		success: true,
		hasil: {
			nominal: finalNominal,
			catatan: catatanOtomatis,
			product_id: productId,
			qty: hasilAI.qty || 1,
			kategori: kategoriTrx,
			abc_id: finalAbcId
		}
	};
}

export const POST = async ({ request }) => {
	// ─── 1. Autentikasi Webhook (WAJIB) ──────────────────────────────────────
	const webhookSecret = env.WA_WEBHOOK_SECRET;
	if (!webhookSecret) {
		console.error('[WA Webhook] WA_WEBHOOK_SECRET tidak dikonfigurasi di .env!');
		return apiError(
			'Webhook belum dikonfigurasi dengan benar di server',
			503,
			'WEBHOOK_NOT_CONFIGURED'
		);
	}

	const providedSecret = request.headers.get('x-webhook-secret');
	if (!providedSecret || providedSecret !== webhookSecret) {
		return apiError('Webhook secret tidak valid', 401, 'INVALID_WEBHOOK_SECRET');
	}

	// ─── 2. Rate Limit per IP ─────────────────────────────────────────────────
	const ip = getClientIP(request);
	const rl = await checkRateLimit({
		key: ip,
		prefix: 'rl:webhook-wa:ip',
		...WA_WEBHOOK_LIMIT
	});
	if (!rl.allowed) {
		return apiRateLimit(rl.retryAfter);
	}

	// ─── 3. Parse & Validasi Body ─────────────────────────────────────────────
	let body;
	try {
		body = await request.json();
	} catch {
		return apiError('Request body harus berformat JSON', 400, 'INVALID_JSON');
	}

	const parsed = waWebhookSchema.safeParse(body);
	if (!parsed.success) {
		const firstError = parsed.error.errors[0]?.message || 'Input tidak valid';
		return apiError(firstError, 422, 'VALIDATION_ERROR');
	}

	const { message, userId, unitId } = parsed.data;

	// ─── 4. Verifikasi userId + unitId ada & milik user yang benar ────────────
	try {
		const unitRows = await db.select({ id: unitBisnis.id })
			.from(unitBisnis)
			.where(and(eq(unitBisnis.id, unitId), eq(unitBisnis.userId, userId)))
			.limit(1);
		if (unitRows.length === 0) {
			return apiError('unitId atau userId tidak valid', 403, 'FORBIDDEN');
		}
	} catch (err) {
		console.error('[WA Webhook] DB verify error:', err);
		return apiError('Terjadi kesalahan server', 500, 'SERVER_ERROR');
	}

	// ─── 5. Proses AI & Simpan Transaksi ──────────────────────────────────────
	try {
		const aiResponse = await prosesTeksLewatAI(message, unitId);

		if (!aiResponse.success) {
			return apiError('AI gagal memproses pesan', 422, 'AI_PROCESSING_FAILED');
		}

		const { nominal, catatan, product_id, qty, kategori, abc_id } = aiResponse.hasil;
		const nominalStr = String(nominal);
		const kategoriNormalized = normalizeKategoriTrx(kategori);

		// Kurangi stok jika penjualan produk
		if (product_id && isKategoriMasuk(kategoriNormalized)) {
			const productRows = await db.select({ id: products.id, stok: products.stok, harga_beli: products.hargaBeli })
				.from(products)
				.where(and(eq(products.id, product_id), eq(products.unitId, unitId)));
			if (productRows.length > 0) {
				const produk = productRows[0];
				const qtyNum = Number(qty) || 1;
				if (produk.stok >= qtyNum) {
					await db.update(products)
						.set({ stok: sql`${products.stok} - ${qtyNum}` })
						.where(eq(products.id, product_id));
				}
			}
		}

		await db.insert(transaksi).values({
			userId,
			unitId,
			keterangan: catatan,
			nominal: nominalStr,
			totalHarga: nominalStr,
			kategoriTrx: kategoriNormalized,
			productId: product_id,
			qty,
			abcCategoryId: abc_id,
			tanggal: sql`NOW()`
		});

		return apiSuccess({ catatan, nominal, kategori: kategoriNormalized }, 'Tercatat Otomatis!');
	} catch (err) {
		console.error('[WA Webhook] Processing error:', err);
		return apiError('Terjadi kesalahan saat memproses pesan', 500, 'SERVER_ERROR');
	}
};
