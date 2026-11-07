/** COA otomatis dari AI: parsing, perapian, dan penyimpanan atomik (AI dipalsukan). */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe('bacaAkunDariAi & rapikanAkunAi (murni)', () => {
	it('mengambil array JSON dari jawaban berisi markdown & teks pembuka', async () => {
		const { bacaAkunDariAi } = await import('../lib/server/masterData.js');
		const jawab = 'Berikut COA-nya:\n```json\n[{"namaAkun":"Kas","tipeAkun":"ASET_LANCAR"}]\n```\nSemoga membantu';
		expect(bacaAkunDariAi(jawab)).toHaveLength(1);
		expect(bacaAkunDariAi('tidak ada json')).toEqual([]);
		expect(bacaAkunDariAi('[rusak')).toEqual([]);
	});

	it('memperbaiki tipe, saldo normal, kode ganda & membuang nama duplikat', async () => {
		const { rapikanAkunAi } = await import('../lib/server/masterData.js');
		const hasil = rapikanAkunAi([
			{ kodeAkun: '1-1001', namaAkun: 'Kas', tipeAkun: 'ASET_LANCAR', normalBalance: 'KREDIT' }, // saldo salah → DEBIT
			{ kodeAkun: '1-1001', namaAkun: 'Bank', tipeAkun: 'ASET_LANCAR' },                         // kode ganda → kode baru
			{ namaAkun: 'Kendaraan', tipeAkun: 'ASET_LAINNYA' },                                       // alias → ASET_TETAP
			{ namaAkun: 'kas', tipeAkun: 'ASET_LANCAR' },                                              // nama ganda → dibuang
			{ namaAkun: 'Aneh', tipeAkun: 'NGAWUR' },                                                  // tipe tak dikenal → dibuang
			{ namaAkun: 'Penjualan', tipeAkun: 'PENDAPATAN' }
		], new Set(), new Set());
		expect(hasil.map((a) => a.namaAkun)).toEqual(['Kas', 'Bank', 'Kendaraan', 'Penjualan']);
		expect(hasil[0].normalBalance).toBe('DEBIT');
		expect(new Set(hasil.map((a) => a.kodeAkun)).size).toBe(4);
		expect(hasil[2].tipeAkun).toBe('ASET_TETAP');
		expect(hasil[3]).toMatchObject({ tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT' });
		expect(hasil[3].kodeAkun.startsWith('4-')).toBe(true);
	});
});

describe.skipIf(!TEST_DB)('buatCoaDenganAi — database sungguhan', () => {
	/** @type {any} */ let db; /** @type {any} */ let s; /** @type {any} */ let m; /** @type {any} */ let eq;
	/** @type {number} */ let unitId; /** @type {number} */ let userId;
	beforeAll(async () => {
		s = await import('../lib/server/schema.js'); ({ db } = await import('../lib/server/drizzle.js')); ({ eq } = await import('drizzle-orm'));
		m = await import('../lib/server/masterData.js');
		const t = Date.now();
		const [u] = await db.insert(s.users).values({ username: `ca${t}`, email: `ca${t}@x.id` }); userId = u.insertId;
		const [b] = await db.insert(s.unitBisnis).values({ userId, namaUnit: 'Roti', slug: `roti-${t}`, modalAwal: '0' }); unitId = b.insertId;
	});
	afterAll(async () => {
		await db.delete(s.unitBisnis).where(eq(s.unitBisnis.id, unitId));
		await db.delete(s.users).where(eq(s.users.id, userId));
		const { pool } = await import('../lib/server/drizzle.js'); await pool?.end();
	});
	const ai = (/** @type {string} */ teks) => ({ panggilAi: async () => teks });
	const daftar = () => db.select().from(s.chartOfAccounts).where(eq(s.chartOfAccounts.unitId, unitId));

	it('deskripsi kosong ditolak; AI error → 503 dan tidak ada akun', async () => {
		await expect(m.buatCoaDenganAi(db, unitId, ' ', ai('[]'))).rejects.toThrow('Deskripsi');
		await expect(m.buatCoaDenganAi(db, unitId, 'toko roti', { panggilAi: async () => { throw new Error('x'); } })).rejects.toMatchObject({ status: 503 });
		expect(await daftar()).toHaveLength(0);
	});
	it('jawaban AI tak valid ditolak tanpa menyimpan apa pun', async () => {
		await expect(m.buatCoaDenganAi(db, unitId, 'toko roti', ai('maaf saya tidak bisa'))).rejects.toMatchObject({ status: 422 });
		expect(await daftar()).toHaveLength(0);
	});
	it('menyimpan semua akun valid sekaligus', async () => {
		const n = await m.buatCoaDenganAi(db, unitId, 'toko roti', ai(JSON.stringify([
			{ kodeAkun: '1-1001', namaAkun: 'Kas', tipeAkun: 'ASET_LANCAR' },
			{ kodeAkun: '4-1001', namaAkun: 'Penjualan Roti', tipeAkun: 'PENDAPATAN' },
			{ kodeAkun: '5-1001', namaAkun: 'Bahan Baku', tipeAkun: 'HPP' }
		])));
		expect(n).toBe(3);
		expect(await daftar()).toHaveLength(3);
	});
	it('unit yang sudah punya COA ditolak, kecuali mode tambahkan (hanya yang belum ada)', async () => {
		await expect(m.buatCoaDenganAi(db, unitId, 'toko roti', ai('[]'))).rejects.toMatchObject({ status: 409 });
		const n = await m.buatCoaDenganAi(db, unitId, 'toko roti', {
			tambahkan: true,
			panggilAi: async () => JSON.stringify([
				{ kodeAkun: '1-1001', namaAkun: 'Kas', tipeAkun: 'ASET_LANCAR' },       // sudah ada → dilewati
				{ namaAkun: 'Beban Listrik', tipeAkun: 'BEBAN_OPERASIONAL' }
			])
		});
		expect(n).toBe(1);
		expect(await daftar()).toHaveLength(4);
	});
});
