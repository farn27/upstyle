// Memeriksa kemajuan uji AI dari keluaran mentah dan mencetak perintah untuk MELANJUTKAN yang belum selesai.
//   node status-ai.mjs
// Yang dihitung selesai: ekstraksi/akun = jalur web & HTTP 200; analitis = HTTP 200. Panggilan yang galat dianggap belum selesai.
import fs from 'node:fs';
import path from 'node:path';
import { folderBukti } from './lib.mjs';

const kasus = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, 'kasus-ai.json'), 'utf8'));
const dir = folderBukti('ai');
const selesai = { ekstraksi: new Set(), akun: new Set(), analitis: new Set() };
let jumlahBaris = 0;
for (const f of fs.readdirSync(dir).filter((x) => /^mentah-.*\.jsonl$/.test(x)).sort()) {
	for (const baris of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) {
		let r; try { r = JSON.parse(baris); } catch { continue; } // baris terakhir bisa terpotong bila PC mati
		jumlahBaris++;
		const ok = r.status === 200 && (r.jenis === 'analitis' || r.jalur === 'web');
		if (ok) selesai[r.jenis]?.add(`${r.id}|${r.run}`);
	}
}
const RUN = [1, 2, 3];
for (const jenis of ['ekstraksi', 'akun', 'analitis']) {
	const daftar = kasus[jenis];
	const target = daftar.length * RUN.length;
	const kurang = new Map(); // "1,2" -> [id, ...]
	for (const k of daftar) {
		const run = RUN.filter((n) => !selesai[jenis].has(`${k.id}|${n}`));
		if (run.length) { const key = run.join(','); kurang.set(key, [...(kurang.get(key) ?? []), k.id]); }
	}
	const ada = selesai[jenis].size;
	console.log(`\n${jenis}: ${ada}/${target} panggilan selesai${ada === target ? ' ✔ LENGKAP' : ''}`);
	for (const [run, ids] of kurang) console.log(`  belum: run ${run} → ${ids.length} kasus\n  node ai.mjs --jenis ${jenis} --run ${run} --kasus ${ids.join(',')}`);
}
console.log(`\n(${jumlahBaris} baris keluaran mentah terbaca di ${dir})`);
