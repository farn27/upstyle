// Menyiapkan riwayat transaksi sintetis Tenant A untuk 2 bulan sebelum bulan pengujian (bulan berjalan sudah terisi oleh uji performa/fungsional).
// Transaksi dicatat lewat API biasa (jurnal ikut terbentuk), lalu tanggalnya digeser dengan SQL yang dihasilkan skrip ini.
//   node seed-uji.mjs --kering     : hanya menampilkan rencana & total
//   node seed-uji.mjs              : mencatat transaksi lewat API → menulis seed-uji-tanggal.sql
// Jalankan SQL-nya di MySQL (hanya UPDATE pada id transaksi yang dibuat skrip ini).
import fs from 'node:fs';
import path from 'node:path';
import { muatConfig, minta, masuk, folderBukti, tidur } from './lib.mjs';

const kering = process.argv.includes('--kering');
const wib = new Date(Date.now() + 7 * 3600e3);
const geser = (n) => { const d = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth() - n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }; };
const pad = (n) => String(n).padStart(2, '0');

// kode akun → peran. MASUK: 4-1001, kas 1-1001 (tunai) / 1-1002 (QRIS/transfer). KELUAR: akun beban/HPP, kas 1-1001.
const MASUK_OKT = [[2, 480000, 'K'], [4, 520000, 'K'], [6, 395000, 'B'], [8, 610000, 'K'], [10, 450000, 'K'], [12, 705000, 'B'], [15, 540000, 'K'], [17, 380000, 'K'], [20, 660000, 'B'], [22, 490000, 'K'], [25, 575000, 'K'], [27, 430000, 'B']];
const KELUAR_OKT = [[3, 18000, '5-1001', 'Beli gula pasir'], [7, 28000, '5-1002', 'Beli cup 16oz 1 pak'], [11, 40000, '5-1001', 'Beli teh hitam 1 kg'], [14, 500000, '6-1002', 'Bayar sewa tempat bulan ini'], [19, 120000, '6-1003', 'Bayar listrik'], [24, 300000, '6-1001', 'Gaji karyawan part time']];
const MASUK_SEP = [[3, 420000, 'K'], [6, 510000, 'K'], [9, 365000, 'B'], [12, 590000, 'K'], [15, 470000, 'K'], [18, 640000, 'B'], [21, 405000, 'K'], [24, 555000, 'K'], [27, 445000, 'B']];
const KELUAR_SEP = [[4, 18000, '5-1001', 'Beli gula pasir'], [10, 28000, '5-1002', 'Beli cup 16oz 1 pak'], [16, 500000, '6-1002', 'Bayar sewa tempat bulan ini'], [20, 110000, '6-1003', 'Bayar listrik'], [25, 300000, '6-1001', 'Gaji karyawan part time']];

const rencana = [];
for (const [n, masukList, keluarList] of [[1, MASUK_OKT, KELUAR_OKT], [2, MASUK_SEP, KELUAR_SEP]]) {
	const { y, m } = geser(n);
	masukList.forEach(([hari, nominal, kas], i) => rencana.push({ y, m, hari, kategori: 'MASUK', nominal, coa: '4-1001', kas: kas === 'K' ? '1-1001' : '1-1002', ket: `Penjualan harian ${pad(hari)}/${pad(m)}`, jam: `${pad(9 + (i % 8))}:${pad(10 + i)}:00` }));
	keluarList.forEach(([hari, nominal, coa, ket], i) => rencana.push({ y, m, hari, kategori: 'KELUAR', nominal, coa, kas: '1-1001', ket, jam: `${pad(8 + i)}:${pad(30 + i)}:00` }));
}
const ringkasan = {};
for (const t of rencana) { const k = `${t.y}-${pad(t.m)}`; ringkasan[k] ??= { masuk: 0, keluar: 0, jumlah: 0 }; ringkasan[k][t.kategori === 'MASUK' ? 'masuk' : 'keluar'] += t.nominal; ringkasan[k].jumlah++; }
console.log('Rencana data sintetis (hanya bulan sebelum bulan pengujian):');
for (const [k, v] of Object.entries(ringkasan)) console.log(`  ${k}: ${v.jumlah} transaksi, masuk Rp${v.masuk.toLocaleString('id-ID')}, keluar Rp${v.keluar.toLocaleString('id-ID')}`);
if (kering) process.exit(0);

const c = muatConfig(), A = c.tenantA;
const dir = folderBukti('seed');
const penanda = path.join(dir, 'seed-uji.selesai.json');
if (fs.existsSync(penanda) && !process.argv.includes('--paksa')) { console.error('Seed sudah pernah dijalankan hari ini (', penanda, '). Tambahkan --paksa hanya bila yakin.'); process.exit(1); }
const { token } = await masuk(c.baseUrl, A);
const coa = await minta(`${c.baseUrl}/api/app/finance/coa?unitId=${A.unitId}`, { token });
const idAkun = Object.fromEntries((coa.json?.data ?? []).map((a) => [a.kodeAkun, a.id]));
for (const t of rencana) for (const kode of [t.coa, t.kas]) if (!idAkun[kode]) { console.error(`Akun ${kode} tidak ada di Tenant A. Jalankan node info-unit.mjs.`); process.exit(1); }

const sql = ['-- Menggeser tanggal transaksi sintetis Tenant A (unit ' + A.unitId + '). Jalankan di database aplikasi.', 'START TRANSACTION;'];
const dibuat = [];
for (const [i, t] of rencana.entries()) {
	const r = await minta(`${c.baseUrl}/api/app/finance`, { method: 'POST', token, body: { transaction: { unitId: A.unitId, kategoriTrx: t.kategori, nominal: t.nominal, keterangan: t.ket, metodeBayar: 'KAS', coaId: idAkun[t.coa], kasCoaId: idAkun[t.kas] } } });
	const id = r.json?.data?.id;
	if (r.status !== 200 || !id) { console.error(`Transaksi ${i + 1} gagal (HTTP ${r.status}): ${r.json?.message ?? r.galat}. Dihentikan; yang sudah dibuat tercatat di ${penanda}.`); fs.writeFileSync(penanda, JSON.stringify({ sebagian: true, dibuat }, null, 1)); sql.push('-- (sebagian) skrip dihentikan karena galat'); break; }
	dibuat.push(id);
	const tgl = `${t.y}-${pad(t.m)}-${pad(t.hari)}`;
	sql.push(`UPDATE transaksi SET tanggal='${tgl} ${t.jam}' WHERE id=${id} AND unit_id=${A.unitId};`);
	sql.push(`UPDATE journal_entries SET tanggal='${tgl}' WHERE source_type='TRX' AND source_id='${id}' AND unit_id=${A.unitId};`);
	console.log(`#${i + 1}/${rencana.length} ${t.kategori} Rp${t.nominal.toLocaleString('id-ID')} → id ${id} (akan jadi ${tgl})`);
	await tidur(400);
}
sql.push('COMMIT;', '', '-- Pemeriksaan:', `SELECT DATE_FORMAT(tanggal,'%Y-%m') bulan, kategori_trx, COUNT(*) jumlah, SUM(nominal) total FROM transaksi WHERE unit_id=${A.unitId} GROUP BY bulan, kategori_trx ORDER BY bulan, kategori_trx;`);
fs.writeFileSync(path.join(dir, 'seed-uji-tanggal.sql'), sql.join('\n') + '\n');
fs.writeFileSync(path.join(dir, 'seed-ringkasan.json'), JSON.stringify(ringkasan, null, 1));
fs.writeFileSync(penanda, JSON.stringify({ selesai: true, dibuat }, null, 1));
console.log(`\nSelesai: ${dibuat.length} transaksi dicatat. SQL penggeser tanggal: ${path.join(dir, 'seed-uji-tanggal.sql')}`);
