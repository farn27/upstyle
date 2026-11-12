/**
 * Analisis Cerdas dasbor: mengambil data unit, menjalankan mesin statistik ($lib/analitik/statistik),
 * dan menyusun wawasan + rekomendasi dalam bahasa sehari-hari. Tanpa model bahasa → 0 token.
 * Hasil di-cache per sidik data (berubah begitu ada transaksi/stok baru).
 */
import { db } from '$lib/server/drizzle';
import { and, eq, gte, inArray, isNull, lt, sql, desc } from 'drizzle-orm';
import { transaksi, products, receivables } from '$lib/server/schema';
import { kalender, geserHari } from '$lib/server/chatKonteks';
import { angkaSaldoKas, prediksiHabis, rp } from '$lib/server/chatData';
import { kunciCache, ambilCache, simpanCache } from '$lib/server/aiCache';
import { targetBulananOtomatis } from '$lib/financeDashboard';
import { ramalkan, ujiBalik, deteksiAnomali, polaHari, analisisABC, skorKesehatan, regresiLinier, rata, simpanganBaku, jumlah, perubahan } from '$lib/analitik/statistik';

const HARI_RIWAYAT = 120;
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const tgl = (/** @type {string} */ d) => `${Number(d.slice(8))} ${BULAN[Number(d.slice(5, 7)) - 1]}`;
const namaHari = (/** @type {string} */ d) => HARI[new Date(d + 'T00:00:00Z').getUTCDay()];
const pct = (/** @type {number} */ x) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)}%`;

/** @typedef {{ id: number, nama_unit?: string, namaUnit?: string, slug: string, modal_awal?: unknown, modalAwal?: unknown }} UnitMasuk */
/** @typedef {{ tipe: 'bahaya' | 'peringatan' | 'baik' | 'info', judul: string, isi: string, aksi?: string, prioritas: number }} Wawasan */

/**
 * @param {UnitMasuk} unitMasuk
 * @param {{ sekarang?: Date, pakaiCache?: boolean }} [opsi]
 */
export async function analisisUnit(unitMasuk, opsi = {}) {
	const unit = { id: unitMasuk.id, nama_unit: String(unitMasuk.nama_unit ?? unitMasuk.namaUnit ?? ''), slug: unitMasuk.slug, modal_awal: unitMasuk.modal_awal ?? unitMasuk.modalAwal, kategori: null };
	const kal = kalender(opsi.sekarang);

	// Sidik data murah → kunci cache; hasil dihitung ulang hanya bila data berubah
	const [sidik] = await db
		.select({ n: sql`COUNT(*)`, maks: sql`COALESCE(MAX(${transaksi.id}), 0)`, total: sql`COALESCE(SUM(${transaksi.nominal}), 0)` })
		.from(transaksi)
		.where(eq(transaksi.unitId, unit.id));
	const [sidikStok] = await db.select({ n: sql`COUNT(*)`, stok: sql`COALESCE(SUM(${products.stok}), 0)` }).from(products).where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)));
	const kunci = kunciCache({ jenis: 'analitik-v2', unit: unit.id, hari: kal.hariIni, jam: kal.jam.slice(0, 2), sidik, sidikStok, modal: String(unit.modal_awal) });
	if (opsi.pakaiCache !== false) {
		const ada = await ambilCache(kunci);
		if (ada) return { ...JSON.parse(ada), dariCache: true };
	}
	const hasil = await hitung(unit, kal);
	await simpanCache(kunci, JSON.stringify(hasil), 15 * 60);
	return { ...hasil, dariCache: false };
}

/**
 * @param {{ id: number, nama_unit: string, slug: string, modal_awal: unknown, kategori: null }} unit
 * @param {ReturnType<typeof kalender>} kal
 */
async function hitung(unit, kal) {
	const kondisi = eq(transaksi.unitId, unit.id);
	const mulai = geserHari(kal.hariIni, -HARI_RIWAYAT);
	const d14 = geserHari(kal.hariIni, -14);
	const d28 = geserHari(kal.hariIni, -28);
	const d30 = geserHari(kal.hariIni, -30);
	const d60 = geserHari(kal.hariIni, -60);
	const d90 = geserHari(kal.hariIni, -90);
	const hariExpr = sql`DATE(${transaksi.tanggal})`;
	const antara = (/** @type {string} */ a, /** @type {string} */ b) => sql`${transaksi.tanggal} >= ${a + ' 00:00:00'} AND ${transaksi.tanggal} < ${b + ' 00:00:00'}`;

	const [harian, daftarProduk, jualProduk, saldo, piutang] = await Promise.all([
		db
			.select({
				hari: hariExpr,
				masuk: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
				keluar: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)`,
				n: sql`COUNT(*)`
			})
			.from(transaksi)
			.where(and(kondisi, gte(transaksi.tanggal, mulai + ' 00:00:00')))
			.groupBy(hariExpr),
		db
			.select({ id: products.id, nama: products.nama, stok: products.stok, minStok: products.minStok, hargaJual: products.hargaJual, hargaBeli: products.hargaBeli })
			.from(products)
			.where(and(eq(products.unitId, unit.id), isNull(products.deletedAt)))
			.limit(500),
		db
			.select({
				id: transaksi.productId,
				q14: sql`COALESCE(SUM(CASE WHEN ${antara(d14, kal.besok)} THEN COALESCE(${transaksi.qty}, 1) ELSE 0 END), 0)`,
				q14lalu: sql`COALESCE(SUM(CASE WHEN ${antara(d28, d14)} THEN COALESCE(${transaksi.qty}, 1) ELSE 0 END), 0)`,
				q30: sql`COALESCE(SUM(CASE WHEN ${antara(d30, kal.besok)} THEN COALESCE(${transaksi.qty}, 1) ELSE 0 END), 0)`,
				rp90: sql`COALESCE(SUM(${transaksi.nominal}), 0)`
			})
			.from(transaksi)
			.where(and(kondisi, eq(transaksi.kategoriTrx, 'MASUK'), sql`${transaksi.productId} IS NOT NULL`, gte(transaksi.tanggal, d90 + ' 00:00:00')))
			.groupBy(transaksi.productId),
		angkaSaldoKas(/** @type {any} */ (unit)),
		db
			.select({
				semua: sql`COUNT(*)`,
				lewat: sql`COALESCE(SUM(CASE WHEN ${receivables.jatuhTempo} < ${kal.hariIni} AND ${receivables.status} IN ('BELUM_BAYAR','SEBAGIAN') THEN ${receivables.nominal} - COALESCE(${receivables.sudahDibayar}, 0) ELSE 0 END), 0)`,
				nLewat: sql`COALESCE(SUM(CASE WHEN ${receivables.jatuhTempo} < ${kal.hariIni} AND ${receivables.status} IN ('BELUM_BAYAR','SEBAGIAN') THEN 1 ELSE 0 END), 0)`
			})
			.from(receivables)
			.where(eq(receivables.unitId, unit.id))
	]);

	// ── Deret harian lengkap (hari tanpa transaksi = 0) sampai KEMARIN (hari penuh) ──
	const peta = new Map(harian.map((h) => [String(h.hari).slice(0, 10), h]));
	const pertama = harian.length ? harian.map((h) => String(h.hari).slice(0, 10)).sort()[0] : kal.hariIni;
	const awalDeret = pertama > mulai ? pertama : mulai;
	/** @type {string[]} */
	const tanggal = [];
	for (let d = awalDeret; d < kal.hariIni; d = geserHari(d, 1)) tanggal.push(d);
	const masuk = tanggal.map((d) => Number(peta.get(d)?.masuk || 0));
	const keluar = tanggal.map((d) => Number(peta.get(d)?.keluar || 0));
	const hariIni = peta.get(kal.hariIni);
	const masukHariIni = Number(hariIni?.masuk || 0);
	const adaData = jumlah(masuk) + jumlah(keluar) > 0;

	// ── Peramalan omzet ──
	const sisaBulan = new Date(Date.UTC(kal.y, kal.m0 + 1, 0)).getUTCDate() - kal.d + 1; // termasuk hari ini
	const horizon = Math.max(7, sisaBulan);
	const prediksi = ramalkan(masuk, horizon);
	const uji = ujiBalik(masuk, 7);
	const awalBulanIdx = tanggal.indexOf(kal.awalBulan);
	const aktualBulanIni = awalBulanIdx >= 0 ? jumlah(masuk.slice(awalBulanIdx)) : 0; // s/d kemarin
	const keHari = (/** @type {number} */ h) => geserHari(kal.hariIni, h);
	const sisa = prediksi.ramalan.slice(0, sisaBulan);
	const sigmaH = prediksi.ramalan.slice(0, sisaBulan).map((_, h) => (prediksi.atas[h] - prediksi.bawah[h]) / 2 / 1.28);
	// Kisaran statistik (residu) diperlebar bila uji balik menunjukkan galat lebih besar — supaya jujur
	const setengahStat = 1.28 * Math.sqrt(jumlah(sigmaH.map((s) => s * s)));
	const setengah = Math.max(setengahStat, (uji.wape || 0) * jumlah(sisa) * 0.6);
	// hari ini: pakai yang lebih besar antara ramalan dan yang sudah tercatat
	const ramalHariIni = Math.max(sisa[0] || 0, masukHariIni);
	const ribu = (/** @type {number} */ x) => Math.round(x / 1000) * 1000;
	const akhirBulan = ribu(aktualBulanIni + ramalHariIni + jumlah(sisa.slice(1)));
	const keluar30 = jumlah(keluar.slice(-30));
	const keluarBulanIni = awalBulanIdx >= 0 ? jumlah(keluar.slice(awalBulanIdx)) + Number(hariIni?.keluar || 0) : Number(hariIni?.keluar || 0);
	const keluarAkhirBulan = keluarBulanIni + (keluar30 / 30) * (sisaBulan - 1);
	const target = targetBulananOtomatis(/** @type {any} */ (unit.modal_awal));
	const awalBulanLalu = new Date(Date.UTC(kal.y, kal.m0 - 1, 1)).toISOString().slice(0, 10);
	const bulanLalu = tanggal.reduce((s, d, i) => (d >= awalBulanLalu && d < kal.awalBulan ? s + masuk[i] : s), 0);

	// ── Pola, tren, anomali ──
	const pola = polaHari(masuk.slice(-56), tanggal.slice(-56));
	const polaValid = pola.filter((p) => p.sampel >= 3 && p.rata > 0);
	const teramai = [...polaValid].sort((a, b) => b.rata - a.rata)[0] || null;
	const tersepi = [...polaValid].sort((a, b) => a.rata - b.rata)[0] || null;
	const m28 = masuk.slice(-28);
	const reg = regresiLinier(m28);
	const trenMingguan = rata(m28) > 0 ? (reg.b * 7) / rata(m28) : 0;
	const cvHarian = m28.filter((v) => v > 0).length >= 10 ? simpanganBaku(m28) / Math.max(1, rata(m28)) : null;
	// Kepadatan pencatatan: berapa persen hari (8 minggu terakhir) yang punya pemasukan.
	// Usaha yang tidak mencatat setiap hari punya banyak "hari nol" yang wajar → jangan dianggap anomali.
	const jendela56 = masuk.slice(-56);
	const kepadatan = jendela56.length ? jendela56.filter((v) => v > 0).length / jendela56.length : 0;
	const minimalAnomali = Math.max(50_000, rata(masuk.slice(-56)) * 0.3);
	const anomaliMasuk = kepadatan >= 0.6
		? deteksiAnomali(masuk, tanggal, { periksa: 14, ambangZ: 3, minimal: minimalAnomali }).filter((a) => a.normal > 0)
		: [];
	// Pengeluaran wajar tidak rutin (sewa, belanja bulanan): tandai hanya bila ≥ 1,25× pengeluaran harian
	// terbesar 8 minggu sebelumnya dan ≥ 3× rata-rata hari berpengeluaran.
	/** @type {{ tanggal: string, nilai: number, normal: number, z: number, arah: 'naik' }[]} */
	const anomaliKeluar = [];
	for (let i = Math.max(56, keluar.length - 14); i < keluar.length; i++) {
		const sebelum = keluar.slice(i - 56, i);
		const maks = Math.max(...sebelum);
		const biasa = rata(sebelum.filter((v) => v > 0));
		if (maks > 0 && keluar[i] >= maks * 1.25 && keluar[i] >= biasa * 3 && keluar[i] - maks >= 100_000) {
			anomaliKeluar.push({ tanggal: tanggal[i], nilai: keluar[i], normal: biasa, z: keluar[i] / maks, arah: 'naik' });
		}
	}
	anomaliKeluar.sort((a, b) => b.z - a.z);

	// Penyebab anomali pengeluaran: keterangan terbesar pada hari itu
	/** @type {Map<string, string>} */
	const penyebab = new Map();
	if (anomaliKeluar.length) {
		const hariAnomali = anomaliKeluar.slice(0, 3).map((a) => a.tanggal);
		const rows = await db
			.select({ hari: hariExpr, ket: transaksi.keterangan, nominal: transaksi.nominal })
			.from(transaksi)
			.where(and(kondisi, eq(transaksi.kategoriTrx, 'KELUAR'), inArray(hariExpr, hariAnomali)))
			.orderBy(desc(transaksi.nominal));
		for (const r of rows) {
			const k = String(r.hari).slice(0, 10);
			if (!penyebab.has(k)) penyebab.set(k, `${String(r.ket || '-').slice(0, 40)} ${rp(r.nominal)}`);
		}
	}

	// ── Produk ──
	const jualPeta = new Map(jualProduk.map((j) => [String(j.id), j]));
	const produk = daftarProduk.map((p) => {
		const j = jualPeta.get(String(p.id));
		return { id: String(p.id), nama: String(p.nama), stok: Number(p.stok || 0), minStok: Number(p.minStok || 0), hargaJual: Number(p.hargaJual || 0), hargaBeli: Number(p.hargaBeli || 0), q14: Number(j?.q14 || 0), q14lalu: Number(j?.q14lalu || 0), q30: Number(j?.q30 || 0), pendapatan: Number(j?.rp90 || 0) };
	});
	const abc = analisisABC(produk);
	const kelasA = abc.filter((p) => p.kelas === 'A');
	const bergerak = produk
		.filter((p) => p.q14 + p.q14lalu >= 4)
		.map((p) => ({ nama: p.nama, kini: p.q14, dulu: p.q14lalu, ubah: perubahan(p.q14, p.q14lalu) }))
		.filter((p) => p.ubah !== null && Math.abs(/** @type {number} */ (p.ubah)) >= 0.25);
	const naik = bergerak.filter((p) => /** @type {number} */ (p.ubah) > 0).sort((a, b) => /** @type {number} */ (b.ubah) - /** @type {number} */ (a.ubah)).slice(0, 3);
	const turun = bergerak.filter((p) => /** @type {number} */ (p.ubah) < 0).sort((a, b) => /** @type {number} */ (a.ubah) - /** @type {number} */ (b.ubah)).slice(0, 3);
	const tidakLaku = produk
		.filter((p) => p.stok > 0 && p.q30 === 0)
		.map((p) => ({ nama: p.nama, stok: p.stok, nilai: p.stok * (p.hargaBeli || p.hargaJual) }))
		.sort((a, b) => b.nilai - a.nilai);
	const habis = (await prediksiHabis(kondisi, produk.map((p) => ({ id: p.id, nama: p.nama, stok: p.stok, minStok: p.minStok })), kal)).filter((x) => x.stok <= x.minStok || (x.hari !== null && x.hari <= 7));
	const kritis = habis.filter((x) => x.stok === 0 || (x.hari !== null && x.hari <= 3));

	// ── Kas ──
	const net30 = (jumlah(masuk.slice(-30)) - keluar30) / 30;
	const runwayHari = net30 < 0 && saldo.saldo > 0 ? Math.floor(saldo.saldo / Math.abs(net30)) : null;

	// ── Skor kesehatan ──
	const masuk30 = jumlah(masuk.slice(-30));
	const masukSebelum30 = jumlah(masuk.slice(-60, -30));
	const pi = piutang[0] || { semua: 0, lewat: 0, nLewat: 0 };
	const kesehatan = skorKesehatan({
		masuk30,
		keluar30,
		masukSebelum30: tanggal.length >= 60 ? masukSebelum30 : 0,
		saldo: saldo.saldo,
		keluarBulanan: keluar30,
		cvHarian,
		jumlahProduk: produk.length,
		produkKritis: habis.filter((x) => x.stok <= x.minStok || (x.hari !== null && x.hari <= 3)).length,
		piutangLewat: Number(pi.lewat || 0),
		omzetBulanan: masuk30,
		adaPiutang: Number(pi.semua || 0) > 0
	});

	// ── Wawasan & rekomendasi ──
	/** @type {Wawasan[]} */
	const w = [];
	if (!adaData) {
		w.push({ tipe: 'info', judul: 'Belum ada data', isi: 'Catat transaksi lewat Kasir atau Catat Transaksi; analisis otomatis muncul setelah ada beberapa hari data.', prioritas: 1 });
	} else {
		if (kal.d > 1 || masukHariIni > 0) {
			const capai = target > 0 ? akhirBulan / target : 0;
			const vsLalu = bulanLalu > 0 ? (akhirBulan - bulanLalu) / bulanLalu : null;
			w.push({
				tipe: vsLalu !== null && vsLalu < -0.1 ? 'peringatan' : vsLalu !== null && vsLalu > 0.05 ? 'baik' : 'info',
				judul: `Perkiraan omzet ${BULAN[kal.m0]}: ${rp(akhirBulan)}`,
				isi: `Kisaran ${rp(ribu(Math.max(aktualBulanIni, akhirBulan - setengah)))} – ${rp(ribu(akhirBulan + setengah))} (keyakinan 80%${uji.wape !== null && uji.wape > 0.5 ? ', data belum teratur sehingga kisaran lebar' : ''}). ${vsLalu !== null ? `${vsLalu >= 0 ? 'Naik' : 'Turun'} ${Math.abs(Math.round(vsLalu * 100))}% dari bulan lalu (${rp(bulanLalu)}). ` : ''}${capai >= 1 ? `Melampaui target estimasi ${rp(target)}.` : `Sekitar ${Math.round(capai * 100)}% dari target ${rp(target)}.`}`,
				aksi: capai < 0.9 ? `Butuh tambahan ±${rp(ribu(Math.max(0, target - akhirBulan) / Math.max(1, sisaBulan)))} per hari untuk mengejar target.` : undefined,
				prioritas: vsLalu !== null && vsLalu < -0.1 ? 70 : 40
			});
		}
		for (const x of kritis.slice(0, 1)) {
			const daftar = kritis.slice(0, 4).map((k) => `${k.nama} (${k.stok === 0 ? 'habis' : `±${k.hari} hari`})`).join(', ');
			const pentingA = kritis.some((k) => kelasA.some((a) => a.id === k.id));
			w.push({ tipe: 'bahaya', judul: `${kritis.length} produk segera habis`, isi: `${daftar}.${pentingA ? ' Termasuk produk andalan (kelas A).' : ''}`, aksi: `Restock: ${kritis.slice(0, 4).map((k) => `${k.nama} ${k.restock}`).join(', ')}.`, prioritas: pentingA ? 95 : 85 });
			void x;
		}
		if (runwayHari !== null && runwayHari < 90) {
			w.push({ tipe: 'bahaya', judul: `Kas menipis: ±${runwayHari} hari lagi`, isi: `Rata-rata 30 hari terakhir pengeluaran melebihi pemasukan ${rp(Math.abs(net30))}/hari. Dengan saldo ${rp(saldo.saldo)}, kas habis dalam ±${runwayHari} hari bila pola tidak berubah.`, aksi: 'Tunda pengeluaran yang tidak mendesak dan tagih piutang.', prioritas: 90 });
		}
		for (const a of anomaliMasuk.filter((x) => x.arah === 'turun').slice(0, 1)) {
			w.push({ tipe: 'peringatan', judul: `Omzet ${namaHari(a.tanggal)} ${tgl(a.tanggal)} anjlok`, isi: `${rp(a.nilai)}, padahal ${namaHari(a.tanggal)} biasanya ±${rp(a.normal)}.`, aksi: 'Cek apakah ada penjualan yang belum dicatat, toko tutup, atau stok kosong hari itu.', prioritas: 75 });
		}
		for (const a of anomaliMasuk.filter((x) => x.arah === 'naik').slice(0, 1)) {
			w.push({ tipe: 'baik', judul: `Omzet ${namaHari(a.tanggal)} ${tgl(a.tanggal)} melonjak`, isi: `${rp(a.nilai)}, jauh di atas biasanya (±${rp(a.normal)}).`, aksi: 'Cari tahu pemicunya (pesanan besar, promo, acara) supaya bisa diulang.', prioritas: 45 });
		}
		for (const a of anomaliKeluar.slice(0, 1)) {
			w.push({ tipe: 'peringatan', judul: `Pengeluaran ${tgl(a.tanggal)} tidak biasa`, isi: `${rp(a.nilai)}, melampaui pengeluaran harian terbesar 8 minggu sebelumnya (rata-rata hari berpengeluaran ±${rp(Math.round(a.normal / 1000) * 1000)}).${penyebab.get(a.tanggal) ? ` Terbesar: ${penyebab.get(a.tanggal)}.` : ''}`, aksi: 'Pastikan ini memang direncanakan dan tercatat di akun yang benar.', prioritas: 65 });
		}
		if (Math.abs(trenMingguan) >= 0.04 && reg.r2 >= 0.25) {
			w.push({ tipe: trenMingguan > 0 ? 'baik' : 'peringatan', judul: `Tren omzet ${trenMingguan > 0 ? 'naik' : 'turun'} ${Math.abs(Math.round(trenMingguan * 100))}% per minggu`, isi: `Berdasarkan 4 minggu terakhir (kekuatan tren R² ${reg.r2.toFixed(2)}).`, aksi: trenMingguan < 0 ? 'Cek produk yang penjualannya turun di bawah dan pertimbangkan promo.' : undefined, prioritas: trenMingguan > 0 ? 35 : 60 });
		}
		if (kepadatan >= 0.5 && teramai && tersepi && teramai.hari !== tersepi.hari && teramai.indeks - tersepi.indeks >= 0.3) {
			w.push({ tipe: 'info', judul: `${teramai.hari} paling ramai, ${tersepi.hari} paling sepi`, isi: `Rata-rata ${teramai.hari} ${rp(Math.round(teramai.rata / 1000) * 1000)} vs ${tersepi.hari} ${rp(Math.round(tersepi.rata / 1000) * 1000)} (8 minggu terakhir).`, aksi: `Buat promo khusus ${tersepi.hari} dan siapkan stok lebih untuk ${teramai.hari}.`, prioritas: 30 });
		}
		if (naik.length) w.push({ tipe: 'baik', judul: `${naik[0].nama} sedang naik daun`, isi: `Terjual ${naik[0].kini} dalam 14 hari (sebelumnya ${naik[0].dulu}, ${pct(/** @type {number} */ (naik[0].ubah))}).`, aksi: 'Pastikan stoknya aman dan tampilkan di posisi utama.', prioritas: 38 });
		if (turun.length) w.push({ tipe: 'peringatan', judul: `${turun[0].nama} penjualannya turun`, isi: `Terjual ${turun[0].kini} dalam 14 hari (sebelumnya ${turun[0].dulu}, ${pct(/** @type {number} */ (turun[0].ubah))}).`, aksi: 'Cek harga, kualitas, atau ketersediaannya.', prioritas: 50 });
		if (kelasA.length && abc.length >= 4) {
			w.push({ tipe: 'info', judul: `${kelasA.length} produk menyumbang 80% pendapatan`, isi: `${kelasA.slice(0, 4).map((p) => p.nama).join(', ')} (90 hari terakhir).`, aksi: 'Prioritaskan stok dan kualitas produk-produk ini.', prioritas: 25 });
		}
		const nilaiMati = jumlah(tidakLaku.map((t) => t.nilai));
		if (tidakLaku.length && nilaiMati > 0) {
			w.push({ tipe: 'peringatan', judul: `${tidakLaku.length} produk tidak terjual 30 hari`, isi: `Modal tertahan ±${rp(nilaiMati)}: ${tidakLaku.slice(0, 3).map((t) => `${t.nama} (${t.stok})`).join(', ')}.`, aksi: 'Coba diskon, bundling dengan produk laris, atau hentikan pembelian.', prioritas: 48 });
		}
		if (Number(pi.nLewat || 0) > 0) {
			w.push({ tipe: 'peringatan', judul: `Piutang lewat jatuh tempo ${rp(pi.lewat)}`, isi: `${Number(pi.nLewat)} tagihan belum dibayar pelanggan.`, aksi: 'Kirim pengingat tagihan hari ini.', prioritas: 68 });
		}
		const keluarSebelum30 = jumlah(keluar.slice(-60, -30));
		const naikKeluar = perubahan(keluar30, keluarSebelum30);
		if (naikKeluar !== null && naikKeluar >= 0.3 && keluar30 > 0 && tanggal.length >= 60) {
			w.push({ tipe: 'peringatan', judul: `Pengeluaran naik ${Math.round(naikKeluar * 100)}%`, isi: `${rp(keluar30)} dalam 30 hari terakhir vs ${rp(keluarSebelum30)} sebelumnya.`, aksi: 'Tanya di chat AI: "pengeluaran terbesar bulan ini" untuk rinciannya.', prioritas: 62 });
		}
	}
	if (adaData && kepadatan < 0.6) {
		w.push({ tipe: 'info', judul: 'Catat transaksi setiap hari', isi: `Hanya ${Math.round(kepadatan * 56)} dari 56 hari terakhir yang punya pemasukan tercatat. Prediksi dan deteksi kejanggalan jadi kurang akurat.`, aksi: 'Pakai Kasir atau ketik di chat ("jual 2 kopi") setiap ada penjualan.', prioritas: 55 });
	}
	w.sort((a, b) => b.prioritas - a.prioritas);

	const terlemah = [...kesehatan.komponen].sort((a, b) => a.skor - b.skor)[0];
	const terkuat = [...kesehatan.komponen].sort((a, b) => b.skor - a.skor)[0];
	const ringkasan = !adaData
		? 'Belum cukup data untuk dianalisis.'
		: `Skor ${kesehatan.skor}/100 (${kesehatan.nilai}). ${terkuat ? `Paling kuat: ${terkuat.nama.toLowerCase()}. ` : ''}${terlemah && terlemah.skor < 60 ? `Perlu perhatian: ${terlemah.nama.toLowerCase()} — ${terlemah.alasan.charAt(0).toLowerCase()}${terlemah.alasan.slice(1)}.` : 'Tidak ada komponen yang kritis.'}`;

	return {
		dibuat: new Date().toISOString(),
		tanggal: kal.hariIni,
		unit: { nama: unit.nama_unit, slug: unit.slug },
		ringkasan,
		kesehatan,
		prediksi: {
			metode: prediksi.metode,
			parameter: prediksi.parameter,
			akurasi: uji.wape === null ? null : Math.max(0, Math.round((1 - uji.wape) * 100)),
			galatUji: uji.wape === null ? null : Math.round(uji.wape * 100),
			hariData: tanggal.length,
			akhirBulan: { nilai: akhirBulan, bawah: ribu(Math.max(aktualBulanIni, akhirBulan - setengah)), atas: ribu(akhirBulan + setengah), aktualSejauhIni: Math.round(aktualBulanIni + masukHariIni), target, bulanLalu: Math.round(bulanLalu) },
			pengeluaranAkhirBulan: ribu(keluarAkhirBulan),
			kepadatan: Math.round(kepadatan * 100),
			ramalan: prediksi.ramalan.slice(0, 7).map((v, h) => ({ tanggal: keHari(h), nilai: Math.round(v), bawah: Math.round(prediksi.bawah[h]), atas: Math.round(prediksi.atas[h]) })),
			riwayat: tanggal.slice(-28).map((d, i, arr) => ({ tanggal: d, nilai: Math.round(masuk[masuk.length - arr.length + i]) })),
			hariIni: Math.round(masukHariIni)
		},
		pola: pola.map((p) => ({ hari: p.hari, rata: Math.round(p.rata), indeks: Math.round(p.indeks * 100) / 100 })),
		tren: { perMinggu: Math.round(trenMingguan * 1000) / 10, r2: Math.round(reg.r2 * 100) / 100 },
		anomali: [
			...anomaliMasuk.slice(0, 3).map((a) => ({ tanggal: a.tanggal, jenis: 'pemasukan', nilai: Math.round(a.nilai), normal: Math.round(a.normal), arah: a.arah, z: Math.round(a.z * 10) / 10 })),
			...anomaliKeluar.slice(0, 3).map((a) => ({ tanggal: a.tanggal, jenis: 'pengeluaran', nilai: Math.round(a.nilai), normal: Math.round(a.normal), arah: a.arah, z: Math.round(a.z * 10) / 10, penyebab: penyebab.get(a.tanggal) || null }))
		],
		produk: {
			naik: naik.map((p) => ({ nama: p.nama, kini: p.kini, dulu: p.dulu, ubah: Math.round(/** @type {number} */ (p.ubah) * 100) })),
			turun: turun.map((p) => ({ nama: p.nama, kini: p.kini, dulu: p.dulu, ubah: Math.round(/** @type {number} */ (p.ubah) * 100) })),
			kelasA: kelasA.slice(0, 6).map((p) => ({ nama: p.nama, porsi: Math.round(p.porsi * 100) })),
			tidakLaku: tidakLaku.slice(0, 6).map((t) => ({ nama: t.nama, stok: t.stok, nilai: Math.round(t.nilai) })),
			segeraHabis: habis.slice(0, 6).map((x) => ({ nama: x.nama, stok: x.stok, hari: x.hari, restock: x.restock }))
		},
		kas: { saldo: Math.round(saldo.saldo), netHarian30: Math.round(net30), runwayHari },
		wawasan: w.slice(0, 8)
	};
}
