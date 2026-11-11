// Pengujian keamanan (Tabel 3.2 / 4.7). Jalankan:  node keamanan.mjs [--tanpa-ratelimit]
// Skenario 4 (pembatasan permintaan) mengunci IP selama 15 menit, jadi dijalankan TERAKHIR dan bisa dilewati.
import fs from 'node:fs';
import path from 'node:path';
import { muatConfig, minta, masuk, folderBukti, simpanBukti, csv, tidur } from './lib.mjs';

const c = muatConfig();
const base = c.baseUrl;
const dir = folderBukti('keamanan');
const hasil = [];
const catat = (no, sub, kriteria, aktual, lulus, bukti = '') => {
	hasil.push({ no, sub, status_usulan: lulus === null ? 'Periksa manual' : lulus ? 'Lulus' : 'Gagal', hasil_aktual: aktual, kriteria, bukti });
	console.log(`[${no}${sub}] ${lulus === null ? '??' : lulus ? 'LULUS' : 'GAGAL'} — ${aktual}`);
};
const A = c.tenantA, B = c.tenantB;

// Data pembanding: transaksi milik Tenant B (dilihat memakai akun B sendiri)
const sa = await masuk(base, A), sb = await masuk(base, B);
const listB = await minta(`${base}/api/app/finance?unitId=${B.unitId}`, { token: sb.token });
const trxB = listB.json?.data?.transactions?.[0];
if (!trxB) console.warn('PERINGATAN: Tenant B belum punya transaksi; skenario 6/7 butuh minimal 1 transaksi di B.');
const jumlahTrxB = listB.json?.data?.transactions?.length ?? 0;

// 1a — halaman tanpa sesi
let r = await minta(`${base}/finance/${A.slug}/laporan`);
simpanBukti(dir, '1a_halaman_tanpa_sesi', r);
catat(1, 'a', 'Dialihkan ke login', `HTTP ${r.status} → ${r.lokasi}`, r.status >= 300 && r.status < 400 && /\/auth\/login/.test(r.lokasi));

// 1b — API tanpa Authorization
r = await minta(`${base}/api/app/finance?unitId=${A.unitId}`);
simpanBukti(dir, '1b_api_tanpa_token', r);
catat(1, 'b', 'Ditolak 401', `HTTP ${r.status}`, r.status === 401 && !r.json?.data);

// 2 — kata sandi salah (web form action + API)
const form = { username: A.email, password: 'salah-' + Date.now() };
r = await minta(`${base}/auth/login?/login`, { method: 'POST', headers: { origin: base, 'x-sveltekit-action': 'true' }, body: new URLSearchParams(form) });
simpanBukti(dir, '2_login_web_salah', r);
const tanpaCookie = !r.setCookie.some((x) => /^session_id=/.test(x) && !/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(x));
const r2 = await minta(`${base}/auth/login?/login`, { method: 'POST', headers: { origin: base, 'x-sveltekit-action': 'true' }, body: new URLSearchParams({ username: `tidak-ada-${Date.now()}@contoh.id`, password: 'x' }) });
simpanBukti(dir, '2_login_web_user_tidak_ada', r2);
const pesan = (x) => (x.json?.data ? String(x.teks.match(/Username\/email atau password salah/)?.[0] ?? '') : '');
catat(2, '', 'Ditolak, tanpa cookie, pesan sama untuk user ada/tidak ada',
	`akun ada: HTTP ${r.status}, cookie session_id: ${tanpaCookie ? 'tidak ada' : 'ADA'}; pesan sama: ${pesan(r) !== '' && pesan(r) === pesan(r2)}`,
	tanpaCookie && pesan(r) !== '' && pesan(r) === pesan(r2));

// 3 — kasir (sesi portal staf) ke halaman pemilik. Butuh cookie staff_session_token dari browser (lihat panduan).
if (c.kasirA?.staffSessionToken) {
	const tiga = [];
	for (const p of ['laporan', 'settings', 'hr']) {
		const x = await minta(`${base}/finance/${A.slug}/${p}`, { headers: { cookie: `staff_session_token=${c.kasirA.staffSessionToken}` } });
		simpanBukti(dir, `3_kasir_${p}`, x);
		tiga.push({ p, st: x.status, ok: (x.status >= 300 && x.status < 400 && /auth\/login|portal/.test(x.lokasi)) || x.status === 403 });
	}
	catat(3, '', 'Ditolak/dialihkan', tiga.map((t) => `${t.p}:${t.st}`).join(' '), tiga.every((t) => t.ok));
} else {
	catat(3, '', 'Ditolak/dialihkan', 'staffSessionToken kasir belum diisi — lakukan manual + tangkapan layar', null);
}

// 5 — data sensitif pada respons
const login = await minta(`${base}/api/auth/login`, { method: 'POST', body: { email: A.email, password: A.password } });
const profil = await minta(`${base}/api/app/settings?mode=profile`, { token: sa.token });
simpanBukti(dir, '5_respons_login', login); simpanBukti(dir, '5_respons_profil', profil);
const bocor = /"password"|\$argon2|passwordHash|"secret"/i.test(login.teks + profil.teks);
catat(5, '', 'Respons tanpa kata sandi/hash', `bocor: ${bocor}. Periksa hash di DB: SELECT LEFT(password,10) FROM users WHERE email='${A.email}'; harus diawali $argon2id$`, bocor ? false : null);

// 6a/6b — isolasi baca
r = await minta(`${base}/finance/${B.slug}/history`, { token: sa.token });
simpanBukti(dir, '6a_halaman_tenant_B', r);
const namaB = trxB?.keterangan ? String(trxB.keterangan).slice(0, 12) : null;
catat(6, 'a', 'Tidak ada data Tenant B', `HTTP ${r.status}${r.lokasi ? ' → ' + r.lokasi : ''}; memuat keterangan trx B: ${namaB ? r.teks.includes(namaB) : 'n/a'}`,
	!(r.status === 200 && namaB && r.teks.includes(namaB)));
r = await minta(`${base}/api/app/finance?unitId=${B.unitId}`, { token: sa.token });
simpanBukti(dir, '6b_api_tenant_B', r);
catat(6, 'b', 'Tidak ada transaksi B', `HTTP ${r.status}; jumlah transaksi dikembalikan: ${r.json?.data?.transactions?.length ?? 0}`, r.status >= 400 || !(r.json?.data?.transactions?.length));
r = await minta(`${base}/api/app/products?unitId=${B.unitId}`, { token: sa.token });
simpanBukti(dir, '6c_api_produk_tenant_B', r);
catat(6, 'c', 'Tidak ada produk B (tambahan)', `HTTP ${r.status}; jumlah data: ${r.json?.data?.length ?? 0}`, r.status >= 400 || !(r.json?.data?.length));

// 7a/7b — isolasi ubah
if (trxB) {
	const web = await masukWeb(A);
	if (web) {
		for (const [lab, slug] of [['slugA', A.slug], ['slugB', B.slug]]) {
			const x = await minta(`${base}/finance/${slug}/history?/delete`, { method: 'POST', headers: { origin: base, 'x-sveltekit-action': 'true', cookie: web }, body: new URLSearchParams({ id: String(trxB.id) }) });
			simpanBukti(dir, `7a_hapus_via_web_${lab}`, x);
		}
	}
	r = await minta(`${base}/api/app/finance?transactionId=${trxB.id}&unitId=${B.unitId}`, { method: 'DELETE', token: sa.token });
	simpanBukti(dir, '7b_hapus_via_api', r);
	const sesudah = await minta(`${base}/api/app/finance?unitId=${B.unitId}`, { token: sb.token });
	const masihAda = (sesudah.json?.data?.transactions ?? []).some((t) => t.id === trxB.id);
	simpanBukti(dir, '7_cek_B_sesudah', sesudah);
	catat(7, 'a+b', 'Ditolak & transaksi B tetap ada', `API: HTTP ${r.status}; transaksi B #${trxB.id} masih ada: ${masihAda}; jumlah trx B sebelum ${jumlahTrxB}, sesudah ${sesudah.json?.data?.transactions?.length}`, r.status >= 400 && masihAda);
}

async function masukWeb({ email, password }) {
	const x = await minta(`${base}/auth/login?/login`, { method: 'POST', headers: { origin: base, 'x-sveltekit-action': 'true' }, body: new URLSearchParams({ username: email, password }) });
	return x.setCookie.map((s) => s.split(';')[0]).find((s) => s.startsWith('session_id=')) || null;
}

fs.writeFileSync(path.join(dir, 'ringkasan.csv'), csv(hasil, ['no', 'sub', 'status_usulan', 'hasil_aktual', 'kriteria', 'bukti']));
console.log(`\nSelesai. Bukti & ringkasan.csv ada di: ${dir}\nSkenario 4 dijalankan terpisah: node ratelimit.mjs. Skenario 3/5 butuh pemeriksaan manual tambahan; status "usulan" tetap harus Anda konfirmasi.`);
