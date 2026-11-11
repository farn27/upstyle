// Menyusun paket penilai kedua: 14 kasus (percobaan ke-1), berisi masukan, acuan, dan keluaran model — TANPA nilai peneliti.
//   node paket-penilai2.mjs   → bukti/<tanggal>/penilai2/paket-penilai2.html dan paket-penilai2.csv
import fs from 'node:fs';
import path from 'node:path';
import { folderBukti, csv } from './lib.mjs';

const KASUS = { ekstraksi: ['E05', 'E10', 'E15', 'E20', 'E25', 'E30'], akun: ['P05', 'P10', 'P15', 'P20'], analitis: ['A05', 'A10', 'A15', 'A20'] };
const dirAi = folderBukti('ai');
const keluar = folderBukti('penilai2');
const kasus = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'kasus-ai.json'), 'utf8'));
const acuanAn = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'acuan-analitis.json'), 'utf8'));
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

function bacaCsv(file) {
	const t = fs.readFileSync(file, 'utf8').replace(/^﻿/, ''); const rows = []; let sel = '', row = [], q = false;
	for (let i = 0; i < t.length; i++) { const ch = t[i];
		if (q) { if (ch === '"' && t[i + 1] === '"') { sel += '"'; i++; } else if (ch === '"') q = false; else sel += ch; }
		else if (ch === '"') q = true; else if (ch === ',') { row.push(sel); sel = ''; } else if (ch === '\n') { row.push(sel); rows.push(row); row = []; sel = ''; } else if (ch !== '\r') sel += ch; }
	const [j, ...isi] = rows; return isi.filter((r) => r.length > 1).map((r) => Object.fromEntries(j.map((k, i) => [k, r[i] ?? ''])));
}
// keluaran run 1 yang valid (bukan galat), yang terbaru menang
const r1 = {};
for (const jenis of ['ekstraksi', 'akun']) for (const f of fs.readdirSync(dirAi).filter((x) => new RegExp(`^${jenis}-.*\\.csv$`).test(x)).sort())
	for (const r of bacaCsv(path.join(dirAi, f))) { const ring = r.R1_ringkas; if (ring !== undefined && r.R1_ms && !String(ring).startsWith('(galat')) r1[r.id] = ring; }
const reply = {};
for (const f of fs.readdirSync(dirAi).filter((x) => /^mentah-.*\.jsonl$/.test(x)).sort())
	for (const b of fs.readFileSync(path.join(dirAi, f), 'utf8').split('\n').filter(Boolean)) { let r; try { r = JSON.parse(b); } catch { continue; } if (r.jenis === 'analitis' && r.run === 1 && r.status === 200) reply[r.id] = r.respons?.reply ?? ''; }
const bersih = (t) => String(t ?? '').replace(/:::([a-z]+)\{([^}]*)\}:::/g, (_, tp, isi) => `[kartu ${tp}: ${isi.replace(/"/g, '')}]`).trim() || '(jawaban kosong — tidak ada teks yang dikembalikan)';

const baris = [];
for (const id of KASUS.ekstraksi) { const k = kasus.ekstraksi.find((x) => x.id === id);
	baris.push({ id, jenis: 'Ekstraksi transaksi', masukan: k.masukan, acuan: `Kategori: ${k.kategori}; Produk: ${k.produk ?? '-'}; Jumlah: ${k.qty ?? '- (tidak dinilai)'}; Nominal: ${rp(k.nominal)}`, keluaran: r1[id] ? `Kategori | Produk | Jumlah | Nominal → ${r1[id]}` : '(tidak ada data)' }); }
for (const id of KASUS.akun) { const k = kasus.akun.find((x) => x.id === id);
	baris.push({ id, jenis: 'Pemetaan akun', masukan: k.masukan, acuan: `Akun transaksi: ${k.akun_kode} ${k.akun_nama}; Akun kas: ${k.kas_kode} ${k.kas_nama}`, keluaran: r1[id] ?? '(tidak ada data)' }); }
for (const id of KASUS.analitis) { const k = kasus.analitis.find((x) => x.id === id); const a = acuanAn[id] ?? {};
	baris.push({ id, jenis: 'Jawaban analitis', masukan: k.masukan, acuan: a.tidakTersedia ? 'AI harus menyatakan data tidak tersedia / tidak dapat memastikan, TANPA mengarang angka.' : `Angka yang harus muncul: ${(a.angka ?? []).map((n) => n >= 1000 ? rp(n) : n).join(', ')}`, keluaran: bersih(reply[id]) }); }

const kolom = ['id', 'jenis', 'masukan', 'acuan', 'keluaran', 'nilai_penilai_2', 'jenis_kesalahan', 'catatan'];
fs.writeFileSync(path.join(keluar, 'paket-penilai2.csv'), '﻿' + csv(baris.map((b) => ({ ...b, nilai_penilai_2: '', jenis_kesalahan: '', catatan: '' })), kolom));
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\n/g, '<br>');
const html = `<!doctype html><html lang="id"><meta charset="utf-8"><title>Paket Penilai Kedua — Evaluasi Asisten AI Bizgrow</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:6px 8px;vertical-align:top;text-align:left}th{background:#e8eef7}.kotak{background:#fff8e1;border:1px solid #e0c060;padding:10px 14px;border-radius:6px}.isi{background:#f6f6f6;min-width:120px}@media print{.kotak{break-inside:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}}</style>
<h1>Paket Penilai Kedua — Evaluasi Keluaran Asisten AI Bizgrow</h1>
<p>Anda diminta menilai <b>14 keluaran</b> asisten AI terhadap acuan yang sudah ditetapkan sebelumnya. Penilaian dilakukan <b>secara mandiri</b>: nilai dari peneliti tidak disertakan.</p>
<div class="kotak"><b>Rubrik penilaian (tiga kategori)</b><ul>
<li><b>Sesuai</b> — seluruh elemen yang dinilai sama dengan acuan.</li>
<li><b>Sesuai sebagian</b> — sebagian elemen benar, sebagian salah atau kurang.</li>
<li><b>Tidak sesuai</b> — elemen utama salah atau tidak dihasilkan.</li></ul>
<b>Elemen yang dinilai:</b> ekstraksi = kategori, produk, jumlah, nominal (untuk pengeluaran, jumlah tidak dinilai); pemetaan akun = akun transaksi dan akun kas (keduanya benar = Sesuai, satu benar = Sesuai sebagian); analitis = angka yang disebut harus sama dengan acuan, dan penjelasan narasinya harus sesuai dengan angka itu.<br>
<b>Jenis kesalahan (bila tidak Sesuai):</b> salah kategori, salah produk, salah jumlah, salah nominal, salah akun, angka tidak sesuai data, mengarang data yang tidak tersedia, tidak ada keluaran/error, lainnya.</div>
<table><tr><th>ID</th><th>Jenis</th><th>Masukan</th><th>Acuan</th><th>Keluaran model</th><th class="isi">Nilai Anda</th><th class="isi">Jenis kesalahan</th></tr>
${baris.map((b) => `<tr><td>${b.id}</td><td>${esc(b.jenis)}</td><td>${esc(b.masukan)}</td><td>${esc(b.acuan)}</td><td>${esc(b.keluaran)}</td><td class="isi"></td><td class="isi"></td></tr>`).join('\n')}</table>
<p>Nama penilai: ______________________ &nbsp; Peran: ______________________ &nbsp; Tanggal: ______________</p></html>`;
fs.writeFileSync(path.join(keluar, 'paket-penilai2.html'), html);
console.log(`Paket dibuat (${baris.length} kasus):\n  ${path.join(keluar, 'paket-penilai2.html')}  (buka di browser / cetak ke PDF)\n  ${path.join(keluar, 'paket-penilai2.csv')}  (untuk diisi di Excel)`);
if (baris.some((b) => b.keluaran === '(tidak ada data)')) console.log('PERINGATAN: ada kasus tanpa data keluaran.');
