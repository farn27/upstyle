// Menampilkan unitId & slug tiap tenant uji (untuk diisi ke config.json), dan memeriksa login, jumlah transaksi, produk.
//   node info-unit.mjs
import { muatConfig, minta, masuk } from './lib.mjs';
// Akun yang diharapkan sheet "Data Uji" (kode → nama)
const COA_DIHARAPKAN = {
	tenantA: { '1-1001': 'Kas Kasir Cafe', '1-1002': 'Bank BCA', '4-1001': 'Pendapatan Minuman & Kopi', '4-1002': 'Pendapatan Snack / Pastry', '5-1001': 'HPP Minuman', '5-1002': 'HPP Kemasan', '6-1001': 'Gaji Barista', '6-1002': 'Beban Sewa Ruko', '6-1003': 'Beban Listrik & Air' },
	tenantB: { '1-1001': 'Kas Kasir Resto', '1-1002': 'Bank BCA', '1-1100': 'Piutang Merchant (Gojek/Grab)', '4-1001': 'Pendapatan Dine-in', '4-1002': 'Pendapatan Delivery (Ojol)', '5-1001': 'HPP Makanan', '5-1002': 'HPP Minuman', '6-1001': 'Gaji Chef & Waiter', '6-1002': 'Beban Gas & Listrik', '6-1003': 'Potongan / Komisi Ojol', '6-1004': 'Beban Bensin Kendaraan' }
};
const c = muatConfig();
for (const k of ['tenantA', 'tenantB']) {
	const t = c[k];
	try {
		const { token } = await masuk(c.baseUrl, t);
		const r = await minta(`${c.baseUrl}/api/app/business`, { token });
		console.log(`\n${k} (${t.email}) — login OK`);
		for (const u of r.json?.data ?? []) {
			const f = await minta(`${c.baseUrl}/api/app/finance?unitId=${u.id}`, { token });
			const p = await minta(`${c.baseUrl}/api/app/products?unitId=${u.id}&limit=200`, { token });
			const namaProduk = (p.json?.data ?? []).map((x) => `${x.nama} (stok ${x.stok})`).join(', ');
			console.log(`  unit "${u.name}" [${u.type}]  unitId=${u.id}  slug=${u.slug}  transaksi=${f.json?.data?.transactions?.length ?? '?'}  produk=${p.json?.data?.length ?? '?'}`);
			if (namaProduk) console.log(`     produk: ${namaProduk}`);
			const co = await minta(`${c.baseUrl}/api/app/finance/coa?unitId=${u.id}`, { token });
			const ada = Object.fromEntries((co.json?.data ?? []).map((a) => [a.kodeAkun, a.namaAkun]));
			const kurang = Object.entries(COA_DIHARAPKAN[k] ?? {}).filter(([kode, nama]) => String(ada[kode] ?? '').trim().toLowerCase() !== nama.toLowerCase());
			console.log(`     COA: ${Object.keys(ada).length} akun; ` + (kurang.length ? `KURANG/BEDA: ${kurang.map(([kode, nama]) => `${kode} ${nama}${ada[kode] ? ` (di sistem: ${ada[kode]})` : ''}`).join(' | ')}` : 'semua akun sheet Data Uji ada'));
		}
	} catch (e) { console.log(`\n${k}: GAGAL — ${e.message}`); }
}
