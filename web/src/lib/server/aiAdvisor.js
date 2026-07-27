/**
 * AI Financial Advisor — Deep Analysis
 * Analisis tren 3 bulan, prediksi cash flow, deteksi anomali, saran aksi
 */
import { groqChatCompletion } from '$lib/server/groq';
import { db } from '$lib/server/drizzle';
import { transaksi, abcCategories, products, receivables } from '$lib/server/schema';
import { sql, eq, and, desc, lte, isNull, inArray } from 'drizzle-orm';

/**
 * Build full financial context untuk AI
 * @param {number} unitId
 * @param {string} unitName
 * @param {string} industri
 */
async function buildFinancialContext(unitId, unitName, industri) {
	const monthly = await db
		.select({
			tahun: sql`YEAR(${transaksi.tanggal})`.mapWith(Number),
			bulan: sql`MONTH(${transaksi.tanggal})`.mapWith(Number),
			masuk: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END)`.mapWith(Number),
			keluar: sql`SUM(CASE WHEN UPPER(${transaksi.kategoriTrx}) = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END)`.mapWith(Number),
			jumlah_trx: sql`COUNT(*)`.mapWith(Number)
		})
		.from(transaksi)
		.where(
			and(
				eq(transaksi.unitId, unitId),
				sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`
			)
		)
		.groupBy(sql`YEAR(${transaksi.tanggal})`, sql`MONTH(${transaksi.tanggal})`)
		.orderBy(desc(sql`YEAR(${transaksi.tanggal})`), desc(sql`MONTH(${transaksi.tanggal})`));

	// Top 5 kategori pengeluaran terbesar
	const topKeluar = await db
		.select({
			nama_kategori: abcCategories.namaKategori,
			total: sql`SUM(${transaksi.nominal})`.mapWith(Number)
		})
		.from(transaksi)
		.leftJoin(abcCategories, eq(abcCategories.id, transaksi.abcCategoryId))
		.where(
			and(
				eq(transaksi.unitId, unitId),
				sql`UPPER(${transaksi.kategoriTrx}) = 'KELUAR'`,
				sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`
			)
		)
		.groupBy(transaksi.abcCategoryId, abcCategories.namaKategori)
		.orderBy(desc(sql`SUM(${transaksi.nominal})`))
		.limit(5);

	// Top 5 produk terlaris
	const topProduk = await db
		.select({
			nama: products.nama,
			total_qty: sql`SUM(${transaksi.qty})`.mapWith(Number),
			total_revenue: sql`SUM(${transaksi.nominal})`.mapWith(Number)
		})
		.from(transaksi)
		.innerJoin(products, eq(products.id, transaksi.productId))
		.where(
			and(
				eq(transaksi.unitId, unitId),
				sql`UPPER(${transaksi.kategoriTrx}) = 'MASUK'`,
				sql`${transaksi.tanggal} >= DATE_SUB(NOW(), INTERVAL 3 MONTH)`
			)
		)
		.groupBy(transaksi.productId, products.nama)
		.orderBy(desc(sql`SUM(${transaksi.nominal})`))
		.limit(5);

	// Stok menipis
	const lowStock = await db
		.select({
			nama: products.nama,
			stok: products.stok,
			min_stok: products.minStok
		})
		.from(products)
		.where(
			and(
				eq(products.unitId, unitId),
				lte(products.stok, products.minStok),
				isNull(products.deletedAt)
			)
		)
		.limit(5);

	// Piutang overdue
	const overdueResult = await db
		.select({
			cnt: sql`COUNT(*)`.mapWith(Number),
			total: sql`SUM(${receivables.nominal} - ${receivables.sudahDibayar})`.mapWith(Number)
		})
		.from(receivables)
		.where(
			and(
				eq(receivables.unitId, unitId),
				inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN']),
				sql`${receivables.jatuhTempo} < CURDATE()`
			)
		);
	
	const overdue = overdueResult[0];

	return { monthly, topKeluar, topProduk, lowStock, overdue };
}

/**
 * Deep AI analysis dengan konteks keuangan lengkap
 * @param {number} unitId
 * @param {string} unitName
 * @param {string} [industri]
 * @param {string} [userQuestion] - Pertanyaan spesifik dari user
 */
export async function getAIFinancialAdvice(unitId, unitName, industri = '', userQuestion = '') {
	const ctx = await buildFinancialContext(unitId, unitName, industri);

	const monthlyText = ctx.monthly
		.map((m) => `  - ${m.bulan}/${m.tahun}: Masuk Rp${Number(m.masuk).toLocaleString('id-ID')}, Keluar Rp${Number(m.keluar).toLocaleString('id-ID')}, ${m.jumlah_trx} transaksi`)
		.join('\n') || '  Belum ada data';

	const katekelText = ctx.topKeluar
		.map((k) => `  - ${k.nama_kategori || 'Lainnya'}: Rp${Number(k.total).toLocaleString('id-ID')}`)
		.join('\n') || '  Belum ada data';

	const produkText = ctx.topProduk
		.map((p) => `  - ${p.nama}: ${p.total_qty} unit, Rp${Number(p.total_revenue).toLocaleString('id-ID')}`)
		.join('\n') || '  Belum ada data';

	const lowStockText = ctx.lowStock
		.map((p) => `  - ${p.nama}: stok ${p.stok} (min ${p.min_stok})`)
		.join('\n') || '  Semua aman';

	const overdueText = ctx.overdue?.cnt > 0
		? `Ada ${ctx.overdue.cnt} piutang overdue total Rp${Number(ctx.overdue.total || 0).toLocaleString('id-ID')}`
		: 'Tidak ada piutang overdue';

	const systemPrompt = `Kamu adalah AI Financial Advisor untuk platform Upstyle yang membantu UMKM Indonesia.
Kamu HARUS membalas dalam Bahasa Indonesia yang natural, singkat, dan actionable.
Hindari jargon teknis. Fokus pada saran yang bisa langsung dilakukan.

DATA KEUANGAN BISNIS "${unitName}" (Industri: ${industri || 'Umum'}):

TREN 3 BULAN TERAKHIR:
${monthlyText}

TOP 5 KATEGORI PENGELUARAN TERBESAR:
${katekelText}

TOP 5 PRODUK TERLARIS:
${produkText}

STOK MENIPIS:
${lowStockText}

PIUTANG: ${overdueText}

FORMAT JAWABAN (selalu gunakan format ini):
## 📊 Analisis Singkat
[2-3 kalimat kesimpulan kondisi keuangan sekarang]

## ⚠️ Perhatian Utama
[1-3 poin masalah/risiko terbesar yang perlu segera ditangani]

## ✅ Yang Sudah Bagus
[1-2 hal positif yang teridentifikasi]

## 🎯 Aksi Rekomendasi
[3 langkah konkret yang bisa dilakukan minggu ini]

## 📈 Prediksi Bulan Depan
[Prediksi singkat berdasarkan tren data]`;

	const userMsg = userQuestion.trim()
		? `Analisis kondisi keuangan bisnis ini secara menyeluruh. Pertanyaan tambahan dari owner: "${userQuestion}"`
		: 'Analisis kondisi keuangan bisnis ini secara menyeluruh dan berikan rekomendasi aksi.';

	const result = await groqChatCompletion({
		model: 'llama-3.3-70b-versatile',
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userMsg }
		],
		temperature: 0.4,
		max_tokens: 1500
	});

	return result.choices[0].message.content;
}

/**
 * Auto-suggest kategori ABC dari teks transaksi
 * @param {string} teks
 * @param {Array<{id: number, nama_kategori: string, jenis: string}>} abcList
 * @returns {Promise<{abc_id: number|null, confidence: number, reason: string}>}
 */
export async function suggestKategoriABC(teks, abcList) {
	if (!teks.trim()) return { abc_id: null, confidence: 0, reason: '' };

	const listStr = abcList
		.map((c) => `ID=${c.id}|${c.nama_kategori}|jenis=${c.jenis}`)
		.join('; ');

	const result = await groqChatCompletion({
		model: 'llama-3.1-8b-instant',
		messages: [
			{
				role: 'system',
				content: `Kamu adalah sistem klasifikasi transaksi keuangan. 
Daftar kategori: ${listStr}
Tentukan kategori yang paling cocok untuk teks transaksi.
Output HANYA JSON: {"abc_id": number|null, "confidence": 0-100, "reason": "alasan singkat"}`
			},
			{ role: 'user', content: teks }
		],
		temperature: 0,
		max_tokens: 100,
		response_format: { type: 'json_object' }
	});

	try {
		return JSON.parse(result.choices[0].message.content);
	} catch {
		return { abc_id: null, confidence: 0, reason: '' };
	}
}
