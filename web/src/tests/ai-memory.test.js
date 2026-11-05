/**
 * Tes memori AI chat (lib/server/aiMemory.js) — tanpa Redis (in-memory).
 */
import { describe, it, expect, vi } from 'vitest';
vi.mock('../lib/server/redis.js', () => ({ redis: null }));
const { saveAiMemory, getAiMemories, deleteAiMemory, isFinancialOrTransactionData } = await import('../lib/server/aiMemory.js');

describe('Memori AI', () => {
	it('menolak angka transaksi / keuangan', async () => {
		expect(isFinancialOrTransactionData('omzet hari ini Rp 2.500.000')).toBe(true);
		expect((await saveAiMemory(1, 1, 'saldo 5 juta')).success).toBe(false);
		expect(isFinancialOrTransactionData('pelanggan suka kopi tanpa gula')).toBe(false);
	});

	it('hapus memori butuh kata kunci minimal 3 huruf — tidak menghapus semuanya', async () => {
		await saveAiMemory(9, 9, 'toko buka jam delapan pagi');
		await saveAiMemory(9, 9, 'pemilik suka laporan singkat');
		expect((await deleteAiMemory(9, 9, 'a')).removedCount).toBe(0);
		expect((await deleteAiMemory(9, 9, '')).removedCount).toBe(0);
		expect(await getAiMemories(9, 9)).toHaveLength(2);
		expect((await deleteAiMemory(9, 9, 'laporan')).removedCount).toBe(1);
		expect((await getAiMemories(9, 9)).map((/** @type {any} */ m) => m.fact)).toEqual(['toko buka jam delapan pagi']);
	});
});
