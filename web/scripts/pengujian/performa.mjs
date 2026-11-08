// Pengujian realtime & performa (Tabel 4.8).
//   node performa.mjs pos   : (config: socketUrl) waktu dari permintaan bayar (POS checkout) sampai event 'pos-transaction' diterima klien Socket.io
//   node performa.mjs stok  : waktu respons GET /api/low-stock (pengganti "peringatan stok realtime", lihat PANDUAN)
// Satu mesin = satu jam, jadi tidak ada selisih jam antarperangkat. Untuk kondisi "HP → laptop", ukur manual (video layar) dan tulis di Catatan.
import fs from 'node:fs';
import path from 'node:path';
import { io } from 'socket.io-client';
import { muatConfig, minta, masuk, folderBukti, csv, tidur, statistik } from './lib.mjs';

const mode = process.argv[2] || 'pos';
const c = muatConfig();
const base = c.baseUrl, A = c.tenantA, P = c.performa ?? {};
const n = P.percobaan ?? 20, jeda = P.jedaMs ?? 3000;
const dir = folderBukti('performa');
const { token } = await masuk(base, A);
const baris = [];

if (mode === 'pos') {
	// Token & alamat socket persis seperti dasbor web: /api/socket-token (token) + alamat VPS Socket.io (PUBLIC_SOCKET_URL) dari config.
	const rt = await minta(`${base}/api/socket-token?unitId=${A.unitId}`, { token });
	const st = rt.json?.token;
	const socketUrl = c.socketUrl;
	if (!socketUrl || !st) { console.error('Isi "socketUrl" di config.json (alamat VPS Socket.io = nilai PUBLIC_SOCKET_URL) dan pastikan /api/socket-token memberi token:', rt.status, rt.teks.slice(0, 200)); process.exit(1); }
	const sock = io(socketUrl, { auth: { token: st }, transports: ['websocket'] });
	await new Promise((ok, gagal) => { sock.on('connected', ok); sock.on('connect_error', gagal); setTimeout(() => gagal(new Error('timeout konek socket')), 15000); });
	console.log('Socket terhubung ke', socketUrl);
	const menunggu = new Map();
	sock.on('pos-transaction', (d) => { const w = menunggu.get(String(d.orderNumber)); if (w) { w(performance.now()); menunggu.delete(String(d.orderNumber)); } });

	// harga & nama produk dari server (harga kiriman app hanya dipakai bila fitur harga bebas aktif)
	const prod = await minta(`${base}/api/app/products?unitId=${A.unitId}&limit=200`, { token });
	let p = (prod.json?.data ?? []).find((x) => String(x.id) === String(P.produkId));
	if (!p && P.nama && P.hargaJual) p = { id: P.produkId, nama: P.nama, hargaJual: P.hargaJual }; // cadangan bila daftar produk tidak terbaca
	if (!p) { console.error('performa.produkId tidak ditemukan di Tenant A (isi juga performa.nama & performa.hargaJual bila perlu)'); process.exit(1); }
	for (let i = 1; i <= n; i++) {
		const orderNumber = `UJI-${Date.now()}-${i}`;
		const total = Number(p.hargaJual);
		const tunggu = new Promise((ok) => { menunggu.set(orderNumber, ok); setTimeout(() => { if (menunggu.delete(orderNumber)) ok(null); }, 10000); });
		const t0 = performance.now();
		const r = await minta(`${base}/api/app/pos`, { method: 'POST', token, body: { action: 'checkout', order: { orderNumber, unitId: A.unitId, subtotal: total, total, paymentMethod: 'CASH', amountPaid: total, changeAmount: 0, items: [{ productId: String(p.id), productName: p.nama, qty: 1, price: total }] } } });
		const t1 = await tunggu;
		const ok = r.json?.success === true;
		baris.push({ percobaan: i, event_pos_ms: ok && t1 ? Math.round(t1 - t0) : '', api_ms: r.ms, status_http: r.status, catatan: !ok ? `checkout gagal: ${r.json?.message ?? r.galat}` : !t1 ? 'event tidak diterima <10 dtk' : '' });
		console.log(`#${i}: event ${t1 ? Math.round(t1 - t0) + ' ms' : '—'} (API ${r.ms} ms, HTTP ${r.status}) ${baris.at(-1).catatan}`);
		await tidur(jeda);
	}
	sock.close();
} else if (mode === 'stok') {
	for (let i = 1; i <= n; i++) {
		const r = await minta(`${base}/api/low-stock?unitId=${A.unitId}`, { token });
		baris.push({ percobaan: i, stok_ms: r.status === 200 ? r.ms : '', status_http: r.status, catatan: r.status === 200 ? `${(r.json?.data ?? r.json?.products ?? []).length ?? ''} item` : 'gagal' });
		console.log(`#${i}: ${r.ms} ms HTTP ${r.status}`);
		await tidur(500);
	}
}
const kolom = mode === 'pos' ? ['percobaan', 'event_pos_ms', 'api_ms', 'status_http', 'catatan'] : ['percobaan', 'stok_ms', 'status_http', 'catatan'];
fs.writeFileSync(path.join(dir, `${mode}.csv`), csv(baris, kolom));
const s = statistik(baris.map((b) => Number(mode === 'pos' ? b.event_pos_ms : b.stok_ms)).filter((x) => !Number.isNaN(x) && x !== 0));
fs.writeFileSync(path.join(dir, `${mode}-statistik.json`), JSON.stringify({ ...s, kondisi: `isi manual: jaringan, perangkat, lokasi; klien Node ${process.version} pada mesin yang sama` }, null, 2));
console.log(`\nn=${s.n}  min=${s.min}  median=${s.median}  maks=${s.maks} (ms)\nBerkas: ${dir}`);
