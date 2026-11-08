// Evaluasi AI (Tabel 4.9 & 4.10): 30 ekstraksi + 20 pemetaan akun + 20 analitis, masing-masing 3 kali.
// Pakai:  node ai.mjs --jenis ekstraksi|akun|analitis|semua [--run 1] [--kasus E01,E02] [--kering]
//   --kering : tidak memanggil server; hanya memeriksa kasus & logika penilaian (untuk latihan).
// Penilaian "usulan" untuk ekstraksi/akun bersifat deterministik; keputusan akhir tetap peneliti (Bab III).
import fs from 'node:fs';
import path from 'node:path';
import { parse as devalueParse } from 'devalue';
import { muatConfig, minta, masuk, folderBukti, csv, tidur, simpanBukti } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] === undefined ? true : process.argv[i + 1]); };
const jenis = arg('jenis', 'semua'), kering = process.argv.includes('--kering');
const runList = String(arg('run', '1,2,3')).split(',').map(Number);
// Jalur input transaksi yang dievaluasi untuk ekstraksi & akun: 'web' = halaman Entri Transaksi (aksi prosesAI), 'api' = POST /api/app/ai-entry (dipakai app mobile).
const jalur = String(arg('jalur', 'web'));
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

// ── jalur web: login web → POST /finance/<slug>/entry?/prosesAI (aksi form SvelteKit, hasil berformat devalue)
const cookieWeb = {};
async function masukWeb(t) {
	if (cookieWeb[t]) return;
	const cfg = c['tenant' + t];
	const x = await minta(`${c.baseUrl}/auth/login?/login`, { method: 'POST', headers: { origin: c.baseUrl, 'x-sveltekit-action': 'true' }, body: new URLSearchParams({ username: cfg.email, password: cfg.password }) });
	cookieWeb[t] = x.setCookie.map((s) => s.split(';')[0]).find((s) => s.startsWith('session_id=')) || null;
	if (!cookieWeb[t]) throw new Error(`Login web gagal untuk tenant ${t} (HTTP ${x.status}). Periksa email/sandi di config.json.`);
}
const urai = (r) => { try { return r.json?.type === 'success' ? devalueParse(r.json.data) : null; } catch { return null; } };
/** Satu panggilan input-transaksi AI untuk kasus k lewat jalur terpilih. Mengembalikan { r, ulang, h0, via, mentahRespons } dengan r.status 200 bila berhasil. */
async function entri(k) {
	if (jalur === 'api') {
		const { r, ulang } = await panggil(k.tenant, '/api/app/ai-entry', { unitId: sesiTenant[k.tenant].cfg.unitId, teksInput: k.masukan });
		return { r, ulang, h0: r.json?.data?.hasil, via: 'api', mentahRespons: r.json ?? r.teks };
	}
	await masukWeb(k.tenant);
	const slug = sesiTenant[k.tenant].cfg.slug;
	const kirim = () => minta(`${c.baseUrl}/finance/${slug}/entry?/prosesAI`, { method: 'POST', headers: { origin: c.baseUrl, 'x-sveltekit-action': 'true', cookie: cookieWeb[k.tenant] }, body: new URLSearchParams({ teksInput: k.masukan }) });
	let r = await kirim(), ulang = false, data = urai(r);
	if (data?.error && /terlalu banyak permintaan ai|kuota ai/i.test(String(data.error))) { console.log('   kuota AI → tunggu 65 dtk lalu ulang sekali'); await tidur(65000); r = await kirim(); ulang = true; data = urai(r); }
	const ok = data?.success === true && data.hasil;
	return { r: { ...r, status: ok ? 200 : 502, json: ok ? r.json : { message: data?.error ?? `respons tidak dikenali (HTTP ${r.status}): ${String(r.teks).slice(0, 80)}` } }, ulang, h0: ok ? data.hasil : null, via: 'web', mentahRespons: data ?? r.teks };
}
const ringkasEk = (h) => h ? `${h.kategori} | ${h.produk ?? '-'} | ${h.qty ?? '-'} | ${h.nominal}` : '(tidak ada)';


// CSV ditulis bertahap (satu baris per kasus selesai). Judul kolom ditulis sekali per berkas.
const berkasCsv = {};
function tulisBaris(nama, row) {
	const kolom = ['id', 'tenant', ...runList.flatMap((r) => [`R${r}_ringkas`, `R${r}_nilai`, `R${r}_salah`, `R${r}_ms`, `R${r}_catatan`])];
	if (!berkasCsv[nama]) { berkasCsv[nama] = path.join(dir, `${nama}-${waktu}.csv`); fs.writeFileSync(berkasCsv[nama], kolom.join(',') + '\n'); }
	fs.appendFileSync(berkasCsv[nama], csv([row], kolom).split('\n').slice(1).join('\n'));
}
const baris = { ekstraksi: [], akun: [], analitis: [] };
const mentah = fs.createWriteStream(path.join(dir, `mentah-${waktu}.jsonl`), { flags: 'a' });
const pilih = (arr) => arr.filter((k) => !hanya || hanya.includes(k.id));
// Kasus A19 memuat placeholder "[isi tanggal 2 bulan lalu]": isi dengan tanggal 12 pada bulan dua bulan sebelum hari uji (WIB).
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tanggalDuaBulanLalu = (() => { const w = new Date(Date.now() + 7 * 3600e3); const d = new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() - 2, 1)); return `12 ${NAMA_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; })();
const isiPlaceholder = (teks) => String(teks).replace(/\[isi tanggal 2 bulan lalu\]/i, tanggalDuaBulanLalu);

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
		tulisBaris(nama, row); // langsung ke CSV agar tidak hilang bila proses terputus
	}
}

if (['ekstraksi', 'semua'].includes(jenis)) await jalankan('ekstraksi', kasus.ekstraksi, async (k, run) => {
	const { r, ulang, h0, via, mentahRespons } = await entri(k);
	mentah.write(JSON.stringify({ jenis: 'ekstraksi', id: k.id, run, jalur: via, ms: r.ms, status: r.status, ulang, masukan: k.masukan, respons: mentahRespons }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const h = h0 ? { kategori: h0.kategori, produk: h0.product_id ? petaProduk[k.tenant][String(h0.product_id)] ?? `#${h0.product_id}` : null, qty: h0.qty, nominal: h0.nominal } : null;
	const n = nilaiEkstraksi(k, h);
	return { ms: r.ms, ringkas: ringkasEk(h), ...n, catatan: [ulang ? 'diulang karena kuota' : '', `jalur ${via}`].filter(Boolean).join('; ') };
});
if (['akun', 'semua'].includes(jenis)) await jalankan('akun', kasus.akun, async (k, run) => {
	const { r, ulang, h0, via, mentahRespons } = await entri(k);
	mentah.write(JSON.stringify({ jenis: 'akun', id: k.id, run, jalur: via, ms: r.ms, status: r.status, ulang, masukan: k.masukan, respons: mentahRespons }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const h = h0 ? { akun_kode: petaAkun[k.tenant][h0.coa_id]?.kode, akun_nama: petaAkun[k.tenant][h0.coa_id]?.nama, kas_kode: petaAkun[k.tenant][h0.kas_coa_id]?.kode, kas_nama: petaAkun[k.tenant][h0.kas_coa_id]?.nama } : null;
	return { ms: r.ms, ringkas: h ? `${h.akun_kode ?? '-'} ${h.akun_nama ?? ''} | kas ${h.kas_kode ?? '-'} ${h.kas_nama ?? ''}` : '(tidak ada)', ...nilaiAkun(k, h), catatan: [ulang ? 'diulang karena kuota' : '', `jalur ${via}`].filter(Boolean).join('; ') };
});
if (['analitis', 'semua'].includes(jenis)) await jalankan('analitis', kasus.analitis, async (k, run) => {
	const { r, ulang } = await panggil(k.tenant, '/api/chat', { message: isiPlaceholder(k.masukan), activeUnitSlug: sesiTenant[k.tenant].cfg.slug, history: [] });
	mentah.write(JSON.stringify({ jenis: 'analitis', id: k.id, run, ms: r.ms, status: r.status, ulang, masukan: isiPlaceholder(k.masukan), respons: r.json ?? r.teks }) + '\n');
	if (r.status !== 200) return { ms: r.ms, ringkas: `(galat HTTP ${r.status}: ${String(r.json?.message ?? r.json?.reply ?? r.galat ?? '').slice(0, 80)})`, nilai: '', salah: '', catatan: 'ULANGI — galat server/kuota/jaringan, bukan penilaian model' };
	const reply = r.json?.reply ?? '';
	const u = usulanAnalitis(k.id, reply, acuanAnalitis);
	return { ms: r.ms, ringkas: String(reply).replace(/:::[a-z]+\{[^}]*\}:::/g, '').replace(/\s+/g, ' ').slice(0, 220), ...u, catatan: [u.catatan, ulang ? 'diulang karena 429' : ''].filter(Boolean).join('; ') };
});

mentah.end();
console.log(`\nSelesai${kering ? ' (mode kering)' : ''}. Keluaran mentah & CSV: ${dir}`);
