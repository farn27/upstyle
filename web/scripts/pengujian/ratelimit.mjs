// Skenario keamanan 4 (pembatasan permintaan) → Tabel 4.7 baris 4.
// PENTING: jalankan di jendela bersih. Tunggu ≥ 15 menit sejak percobaan login terakhir dari IP ini (termasuk keamanan.mjs),
// dan JANGAN login ke Bizgrow dari IP yang sama sampai 15 menit setelah skrip ini selesai (IP & akun akan terkunci).
//   node ratelimit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { muatConfig, minta, folderBukti, simpanBukti, csv, tidur } from './lib.mjs';

const c = muatConfig(), base = c.baseUrl, A = c.tenantA;
const dir = folderBukti('keamanan');
const hasil = [];
const catat = (sub, kriteria, aktual, lulus) => { hasil.push({ no: 4, sub, status_usulan: lulus ? 'Lulus' : 'Gagal', hasil_aktual: aktual, kriteria }); console.log(`[4${sub}] ${lulus ? 'LULUS' : 'GAGAL'} — ${aktual}`); };

const web = [];
for (let i = 1; i <= 11; i++) {
	const x = await minta(`${base}/auth/login?/login`, { method: 'POST', headers: { origin: base, 'x-sveltekit-action': 'true' }, body: new URLSearchParams({ username: A.email, password: 'salah-' + i }) });
	web.push(x.json?.status ?? x.status);
	if (i === 10 || i === 11) simpanBukti(dir, `4a_percobaan_ke${i}`, x);
	await tidur(250);
}
catat('a', 'Percobaan ke-11 ditolak (429); 1–10 tidak', `status per percobaan: ${web.join(',')}`, web[10] === 429 && web.slice(0, 10).every((s) => s !== 429));

const api = [];
for (let i = 1; i <= 16; i++) {
	const x = await minta(`${base}/api/auth/login`, { method: 'POST', body: { email: A.email, password: 'salah-' + i } });
	api.push(x.status);
	if (i === 15 || i === 16) simpanBukti(dir, `4b_percobaan_ke${i}`, x);
	await tidur(250);
}
catat('b', 'Percobaan ke-16 ditolak (429); 1–15 tidak', `status per percobaan: ${api.join(',')}`, api[15] === 429 && api.slice(0, 15).every((s) => s !== 429));

fs.writeFileSync(path.join(dir, 'ringkasan-ratelimit.csv'), csv(hasil, ['no', 'sub', 'status_usulan', 'hasil_aktual', 'kriteria']));
console.log(`\nBukti: ${dir}\nJangan login dari IP ini selama 15 menit ke depan.`);
