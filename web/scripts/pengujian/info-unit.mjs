// Menampilkan unitId & slug tiap tenant uji (untuk diisi ke config.json), dan memeriksa login, jumlah transaksi, produk.
//   node info-unit.mjs
import { muatConfig, minta, masuk } from './lib.mjs';
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
			console.log(`  unit "${u.name}" [${u.type}]  unitId=${u.id}  slug=${u.slug}  transaksi=${f.json?.data?.transactions?.length ?? '?'}  produk=${p.json?.data?.length ?? '?'}`);
		}
	} catch (e) { console.log(`\n${k}: GAGAL — ${e.message}`); }
}
