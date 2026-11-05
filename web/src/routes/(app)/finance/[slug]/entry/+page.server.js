import { db } from '$lib/server/drizzle';
import { transaksi, unitBisnis, products, chartOfAccounts, journalEntries, journalEntryLines, riwayatAksi } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';
import { pusherServer } from '$lib/server/pusher';
import { inngest } from '$lib/server/inngest';
import { log } from '$lib/server/logger';
import { redis } from '$lib/server/redis';
import { error, fail } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { groqChatCompletion } from '$lib/server/groq';
import { normalizeKategoriTrx, isKategoriMasuk } from '$lib/server/kategoriTrx';
import { nowWIB } from '$lib/server/dateUtils';
import { sql } from 'drizzle-orm';
import { catatTransaksi, COA_STANDAR } from '$lib/server/catatTransaksi';

// COA standar & logika catat transaksi dipakai bersama web + mobile

export const load = async ({ params, cookies }) => {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	const unit = await db.query.unitBisnis.findFirst({
		where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
	});
	if (!unit) throw error(404, 'Unit tidak ditemukan');

	// Cek apakah unit sudah punya COA
	const coaCount = await db.select({ count: sql`COUNT(*)` })
		.from(chartOfAccounts)
		.where(eq(chartOfAccounts.unitId, unit.id));
	const hasCoa = Number(coaCount[0].count) > 0;

	// Jika belum ada COA, kembalikan early dengan flag
	if (!hasCoa) {
		return { unit, hasCoa: false, coaAccounts: [], kasAccounts: [], products: [], coaStandar: COA_STANDAR };
	}

	// Load semua COA aktif milik unit ini
	const coaList = await db.select().from(chartOfAccounts)
		.where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, 1)))
		.orderBy(chartOfAccounts.kodeAkun);

	// Pisahkan: akun kas/bank (untuk metode bayar) dan akun lainnya (untuk kategori)
	const kasAccounts = coaList.filter(c => c.tipeAkun === 'ASET_LANCAR' && 
		(c.namaAkun.toLowerCase().includes('kas') || c.namaAkun.toLowerCase().includes('bank') || c.namaAkun.toLowerCase().includes('transfer')));
	
	const productsData = await db.select().from(products).where(eq(products.unitId, unit.id));

	return { unit, hasCoa: true, coaAccounts: coaList, kasAccounts, products: productsData };
};

export const actions = {
	// Seed COA standar jika user minta pakai template
	seedCoa: async ({ params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const unit = await db.query.unitBisnis.findFirst({
			where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
		});
		if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

		// Cek lagi, pastikan memang belum ada
		const existing = await db.select({ count: sql`COUNT(*)` })
			.from(chartOfAccounts).where(eq(chartOfAccounts.unitId, unit.id));
		if (Number(existing[0].count) > 0) {
			return { success: true, message: 'COA sudah ada' };
		}

		await db.insert(chartOfAccounts).values(
			COA_STANDAR.map(c => ({ ...c, unitId: unit.id, isActive: 1 }))
		);

		return { success: true, message: `${COA_STANDAR.length} akun COA standar berhasil ditambahkan!` };
	},

	// Tambah akun kas/bank secara inline dari halaman entry
	addKasAccount: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const unit = await db.query.unitBisnis.findFirst({
			where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
		});
		if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

		const data = await request.formData();
		const namaAkun = data.get('nama_akun')?.toString().trim();
		const kodeAkun = data.get('kode_akun')?.toString().trim();

		if (!namaAkun || !kodeAkun) return fail(400, { message: 'Nama dan kode akun harus diisi' });

		// Cek duplikat kode
		const existing = await db.query.chartOfAccounts.findFirst({
			where: and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.kodeAkun, kodeAkun))
		});
		if (existing) return fail(400, { message: `Kode akun "${kodeAkun}" sudah digunakan` });

		const [result] = await db.insert(chartOfAccounts).values({
			unitId: unit.id,
			kodeAkun,
			namaAkun,
			tipeAkun: 'ASET_LANCAR',
			normalBalance: 'DEBIT',
			isActive: 1,
			deskripsi: 'Akun kas/bank untuk metode pembayaran'
		});

		return { success: true, newKasId: result.insertId, namaAkun, kodeAkun };
	},

	prosesAI: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return { success: false, error: 'Silakan login ulang' };

		const { slug } = params;
		const formData = await request.formData();
		const teksInput = formData.get('teksInput') || '';

		try {
			const unit = await db.query.unitBisnis.findFirst({
				where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
			});
			if (!unit) return { success: false, error: 'Unit tidak ditemukan' };

			const productsData = await db.select().from(products).where(eq(products.unitId, unit.id));
			const coaData = await db.select().from(chartOfAccounts)
				.where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.isActive, 1)))
				.orderBy(chartOfAccounts.kodeAkun);
			
			const listProduk = productsData.map(p => `- ID=${p.id} | NAMA="${p.nama}"`).join('\n');
			const contextCOA = coaData
				.map(c => `- ID=${c.id} | KODE="${c.kodeAkun}" | NAMA="${c.namaAkun}" | TIPE="${c.tipeAkun}"`)
				.join('\n');

			const systemPrompt = `Anda adalah Mesin Pencocokan Data Akuntansi ERP.
DAFTAR PRODUK:\n${listProduk}\n
DAFTAR AKUN COA:\n${contextCOA}\n
TUGAS: Analisis teks "${teksInput}". 
LOGIKA: 
1. Jika teks mengacu pada penjualan/pendapatan, set kategori="Masuk" dan pilih coa_id dari akun PENDAPATAN (tipe PENDAPATAN atau PENDAPATAN_LAINNYA).
2. Jika teks mengacu pada biaya/pengeluaran, set kategori="Keluar" dan pilih coa_id dari akun BEBAN (tipe BEBAN_OPERASIONAL, BEBAN_LAINNYA, atau HPP).
3. Pilih juga kas_coa_id dari akun ASET_LANCAR yang paling sesuai (biasanya "Kas Tunai").
OUTPUT JSON SAJA: { "product_id": string|null, "qty": number, "kategori": "Masuk"|"Keluar", "coa_id": number|null, "kas_coa_id": number|null, "nominal_manual": number }`;

			const resJson = await groqChatCompletion({
				model: 'llama-3.1-8b-instant',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: String(teksInput) }
				],
				temperature: 0.1,
				response_format: { type: 'json_object' }
			});

			let hasilAI = JSON.parse(resJson.choices[0].message.content);
			let finalNominal = hasilAI.nominal_manual || 0;
			let catatanOtomatis = String(teksInput).toUpperCase();
			let finalCoaId = hasilAI.coa_id;
			let finalKasCoaId = hasilAI.kas_coa_id;

			if (hasilAI.product_id) {
				const p = productsData.find(prod => String(prod.id) === String(hasilAI.product_id));
				if (p) {
					finalNominal = (hasilAI.qty || 1) * Number(p.hargaJual);
					catatanOtomatis = `PENJUALAN ${p.nama.toUpperCase()} (${hasilAI.qty || 1}x)`;
					hasilAI.kategori = 'Masuk';

					// Pilih akun pendapatan penjualan
					const autoRevenue = coaData.find(c => c.tipeAkun === 'PENDAPATAN' && c.namaAkun.toLowerCase().includes('penjualan'));
					if (autoRevenue) finalCoaId = autoRevenue.id;
				}
			}

			// Fallback kas_coa_id jika AI tidak pilih
			if (!finalKasCoaId) {
				const kas = coaData.find(c => c.tipeAkun === 'ASET_LANCAR' && c.namaAkun.toLowerCase().includes('kas'));
				if (kas) finalKasCoaId = kas.id;
			}

			return {
				success: true,
				hasil: {
					nominal: finalNominal,
					catatan: catatanOtomatis,
					product_id: hasilAI.product_id ? String(hasilAI.product_id) : null,
					qty: hasilAI.qty || 1,
					kategori: hasilAI.kategori,
					coa_id: finalCoaId,
					kas_coa_id: finalKasCoaId
				}
			};
		} catch (err) {
			return { success: false, error: err.message };
		}
	},

	addTransaction: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		const { slug } = params;
		const formData = await request.formData();

		const productId = formData.get('product_id') ? String(formData.get('product_id')) : null;
		const qty = parseInt(formData.get('qty')) || 1;
		const nominal = Number(formData.get('nominal')) || 0;
		const keterangan = formData.get('keterangan')?.toString().toUpperCase() || '';
		const kategori = normalizeKategoriTrx(formData.get('kategori_trx'));
		const coaId = formData.get('coa_id') ? parseInt(formData.get('coa_id')) : null;
		const kasCoaId = formData.get('kas_coa_id') ? parseInt(formData.get('kas_coa_id')) : null;

		if (!coaId) return fail(400, { message: 'Pilih akun COA terlebih dahulu!' });
		if (!kasCoaId) return fail(400, { message: 'Pilih metode bayar (akun kas/bank)!' });
		if (nominal <= 0) return fail(400, { message: 'Nominal harus lebih dari 0!' });

		try {
			let savedTrxId = null;
			let unitId = null;

			// Get unit info first (outside transaction for Pusher/Inngest access)
			const unit = await db.query.unitBisnis.findFirst({
				where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
			});
			if (!unit) throw new Error('Unit tidak ditemukan');
			unitId = unit.id;

			const hasil = await db.transaction((tx) => catatTransaksi(tx, {
				unitId: unit.id,
				userId,
				kategori,
				nominal,
				keterangan,
				coaId,
				kasCoaId,
				productId,
				qty
			}));
			savedTrxId = hasil.trxId;

			// 5. Invalidate cache (Bungkus di try-catch agar transaksi tidak gagal jika Redis down)
			try {
				if (redis) {
					const dashboardKeys = await redis.keys(`finance_dash_v4:*:${slug}:*`);
					if (dashboardKeys.length > 0) await redis.del(...dashboardKeys);

					const historyKeys = await redis.keys(`history_v3:*:${slug}:*`);
					if (historyKeys.length > 0) await redis.del(...historyKeys);

					const productKeys = await redis.keys(`cache:products_page_v4:${slug}:*`);
					if (productKeys.length > 0) await redis.del(...productKeys);
				}
			} catch (err) {
				console.error('[Redis] Gagal invalidate cache:', err.message);
			}

			// 6. Trigger realtime & background job
			try {
				if (pusherServer) {
					await pusherServer.trigger(`unit-${unitId}`, 'stats-updated', {
						newTransaction: { keterangan, nominal, kategori, waktu: new Date() },
						triggerRefresh: true
					});

					await pusherServer.trigger(`unit-${unitId}`, 'notification', {
						id: Date.now(),
						unitId: unitId,
						pesan: `MENCATAT ${kategori}: ${keterangan}`,
						kategori: 'Keuangan',
						tipe: isKategoriMasuk(kategori) ? 'success' : 'info',
						waktu: nowWIB()
					});
				}
			} catch (err) {
				console.error('[Pusher] Gagal kirim event realtime:', err.message);
			}

			try {
				await inngest.send({ name: 'app/transaction.changed', data: { userId, slug, trxId: savedTrxId, unitId } });
			} catch (err) {
				// Inngest failure should not block transaction - it's a background job
				console.error(`[Inngest] Gagal kirim event untuk transaksi ${savedTrxId}:`, err.message);
				if (err.message.includes('fetch failed') || err.message.includes('ECONNREFUSED')) {
					console.warn('[Inngest] Server Inngest mungkin belum berjalan. Jalankan server Inngest untuk background jobs.');
				}
			}

			return {
				success: true,
				message: `"${keterangan}" BERHASIL DICATAT!`,
				detail: { nominal, keterangan }
			};
		} catch (err) {
			console.error(err);
			return fail(400, { message: err.message });
		}
	}
};
