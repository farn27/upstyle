import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, unitBisnis, stockLogs } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { randomUUID } from 'crypto';

export async function load({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	const unit = await db.query.unitBisnis.findFirst({
		where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
	});
	if (!unit) throw error(404, 'Unit tidak ditemukan');

	const productList = await db
		.select({
			id: products.id,
			nama: products.nama,
			sku: products.sku,
			stok: products.stok
		})
		.from(products)
		.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)));

	return { unit, products: productList };
}

export const actions = {
	adjust: async ({ request, params, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Sesi berakhir' });

		const formData = await request.formData();
		const productId = String(formData.get('product_id') || '');
		const actualStock = parseInt(String(formData.get('actual_stock')), 10);
		const notes = String(formData.get('notes') || 'Stok opname').trim();

		if (!productId || Number.isNaN(actualStock)) {
			return fail(400, { message: 'Data tidak valid' });
		}

		const unit = await db.query.unitBisnis.findFirst({
			where: and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId))
		});
		if (!unit) return fail(404, { message: 'Unit tidak ditemukan' });

		const produk = await db.query.products.findFirst({
			where: and(eq(products.id, productId), eq(products.unitId, unit.id))
		});
		if (!produk) return fail(404, { message: 'Produk tidak ditemukan' });

		const stokAwal = produk.stok;
		const perubahan = actualStock - stokAwal;
		if (perubahan === 0) return { success: true, message: 'Stok sudah sesuai, tidak ada penyesuaian.' };

		await db.transaction(async (tx) => {
			await tx.update(products).set({ stok: actualStock }).where(eq(products.id, productId));
			await tx.insert(stockLogs).values({
				id: randomUUID(),
				productId,
				userId: String(userId),
				unitId: unit.id,
				stokAwal,
				perubahan,
				stokAkhir: actualStock,
				alasan: 'OPNAME',
				keterangan: notes
			});

            // ── INTEGRASI BUKU BESAR (JURNAL UMUM) ──
            const { chartOfAccounts, journalEntries, journalEntryLines } = await import('$lib/server/schema.js');
            
            const hargaBeli = Number(produk.hargaBeli || 0);
            const nominalSelisih = Math.abs(perubahan * hargaBeli);

            if (nominalSelisih > 0) {
                // Find Accounts
                const akunPersediaanArr = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.tipeAkun, 'PERSEDIAAN'))).limit(1);
                const akunKerugianArr = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.unitId, unit.id), eq(chartOfAccounts.tipeAkun, 'BEBAN_OPERASIONAL'))).limit(1);
                
                if (akunPersediaanArr.length > 0 && akunKerugianArr.length > 0) {
                    const akunPersediaan = akunPersediaanArr[0];
                    const akunKerugian = akunKerugianArr[0]; // Boleh buat akun khusus SELISIH_STOK nantinya
                    
                    const nowWIB = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
                    const tanggalJurnal = nowWIB();

                    // Header
                    const [jurnalResult] = await tx.insert(journalEntries).values({
                        unitId: unit.id,
                        userId: String(userId),
                        tanggal: tanggalJurnal,
                        nomorJurnal: `JRN-OPN-${Date.now()}`,
                        referensi: `Opname ${produk.sku || produk.nama}`,
                        memo: `Penyesuaian stok ${produk.nama} (${perubahan > 0 ? '+' : ''}${perubahan})`,
                        sourceType: 'INVENTORY',
                        sourceId: productId,
                        totalDebit: String(nominalSelisih),
                        totalKredit: String(nominalSelisih),
                        status: 'POSTED',
                        createdAt: tanggalJurnal
                    });

                    const journalId = jurnalResult.insertId;

                    if (perubahan < 0) {
                        // Stok Berkurang -> Kerugian (Debit), Persediaan (Kredit)
                        await tx.insert(journalEntryLines).values({
                            journalId, coaId: akunKerugian.id, deskripsi: `Kerugian Selisih Stok ${produk.nama}`, debit: String(nominalSelisih), kredit: '0'
                        });
                        await tx.insert(journalEntryLines).values({
                            journalId, coaId: akunPersediaan.id, deskripsi: `Persediaan ${produk.nama} Keluar`, debit: '0', kredit: String(nominalSelisih)
                        });
                    } else {
                        // Stok Bertambah -> Persediaan (Debit), Pendapatan Lain (Kredit) - sementara pakai beban yg di kredit sbg kontra
                        await tx.insert(journalEntryLines).values({
                            journalId, coaId: akunPersediaan.id, deskripsi: `Persediaan ${produk.nama} Masuk`, debit: String(nominalSelisih), kredit: '0'
                        });
                        await tx.insert(journalEntryLines).values({
                            journalId, coaId: akunKerugian.id, deskripsi: `Koreksi Stok ${produk.nama}`, debit: '0', kredit: String(nominalSelisih)
                        });
                    }
                }
            }
		});

		return { success: true, message: `Stok ${produk.nama} disesuaikan: ${stokAwal} → ${actualStock} dan dijurnal ke Akuntansi.` };
	}
};
