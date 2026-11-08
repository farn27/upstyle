// Menampilkan jawaban LENGKAP dari keluaran mentah uji AI, untuk membantu penilaian manual.
//   node lihat-jawaban.mjs A06 A12 A19 A20        (semua percobaan kasus itu)
//   node lihat-jawaban.mjs A01:3                   (hanya percobaan ke-3 kasus A01)
// Membaca bukti/<tanggal>/ai/mentah-*.jsonl; bila satu kasus+percobaan ada lebih dari sekali, yang terbaru dipakai.
import fs from 'node:fs';
import path from 'node:path';
import { folderBukti } from './lib.mjs';

const dir = folderBukti('ai');
const rekam = new Map();
for (const f of fs.readdirSync(dir).filter((x) => /^mentah-.*\.jsonl$/.test(x)).sort()) {
	for (const baris of fs.readFileSync(path.join(dir, f), 'utf8').split('\n').filter(Boolean)) {
		const r = JSON.parse(baris);
		rekam.set(`${r.jenis}|${r.id}|${r.run}`, r);
	}
}
const minta = process.argv.slice(2).map((a) => { const [id, run] = a.split(':'); return { id: id.toUpperCase(), run: run ? Number(run) : null }; });
if (!minta.length) { console.error('Contoh: node lihat-jawaban.mjs A06 A12'); process.exit(1); }
const bersih = (t) => String(t ?? '').replace(/:::([a-z]+)\{([^}]*)\}:::/g, (_, tipe, isi) => `[${tipe.toUpperCase()}: ${isi}]`).trim();
for (const m of minta) {
	const baris = [...rekam.values()].filter((r) => r.id === m.id && (m.run === null || r.run === m.run)).sort((a, b) => a.run - b.run);
	if (!baris.length) { console.log(`\n=== ${m.id}: tidak ada data ===`); continue; }
	for (const r of baris) {
		const reply = r.respons?.reply ?? (typeof r.respons === 'string' ? r.respons : JSON.stringify(r.respons));
		console.log(`\n=== ${r.id} R${r.run} | ${r.ms} ms | HTTP ${r.status} ===\nPertanyaan: ${r.masukan}\nJawaban:\n${bersih(reply)}`);
		if (r.respons?.transactionPreviews) console.log(`(Sistem menghasilkan KARTU PRATINJAU TRANSAKSI: ${JSON.stringify(r.respons.transactionPreviews).slice(0, 300)})`);
	}
}
