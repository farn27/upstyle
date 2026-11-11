import { and, eq, inArray, like } from 'drizzle-orm';
import crypto from 'crypto';
import { products, stockOpname, stockOpnameItems, stockLogs, warehouses, chartOfAccounts, journalEntries, journalEntryLines, riwayatAksi } from '$lib/server/schema';
import { TransaksiError } from '$lib/server/catatTransaksi';
import { pastikanPeriodeTerbuka } from '$lib/server/periodeTutup';
import { todayStrWIB } from '$lib/server/dateUtils';

/** Gudang bawaan unit (dibuat otomatis bila belum ada) — kolom stock_opname.warehouse_id wajib FK ke warehouses. */
export async function gudangBawaan(tx, unitId) {
	const [ada] = await tx.select().from(warehouses).where(eq(warehouses.unitId, unitId)).limit(1);
	if (ada) return ada.id;
	const [baru] = await tx.insert(warehouses).values({ unitId, name: 'Gudang Utama', isDefault: true });
	return baru.insertId;
}

/**
 * Akun untuk jurnal selisih stok: Persediaan (nama "Persediaan…", bukan tipe khusus — di COA standar bertipe ASET_LANCAR)
 * dan beban (utamanya "Biaya Operasional Lainnya", jika tidak ada beban operasional pertama).
 * @param {any} tx @param {number} unitId
 */
export async function akunSelisihStok(tx, unitId) {
	const [persediaan] = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.unitId, unitId), like(chartOfAccounts.namaAkun, 'Persediaan%'))).limit(1);
	const bebanSemua = await tx.select().from(chartOfAccounts).where(and(eq(chartOfAccounts.unitId, unitId), eq(chartOfAccounts.tipeAkun, 'BEBAN_OPERASIONAL')));
	const beban = bebanSemua.find((/** @type {any} */ a) => /lain/i.test(a.namaAkun)) || bebanSemua[0];
	return { persediaan, beban };
}

/**
 * Stok opname: bandingkan hitungan fisik dengan stok sistem SAAT INI (diambil dari DB, bukan dari klien),
 * sesuaikan stok, catat log stok, dan jurnalkan selisih (persediaan ↔ beban) seperti halaman opname web.
 * @param {any} db
 * @param {{ unitId: number, userId: number, notes?: string | null, items: Array<{ productId: string, actualStock: number, notes?: string | null }> }} p
 */
export async function prosesOpname(db, p) {
	const { unitId, userId } = p;
	const items = Array.isArray(p.items) ? p.items : [];
	if (items.length === 0) throw new TransaksiError('Minimal 1 produk harus dihitung', 400);
	const ids = [...new Set(items.map((i) => String(i.productId)))];
	if (ids.length !== items.length) throw new TransaksiError('Produk yang sama dihitung lebih dari sekali', 400);
	for (const i of items) {
		if (!Number.isInteger(Number(i.actualStock)) || Number(i.actualStock) < 0) throw new TransaksiError('Stok fisik harus bilangan bulat ≥ 0', 400);
	}

	return db.transaction(async (/** @type {any} */ tx) => {
		await pastikanPeriodeTerbuka(tx, unitId, todayStrWIB());
		const daftar = await tx.select().from(products).where(and(eq(products.unitId, unitId), inArray(products.id, ids)));
		if (daftar.length !== ids.length) throw new TransaksiError('Ada produk yang tidak ditemukan di unit ini', 404);
		const peta = new Map(daftar.map((/** @type {any} */ x) => [x.id, x]));

		const warehouseId = await gudangBawaan(tx, unitId);
		const [sesi] = await tx.insert(stockOpname).values({ unitId, warehouseId, createdBy: userId, status: 'COMPLETED', notes: p.notes || null, completedAt: new Date() });
		const opnameId = sesi.insertId;

		let nilaiKurang = 0, nilaiLebih = 0, jumlahSelisih = 0;
		for (const i of items) {
			const pr = peta.get(String(i.productId));
			const sistem = Number(pr.stok);
			const fisik = Number(i.actualStock);
			const selisih = fisik - sistem;
			await tx.insert(stockOpnameItems).values({ opnameId, productId: pr.id, systemStock: sistem, actualStock: fisik, difference: selisih, notes: i.notes || null });
			if (selisih === 0) continue;
			jumlahSelisih++;
			await tx.update(products).set({ stok: fisik }).where(and(eq(products.id, pr.id), eq(products.unitId, unitId)));
			await tx.insert(stockLogs).values({
				id: crypto.randomUUID(), productId: pr.id, userId: String(userId), unitId,
				stokAwal: sistem, perubahan: selisih, stokAkhir: fisik, alasan: 'OPNAME', keterangan: `Stok Opname #${opnameId}`
			});
			const nilai = Math.abs(selisih) * Number(pr.hargaBeli || 0);
			if (selisih < 0) nilaiKurang += nilai; else nilaiLebih += nilai;
		}

		// Jurnal selisih (jika akun persediaan & beban tersedia): kurang → D Beban / K Persediaan; lebih → D Persediaan / K Beban
		const total = nilaiKurang + nilaiLebih;
		if (total > 0) {
			const { persediaan, beban } = await akunSelisihStok(tx, unitId);
			if (persediaan && beban) {
				const [j] = await tx.insert(journalEntries).values({
					unitId, userId: String(userId), tanggal: todayStrWIB(), nomorJurnal: `JRN-OPN-${opnameId}-${Date.now()}`,
					referensi: `Opname #${opnameId}`, memo: `Penyesuaian stok opname #${opnameId} (${jumlahSelisih} produk selisih)`,
					sourceType: 'INVENTORY', sourceId: String(opnameId), totalDebit: String(total), totalKredit: String(total), status: 'POSTED'
				});
				const jid = j.insertId;
				const baris = [];
				if (nilaiKurang > 0) {
					baris.push({ journalId: jid, coaId: beban.id, deskripsi: 'Kerugian selisih stok (kurang)', debit: String(nilaiKurang), kredit: '0' });
					baris.push({ journalId: jid, coaId: persediaan.id, deskripsi: 'Persediaan berkurang (opname)', debit: '0', kredit: String(nilaiKurang) });
				}
				if (nilaiLebih > 0) {
					baris.push({ journalId: jid, coaId: persediaan.id, deskripsi: 'Persediaan bertambah (opname)', debit: String(nilaiLebih), kredit: '0' });
					baris.push({ journalId: jid, coaId: beban.id, deskripsi: 'Koreksi selisih stok (lebih)', debit: '0', kredit: String(nilaiLebih) });
				}
				await tx.insert(journalEntryLines).values(baris);
			}
		}

		await tx.insert(riwayatAksi).values({ userId, unitId, pesan: `Stok Opname #${opnameId} selesai: ${items.length} produk dihitung, ${jumlahSelisih} selisih.`, kategori: 'PRODUK', tipe: 'success' });
		return { id: opnameId, dihitung: items.length, selisih: jumlahSelisih, nilaiKurang, nilaiLebih };
	});
}
