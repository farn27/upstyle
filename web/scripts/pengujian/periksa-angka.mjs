// Menandai angka di jawaban AI analitis yang TIDAK ada pada acuan (mis. persentase turunan) untuk dihitung ulang manual.
//   node periksa-angka.mjs
import fs from 'node:fs';
import path from 'node:path';
import { folderBukti } from './lib.mjs';
import { angkaDalamTeks } from './nilai.mjs';

const dir = folderBukti('ai');
const acuan = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'acuan-analitis.json'), 'utf8'));
const rekam = new Map();
for (const f of fs.readdirSync(dir).filter((x) => /^mentah-.*\.jsonl$/.test(x)).sort())
	for (const b of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(b); if (r.jenis === 'analitis') rekam.set(`${r.id}|${r.run}`, r); }

const tanpaTautan = (t) => String(t).replace(/\]\([^)]*\)/g, ']').replace(/\/finance\/[^\s)]*/g, '');
let ditandai = 0;
for (const r of [...rekam.values()].sort((a, b) => a.id.localeCompare(b.id) || a.run - b.run)) {
	const teks = tanpaTautan(r.respons?.reply ?? '');
	const angkaAcuan = acuan[r.id]?.angka ?? [];
	const persen = [...teks.matchAll(/(-?\d+(?:[.,]\d+)?)\s?%/g)].map((m) => `${m[1]}%`);
	const sisa = angkaDalamTeks(teks).filter((n) => n >= 0 && !angkaAcuan.some((a) => Math.abs(a - n) < 0.5))
		.filter((n) => ![2026, 2025].includes(n) && n > 31); // abaikan tahun & tanggal/bulan
	const kecil = angkaAcuan.length ? [] : angkaDalamTeks(teks).filter((n) => n !== 2026 && n > 0);
	const semua = [...new Set([...persen, ...sisa.map(String), ...kecil.map(String)])];
	if (semua.length) { ditandai++; console.log(`${r.id} R${r.run}: angka di luar acuan → ${semua.join(', ')}`); }
}
console.log(`\n${ditandai} jawaban memuat angka di luar acuan (periksa hitungannya manual). Jawaban yang tidak tercantum hanya memuat angka acuan.`);
