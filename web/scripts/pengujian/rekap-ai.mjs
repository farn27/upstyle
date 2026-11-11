// Merekap hasil uji AI untuk Tabel 4.9 (akurasi per kategori), 4.10 (jenis kesalahan), konsistensi, dan waktu respons.
//   node rekap-ai.mjs
// Sumber: bukti/<tanggal>/ai/<jenis>-*.csv (baris galat "(galat …" dilewati). Untuk analitis, nilai peneliti boleh menimpa usulan skrip
// lewat berkas penilaian-analitis.json: { "A19|3": { "nilai": "Sesuai", "salah": "", "catatan": "…" }, … }
import fs from 'node:fs';
import path from 'node:path';
import { folderBukti, statistik } from './lib.mjs';

const dir = folderBukti('ai');
function bacaCsv(file) {
	const t = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
	const baris = []; let sel = '', row = [], q = false;
	for (let i = 0; i < t.length; i++) {
		const ch = t[i];
		if (q) { if (ch === '"' && t[i + 1] === '"') { sel += '"'; i++; } else if (ch === '"') q = false; else sel += ch; }
		else if (ch === '"') q = true; else if (ch === ',') { row.push(sel); sel = ''; } else if (ch === '\n') { row.push(sel); baris.push(row); row = []; sel = ''; } else if (ch !== '\r') sel += ch;
	}
	if (sel || row.length) { row.push(sel); baris.push(row); }
	const [judul, ...isi] = baris;
	return isi.filter((r) => r.length > 1).map((r) => Object.fromEntries(judul.map((j, i) => [j, r[i] ?? ''])));
}
const penimpaFile = path.resolve(import.meta.dirname, 'penilaian-analitis.json');
const penimpa = fs.existsSync(penimpaFile) ? JSON.parse(fs.readFileSync(penimpaFile, 'utf8')) : {};

const laporan = [];
const semuaWaktu = [];
for (const jenis of ['ekstraksi', 'akun', 'analitis']) {
	const berkas = fs.readdirSync(dir).filter((f) => new RegExp(`^${jenis}-.*\\.csv$`).test(f)).sort();
	const data = new Map(); // "id|run" -> { nilai, salah, ms }
	for (const f of berkas) for (const r of bacaCsv(path.join(dir, f))) for (const run of [1, 2, 3]) {
		const ring = r[`R${run}_ringkas`], msKolom = r[`R${run}_ms`];
		// Panggilan dianggap terjadi bila kolom waktu terisi. Ringkasan boleh kosong (jawaban kosong adalah hasil sah: Tidak sesuai); baris galat dilewati.
		if (ring === undefined || msKolom === undefined || msKolom === '' || String(ring).startsWith('(galat')) continue;
		data.set(`${r.id}|${run}`, { id: r.id, run, nilai: r[`R${run}_nilai`], salah: r[`R${run}_salah`], ms: Number(r[`R${run}_ms`]) });
	}
	let tanpaNilai = 0;
	for (const [k, v] of data) {
		const o = penimpa[k]; if (o) { v.nilai = o.nilai ?? v.nilai; v.salah = o.salah ?? v.salah; v.dioverride = true; }
		if (!v.nilai) tanpaNilai++;
	}
	const daftar = [...data.values()];
	const hit = (n) => daftar.filter((v) => v.nilai === n).length;
	const sesuai = hit('Sesuai'), sebagian = hit('Sesuai sebagian'), tidak = hit('Tidak sesuai');
	const salah = {};
	for (const v of daftar.filter((x) => x.nilai !== 'Sesuai' && x.salah)) for (const s of String(v.salah).split(';').map((x) => x.trim()).filter(Boolean)) { salah[s] ??= { jumlah: 0, kasus: new Set() }; salah[s].jumlah++; salah[s].kasus.add(`${v.id} R${v.run}`); }
	const perKasus = new Map(); for (const v of daftar) perKasus.set(v.id, [...(perKasus.get(v.id) ?? []), v.nilai]);
	const konsisten = [...perKasus.values()].filter((n) => n.length === 3 && new Set(n).size === 1).length;
	const waktu = statistik(daftar.map((v) => v.ms));
	semuaWaktu.push(...daftar.map((v) => v.ms));
	laporan.push({ jenis, kasus: perKasus.size, keluaran: daftar.length, sesuai, sebagian, tidak, akurasi: daftar.length ? +(100 * sesuai / daftar.length).toFixed(1) : null, konsisten, waktu, salah: Object.fromEntries(Object.entries(salah).map(([s, v]) => [s, { jumlah: v.jumlah, contoh: [...v.kasus].slice(0, 6).join(', ') }])), tanpaNilai, dioverride: daftar.filter((v) => v.dioverride).length });
}
const gabung = statistik(semuaWaktu);
const baris = [];
baris.push('REKAP EVALUASI AI (untuk Tabel 4.9, 4.10, dan baris "Respons asisten AI" Tabel 4.8)\n');
baris.push('Kategori | Kasus | Keluaran dinilai | Sesuai | Sesuai sebagian | Tidak sesuai | Akurasi % | Kasus konsisten (3 run sama) | Waktu ms min/median/maks');
for (const l of laporan) baris.push(`${l.jenis} | ${l.kasus} | ${l.keluaran} | ${l.sesuai} | ${l.sebagian} | ${l.tidak} | ${l.akurasi} | ${l.konsisten}/${l.kasus} | ${l.waktu.min}/${l.waktu.median}/${l.waktu.maks}`);
baris.push(`\nWaktu respons seluruh panggilan AI (n=${gabung.n}): min ${gabung.min} / median ${gabung.median} / maks ${gabung.maks} ms`);
baris.push('\nJENIS KESALAHAN (Tabel 4.10):');
for (const l of laporan) { baris.push(`- ${l.jenis}:`); const e = Object.entries(l.salah); if (!e.length) baris.push('    (tidak ada)'); for (const [s, v] of e) baris.push(`    ${s}: ${v.jumlah}  contoh: ${v.contoh}`); }
for (const l of laporan) if (l.tanpaNilai) baris.push(`\nPERINGATAN: ${l.jenis} memiliki ${l.tanpaNilai} keluaran tanpa nilai (belum dinilai). Untuk analitis, isi penilaian-analitis.json.`);
for (const l of laporan) if (l.dioverride) baris.push(`Catatan: ${l.dioverride} nilai ${l.jenis} berasal dari penilaian peneliti (penilaian-analitis.json), bukan usulan skrip.`);
const teks = baris.join('\n');
console.log(teks);
fs.writeFileSync(path.join(dir, 'rekap-ai.txt'), teks + '\n');
fs.writeFileSync(path.join(dir, 'rekap-ai.json'), JSON.stringify({ laporan, gabung }, null, 1));
console.log(`\nTersimpan: ${path.join(dir, 'rekap-ai.txt')}`);
