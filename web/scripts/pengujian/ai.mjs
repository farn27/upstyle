// Evaluasi AI (Tabel 4.9 & 4.10): 30 ekstraksi + 20 pemetaan akun + 20 analitis, masing-masing 3 kali.
// Pakai:  node ai.mjs --jenis ekstraksi|akun|analitis|semua [--run 1] [--kasus E01,E02] [--kering]
//   --kering : tidak memanggil server; hanya memeriksa kasus & logika penilaian (untuk latihan).
// Penilaian "usulan" untuk ekstraksi/akun bersifat deterministik; keputusan akhir tetap peneliti (Bab III).
import fs from 'node:fs';
import path from 'node:path';
import { muatConfig, minta, masuk, folderBukti, csv, tidur, simpanBukti } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const jenis = arg('jenis', 'semua'), kering = process.argv.includes('--kering');
const runList = String(arg('run', '1,2,3')).split(',').map(Number);
const hanya = arg('kasus', null) ? String(arg('kasus')).split(',') : null;
const kasus = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'kasus-ai.json'), 'utf8'));
const acuanFile = path.resolve(import.meta.dirname, 'acuan-analitis.json'); // diisi peneliti dari acuan-analitis.sql
const acuanAnalitis = fs.existsSync(acuanFile) ? JSON.parse(fs.readFileSync(acuanFile, 'utf8')) : {};
const waktu = new Date().toISOString().slice(11, 19).replace(/:/g, '');
const dir = folderBukti('ai');

import { nilaiEkstraksi, nilaiAkun, usulanAnalitis } from './nilai.mjs';

// ── pemanggilan ──────────────────────────────────────────────────────────────
const c = kering ? null : muatConfig();
const sesiTenant = {}, petaProduk = {}, petaAkun = {};
async function siapkan(t) {
	if (sesiTenant[t]) return;
	const cfg = c['tenant' + t];
	const s = await masuk(c.baseUrl, cfg);
	sesiTenant[t] = { ...s, cfg };
	const p = await minta(`${c.baseUrl}/api/app/products?unitId=${cfg.unitId}&limit=200`, { token: s.token });
	petaProduk[t] = Object.fromEntries((p.json?.data ?? []).map((x) => [String(x.id), x.nama]));
	const a = await minta(`${c.baseUrl}/api/app/finance/coa?unitId=${cfg.unitId}`, { token: s.token });
	petaAkun[t] = Object.fromEntries((a.json?.data ?? []).map((x) => [x.id, { kode: x.kodeAkun, nama: x.namaAkun }]));
}
async function panggil(t, jalur, body) {
	const s = sesiTenant[t];
	let r = await minta(`${c.baseUrl}${jalur}`, { method: 'POST', token: s.token, body });
	let ulang = false;
	if (r.status === 429) { console.log('   429 kuota/batas → tunggu 65 dtk lalu ulang sekali'); await tidur(65000); r = await minta(`${c.baseUrl}${jalur}`, { method: 'POST', token: s.token, body }); ulang = true; }
	return { r, ulang };
}
const ringkasEk = (h) => h ? `${h.kategori} | ${h.produk ?? '-'} | ${h.qty ?? '-'} | ${h.nominal}` : '(tidak ada)';

const baris = { ekstraksi: [], akun: [], analitis: [] };
const mentah = fs.createWriteStream(path.join(dir, `mentah-${waktu}.jsonl`), { flags: 'a' });
const pilih = (arr) => arr.filter((k) => !hanya || hanya.includes(k.id));

async function jalankan(nama, daftar, tangani) {
	for (const k of pilih(daftar)) {
		const row = { id: k.id, tenant: k.tenant };
		for (const run of runList) {
			let out;
			if (kering) out = { ms: 0, nilai: '(kering)', ringkas: '(kering)', salah: '' };
			else { await siapkan(k.tenant); out = await tangani(k, run); await tidur(c.jedaAiMs ?? 4000); }
			row[`R${run}_ringkas`] = out.ringkas; row[`R${run}_nilai`] = out.nilai; row[`R${run}_salah`] = out.salah; row[`R${run}_ms`] = out.ms;
			if (out.catatan) row[`R${run}_catatan`] = out.catatan;
			console.log(`${k.id} R${run}: ${out.nilai || '-'} (${out.ms} ms) ${out.ringkas?.slice(0, 70) ?? ''}`);
		}
		baris[nama].push(row);
	}
}

if (['ekstraksi', 'semua'].includes(jenis)) await jalankan('ekstraksi', kasus.ekstraksi, async (k, run) => {
	const { r, ulang } = await panggil(k.tenant, '/api/app/ai-entry', { unitId: sesiTenant[k.tenant].cfg.unitId, teksInput: k.masukan });
	mentah.write(JSON.stringify({ jenis: 'ekstraksi', id: k.id, run, ms: r.ms, status: r.status, ulang, masukan: k.masukan, respons: r.json ?? r.teks }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const h0 = r.json?.data?.hasil;
	const h = h0 ? { kategori: h0.kategori, produk: h0.product_id ? petaProduk[k.tenant][String(h0.product_id)] ?? `#${h0.product_id}` : null, qty: h0.qty, nominal: h0.nominal } : null;
	const n = nilaiEkstraksi(k, h);
	return { ms: r.ms, ringkas: ringkasEk(h), ...n, catatan: ulang ? 'diulang karena 429' : '' };
});
if (['akun', 'semua'].includes(jenis)) await jalankan('akun', kasus.akun, async (k, run) => {
	const { r, ulang } = await panggil(k.tenant, '/api/app/ai-entry', { unitId: sesiTenant[k.tenant].cfg.unitId, teksInput: k.masukan });
	mentah.write(JSON.stringify({ jenis: 'akun', id: k.id, run, ms: r.ms, status: r.status, ulang, masukan: k.masukan, respons: r.json ?? r.teks }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const h0 = r.json?.data?.hasil;
	const h = h0 ? { akun_kode: petaAkun[k.tenant][h0.coa_id]?.kode, akun_nama: petaAkun[k.tenant][h0.coa_id]?.nama, kas_kode: petaAkun[k.tenant][h0.kas_coa_id]?.kode, kas_nama: petaAkun[k.tenant][h0.kas_coa_id]?.nama } : null;
	return { ms: r.ms, ringkas: h ? `${h.akun_kode ?? '-'} ${h.akun_nama ?? ''} | kas ${h.kas_kode ?? '-'} ${h.kas_nama ?? ''}` : '(tidak ada)', ...nilaiAkun(k, h), catatan: ulang ? 'diulang karena 429' : '' };
});
if (['analitis', 'semua'].includes(jenis)) await jalankan('analitis', kasus.analitis, async (k, run) => {
	const { r, ulang } = await panggil(k.tenant, '/api/chat', { message: k.masukan, activeUnitSlug: sesiTenant[k.tenant].cfg.slug, history: [] });
	mentah.write(JSON.stringify({ jenis: 'analitis', id: k.id, run, ms: r.ms, status: r.status, ulang, masukan: k.masukan, respons: r.json ?? r.teks }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const reply = r.json?.reply ?? '';
	const u = usulanAnalitis(k.id, reply, acuanAnalitis);
	return { ms: r.ms, ringkas: String(reply).replace(/:::[a-z]+\{[^}]*\}:::/g, '').replace(/\s+/g, ' ').slice(0, 220), ...u, catatan: [u.catatan, ulang ? 'diulang karena 429' : ''].filter(Boolean).join('; ') };
});

mentah.end();
for (const [nama, rows] of Object.entries(baris)) {
	if (!rows.length) continue;
	const kolom = ['id', 'tenant', ...runList.flatMap((r) => [`R${r}_ringkas`, `R${r}_nilai`, `R${r}_salah`, `R${r}_ms`, `R${r}_catatan`])];
	fs.writeFileSync(path.join(dir, `${nama}-${waktu}.csv`), csv(rows, kolom));
}
console.log(`\nSelesai${kering ? ' (mode kering)' : ''}. Keluaran mentah & CSV: ${dir}`);
