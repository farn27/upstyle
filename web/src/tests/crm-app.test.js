/**
 * CRM (app): daftar kontak (?type=contacts), deal (nama/ubah/kontak terpilih), tugas (validasi unit, ubah, hapus),
 * ubah/hapus kontak, isolasi antar user. Hanya jalan bila TEST_DATABASE_URL diset.
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.DB_RELATIONAL_MODE ||= 'planetscale'; // MariaDB lokal tak punya LATERAL JOIN

const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('CRM app', () => {
	it('kontak, deal, tugas end-to-end + isolasi', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const { eq } = await import('drizzle-orm');
		const crm = await import('../routes/api/app/crm/+server.js');
		const tugas = await import('../routes/api/app/crm/tasks/+server.js');
		const kontakApi = await import('../routes/api/app/crm/contacts/[contactId]/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `ca${t}`, email: `ca${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `cb${t}`, email: `cb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'CRM A', slug: `crm-a-${t}`, kategori: 'FNB_RESTAURANT' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'CRM B', slug: `crm-b-${t}`, kategori: 'FNB_RESTAURANT' });
		const unitA = ua.insertId;
		const unitB = ub.insertId;
		const mk = (method, body, qs = '', params = {}) => ({
			request: new Request(`http://x/?${qs}`, { method, body: body ? JSON.stringify(body) : undefined, headers: { 'content-type': 'application/json' } }),
			cookies: { get() {} }, url: new URL(`http://x/?${qs}`), params
		});
		const jalan = async (fn, ...a) => { const r = await fn(...a); return { st: r.status, j: await r.json() }; };

		login.userId = a.insertId;
		// kontak baru (payload app) lalu muncul di ?type=contacts
		expect((await jalan(crm.POST, mk('POST', { action: 'create-contact', contact: { nama: 'Budi Santoso', telepon: '0811', email: 'budi@x.id', perusahaan: 'PT Maju', stage: 'lead', sumber: 'manual', unitId: unitA } }))).j.success).toBe(true);
		expect((await jalan(crm.POST, mk('POST', { action: 'create-contact', contact: { nama: 'Siti', unitId: unitA } }))).j.success).toBe(true);
		const daftar = (await jalan(crm.GET, mk('GET', null, `unitId=${unitA}&type=contacts`))).j;
		expect(daftar.data.map((k) => k.nama).sort()).toEqual(['Budi Santoso', 'Siti']);
		expect(daftar.data[0]).toMatchObject({ ownerId: a.insertId, unitId: unitA });
		const cari = (await jalan(crm.GET, mk('GET', null, `unitId=${unitA}&type=contacts&q=maju`))).j;
		expect(cari.data.map((k) => k.nama)).toEqual(['Budi Santoso']);
		const budi = daftar.data.find((k) => k.nama === 'Budi Santoso');

		// deal: pakai kontak terpilih + nama kustom; kontak unit lain ditolak
		const d1 = (await jalan(crm.POST, mk('POST', { deal: { contactName: 'x', dealValue: 1500000, stage: 'PROSPEK', unitId: unitA, kontakId: budi.id, namaDeal: 'Seragam PT Maju' } }))).j;
		expect(d1.success).toBe(true);
		const deals = (await jalan(crm.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(deals[0]).toMatchObject({ namaDeal: 'Seragam PT Maju', contactName: 'Budi Santoso', companyName: 'PT Maju', dealValue: 1500000, stage: 'PROSPEK', kontakId: budi.id });
		const [kontakB] = await db.insert(s.crmContacts).values({ ownerId: b.insertId, unitId: unitB, nama: 'Orang B' });
		const curi = await jalan(crm.POST, mk('POST', { deal: { contactName: 'y', dealValue: 1, unitId: unitA, kontakId: kontakB.insertId } }));
		expect(curi.st).toBe(404);

		// ubah nama + nilai tanpa mengubah tahap, lalu pindah tahap
		expect((await jalan(crm.PUT, mk('PUT', { dealId: d1.id, namaDeal: 'Seragam v2', nilai: 2000000 }))).j.success).toBe(true);
		expect((await jalan(crm.PUT, mk('PUT', { dealId: d1.id, namaDeal: '  ' }))).st).toBe(400);
		let [row] = await db.select().from(s.crmDeals).where(eq(s.crmDeals.id, d1.id));
		expect(row).toMatchObject({ namaDeal: 'Seragam v2', stage: 'prospek', status: 'open' });
		expect(Number(row.nilai)).toBe(2000000);
		expect((await jalan(crm.PUT, mk('PUT', { dealId: d1.id, stage: 'WON' }))).j.success).toBe(true);
		[row] = await db.select().from(s.crmDeals).where(eq(s.crmDeals.id, d1.id));
		expect(row).toMatchObject({ stage: 'won', status: 'won' });

		// tugas: tautan kontak unit lain ditolak, ubah status, edit, hapus
		const tBuruk = await jalan(tugas.POST, mk('POST', { unitId: unitA, deskripsi: 'Telepon', kontakId: kontakB.insertId }));
		expect(tBuruk.st).toBe(404);
		expect((await jalan(tugas.POST, mk('POST', { unitId: unitA, deskripsi: 'Telepon Budi', kontakId: budi.id, dealId: d1.id, deadline: '2026-12-01' }))).j.success).toBe(true);
		const list = (await jalan(tugas.GET, mk('GET', null, `unitId=${unitA}`))).j.data;
		expect(list[0]).toMatchObject({ deskripsi: 'Telepon Budi', contactName: 'Budi Santoso', status: 'pending' });
		const tid = list[0].id;
		expect((await jalan(tugas.PUT, mk('PUT', { taskId: tid, status: 'selesai' }))).st).toBe(400);
		expect((await jalan(tugas.PUT, mk('PUT', { taskId: tid, status: 'done' }))).j.success).toBe(true);
		expect((await jalan(tugas.PUT, mk('PUT', { taskId: tid, deskripsi: 'Telepon Budi lagi' }))).j.success).toBe(true);
		const [tr] = await db.select().from(s.crmTasks).where(eq(s.crmTasks.id, tid));
		expect(tr).toMatchObject({ status: 'done', deskripsi: 'Telepon Budi lagi' });

		// user lain tidak bisa menyentuh data A
		login.userId = b.insertId;
		expect((await jalan(tugas.DELETE, mk('DELETE', null, `taskId=${tid}`))).st).toBe(404);
		expect((await jalan(kontakApi.PUT, mk('PUT', { nama: 'Hack' }, '', { contactId: String(budi.id) }))).st).toBe(404);
		expect((await jalan(kontakApi.DELETE, mk('DELETE', null, '', { contactId: String(budi.id) }))).st).toBe(404);

		// pemilik: ubah & hapus kontak (deal & tugas tetap, tautan jadi null)
		login.userId = a.insertId;
		expect((await jalan(kontakApi.PUT, mk('PUT', { nama: 'Budi S.', telepon: '', stage: 'prospek' }, '', { contactId: String(budi.id) }))).j.success).toBe(true);
		const [kb] = await db.select().from(s.crmContacts).where(eq(s.crmContacts.id, budi.id));
		expect(kb).toMatchObject({ nama: 'Budi S.', stage: 'prospek' });
		expect((await jalan(kontakApi.DELETE, mk('DELETE', null, '', { contactId: String(budi.id) }))).j.success).toBe(true);
		[row] = await db.select().from(s.crmDeals).where(eq(s.crmDeals.id, d1.id));
		expect(row.kontakId).toBeNull();
		expect((await jalan(tugas.DELETE, mk('DELETE', null, `taskId=${tid}`))).j.success).toBe(true);
	});
});
