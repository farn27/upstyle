/**
 * Jurnal umum manual web (?/createManualJournal): dulu selalu gagal (tx.execute dengan parameter
 * diabaikan Drizzle). Sekarang memakai buatJurnalManual yang sama dengan API mobile.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: null }));

describe.skipIf(!TEST_DB)('jurnal manual web', () => {
	/** @type {any} */ let db; /** @type {any} */ let schema; /** @type {any} */ let eq; /** @type {any} */ let page;
	/** @type {Record<string, any>} */ const ids = {};

	beforeAll(async () => {
		schema = await import('../lib/server/schema.js');
		({ db } = await import('../lib/server/drizzle.js'));
		({ eq } = await import('drizzle-orm'));
		const lib = await import('../lib/server/catatTransaksi.js');
		page = await import('../routes/(app)/finance/[slug]/jurnal-umum/+page.server.js');
		const s = Date.now();
		const [u] = await db.insert(schema.users).values({ username: `jrn${s}`, email: `jrn${s}@contoh.id` });
		const [u2] = await db.insert(schema.users).values({ username: `jrnb${s}`, email: `jrnb${s}@contoh.id` });
		ids.user = u.insertId; ids.userB = u2.insertId;
		const [a] = await db.insert(schema.unitBisnis).values({ userId: ids.user, namaUnit: 'J', slug: `jrn-${s}`, modalAwal: '0' });
		const [b] = await db.insert(schema.unitBisnis).values({ userId: ids.userB, namaUnit: 'JB', slug: `jrnb-${s}`, modalAwal: '0' });
		ids.unit = a.insertId; ids.slug = `jrn-${s}`; ids.unitB = b.insertId;
		for (const u of [ids.unit, ids.unitB]) await db.transaction((/** @type {any} */ tx) => lib.pastikanCoaStandar(tx, u));
		const akun = await db.select().from(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.unitId, ids.unit));
		ids.kas = akun.find((/** @type {any} */ x) => /kas tunai/i.test(x.namaAkun)).id;
		ids.modal = akun.find((/** @type {any} */ x) => x.tipeAkun === 'EKUITAS').id;
		ids.akunB = (await db.select().from(schema.chartOfAccounts).where(eq(schema.chartOfAccounts.unitId, ids.unitB)))[0].id;
	});

	afterAll(async () => {
		for (const u of [ids.unit, ids.unitB]) if (u) await db.delete(schema.unitBisnis).where(eq(schema.unitBisnis.id, u));
		for (const u of [ids.user, ids.userB]) if (u) await db.delete(schema.users).where(eq(schema.users.id, u));
		const { pool } = await import('../lib/server/drizzle.js');
		await pool?.end?.();
	});

	const kirim = (/** @type {Record<string, string>} */ o) => {
		const f = new FormData();
		for (const [k, v] of Object.entries(o)) f.set(k, v);
		return page.actions.createManualJournal({ request: new Request('http://x', { method: 'POST', body: f }), params: { slug: ids.slug }, cookies: { get: () => undefined } });
	};

	it('jurnal seimbang tersimpan dengan barisnya', async () => {
		login.userId = ids.user;
		const r = await kirim({ tanggal: '2026-11-10', memo: 'Setoran modal', account_id_0: String(ids.kas), debit_0: '500000', kredit_0: '0', account_id_1: String(ids.modal), debit_1: '0', kredit_1: '500000' });
		expect(r.success).toBe(true);
		const j = await db.query.journalEntries.findFirst({ where: eq(schema.journalEntries.nomorJurnal, r.nomorJurnal) });
		expect(Number(j.totalDebit)).toBe(500000);
		const baris = await db.select().from(schema.journalEntryLines).where(eq(schema.journalEntryLines.journalId, j.id));
		expect(baris).toHaveLength(2);
	});

	it('tidak seimbang / akun unit lain → ditolak 400', async () => {
		login.userId = ids.user;
		const r1 = await kirim({ tanggal: '2026-11-10', account_id_0: String(ids.kas), debit_0: '100', account_id_1: String(ids.modal), kredit_1: '90' });
		expect(r1.status).toBe(400);
		const r2 = await kirim({ tanggal: '2026-11-10', account_id_0: String(ids.kas), debit_0: '100', account_id_1: String(ids.akunB), kredit_1: '100' });
		expect(r2.status).toBe(400);
	});
});
