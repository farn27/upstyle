/**
 * Pengumpul data usaha untuk chat AI. Hanya mengambil data yang relevan dengan topik & periode pertanyaan
 * (hemat token) dan menghitung agregat di basis data supaya model tidak menjumlah sendiri.
 */
import { db } from '$lib/server/drizzle';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import {
	transaksi,
	products,
	receivables,
	payables,
	journalEntries,
	employees,
	employeeKpi,
	attendance,
	leaveRequests,
	posOrders,
	suppliers,
	purchaseOrders,
	fixedAssets,
	taxRates,
	budgetItems,
	chartOfAccounts,
	approvalRequests,
	stockOpname,
	salaryComponents,
	riwayatAksi,
	salesOrders,
	salesTargets,
	users,
	marketingCampaigns,
	vouchers,
	supportTickets,
	ecommerceOrders,
	crmContacts,
	crmDeals,
	crmActivities,
	closingPeriods
} from '$lib/server/schema';
import { hitungSaldoKas } from '$lib/financeDashboard';
import { kalender } from '$lib/server/chatKonteks';
import { log } from '$lib/server/logger';

/** Rp1.250.000 */
export const rp = (/** @type {unknown} */ v) => `Rp${Math.round(Number(v) || 0).toLocaleString('id-ID')}`;
/** "2026-11-11 19:09:00" → "11/11 19:09" */
const waktuPendek = (/** @type {unknown} */ v) => {
	const s = String(v || '');
	return /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}${s.length > 11 ? ' ' + s.slice(11, 16) : ''}` : s || '-';
};
const tglPendek = (/** @type {unknown} */ v) => String(v || '-').slice(0, 10);

const MASUK = sql`${transaksi.kategoriTrx} = 'MASUK'`;
const KELUAR = sql`${transaksi.kategoriTrx} = 'KELUAR'`;

/**
 * @typedef {{
 *   unit: { id: number, nama_unit: string, slug: string, modal_awal: unknown, kategori: string | null } | null,
 *   unitIds: number[],
 *   userId: number,
 *   pesan: string,
 *   topik: string[],
 *   periode: import('$lib/server/chatKonteks').Periode[],
 *   sekarang?: Date
 * }} KonteksData
 */

/**
 * Kumpulkan blok data untuk prompt.
 * @param {KonteksData} k
 * @returns {Promise<{ data: string, saran: string[], grafik: any }>}
 */
export async function kumpulkanData(k) {
	const t = k.pesan.toLowerCase();
	const kal = kalender(k.sekarang);
	const kondisiTrx = k.unit ? eq(transaksi.unitId, k.unit.id) : inArray(transaksi.unitId, k.unitIds.length ? k.unitIds : [-1]);
	const ada = (/** @type {string} */ x) => k.topik.includes(x);
	/** @type {string[]} */
	const blok = [];
	/** @type {string[]} */
	const saran = [];

	const tugas = [];
	/** @type {any} grafik Chart.js yang dibuat server (tanpa token) */
	let grafik = null;

	// ── Ringkasan keuangan: hari ini, kemarin, bulan ini, bulan lalu + periode yang ditanya ──
	// Pertanyaan produk/karyawan dengan periode ("mie goreng laku berapa bulan ini") tidak butuh ringkasan keuangan
	const butuhRingkasan = ada('keuangan') || ada('riwayat') || ada('tren') || ada('kasir') || k.topik.length === 0;
	if (butuhRingkasan) {
		tugas.push(
			ringkasanKeuangan(kondisiTrx, kal, k.periode).then((b) => {
				blok.push(b);
				saran.push('Pengeluaran terbesar bulan ini', 'Bandingkan dengan bulan lalu');
			})
		);
	}
	if (/\b(saldo|kas|uang|modal|arus\s?kas)\b/.test(t) && k.unit) {
		tugas.push(saldoKas(k.unit).then((b) => blok.push(b)));
	}

	// ── Rincian pemasukan/pengeluaran per keterangan ──
	const mintaRincian = /\b(terbesar|terbanyak|paling\s+(besar|banyak)|rincian|rinci|detail|boros|untuk\s+apa|buat\s+apa|ke\s?mana|komposisi|kategori|apa\s+saja|apa\s+aja|kenapa|mengapa|knp|penyebab)\b/.test(t);
	if (mintaRincian && (ada('keuangan') || ada('riwayat'))) {
		const p = k.periode[0] || { label: `bulan ini (${kal.awalBulan} s/d ${kal.hariIni})`, mulai: kal.awalBulan, akhir: kal.besok };
		const jenis = /\b(pemasukan|pendapatan|omzet|omset|penghasilan)\b/.test(t) && !/\b(pengeluaran|biaya|beban|boros)\b/.test(t) ? 'MASUK' : 'KELUAR';
		tugas.push(
			rincianPerKeterangan(kondisiTrx, p, jenis).then((r) => {
				blok.push(r.teks);
				if (r.grafik && !grafik) grafik = r.grafik;
			})
		);
	}

	// ── Tren bulanan ──
	if (ada('tren') || /\bbulan\s+(ke\s+)?bulan\b/.test(t)) {
		tugas.push(
			trenBulanan(kondisiTrx, kal).then((r) => {
				blok.push(r.teks);
				if (r.grafik) grafik = r.grafik;
			})
		);
	}

	// ── Transaksi terakhir ──
	if (ada('riwayat') && /\b(terakhir|terbaru|barusan|tadi|riwayat|mutasi|terkini)\b/.test(t)) {
		tugas.push(transaksiTerakhir(kondisiTrx).then((b) => blok.push(b)));
	}

	// ── Produk & stok ──
	if (ada('produk') || ada('gudang')) {
		const kondisiProduk = k.unit ? eq(products.unitId, k.unit.id) : inArray(products.unitId, k.unitIds.length ? k.unitIds : [-1]);
		tugas.push(
			dataProduk(kondisiTrx, kondisiProduk, t, k.periode, kal).then((b) => {
				blok.push(b);
				saran.push('Produk stok menipis', 'Produk terlaris 30 hari terakhir');
			})
		);
	}

	// ── Kasir ──
	if (ada('kasir') && k.unit) tugas.push(dataKasir(k.unit.id, kal).then((b) => blok.push(b)));

	// ── Modul lain ──
	for (const topik of k.topik) {
		const fn = MODUL[topik];
		if (fn && (k.unit || topik === 'karyawan' || topik === 'kpi' || topik === 'penggajian')) {
			tugas.push(
				fn({ unitId: k.unit?.id ?? null, unitIds: k.unitIds, userId: k.userId }).then((r) => {
					if (r.teks) blok.push(r.teks);
					saran.push(...r.saran);
				})
			);
		}
	}

	const hasil = await Promise.allSettled(tugas);
	for (const h of hasil) if (h.status === 'rejected') log.ai.error({ err: String(h.reason?.message || h.reason) }, '[Chat] Gagal memuat data');

	return { data: blok.filter(Boolean).join('\n'), saran: [...new Set(saran)].slice(0, 3), grafik };
}

// ─── Keuangan ───────────────────────────────────────────────────────────────

/** @typedef {{ label: string, mulai: string, akhir: string }} Jendela */
/** @typedef {Jendela & { masuk: number, keluar: number, n: number }} AngkaJendela */

/**
 * Pemasukan, pengeluaran, dan jumlah transaksi untuk beberapa jendela waktu dalam SATU kueri
 * (string tanggal WIB; kolom tanggal disimpan dalam WIB).
 * @param {any} kondisi
 * @param {Jendela[]} jendela
 * @returns {Promise<AngkaJendela[]>}
 */
export async function angkaJendela(kondisi, jendela) {
	if (!jendela.length) return [];
	/** @type {Record<string, any>} */
	const kolom = {};
	jendela.forEach((j, i) => {
		const dalam = sql`${transaksi.tanggal} >= ${j.mulai + ' 00:00:00'} AND ${transaksi.tanggal} < ${j.akhir + ' 00:00:00'}`;
		kolom[`m${i}`] = sql`COALESCE(SUM(CASE WHEN ${MASUK} AND ${dalam} THEN ${transaksi.nominal} ELSE 0 END), 0)`;
		kolom[`k${i}`] = sql`COALESCE(SUM(CASE WHEN ${KELUAR} AND ${dalam} THEN ${transaksi.nominal} ELSE 0 END), 0)`;
		kolom[`n${i}`] = sql`COALESCE(SUM(CASE WHEN ${dalam} THEN 1 ELSE 0 END), 0)`;
	});
	const awal = jendela.map((j) => j.mulai).sort()[0];
	const [r] = await db.select(kolom).from(transaksi).where(and(kondisi, gte(transaksi.tanggal, awal + ' 00:00:00')));
	return jendela.map((j, i) => ({ ...j, masuk: Number(r?.[`m${i}`] || 0), keluar: Number(r?.[`k${i}`] || 0), n: Number(r?.[`n${i}`] || 0) }));
}

/** Jumlah hari dalam bulan berjalan (kalender WIB). */
const hariDalamBulan = (/** @type {ReturnType<typeof kalender>} */ kal) => new Date(Date.UTC(kal.y, kal.m0 + 1, 0)).getUTCDate();

/**
 * Proyeksi akhir bulan dari laju harian bulan berjalan (sama dengan cara dasbor).
 * @param {{ masuk: number, keluar: number }} bulanIni
 * @param {ReturnType<typeof kalender>} kal
 */
export function proyeksiBulan(bulanIni, kal) {
	const total = hariDalamBulan(kal);
	const faktor = total / Math.max(1, kal.d);
	// dibulatkan ke ribuan: proyeksi hanya perkiraan
	return { masuk: Math.round((bulanIni.masuk * faktor) / 1000) * 1000, keluar: Math.round((bulanIni.keluar * faktor) / 1000) * 1000, hariBerjalan: kal.d, totalHari: total };
}

/**
 * @param {any} kondisi
 * @param {ReturnType<typeof kalender>} kal
 * @param {import('$lib/server/chatKonteks').Periode[]} periode
 */
async function ringkasanKeuangan(kondisi, kal, periode) {
	const blnLaluMulai = new Date(Date.UTC(kal.y, kal.m0 - 1, 1)).toISOString().slice(0, 10);
	/** @type {Jendela[]} */
	const jendela = [
		{ label: `Hari ini (${kal.hariIni})`, mulai: kal.hariIni, akhir: kal.besok },
		{ label: `Kemarin (${kal.kemarin})`, mulai: kal.kemarin, akhir: kal.hariIni },
		{ label: `Bulan ini (${kal.awalBulan} s/d ${kal.hariIni})`, mulai: kal.awalBulan, akhir: kal.besok },
		{ label: `Bulan lalu (${blnLaluMulai.slice(0, 7)})`, mulai: blnLaluMulai, akhir: kal.awalBulan }
	];
	for (const p of periode) {
		if (!jendela.some((j) => j.mulai === p.mulai && j.akhir === p.akhir)) jendela.push({ label: p.label.charAt(0).toUpperCase() + p.label.slice(1), mulai: p.mulai, akhir: p.akhir });
	}
	const angka = await angkaJendela(kondisi, jendela);
	const baris = angka.map((j) => `- ${j.label}: masuk ${rp(j.masuk)} | keluar ${rp(j.keluar)} | selisih ${rp(j.masuk - j.keluar)} | ${j.n} trx`);
	const pr = proyeksiBulan(angka[2], kal);
	if (kal.d < pr.totalHari && angka[2].n > 0) baris.push(`- Proyeksi akhir bulan (laju ${pr.hariBerjalan}/${pr.totalHari} hari): masuk ±${rp(pr.masuk)} | keluar ±${rp(pr.keluar)}`);
	return `RINGKASAN KEUANGAN (dari basis data; masuk = pemasukan/omzet, keluar = pengeluaran):\n${baris.join('\n')}`;
}

/**
 * Saldo kas sama dengan kartu "Saldo Kas" di dasbor: modal awal + semua pemasukan − semua pengeluaran.
 * @param {NonNullable<KonteksData['unit']>} unit
 */
export async function angkaSaldoKas(unit) {
	const [r] = await db
		.select({
			masuk: sql`COALESCE(SUM(CASE WHEN ${MASUK} THEN ${transaksi.nominal} ELSE 0 END), 0)`,
			keluar: sql`COALESCE(SUM(CASE WHEN ${KELUAR} THEN ${transaksi.nominal} ELSE 0 END), 0)`
		})
		.from(transaksi)
		.where(eq(transaksi.unitId, unit.id));
	const masuk = Number(r?.masuk || 0);
	const keluar = Number(r?.keluar || 0);
	return { saldo: hitungSaldoKas({ modalAwal: /** @type {any} */ (unit.modal_awal), totalMasuk: masuk, totalKeluar: keluar }), modal: Number(unit.modal_awal || 0), masuk, keluar };
}

/** @param {NonNullable<KonteksData['unit']>} unit */
async function saldoKas(unit) {
	const [r] = await db
		.select({
			masuk: sql`COALESCE(SUM(CASE WHEN ${MASUK} THEN ${transaksi.nominal} ELSE 0 END), 0)`,
			keluar: sql`COALESCE(SUM(CASE WHEN ${KELUAR} THEN ${transaksi.nominal} ELSE 0 END), 0)`
		})
		.from(transaksi)
		.where(eq(transaksi.unitId, unit.id));
	const saldo = hitungSaldoKas({ modalAwal: /** @type {any} */ (unit.modal_awal), totalMasuk: /** @type {any} */ (r?.masuk), totalKeluar: /** @type {any} */ (r?.keluar) });
	return `SALDO KAS (sama dengan dasbor): ${rp(saldo)} = modal awal ${rp(unit.modal_awal)} + total pemasukan ${rp(r?.masuk)} − total pengeluaran ${rp(r?.keluar)}`;
}

/**
 * @param {any} kondisi
 * @param {import('$lib/server/chatKonteks').Periode} p
 * @param {'MASUK' | 'KELUAR'} jenis
 */
async function rincianPerKeterangan(kondisi, p, jenis) {
	const rows = await rincianAngka(kondisi, p, jenis, 6);
	const nama = jenis === 'MASUK' ? 'PEMASUKAN' : 'PENGELUARAN';
	if (!rows.length) return { teks: `${nama} TERBESAR ${p.label}: tidak ada data`, grafik: null };
	return {
		teks: `${nama} TERBESAR ${p.label} (per keterangan):\n${rows.map((r, i) => `${i + 1}. ${r.ket.slice(0, 50)}: ${rp(r.total)} (${r.n}x)`).join('\n')}`,
		grafik: grafikDonat(`${jenis === 'MASUK' ? 'Pemasukan' : 'Pengeluaran'} terbesar`, rows.map((r) => [r.ket.slice(0, 24), r.total]))
	};
}

/**
 * Total per keterangan (dikelompokkan, huruf besar).
 * @param {any} kondisi
 * @param {{ mulai: string, akhir: string }} p
 * @param {'MASUK' | 'KELUAR'} jenis
 * @param {number} batas
 */
export async function rincianAngka(kondisi, p, jenis, batas) {
	const ket = sql`UPPER(TRIM(COALESCE(${transaksi.keterangan}, '-')))`;
	const rows = await db
		.select({ ket, total: sql`SUM(${transaksi.nominal})`, n: sql`COUNT(*)` })
		.from(transaksi)
		.where(and(kondisi, eq(transaksi.kategoriTrx, jenis), gte(transaksi.tanggal, p.mulai + ' 00:00:00'), lt(transaksi.tanggal, p.akhir + ' 00:00:00')))
		.groupBy(ket)
		.orderBy(desc(sql`SUM(${transaksi.nominal})`))
		.limit(batas);
	return rows.map((r) => ({ ket: String(r.ket), total: Number(r.total || 0), n: Number(r.n || 0) }));
}

// ─── Grafik (format Chart.js — dirender web & Android, tanpa token) ─────────

const WARNA = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#14b8a6', '#ec4899'];

/**
 * @param {string} judul
 * @param {[string, number][]} pasangan
 */
export function grafikDonat(judul, pasangan) {
	return {
		type: 'doughnut',
		data: { labels: pasangan.map((x) => x[0]), datasets: [{ label: judul, data: pasangan.map((x) => Math.round(x[1])), backgroundColor: pasangan.map((_, i) => WARNA[i % WARNA.length]) }] },
		options: { plugins: { legend: { position: 'bottom' } } }
	};
}

/**
 * @param {string[]} label
 * @param {{ label: string, data: number[], warna?: string }[]} seri
 * @param {'bar' | 'line'} [tipe]
 */
export function grafikBatang(label, seri, tipe = 'bar') {
	return {
		type: tipe,
		data: { labels: label, datasets: seri.map((x, i) => ({ label: x.label, data: x.data.map((v) => Math.round(v)), backgroundColor: x.warna || WARNA[i], borderColor: x.warna || WARNA[i] })) },
		options: { scales: { x: {}, y: { beginAtZero: true } } }
	};
}

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Tren 6 bulan terakhir + grafik batang masuk vs keluar. */
async function trenBulanan(/** @type {any} */ kondisi, /** @type {ReturnType<typeof kalender>} */ kal) {
	const mulai = new Date(Date.UTC(kal.y, kal.m0 - 5, 1)).toISOString().slice(0, 10);
	const bln = sql`DATE_FORMAT(${transaksi.tanggal}, '%Y-%m')`;
	const rows = await db
		.select({
			bln,
			masuk: sql`COALESCE(SUM(CASE WHEN ${MASUK} THEN ${transaksi.nominal} ELSE 0 END), 0)`,
			keluar: sql`COALESCE(SUM(CASE WHEN ${KELUAR} THEN ${transaksi.nominal} ELSE 0 END), 0)`
		})
		.from(transaksi)
		.where(and(kondisi, gte(transaksi.tanggal, mulai + ' 00:00:00')))
		.groupBy(bln)
		.orderBy(asc(bln));
	if (!rows.length) return { teks: 'TREN 6 BULAN: belum ada data', grafik: null };
	const label = rows.map((r) => `${BLN[Number(String(r.bln).slice(5, 7)) - 1]} ${String(r.bln).slice(2, 4)}`);
	return {
		teks: `TREN 6 BULAN (bulan berjalan belum penuh):\n${rows.map((r) => `- ${r.bln}: pemasukan ${rp(r.masuk)}, pengeluaran ${rp(r.keluar)}`).join('\n')}`,
		grafik: grafikBatang(label, [
			{ label: 'Pemasukan', data: rows.map((r) => Number(r.masuk)), warna: '#10b981' },
			{ label: 'Pengeluaran', data: rows.map((r) => Number(r.keluar)), warna: '#f43f5e' }
		])
	};
}

async function transaksiTerakhir(/** @type {any} */ kondisi) {
	const rows = await db
		.select({ k: transaksi.kategoriTrx, nominal: transaksi.nominal, ket: transaksi.keterangan, tgl: transaksi.tanggal })
		.from(transaksi)
		.where(kondisi)
		.orderBy(desc(transaksi.tanggal), desc(transaksi.id))
		.limit(6);
	if (!rows.length) return 'TRANSAKSI TERAKHIR: belum ada';
	return `6 TRANSAKSI TERAKHIR:\n${rows.map((r) => `- ${waktuPendek(r.tgl)} ${r.k === 'MASUK' ? 'masuk' : 'keluar'} ${rp(r.nominal)} ${String(r.ket || '').slice(0, 45)}`).join('\n')}`;
}

// ─── Produk ─────────────────────────────────────────────────────────────────

/**
 * Stok menipis, produk terlaris, dan produk yang disebut namanya.
 * @param {any} kondisiTrx
 * @param {any} kondisiProduk
 * @param {string} t  pesan huruf kecil
 * @param {import('$lib/server/chatKonteks').Periode[]} periode
 * @param {ReturnType<typeof kalender>} kal
 */
async function dataProduk(kondisiTrx, kondisiProduk, t, periode, kal) {
	const daftar = await db
		.select({ id: products.id, nama: products.nama, stok: products.stok, minStok: products.minStok, harga: products.hargaJual })
		.from(products)
		.where(and(kondisiProduk, isNull(products.deletedAt)))
		.orderBy(asc(products.nama))
		.limit(300);
	if (!daftar.length) return 'PRODUK: belum ada produk';
	/** @type {string[]} */
	const out = [`PRODUK: ${daftar.length} produk aktif`];

	const p = periode[0] || { label: `30 hari terakhir (s/d ${kal.hariIni})`, mulai: new Date(Date.UTC(kal.y, kal.m0, kal.d - 29)).toISOString().slice(0, 10), akhir: kal.besok };
	const terjual = (/** @type {string[] | null} */ ids, /** @type {number} */ batas) =>
		db
			.select({ id: transaksi.productId, qty: sql`SUM(COALESCE(${transaksi.qty}, 1))`, total: sql`SUM(${transaksi.nominal})` })
			.from(transaksi)
			.where(and(kondisiTrx, MASUK, sql`${transaksi.productId} IS NOT NULL`, ids ? inArray(transaksi.productId, ids) : undefined, gte(transaksi.tanggal, p.mulai + ' 00:00:00'), lt(transaksi.tanggal, p.akhir + ' 00:00:00')))
			.groupBy(transaksi.productId)
			.orderBy(desc(sql`SUM(COALESCE(${transaksi.qty}, 1))`))
			.limit(batas);
	const namaDari = (/** @type {unknown} */ id) => daftar.find((d) => String(d.id) === String(id))?.nama || 'Produk terhapus';

	// Produk yang disebut di pesan ("mie goreng spesial laku berapa?")
	const disebut = daftar.filter((d) => d.nama && d.nama.length >= 3 && t.includes(d.nama.toLowerCase())).slice(0, 5);
	if (disebut.length) {
		const jual = await terjual(disebut.map((d) => String(d.id)), 5);
		out.push(
			`PRODUK DISEBUT (terjual ${p.label}):\n${disebut
				.map((d) => {
					const j = jual.find((x) => String(x.id) === String(d.id));
					return `- ${d.nama}: terjual ${Number(j?.qty || 0)} (${rp(j?.total)}), stok ${d.stok}, harga ${rp(d.harga)}`;
				})
				.join('\n')}`
		);
	}

	const mintaPeringkat = /\b(laris|terlaris|favorit|populer|terbanyak|paling|best\s?seller|sepi|kurang\s+laku|tidak\s+laku|ranking|peringkat)\b/.test(t);
	if (mintaPeringkat || (!disebut.length && /\b(laku|terjual|penjualan|jual)\b/.test(t)) || (!disebut.length && !/\b(stok|stock|habis|menipis|sisa|persediaan|restock)\b/.test(t))) {
		const top = await terjual(null, 8);
		out.push(top.length ? `TERLARIS ${p.label} (qty terjual):\n${top.map((r, i) => `${i + 1}. ${namaDari(r.id)}: ${Number(r.qty)} terjual, ${rp(r.total)}`).join('\n')}` : `TERLARIS ${p.label}: belum ada penjualan produk`);
		if (/\b(sepi|kurang\s+laku|tidak\s+laku|dead\s?stock)\b/.test(t)) {
			const laku = new Set(top.map((r) => String(r.id)));
			const tidak = daftar.filter((d) => !laku.has(String(d.id))).slice(0, 8);
			if (tidak.length) out.push(`TIDAK TERJUAL ${p.label}: ${tidak.map((d) => `${d.nama} (stok ${d.stok})`).join(', ')}`);
		}
	}

	const menipis = daftar.filter((d) => Number(d.stok) <= Number(d.minStok || 0)).sort((a, b) => Number(a.stok) - Number(b.stok));
	if (/\b(stok|stock|habis|menipis|sisa|persediaan|restock|kurang|kapan)\b/.test(t) || menipis.length) {
		out.push(menipis.length ? `STOK MENIPIS (stok ≤ minimum): ${menipis.slice(0, 10).map((d) => `${d.nama} ${d.stok}/${d.minStok}`).join(', ')}` : 'STOK MENIPIS: tidak ada');
		const prediksi = await prediksiHabis(kondisiTrx, daftar, kal);
		const segera = prediksi.filter((x) => x.hari !== null && x.hari <= 7);
		if (segera.length) out.push(`PERKIRAAN HABIS ≤ 7 hari (laju jual 14 hari terakhir): ${segera.slice(0, 8).map((x) => `${x.nama} ~${x.hari} hari (stok ${x.stok}, ${x.laju}/hari, saran restock ${x.restock})`).join('; ')}`);
		if (/\b(stok|stock|sisa|persediaan)\b/.test(t) && !disebut.length) {
			const rendah = [...daftar].sort((a, b) => Number(a.stok) - Number(b.stok)).slice(0, 8);
			out.push(`STOK TERENDAH: ${rendah.map((d) => `${d.nama} ${d.stok}`).join(', ')}`);
		}
	}
	return out.join('\n');
}

/**
 * Prediksi kapan stok habis dari laju penjualan 14 hari terakhir (tanpa AI).
 * @param {any} kondisiTrx
 * @param {{ id: string, nama: string, stok: number | null, minStok: number | null }[]} daftar
 * @param {ReturnType<typeof kalender>} kal
 * @returns {Promise<{ id: string, nama: string, stok: number, minStok: number, laju: number, hari: number | null, restock: number }[]>}
 */
export async function prediksiHabis(kondisiTrx, daftar, kal) {
	const HARI = 14;
	const mulai = new Date(Date.UTC(kal.y, kal.m0, kal.d - (HARI - 1))).toISOString().slice(0, 10);
	const jual = await db
		.select({ id: transaksi.productId, qty: sql`SUM(COALESCE(${transaksi.qty}, 1))` })
		.from(transaksi)
		.where(and(kondisiTrx, MASUK, sql`${transaksi.productId} IS NOT NULL`, gte(transaksi.tanggal, mulai + ' 00:00:00')))
		.groupBy(transaksi.productId);
	const laju = new Map(jual.map((j) => [String(j.id), Number(j.qty || 0) / HARI]));
	return daftar
		.map((d) => {
			const l = laju.get(String(d.id)) || 0;
			const stok = Math.max(0, Number(d.stok || 0));
			const hari = l > 0 ? Math.floor(stok / l) : stok === 0 ? 0 : null;
			// cukup untuk 14 hari ke depan + stok minimum
			const restock = l > 0 ? Math.max(0, Math.ceil(l * HARI + Number(d.minStok || 0) - stok)) : Math.max(0, Number(d.minStok || 0) - stok);
			return { id: String(d.id), nama: String(d.nama), stok, minStok: Number(d.minStok || 0), laju: Math.round(l * 10) / 10, hari, restock };
		})
		.sort((a, b) => (a.hari ?? 9999) - (b.hari ?? 9999));
}

// ─── Kasir ──────────────────────────────────────────────────────────────────

async function dataKasir(/** @type {number} */ unitId, /** @type {ReturnType<typeof kalender>} */ kal) {
	const dariHariIni = gte(posOrders.createdAt, kal.hariIni + ' 00:00:00');
	const [ringkas, metode, terakhir] = await Promise.all([
		db.select({ n: sql`COUNT(*)`, total: sql`COALESCE(SUM(${posOrders.total}), 0)` }).from(posOrders).where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID'), dariHariIni)),
		db
			.select({ m: posOrders.paymentMethod, n: sql`COUNT(*)`, total: sql`SUM(${posOrders.total})` })
			.from(posOrders)
			.where(and(eq(posOrders.unitId, unitId), eq(posOrders.status, 'PAID'), gte(posOrders.createdAt, kal.awalBulan + ' 00:00:00')))
			.groupBy(posOrders.paymentMethod),
		db.select({ no: posOrders.orderNumber, total: posOrders.total, m: posOrders.paymentMethod, st: posOrders.status, at: posOrders.createdAt }).from(posOrders).where(eq(posOrders.unitId, unitId)).orderBy(desc(posOrders.createdAt)).limit(5)
	]);
	const out = [`KASIR hari ini: ${Number(ringkas[0]?.n || 0)} order lunas, total ${rp(ringkas[0]?.total)}`];
	if (metode.length) out.push(`Metode bayar kasir bulan ini: ${metode.map((x) => `${x.m || '-'} ${x.n}x (${rp(x.total)})`).join(', ')}`);
	if (terakhir.length) out.push(`Order kasir terakhir: ${terakhir.map((o) => `#${o.no} ${rp(o.total)} ${o.m} ${o.st} ${waktuPendek(o.at)}`).join('; ')}`);
	return out.join('\n');
}

// ─── Modul lain ─────────────────────────────────────────────────────────────

/** @typedef {{ unitId: number | null, unitIds: number[], userId: number }} Lingkup */
/** @typedef {(l: Lingkup) => Promise<{ teks: string, saran: string[] }>} Pemuat */

/** Karyawan milik unit aktif (atau semua unit pemilik). Dulu memakai employees.userId → bisa kosong / campur unit. */
const kondisiKaryawan = (/** @type {Lingkup} */ l) => (l.unitId ? eq(employees.companyId, l.unitId) : inArray(employees.companyId, l.unitIds.length ? l.unitIds : [-1]));

/** @type {Record<string, Pemuat>} */
const MODUL = {
	async piutang({ unitId }) {
		const [pi, hu] = await Promise.all([
			db.select({ no: receivables.nomorInvoice, nominal: receivables.nominal, jt: receivables.jatuhTempo, st: receivables.status }).from(receivables).where(and(eq(receivables.unitId, /** @type {number} */ (unitId)), inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN']))).orderBy(asc(receivables.jatuhTempo)).limit(8),
			db.select({ no: payables.nomorFaktur, nominal: payables.nominal, jt: payables.jatuhTempo, st: payables.status }).from(payables).where(and(eq(payables.unitId, /** @type {number} */ (unitId)), inArray(payables.status, ['BELUM_BAYAR', 'SEBAGIAN']))).orderBy(asc(payables.jatuhTempo)).limit(8)
		]);
		const hariIni = kalender().hariIni;
		const fmt = (/** @type {any} */ x) => `${x.no} ${rp(x.nominal)} jatuh tempo ${tglPendek(x.jt)}${tglPendek(x.jt) < hariIni ? ' (LEWAT)' : ''} ${x.st}`;
		return {
			teks: `PIUTANG BELUM LUNAS: ${pi.length ? pi.map(fmt).join('; ') : 'tidak ada'}\nHUTANG BELUM LUNAS: ${hu.length ? hu.map(fmt).join('; ') : 'tidak ada'}`,
			saran: ['Piutang yang lewat jatuh tempo', 'Total hutang ke supplier']
		};
	},
	async akuntansi({ unitId }) {
		const j = await db.select({ tgl: journalEntries.tanggal, memo: journalEntries.memo, d: journalEntries.totalDebit }).from(journalEntries).where(eq(journalEntries.unitId, /** @type {number} */ (unitId))).orderBy(desc(journalEntries.tanggal)).limit(5);
		return { teks: j.length ? `JURNAL TERAKHIR: ${j.map((x) => `${tglPendek(x.tgl)} ${x.memo || '-'} ${rp(x.d)}`).join('; ')}` : '', saran: ['Status tutup buku'] };
	},
	async tutup_buku({ unitId }) {
		const c = await db.select({ a: closingPeriods.periodStart, b: closingPeriods.periodEnd, st: closingPeriods.status, lr: closingPeriods.labaRugiPeriode }).from(closingPeriods).where(eq(closingPeriods.unitId, /** @type {number} */ (unitId))).orderBy(desc(closingPeriods.id)).limit(3);
		return { teks: `TUTUP BUKU: ${c.length ? c.map((x) => `${tglPendek(x.a)}~${tglPendek(x.b)} ${x.st} laba/rugi ${rp(x.lr)}`).join('; ') : 'belum pernah'}`, saran: ['Laba bersih bulan lalu'] };
	},
	async pelanggan({ unitId }) {
		const u = /** @type {number} */ (unitId);
		const [jml, deals, akt] = await Promise.all([
			db.select({ n: sql`COUNT(*)` }).from(crmContacts).where(eq(crmContacts.unitId, u)),
			db.select({ nama: crmDeals.namaDeal, nilai: crmDeals.nilai, stage: crmDeals.stage }).from(crmDeals).where(and(eq(crmDeals.unitId, u), eq(crmDeals.status, 'open'))).orderBy(desc(crmDeals.nilai)).limit(5),
			db.select({ tipe: crmActivities.tipe, cat: crmActivities.catatan, tgl: crmActivities.tanggal }).from(crmActivities).where(eq(crmActivities.unitId, u)).orderBy(desc(crmActivities.tanggal)).limit(4)
		]);
		const out = [`PELANGGAN (CRM): ${Number(jml[0]?.n || 0)} kontak`];
		if (deals.length) out.push(`Deal terbuka: ${deals.map((d) => `${d.nama} ${rp(d.nilai)} (${d.stage})`).join('; ')}`);
		if (akt.length) out.push(`Aktivitas terakhir: ${akt.map((a) => `${tglPendek(a.tgl)} ${a.tipe}: ${String(a.cat || '-').slice(0, 40)}`).join('; ')}`);
		return { teks: out.join('\n'), saran: ['Deal terbesar yang masih terbuka', 'Pelanggan yang perlu di-follow up'] };
	},
	async karyawan(l) {
		const k = kondisiKaryawan(l);
		const hariIni = kalender().hariIni;
		const [aktif, absen, cuti] = await Promise.all([
			db.select({ nama: employees.fullName, posisi: employees.position, gaji: employees.salary }).from(employees).where(and(k, eq(employees.status, 'active'))).limit(20),
			db.select({ nama: employees.fullName, st: attendance.status, masuk: attendance.checkIn }).from(attendance).innerJoin(employees, eq(attendance.employeeId, employees.id)).where(and(k, gte(attendance.checkIn, hariIni + ' 00:00:00'))).limit(20),
			db.select({ nama: employees.fullName, a: leaveRequests.startDate, b: leaveRequests.endDate }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).where(and(k, eq(leaveRequests.status, 'pending'))).limit(5)
		]);
		const out = [`KARYAWAN AKTIF (${aktif.length}): ${aktif.length ? aktif.map((e) => `${e.nama} (${e.posisi || '-'}, gaji ${rp(e.gaji)})`).join('; ') : 'belum ada'}`];
		out.push(`ABSENSI HARI INI: ${absen.length ? absen.map((a) => `${a.nama} ${a.st} ${waktuPendek(a.masuk).slice(6)}`).join('; ') : 'belum ada yang absen'}`);
		if (cuti.length) out.push(`CUTI MENUNGGU PERSETUJUAN: ${cuti.map((c) => `${c.nama} ${tglPendek(c.a)} s/d ${tglPendek(c.b)}`).join('; ')}`);
		return { teks: out.join('\n'), saran: ['Siapa yang belum absen hari ini?', 'Total gaji karyawan per bulan'] };
	},
	async kpi(l) {
		const r = await db.select({ nama: employees.fullName, bln: employeeKpi.periodMonth, thn: employeeKpi.periodYear, skor: employeeKpi.score }).from(employeeKpi).innerJoin(employees, eq(employeeKpi.employeeId, employees.id)).where(kondisiKaryawan(l)).orderBy(desc(employeeKpi.periodYear), desc(employeeKpi.periodMonth)).limit(8);
		return { teks: `KPI KARYAWAN: ${r.length ? r.map((x) => `${x.nama} ${x.bln}/${x.thn} skor ${x.skor}`).join('; ') : 'belum ada'}`, saran: ['Karyawan dengan KPI tertinggi'] };
	},
	async penggajian(l) {
		const r = await db.select({ nama: employees.fullName, komp: salaryComponents.name, tipe: salaryComponents.type, n: salaryComponents.amount }).from(salaryComponents).innerJoin(employees, eq(salaryComponents.employeeId, employees.id)).where(kondisiKaryawan(l)).limit(12);
		return { teks: `KOMPONEN GAJI: ${r.length ? r.map((x) => `${x.nama}: ${x.komp} (${x.tipe}) ${rp(x.n)}`).join('; ') : 'belum ada'}`, saran: [] };
	},
	async pengadaan({ unitId }) {
		const u = /** @type {number} */ (unitId);
		const [sup, po] = await Promise.all([
			db.select({ nama: suppliers.namaSupplier }).from(suppliers).where(eq(suppliers.unitId, u)).limit(10),
			db.select({ no: purchaseOrders.poNumber, total: purchaseOrders.totalAmount, st: purchaseOrders.status }).from(purchaseOrders).where(and(eq(purchaseOrders.unitId, u), inArray(purchaseOrders.status, ['DRAFT', 'SENT', 'PARTIAL']))).limit(6)
		]);
		return { teks: `SUPPLIER: ${sup.length ? sup.map((s) => s.nama).join(', ') : 'belum ada'}\nPO BELUM SELESAI: ${po.length ? po.map((p) => `${p.no} ${rp(p.total)} ${p.st}`).join('; ') : 'tidak ada'}`, saran: ['Barang yang perlu di-restock'] };
	},
	async aset({ unitId }) {
		const r = await db.select({ nama: fixedAssets.namaAset, oleh: fixedAssets.nilaiPerolehan, buku: fixedAssets.nilaiBuku }).from(fixedAssets).where(eq(fixedAssets.unitId, /** @type {number} */ (unitId))).limit(10);
		return { teks: `ASET TETAP: ${r.length ? r.map((a) => `${a.nama} perolehan ${rp(a.oleh)} nilai buku ${rp(a.buku)}`).join('; ') : 'belum ada'}`, saran: [] };
	},
	async pajak({ unitId }) {
		const r = await db.select({ nama: taxRates.namaPajak, pct: taxRates.persentase, tipe: taxRates.tipe }).from(taxRates).where(and(eq(taxRates.unitId, /** @type {number} */ (unitId)), eq(taxRates.isActive, 1))).limit(5);
		return { teks: `TARIF PAJAK AKTIF: ${r.length ? r.map((x) => `${x.nama} (${x.tipe}) ${x.pct}%`).join('; ') : 'belum diatur'}`, saran: [] };
	},
	async anggaran({ unitId }) {
		const r = await db.select({ thn: budgetItems.tahun, bln: budgetItems.bulan, n: budgetItems.nominal, akun: chartOfAccounts.namaAkun }).from(budgetItems).leftJoin(chartOfAccounts, eq(chartOfAccounts.id, budgetItems.coaId)).where(eq(budgetItems.unitId, /** @type {number} */ (unitId))).orderBy(desc(budgetItems.tahun), desc(budgetItems.bulan)).limit(8);
		return { teks: `ANGGARAN: ${r.length ? r.map((b) => `${b.akun || '-'} ${b.bln}/${b.thn} ${rp(b.n)}`).join('; ') : 'belum diatur'}`, saran: [] };
	},
	async approval({ unitId }) {
		const r = await db.select({ mod: approvalRequests.module, aksi: approvalRequests.actionType, at: approvalRequests.createdAt }).from(approvalRequests).where(and(eq(approvalRequests.unitId, /** @type {number} */ (unitId)), eq(approvalRequests.status, 'PENDING'))).limit(6);
		return { teks: `MENUNGGU PERSETUJUAN: ${r.length ? r.map((a) => `${a.mod} ${a.aksi} ${tglPendek(a.at)}`).join('; ') : 'tidak ada'}`, saran: [] };
	},
	async gudang({ unitId }) {
		const r = await db.select({ st: stockOpname.status, at: stockOpname.createdAt }).from(stockOpname).where(eq(stockOpname.unitId, /** @type {number} */ (unitId))).orderBy(desc(stockOpname.createdAt)).limit(3);
		return { teks: `STOK OPNAME TERAKHIR: ${r.length ? r.map((o) => `${tglPendek(o.at)} ${o.st}`).join('; ') : 'belum pernah'}`, saran: [] };
	},
	async audit({ unitId }) {
		const r = await db.select({ pesan: riwayatAksi.pesan, tipe: riwayatAksi.tipe, waktu: riwayatAksi.waktu }).from(riwayatAksi).where(eq(riwayatAksi.unitId, /** @type {number} */ (unitId))).orderBy(desc(riwayatAksi.waktu)).limit(8);
		return { teks: `LOG AKTIVITAS: ${r.length ? r.map((x) => `${waktuPendek(x.waktu)} ${String(x.pesan).slice(0, 60)}`).join('; ') : 'kosong'}`, saran: [] };
	},
	async sales({ unitId }) {
		const u = /** @type {number} */ (unitId);
		const kal = kalender();
		const [so, target] = await Promise.all([
			db.select({ no: salesOrders.orderNumber, total: salesOrders.totalAmount, st: salesOrders.status }).from(salesOrders).where(eq(salesOrders.unitId, u)).orderBy(desc(salesOrders.createdAt)).limit(5),
			db.select({ target: salesTargets.targetAmount, komisi: salesTargets.komisiPersen, nama: users.username }).from(salesTargets).innerJoin(users, eq(users.id, salesTargets.userId)).where(and(eq(salesTargets.unitId, u), eq(salesTargets.periodMonth, kal.m0 + 1), eq(salesTargets.periodYear, kal.y))).limit(5)
		]);
		return { teks: `SALES ORDER TERBARU: ${so.length ? so.map((o) => `${o.no} ${rp(o.total)} ${o.st}`).join('; ') : 'tidak ada'}\nTARGET BULAN INI: ${target.length ? target.map((x) => `${x.nama} ${rp(x.target)} komisi ${x.komisi}%`).join('; ') : 'belum diatur'}`, saran: [] };
	},
	async marketing({ unitId }) {
		const u = /** @type {number} */ (unitId);
		const [kamp, vc] = await Promise.all([
			db.select({ nama: marketingCampaigns.name, st: marketingCampaigns.status, budget: marketingCampaigns.budget }).from(marketingCampaigns).where(eq(marketingCampaigns.unitId, u)).orderBy(desc(marketingCampaigns.createdAt)).limit(5),
			db.select({ kode: vouchers.code, tipe: vouchers.discountType, nilai: vouchers.discountValue, pakai: vouchers.currentUsage, maks: vouchers.maxUsage }).from(vouchers).where(and(eq(vouchers.unitId, u), eq(vouchers.isActive, true))).limit(5)
		]);
		return { teks: `KAMPANYE: ${kamp.length ? kamp.map((c) => `${c.nama} ${c.st} budget ${rp(c.budget)}`).join('; ') : 'belum ada'}\nVOUCHER AKTIF: ${vc.length ? vc.map((v) => `${v.kode} ${v.nilai}${v.tipe === 'PERCENTAGE' ? '%' : ' rupiah'} dipakai ${v.pakai}/${v.maks || '∞'}`).join('; ') : 'tidak ada'}`, saran: [] };
	},
	async cs({ unitId }) {
		const r = await db.select({ st: supportTickets.status, n: sql`COUNT(*)` }).from(supportTickets).where(eq(supportTickets.unitId, /** @type {number} */ (unitId))).groupBy(supportTickets.status);
		const baru = await db.select({ no: supportTickets.ticketNumber, subjek: supportTickets.subject, pr: supportTickets.priority, st: supportTickets.status }).from(supportTickets).where(and(eq(supportTickets.unitId, /** @type {number} */ (unitId)), inArray(supportTickets.status, ['OPEN', 'IN_PROGRESS']))).orderBy(desc(supportTickets.createdAt)).limit(5);
		return { teks: `TIKET CS: ${r.length ? r.map((s) => `${s.st} ${s.n}`).join(', ') : 'belum ada'}${baru.length ? `\nTIKET TERBUKA: ${baru.map((x) => `#${x.no} ${String(x.subjek).slice(0, 40)} (${x.pr})`).join('; ')}` : ''}`, saran: [] };
	},
	async ecommerce({ unitId }) {
		const r = await db.select({ st: ecommerceOrders.paymentStatus, n: sql`COUNT(*)`, total: sql`SUM(${ecommerceOrders.totalAmount})` }).from(ecommerceOrders).where(eq(ecommerceOrders.unitId, /** @type {number} */ (unitId))).groupBy(ecommerceOrders.paymentStatus);
		return { teks: `ORDER TOKO ONLINE: ${r.length ? r.map((s) => `${s.st} ${s.n} order (${rp(s.total)})`).join('; ') : 'belum ada'}`, saran: [] };
	}
};
