/**
 * Jawaban instan TANPA model AI (0 token, < 100 ms) untuk pertanyaan fakta sederhana yang jawabannya pasti
 * dari basis data, plus "Cek kesehatan usaha" (insight otomatis). Pertanyaan yang butuh penalaran
 * ("kenapa", "saran", "bandingkan", "strategi") tetap diteruskan ke model.
 */
import { db } from '$lib/server/drizzle';
import { and, asc, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import { transaksi, products, receivables } from '$lib/server/schema';
import { kalender, kalimatTanya, periodeSebelumnya, hariPenuh, geserHari, selisihHari } from '$lib/server/chatKonteks';
import { angkaJendela, angkaSaldoKas, proyeksiBulan, prediksiHabis, rincianAngka, grafikBatang, rp } from '$lib/server/chatData';
import { analisisUnit } from '$lib/server/analitik';

/** Kata yang menandakan pertanyaan butuh penalaran model, bukan sekadar angka. */
const BUTUH_AI = /\b(kenapa|mengapa|knp|analisa|analisis|analisi|saran|sarankan|rekomendasi|strategi|tips|ide|bandingkan|banding|dibanding(kan)?|perbandingan|tren|grafik|naik|turun|cara|gimana\s+cara|bagaimana\s+cara|prediksi|target|evaluasi|jelaskan|penyebab|solusi|kok|apakah\s+bagus|sehat\s+gak|wajar)\b/i;

const ID = (/** @type {number} */ n) => n.toLocaleString('id-ID');
const tanggalId = (/** @type {string} */ ymd) => {
	const [y, m, d] = ymd.split('-').map(Number);
	return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m - 1]} ${y}`;
};
const metrik = (/** @type {string} */ label, /** @type {string} */ nilai, /** @type {string} */ tren = '', /** @type {string} */ warna = 'indigo') =>
	`:::metric{label:"${label}",value:"${nilai}",trend:"${tren}",color:"${warna}"}:::`;
const peringatan = (/** @type {string} */ tipe, /** @type {string} */ judul, /** @type {string} */ isi) => `:::alert{type:"${tipe}",title:"${judul}",msg:"${isi.replace(/"/g, "'")}"}:::`;
const persen = (/** @type {number} */ kini, /** @type {number} */ dulu) => (dulu > 0 ? Math.round(((kini - dulu) / dulu) * 100) : null);
const tandaPersen = (/** @type {number | null} */ p) => (p === null ? '' : `${p > 0 ? '+' : ''}${p}%`);
const CATATAN = '\n\n*⚡ Dihitung langsung dari data, tanpa AI.*';

/**
 * @typedef {{
 *   pesan: string,
 *   unit: { id: number, nama_unit: string, slug: string, modal_awal: unknown, kategori: string | null } | null,
 *   unitIds: number[],
 *   topik: string[],
 *   periode: import('$lib/server/chatKonteks').Periode[],
 *   sekarang?: Date
 * }} MasukanInstan
 * @typedef {{ reply: string, suggestions: string[], chartData?: any, intent: string }} JawabanInstan
 */

/**
 * @param {MasukanInstan} m
 * @returns {Promise<JawabanInstan | null>}
 */
export async function jawabInstan(m) {
	const t = m.pesan.toLowerCase().trim();
	const kal = kalender(m.sekarang);

	if (/^(tolong\s+)?(cek\s+)?(kesehatan|kondisi)\s+(usaha|bisnis|toko|keuangan)|^(insight|briefing)\b|^ringkasan\s+(hari\s+ini|usaha|bisnis)|^(bagaimana|gimana)\s+(kondisi|keadaan)\s+(usaha|bisnis|toko)/.test(t)) {
		return m.unit ? cekKesehatan(m.unit, kal) : null;
	}

	if (BUTUH_AI.test(t) || m.periode.length > 1) return null;
	const pendek = t.split(/\s+/).length <= 7;
	if (!kalimatTanya(t) && !pendek) return null;
	const kondisiTrx = m.unit ? eq(transaksi.unitId, m.unit.id) : inArray(transaksi.unitId, m.unitIds.length ? m.unitIds : [-1]);
	const kondisiProduk = m.unit ? eq(products.unitId, m.unit.id) : inArray(products.unitId, m.unitIds.length ? m.unitIds : [-1]);

	// ── Stok yang perlu di-restock / hampir habis ──
	if (/\b(stok|barang|produk|bahan)\b.*\b(menipis|hampir\s+habis|mau\s+habis|akan\s+habis|segera\s+habis)\b|\b(perlu|harus)\s+(di-?)?restock\b|\brestock\s+apa\b|\bapa\s+(saja\s+)?yang\s+(perlu|harus)\s+(di-?)?(restock|dibeli|belanja)\b/.test(t)) {
		return stokPerluRestock(kondisiTrx, kondisiProduk, kal);
	}

	// ── Stok satu produk ──
	if (/\b(stok|sisa|persediaan)\b/.test(t)) {
		const daftar = await daftarProduk(kondisiProduk);
		const disebut = daftar.filter((d) => d.nama.length >= 3 && t.includes(d.nama.toLowerCase()));
		if (disebut.length) {
			const pred = await prediksiHabis(kondisiTrx, disebut, kal);
			const baris = pred.map((x) => {
				const kapan = x.hari === null ? 'belum ada penjualan 14 hari terakhir' : x.stok === 0 ? '**sudah habis**' : `perkiraan habis **±${x.hari} hari lagi** (laju ${ID(x.laju)}/hari)`;
				return `• **${x.nama}**: stok **${ID(x.stok)}** (minimum ${ID(x.minStok)}) — ${kapan}${x.restock > 0 ? `, saran restock ${ID(x.restock)}` : ''}`;
			});
			return { reply: `${baris.join('\n')}${CATATAN}`, suggestions: ['Apa saja yang perlu di-restock?', 'Produk terlaris bulan ini'], intent: 'instan:stok' };
		}
	}

	// ── Produk terlaris ──
	if (/\b(terlaris|paling\s+laris|paling\s+laku|paling\s+banyak\s+terjual|best\s?seller|produk\s+favorit)\b/.test(t)) {
		const p = m.periode[0] || { label: '30 hari terakhir', mulai: geserHari(kal.hariIni, -29), akhir: kal.besok };
		return terlaris(kondisiTrx, kondisiProduk, p);
	}

	// ── Saldo kas ──
	if (/\bsaldo(\s+kas)?\b/.test(t) && !/\b(bank|rekening|piutang|hutang)\b/.test(t) && m.unit) {
		const s = await angkaSaldoKas(m.unit);
		return {
			reply: `Saldo kas **${m.unit.nama_unit}** saat ini **${rp(s.saldo)}** (sama dengan kartu Saldo Kas di dasbor).\n\n${metrik('Saldo kas', rp(s.saldo), '', s.saldo >= 0 ? 'green' : 'red')}\n\nRinciannya: modal awal ${rp(s.modal)} + total pemasukan ${rp(s.masuk)} − total pengeluaran ${rp(s.keluar)}.${CATATAN}`,
			suggestions: ['Cek kesehatan usaha', 'Pengeluaran terbesar bulan ini'],
			intent: 'instan:saldo'
		};
	}

	// ── Omzet / pengeluaran / selisih untuk satu periode ──
	const mintaMasuk = /\b(omzet|omset|pemasukan|pendapatan|penjualan|penghasilan|uang\s+masuk)\b/.test(t);
	const mintaKeluar = /\b(pengeluaran|biaya|beban|belanja|uang\s+keluar)\b/.test(t);
	const mintaSelisih = /\b(untung|laba|keuntungan|selisih|profit|cuan)\b/.test(t);
	const lain = m.topik.filter((x) => !['keuangan', 'riwayat', 'kasir'].includes(x));
	if ((mintaMasuk || mintaKeluar || mintaSelisih) && !lain.length && !/\b(produk|menu|item|per\s+hari|rata|terbesar|terbanyak|apa\s+saja|untuk\s+apa|dari\s+mana)\b/.test(t)) {
		const p = m.periode[0] || { label: `hari ini`, mulai: kal.hariIni, akhir: kal.besok };
		return angkaPeriode(kondisiTrx, p, kal, { mintaMasuk, mintaKeluar, mintaSelisih }, m.unit?.slug ?? null);
	}
	return null;
}

// ─── Implementasi ───────────────────────────────────────────────────────────

async function daftarProduk(/** @type {any} */ kondisiProduk) {
	const rows = await db
		.select({ id: products.id, nama: products.nama, stok: products.stok, minStok: products.minStok })
		.from(products)
		.where(and(kondisiProduk, isNull(products.deletedAt)))
		.orderBy(asc(products.nama))
		.limit(300);
	return rows.map((r) => ({ id: String(r.id), nama: String(r.nama || ''), stok: Number(r.stok || 0), minStok: Number(r.minStok || 0) }));
}

/**
 * @param {any} kondisiTrx
 * @param {{ label: string, mulai: string, akhir: string }} p
 * @param {ReturnType<typeof kalender>} kal
 * @param {{ mintaMasuk: boolean, mintaKeluar: boolean, mintaSelisih: boolean }} minta
 * @param {string | null} slug
 * @returns {Promise<JawabanInstan>}
 */
async function angkaPeriode(kondisiTrx, p, kal, minta, slug) {
	// Pembanding adil: periode berjalan dipotong s/d kemarin, lalu dibanding periode yang sama sebelumnya
	const penuh = hariPenuh(p, kal);
	const pembanding = penuh ? periodeSebelumnya(penuh, kal) : null;
	const tujuhHari = { label: '7 hari sebelumnya', mulai: geserHari(kal.hariIni, -7), akhir: kal.hariIni };
	/** @type {{ label: string, mulai: string, akhir: string }[]} */
	const jendela = [p];
	if (penuh && pembanding) jendela.push(penuh, pembanding);
	if (p.mulai === kal.hariIni) jendela.push(tujuhHari);
	const hasil = await angkaJendela(kondisiTrx, jendela);
	const kini = hasil[0];
	const kiniPenuh = penuh && pembanding ? hasil[1] : null;
	const lalu = penuh && pembanding ? hasil[2] : null;
	const rata = p.mulai === kal.hariIni ? hasil[hasil.length - 1] : null;
	const semua = !minta.mintaMasuk && !minta.mintaKeluar && minta.mintaSelisih;
	const selisih = kini.masuk - kini.keluar;
	const label = p.label.replace(/\s*\(.*\)$/, '');
	const rentang = selisihHari(p.mulai, p.akhir) > 1 ? ` (${tanggalId(p.mulai)} – ${tanggalId(geserHari(p.akhir, -1))})` : ` (${tanggalId(p.mulai)})`;

	/** @type {string[]} */
	const kalimat = [];
	if (minta.mintaMasuk) kalimat.push(`omzet ${label} **${rp(kini.masuk)}**`);
	if (minta.mintaKeluar) kalimat.push(`pengeluaran **${rp(kini.keluar)}**`);
	if (minta.mintaSelisih || semua) kalimat.push(`selisih pemasukan − pengeluaran **${rp(selisih)}**`);
	let jawab = `${kalimat.join(', ').replace(/^./, (c) => c.toUpperCase())}${rentang}, dari ${ID(kini.n)} transaksi.`;
	if (kini.n === 0) jawab = `Belum ada transaksi tercatat ${label}${rentang}.`;

	const w = [];
	if (minta.mintaMasuk || semua) w.push(metrik('Pemasukan', rp(kini.masuk), kiniPenuh && lalu ? tandaPersen(persen(kiniPenuh.masuk, lalu.masuk)) : '', 'green'));
	if (minta.mintaKeluar || semua) w.push(metrik('Pengeluaran', rp(kini.keluar), kiniPenuh && lalu ? tandaPersen(persen(kiniPenuh.keluar, lalu.keluar)) : '', 'red'));
	if (minta.mintaSelisih) w.push(metrik('Selisih', rp(selisih), '', selisih >= 0 ? 'indigo' : 'red'));

	/** @type {string[]} */
	const tambahan = [];
	if (kiniPenuh && lalu && (kiniPenuh.n > 0 || lalu.n > 0)) {
		const s = kiniPenuh.akhir !== kini.akhir ? ' (hari penuh s/d kemarin)' : '';
		tambahan.push(`Perbandingan${s}: pemasukan ${rp(kiniPenuh.masuk)} vs ${rp(lalu.masuk)} pada ${lalu.label}; pengeluaran ${rp(kiniPenuh.keluar)} vs ${rp(lalu.keluar)}.`);
	}
	if (rata && p.mulai === kal.hariIni) tambahan.push(`Rata-rata harian 7 hari sebelumnya: pemasukan ${rp(rata.masuk / 7)}, pengeluaran ${rp(rata.keluar / 7)}.`);
	if (p.mulai === kal.awalBulan && p.akhir === kal.besok && kini.n > 0) {
		const pr = proyeksiBulan(kini, kal);
		tambahan.push(`Proyeksi akhir bulan dengan laju sekarang: pemasukan ±${rp(pr.masuk)}, pengeluaran ±${rp(pr.keluar)}.`);
	}
	if (minta.mintaSelisih) tambahan.push(`Selisih ini arus kas, belum laba bersih — laba rugi lengkap ada di Laporan Keuangan.`);
	const tautan = slug ? `\n\n[Riwayat Transaksi](/finance/${slug}/history)` : '';
	return {
		reply: `${jawab}\n\n${w.join('\n')}${tambahan.length ? `\n\n${tambahan.join(' ')}` : ''}${tautan}${CATATAN}`,
		suggestions: ['Kenapa bisa begitu?', 'Pengeluaran terbesar bulan ini', 'Cek kesehatan usaha'],
		intent: 'instan:keuangan'
	};
}

/**
 * @param {any} kondisiTrx
 * @param {any} kondisiProduk
 * @param {ReturnType<typeof kalender>} kal
 * @returns {Promise<JawabanInstan>}
 */
async function stokPerluRestock(kondisiTrx, kondisiProduk, kal) {
	const daftar = await daftarProduk(kondisiProduk);
	if (!daftar.length) return { reply: 'Belum ada produk di unit ini kak.', suggestions: ['Cara menambah produk'], intent: 'instan:stok' };
	const pred = await prediksiHabis(kondisiTrx, daftar, kal);
	const perlu = pred.filter((x) => x.stok <= x.minStok || (x.hari !== null && x.hari <= 7));
	if (!perlu.length) {
		return { reply: `Aman kak 👍 Tidak ada produk yang di bawah stok minimum atau diperkirakan habis dalam 7 hari.${CATATAN}`, suggestions: ['Produk terlaris bulan ini'], intent: 'instan:stok' };
	}
	const baris = perlu.slice(0, 10).map((x, i) => {
		const kapan = x.stok === 0 ? '**habis**' : x.hari === null ? 'tidak ada penjualan 14 hari terakhir' : `±${x.hari} hari lagi`;
		return `${i + 1}. **${x.nama}** — stok ${ID(x.stok)}/${ID(x.minStok)}, ${kapan}${x.restock > 0 ? `, restock **${ID(x.restock)}**` : ''}`;
	});
	return {
		reply: `Ada **${perlu.length} produk** yang perlu diperhatikan:\n\n${baris.join('\n')}\n\nJumlah restock = kebutuhan 14 hari dengan laju jual 14 hari terakhir + stok minimum.${CATATAN}`,
		suggestions: ['Produk terlaris bulan ini', 'Cek kesehatan usaha'],
		intent: 'instan:stok'
	};
}

/**
 * @param {any} kondisiTrx
 * @param {any} kondisiProduk
 * @param {{ label: string, mulai: string, akhir: string }} p
 * @returns {Promise<JawabanInstan>}
 */
async function terlaris(kondisiTrx, kondisiProduk, p) {
	const rows = await db
		.select({ nama: products.nama, qty: sql`SUM(COALESCE(${transaksi.qty}, 1))`, total: sql`SUM(${transaksi.nominal})` })
		.from(transaksi)
		.innerJoin(products, and(eq(products.id, transaksi.productId), kondisiProduk))
		.where(and(kondisiTrx, eq(transaksi.kategoriTrx, 'MASUK'), gte(transaksi.tanggal, p.mulai + ' 00:00:00'), lt(transaksi.tanggal, p.akhir + ' 00:00:00')))
		.groupBy(transaksi.productId, products.nama)
		.orderBy(desc(sql`SUM(COALESCE(${transaksi.qty}, 1))`))
		.limit(5);
	const label = p.label.replace(/\s*\(.*\)$/, '');
	if (!rows.length) return { reply: `Belum ada penjualan produk tercatat ${label} kak. Penjualan lewat Kasir atau "jual 2 [produk]" di chat akan terhitung di sini.${CATATAN}`, suggestions: ['Stok yang hampir habis'], intent: 'instan:produk' };
	const baris = rows.map((r, i) => `${i + 1}. **${r.nama}** — ${ID(Number(r.qty))} terjual (${rp(r.total)})`);
	return {
		reply: `Produk terlaris ${label}:\n\n${baris.join('\n')}${CATATAN}`,
		chartData: grafikBatang(rows.map((r) => String(r.nama).slice(0, 18)), [{ label: 'Terjual', data: rows.map((r) => Number(r.qty)) }]),
		suggestions: ['Kenapa produk lain kurang laku?', 'Apa saja yang perlu di-restock?'],
		intent: 'instan:produk'
	};
}

/**
 * Cek kesehatan usaha: angka utama + peringatan otomatis + grafik 14 hari. Tanpa AI.
 * @param {NonNullable<MasukanInstan['unit']>} unit
 * @param {ReturnType<typeof kalender>} kal
 * @returns {Promise<JawabanInstan>}
 */
async function cekKesehatan(unit, kal) {
	const kondisiTrx = eq(transaksi.unitId, unit.id);
	const bulanIni = { label: 'bulan ini', mulai: kal.awalBulan, akhir: kal.besok };
	// Tren bulan ini dihitung dari hari penuh (s/d kemarin) agar dini hari tidak terlihat "turun"
	const bulanPenuh = hariPenuh(bulanIni, kal) || bulanIni;
	const pembanding = /** @type {{ label: string, mulai: string, akhir: string }} */ (periodeSebelumnya(bulanPenuh, kal));
	const mulai14 = geserHari(kal.hariIni, -13);
	const hariExpr = sql`DATE(${transaksi.tanggal})`;

	const [angka, saldo, harian, daftar, piutang, keluarNaik] = await Promise.all([
		angkaJendela(kondisiTrx, [
			{ label: 'hari ini', mulai: kal.hariIni, akhir: kal.besok },
			{ label: '7 hari sebelumnya', mulai: geserHari(kal.hariIni, -7), akhir: kal.hariIni },
			bulanIni,
			pembanding,
			bulanPenuh
		]),
		angkaSaldoKas(unit),
		db
			.select({ hari: hariExpr, masuk: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'MASUK' THEN ${transaksi.nominal} ELSE 0 END), 0)`, keluar: sql`COALESCE(SUM(CASE WHEN ${transaksi.kategoriTrx} = 'KELUAR' THEN ${transaksi.nominal} ELSE 0 END), 0)` })
			.from(transaksi)
			.where(and(kondisiTrx, gte(transaksi.tanggal, mulai14 + ' 00:00:00')))
			.groupBy(hariExpr),
		daftarProduk(eq(products.unitId, unit.id)),
		db
			.select({ n: sql`COUNT(*)`, total: sql`COALESCE(SUM(${receivables.nominal} - COALESCE(${receivables.sudahDibayar}, 0)), 0)` })
			.from(receivables)
			.where(and(eq(receivables.unitId, unit.id), inArray(receivables.status, ['BELUM_BAYAR', 'SEBAGIAN']), sql`${receivables.jatuhTempo} < ${kal.hariIni}`)),
		rincianAngka(kondisiTrx, bulanIni, 'KELUAR', 1)
	]);
	const [hIni, tujuh, bIni, bLalu, bPenuh] = angka;
	const pred = await prediksiHabis(kondisiTrx, daftar, kal);
	const pr = proyeksiBulan(bIni, kal);

	/** @type {string[]} */
	const masalah = [];
	/** @type {string[]} */
	const bagus = [];
	const naikMasuk = persen(bPenuh.masuk, bLalu.masuk);
	const naikKeluar = persen(bPenuh.keluar, bLalu.keluar);
	if (naikMasuk !== null && naikMasuk >= 10) bagus.push(`Omzet bulan ini naik ${naikMasuk}% dibanding periode yang sama bulan lalu.`);
	if (naikMasuk !== null && naikMasuk <= -15) masalah.push(peringatan('warning', 'Omzet turun', `Omzet bulan ini ${naikMasuk}% dibanding periode yang sama bulan lalu (${rp(bPenuh.masuk)} vs ${rp(bLalu.masuk)}, hari penuh).`));
	if (naikKeluar !== null && naikKeluar >= 30 && bIni.keluar > 0) masalah.push(peringatan('warning', 'Pengeluaran naik', `Pengeluaran bulan ini +${naikKeluar}% dibanding periode yang sama bulan lalu. Terbesar: ${keluarNaik[0] ? `${keluarNaik[0].ket.slice(0, 30)} ${rp(keluarNaik[0].total)}` : '-'}.`));
	if (bIni.masuk > 0 && bIni.keluar / bIni.masuk >= 0.8) masalah.push(peringatan('error', 'Margin tipis', `Pengeluaran sudah ${Math.round((bIni.keluar / bIni.masuk) * 100)}% dari pemasukan bulan ini.`));
	else if (bIni.masuk > 0 && bIni.keluar / bIni.masuk <= 0.5) bagus.push(`Pengeluaran hanya ${Math.round((bIni.keluar / bIni.masuk) * 100)}% dari pemasukan bulan ini.`);
	if (saldo.saldo < 0) masalah.push(peringatan('error', 'Saldo kas minus', `Saldo kas ${rp(saldo.saldo)}. Periksa transaksi atau tambahkan modal.`));
	const habis = pred.filter((x) => x.stok === 0 || (x.hari !== null && x.hari <= 3));
	if (habis.length) masalah.push(peringatan('warning', 'Stok segera habis', habis.slice(0, 5).map((x) => `${x.nama} (${x.stok === 0 ? 'habis' : `±${x.hari} hari`})`).join(', ')));
	const pi = piutang[0];
	if (Number(pi?.n || 0) > 0) masalah.push(peringatan('warning', 'Piutang lewat jatuh tempo', `${Number(pi.n)} tagihan, total ${rp(pi.total)}. Segera tagih pelanggan.`));
	if (hIni.n === 0 && Number(kal.jam.slice(0, 2)) >= 12) masalah.push(peringatan('info', 'Belum ada transaksi hari ini', 'Sudah lewat tengah hari. Pastikan penjualan sudah dicatat di Kasir atau chat.'));
	if (hIni.n > 0 && tujuh.masuk > 0 && hIni.masuk >= (tujuh.masuk / 7) * 1.2) bagus.push(`Omzet hari ini sudah di atas rata-rata harian minggu lalu.`);

	const status = masalah.some((x) => x.includes('type:"error"')) ? '🔴 Perlu perhatian' : masalah.length ? '🟡 Ada yang perlu dicek' : '🟢 Sehat';
	const metrikBaris = [
		metrik('Omzet hari ini', rp(hIni.masuk), tujuh.masuk > 0 ? `rata² ${rp(tujuh.masuk / 7)}/hari` : '', 'green'),
		metrik('Omzet bulan ini', rp(bIni.masuk), tandaPersen(naikMasuk), 'green'),
		metrik('Pengeluaran bulan ini', rp(bIni.keluar), tandaPersen(naikKeluar), 'red'),
		metrik('Saldo kas', rp(saldo.saldo), '', saldo.saldo >= 0 ? 'indigo' : 'red')
	];

	// Grafik 14 hari (hari tanpa transaksi = 0)
	const peta = new Map(harian.map((h) => [String(h.hari).slice(0, 10), h]));
	const hari = Array.from({ length: 14 }, (_, i) => geserHari(mulai14, i));
	const grafik = grafikBatang(
		hari.map((d) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`),
		[
			{ label: 'Pemasukan', data: hari.map((d) => Number(peta.get(d)?.masuk || 0)), warna: '#10b981' },
			{ label: 'Pengeluaran', data: hari.map((d) => Number(peta.get(d)?.keluar || 0)), warna: '#f43f5e' }
		],
		'line'
	);

	// Skor & perkiraan dari mesin analisis yang sama dengan dasbor (cache per sidik data)
	/** @type {any} */
	let mesin = null;
	try {
		mesin = await analisisUnit(unit);
	} catch {
		/* pelengkap; abaikan bila gagal */
	}
	const ab = mesin?.prediksi?.akhirBulan;
	// Status mengikuti skor mesin analisis (sama dengan dasbor); temuan di bawah tetap ditampilkan
	const nilaiMesin = mesin?.kesehatan?.komponen?.length ? mesin.kesehatan.nilai : null;
	const statusAkhir = nilaiMesin ? ({ A: '🟢 Sehat', B: '🟢 Cukup sehat', C: '🟡 Perlu dicek', D: '🔴 Perlu perhatian' }[/** @type {'A'|'B'|'C'|'D'} */ (nilaiMesin)] || status) : status;
	const reply = [
		`**Kesehatan ${unit.nama_unit}: ${statusAkhir}${mesin?.kesehatan ? ` · skor ${mesin.kesehatan.skor}/100 (${mesin.kesehatan.nilai})` : ''}**`,
		metrikBaris.join('\n'),
		ab && ab.nilai > 0
			? `📈 Perkiraan omzet akhir bulan (${mesin.prediksi.metode}): ±${rp(ab.nilai)} (kisaran ${rp(ab.bawah)} – ${rp(ab.atas)}).`
			: kal.d < pr.totalHari && bIni.n > 0 ? `📈 Proyeksi akhir bulan: pemasukan ±${rp(pr.masuk)}, pengeluaran ±${rp(pr.keluar)}, selisih ±${rp(pr.masuk - pr.keluar)}.` : '',
		mesin?.kesehatan?.komponen?.filter((/** @type {any} */ c) => c.skor < 50).map((/** @type {any} */ c) => `• ${c.nama}: ${c.alasan}`).join('\n') || '',
		masalah.length ? masalah.join('\n') : '',
		bagus.length ? `✅ ${bagus.join(' ')}` : '',
		`[Dasbor](/finance/${unit.slug}) [Laporan Keuangan](/finance/${unit.slug}/laporan)`
	]
		.filter(Boolean)
		.join('\n\n');
	return {
		reply: reply + CATATAN,
		chartData: grafik,
		suggestions: masalah.length ? ['Apa yang harus saya lakukan dulu?', 'Apa saja yang perlu di-restock?', 'Pengeluaran terbesar bulan ini'] : ['Tips menaikkan omzet', 'Produk terlaris bulan ini'],
		intent: 'instan:kesehatan'
	};
}
