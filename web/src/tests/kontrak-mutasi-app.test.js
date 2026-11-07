import { describe, it, vi } from 'vitest';
import { expect } from 'vitest';
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64);
const login = vi.hoisted(() => ({ userId: null }));
vi.mock('$env/dynamic/private', () => ({ env: process.env }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));
vi.mock('$lib/server/redis', () => ({ redis: { keys: async () => [], del: async () => 0, get: async () => null, set: async () => 'OK' } }));
vi.mock('$lib/server/pusher', () => ({ triggerEvent: async () => {}, pusherServer: { trigger: async () => {} } }));
vi.mock('$lib/server/inngest', () => ({ inngest: { send: async () => {} } }));
const mods = import.meta.glob('../routes/api/app/**/+server.js');
/**
 * Kontrak tombol-tombol app mobile: setiap payload yang dikirim UpstyleApi.kt harus diterima server
 * (dulu banyak yang 400/422 → "Aksi/Data tidak lengkap"). Hanya jalan bila TEST_DATABASE_URL diset.
 */
describe.skipIf(!TEST_DB)('Kontrak mutasi app mobile', () => { it('semua payload app diterima server', async () => {
  const s = await import('../lib/server/schema.js'); const { db } = await import('../lib/server/drizzle.js');
  const { pastikanCoaStandar } = await import('../lib/server/catatTransaksi.js');
  const t = Date.now();
  const [a] = await db.insert(s.users).values({ username: `km${t}`, email: `km${t}@x.id` });
  const [u] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'K', slug: `k-${t}`, modalAwal: '0' });
  login.userId = a.insertId; const unitId = u.insertId;
  await pastikanCoaStandar(db, unitId);
  const [k] = await db.insert(s.accountingContacts).values({ unitId, namaKontak: 'Budi', tipeKontak: 'BOTH', isActive: 1 });
  const [c] = await db.insert(s.crmContacts).values({ ownerId: a.insertId, unitId, nama: 'Ani' });
  const [p] = await db.insert(s.products).values({ id: `P${t}`, slug: `p-${t}`, nama: 'Kopi', userId: a.insertId, unitId, hargaBeli: '1', hargaJual: '2', stok: 10, status: 'active' });
  const coa = await db.select().from(s.chartOfAccounts).where((await import('drizzle-orm')).eq(s.chartOfAccounts.unitId, unitId));
  const kas = coa.find(x => x.tipeAkun === 'ASET_LANCAR'); const pend = coa.find(x => x.tipeAkun === 'PENDAPATAN');
  const pid = `P${t}`;
  const kasus = [
   ['cs buat tiket', 'cs', 'POST', '', { action: 'create', subject: 'Tes', customerName: 'Ani', priority: 'medium', message: '', unitId }],
   ['crm kontak', 'crm', 'POST', '', { action: 'create-contact', contact: { nama: 'Bimo', telepon: '', email: '', perusahaan: '', stage: 'lead', sumber: 'manual', unitId } }],
   ['crm deal', 'crm', 'POST', '', { deal: { contactName: 'Ani', companyName: '', dealValue: 100, stage: 'PROSPECT', phone: '', unitId } }],
   ['crm aktivitas', 'crm/activities', 'POST', '', { action: 'create-activity', activity: { kontakId: c.insertId, tipe: 'CALL', catatan: 'x', unitId } }],
   ['crm kampanye', 'crm/campaigns', 'POST', '', { unitId, name: 'Promo', type: 'EMAIL', status: 'DRAFT', budget: 0 }],
   ['scm supplier', 'scm', 'POST', '', { action: 'create-supplier', supplier: { name: 'S', contactName: 'c', phone: '1', email: '', category: 'Umum', address: 'a', unitId } }],
   ['piutang buat', 'finance/receivables', 'POST', `unitId=${unitId}`, { contactId: k.insertId, tanggal: '2026-01-01', jatuhTempo: '2026-02-01', nominal: 1000 }],
   ['hutang buat', 'finance/payables', 'POST', `unitId=${unitId}`, { contactId: k.insertId, tanggal: '2026-01-01', jatuhTempo: '2026-02-01', nominal: 1000 }],
   ['jurnal buat', 'finance/journal', 'POST', `unitId=${unitId}`, { tanggal: '2026-01-01', lines: [{ coaId: kas.id, debit: 100, kredit: 0 }, { coaId: pend.id, debit: 0, kredit: 100 }] }],
   ['produk adjust', 'products', 'POST', '', { action: 'adjust-stock', productId: pid, unitId, perubahan: 5, alasan: 'KOREKSI', keterangan: '' }],
   ['produk stock-logs', 'products', 'GET', `unitId=${unitId}&action=stock-logs&productId=${pid}`, null],
   ['pos pelanggan', 'pos', 'POST', '', { action: 'create-customer', customer: { namaCustomer: 'Z', email: '', telepon: '', unitId } }],
   ['hr karyawan baru', 'hr', 'POST', '', { action: 'create-employee', employee: { fullName: 'Rina', position: 'Kasir', salary: 1000, pin: '1234', role: 'cashier', unitId, password: 'rahasia1' } }],
   ['website simpan', 'website', 'PUT', '', { unitId, domainSlug: `w${t}`, theme: 'modern', colorPrimary: '#6366F1', heroTitle: 'x', heroSubtitle: '', aboutUs: '', contactPhone: '', contactEmail: '', contactAddress: '' }],
   ['unit ubah', 'business', 'PUT', `unitId=${unitId}`, { unitId, action: 'updateBusiness', namaUnit: 'K2', alamat: 'a', telepon: '1', email: '', modalAwal: 5 }],
   ['kontak akunting', 'finance/contacts', 'POST', `unitId=${unitId}`, { id: 0, unitId, namaKontak: 'X', tipeKontak: 'customer', email: null, telepon: null, alamat: null, npwp: null, limitKredit: 0, termPembayaran: 30, isActive: 1 }],
   ['notif tandai semua', 'notifications/read-all', 'PUT', `unitId=${unitId}`, null],
   ['varian buat', 'products/variants', 'POST', `unitId=${unitId}`, { id: '', productId: pid, namaVariasi: 'L', sku: '', hargaBeli: 1, hargaJual: 2, stok: 1, minStok: 0 }],
   ['kategori produk buat', 'products/categories', 'POST', `unitId=${unitId}`, { unitId, namaKategori: 'Minuman' }],
  ];
  const out = [];
  for (const [nama, rute, meth, qs, body] of kasus) {
    const key = `../routes/api/app/${rute}/+server.js`;
    if (!mods[key]) { out.push(`${nama}: RUTE TIDAK ADA`); continue; }
    try {
      const m = await mods[key]();
      if (!m[meth]) { out.push(`${nama}: METODE ${meth} TIDAK ADA`); continue; }
      const req = new Request(`http://x/?${qs}`, body ? { method: meth, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : { method: meth });
      const res = await m[meth]({ request: req, cookies: { get() {} }, url: new URL(`http://x/?${qs}`), params: {}, locals: {} });
      const j = await res.json().catch(() => ({}));
      out.push(`${res.status >= 400 || j.success === false ? 'GAGAL' : 'ok   '} ${nama}: ${res.status} ${j.message || ''}`);
    } catch (e) { out.push(`CRASH ${nama}: ${String(e.message).slice(0, 100)}`); }
  }
  // bayar piutang & hutang (PUT) atas data yang baru dibuat
  const { eq } = await import('drizzle-orm');
  const [ar] = await db.select().from(s.receivables).where(eq(s.receivables.unitId, unitId)).limit(1);
  const [ap] = await db.select().from(s.payables).where(eq(s.payables.unitId, unitId)).limit(1);
  for (const [nama, rute, id] of [['piutang bayar', 'finance/receivables', ar?.id], ['hutang bayar', 'finance/payables', ap?.id]]) {
    const m = await mods[`../routes/api/app/${rute}/+server.js`]();
    const res = await m.PUT({ request: new Request('http://x/', { method: 'PUT', body: JSON.stringify({ action: 'pay', invoiceId: id, nominalBayar: 100, kasCoaId: kas.id }), headers: { 'content-type': 'application/json' } }), cookies: { get() {} }, url: new URL('http://x/'), params: {}, locals: {} });
    const j = await res.json();
    out.push(`${res.status >= 400 || j.success === false ? 'GAGAL' : 'ok   '} ${nama}: ${res.status} ${j.message || ''}`);
  }
  expect(out.filter((l) => !l.startsWith('ok'))).toEqual([]);
  const { pool } = await import('../lib/server/drizzle.js'); await pool?.end();
}); });
