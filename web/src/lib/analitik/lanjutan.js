/**
 * Mesin analisis lanjutan Bizgrow — murni (tanpa basis data, tanpa model bahasa, tanpa token).
 *
 *  - Kompetisi model peramalan: Holt-Winters, naif musiman, median per hari, pemulusan eksponensial
 *    terdeseasonalisasi, dan regresi tren+musim diuji dengan validasi silang bergulir (3 titik asal ×
 *    7 hari). Model terbaik dipakai; bila beberapa model sama baiknya, ramalan digabung (ensemble)
 *    berbobot kebalikan galat. Kisaran prediksi empiris dari galat validasi.
 *  - Titik perubahan (change point): pemisahan dua segmen dengan statistik-t terbesar.
 *  - Efek gajian: omzet tanggal 25–5 vs 6–24.
 *  - Aturan asosiasi (market basket): support, confidence, lift pasangan produk.
 *  - Biaya berulang: pengeluaran dengan keterangan & nominal mirip yang muncul berkala.
 *  - Penggerak perubahan: kontribusi tiap produk terhadap selisih omzet dua periode.
 */
import { holtWinters, rata, median, jumlah, simpanganBaku, regresiLinier } from '$lib/analitik/statistik';

const M = 7;

// ─── Model-model peramalan ──────────────────────────────────────────────────

/** @typedef {(y: number[], h: number) => number[]} Model */

/** Naif musiman: sama dengan hari yang sama minggu lalu. @type {Model} */
export const naifMusiman = (y, h) => Array.from({ length: h }, (_, i) => y[y.length - M + (i % M)] ?? 0);

/** Median hari yang sama 4 minggu terakhir (tahan pencilan). @type {Model} */
export const medianHari = (y, h) =>
	Array.from({ length: h }, (_, i) => {
		const hari = (y.length + i) % M;
		const v = [];
		for (let j = y.length - 1; j >= 0 && v.length < 4; j--) if (j % M === hari) v.push(y[j]);
		return median(v);
	});

/** Pemulusan eksponensial pada deret terdeseasonalisasi (indeks musim multiplikatif 8 minggu). @type {Model} */
export const sesMusiman = (y, h) => {
	const w = y.slice(-56);
	const rt = rata(w) || 1;
	const indeks = Array.from({ length: M }, (_, d) => {
		const v = w.filter((_, i) => (y.length - w.length + i) % M === d);
		return v.length ? (rata(v) || 0) / rt : 1;
	});
	let level = y[0] / (indeks[0] || 1) || 0;
	const a = 0.25;
	for (let t = 1; t < y.length; t++) {
		const s = indeks[t % M] || 1;
		level = a * (y[t] / s) + (1 - a) * level;
	}
	return Array.from({ length: h }, (_, i) => level * (indeks[(y.length + i) % M] || 1));
};

/** Regresi tren linier + efek hari (aditif), dilatih 8 minggu terakhir. @type {Model} */
export const regresiMusim = (y, h) => {
	const w = y.slice(-56);
	const awal = y.length - w.length;
	const efek = Array.from({ length: M }, (_, d) => {
		const v = w.filter((_, i) => (awal + i) % M === d);
		return rata(v) - rata(w);
	});
	const terdes = w.map((v, i) => v - efek[(awal + i) % M]);
	const { a, b } = regresiLinier(terdes);
	return Array.from({ length: h }, (_, i) => a + b * (w.length + i) + efek[(y.length + i) % M]);
};

/** Holt-Winters dengan parameter tetap yang wajar (pencarian grid dilakukan di ramalkan()). @type {Model} */
export const hwTetap = (y, h) => holtWinters(y, M, 0.2, 0.02, 0.1, h).ramalan;

export const MODEL = /** @type {const} */ ([
	{ kunci: 'hw', nama: 'Holt-Winters', fn: hwTetap, minimal: 3 * M },
	{ kunci: 'regresi', nama: 'Regresi tren + musim', fn: regresiMusim, minimal: 3 * M },
	{ kunci: 'ses', nama: 'Pemulusan eksponensial musiman', fn: sesMusiman, minimal: 2 * M },
	{ kunci: 'median', nama: 'Median hari yang sama', fn: medianHari, minimal: 2 * M },
	{ kunci: 'naif', nama: 'Naif musiman', fn: naifMusiman, minimal: M }
]);

/**
 * Validasi silang bergulir: untuk setiap titik asal, latih pada data sebelum titik itu, ramalkan 7 hari,
 * hitung galat. Mengembalikan WAPE per model dan galat relatif per horizon (untuk kisaran empiris).
 * @param {number[]} y
 * @param {number} [asal]  jumlah titik asal
 */
export function validasiSilang(y, asal = 3) {
	/** @type {{ kunci: string, nama: string, wape: number, galat: number[][] }[]} */
	const hasil = [];
	for (const m of MODEL) {
		let absErr = 0;
		let total = 0;
		/** @type {number[][]} galat relatif per horizon */
		const galat = Array.from({ length: M }, () => /** @type {number[]} */ ([]));
		let cukup = true;
		for (let o = asal; o >= 1; o--) {
			const potong = y.length - o * M;
			if (potong < m.minimal) {
				cukup = false;
				break;
			}
			const latih = y.slice(0, potong);
			const aktual = y.slice(potong, potong + M);
			const r = m.fn(latih, M).map((v) => Math.max(0, v));
			// galat relatif terhadap max(ramalan, rata-rata data latih) agar ramalan ≈ 0 tidak meledakkan rasio;
			// dibatasi [-100%, +200%] supaya kisaran tetap masuk akal
			const skala = Math.max(1, rata(latih.slice(-28)));
			aktual.forEach((a, i) => {
				absErr += Math.abs(a - r[i]);
				total += a;
				galat[i].push(Math.max(-1, Math.min(2, (a - r[i]) / Math.max(r[i], skala))));
			});
		}
		if (cukup && total > 0) hasil.push({ kunci: m.kunci, nama: m.nama, wape: absErr / total, galat });
	}
	return hasil.sort((a, b) => a.wape - b.wape);
}

/**
 * Peramalan kompetisi model + ensemble + kisaran empiris (persentil 10–90 galat validasi).
 * @param {number[]} y
 * @param {number} horizon
 */
export function ramalkanCerdas(y, horizon) {
	const cv = validasiSilang(y);
	if (!cv.length) {
		const r = medianHari(y.length >= M ? y : [...Array(M - y.length).fill(0), ...y], horizon);
		return { metode: 'Median hari yang sama', model: [], ramalan: r, bawah: r.map((v) => v * 0.5), atas: r.map((v) => v * 1.5), wape: null };
	}
	const terbaik = cv[0];
	// Ensemble: model dengan galat ≤ 1,15 × galat terbaik, bobot ∝ 1/galat²
	const peserta = cv.filter((c) => c.wape <= terbaik.wape * 1.15).slice(0, 3);
	const bobot = peserta.map((c) => 1 / Math.max(c.wape, 0.01) ** 2);
	const totalBobot = jumlah(bobot);
	const ramalanTiap = peserta.map((c) => {
		const fn = MODEL.find((m) => m.kunci === c.kunci)?.fn ?? naifMusiman;
		return fn(y, horizon).map((v) => Math.max(0, v));
	});
	const ramalan = Array.from({ length: horizon }, (_, h) => jumlah(ramalanTiap.map((r, i) => r[h] * bobot[i])) / totalBobot);
	// galat relatif gabungan dari model peserta, per posisi hari ke-(h mod 7)
	const kuantil = (/** @type {number[]} */ a, /** @type {number} */ q) => {
		if (!a.length) return 0;
		const b = [...a].sort((x, z) => x - z);
		return b[Math.min(b.length - 1, Math.max(0, Math.round(q * (b.length - 1))))];
	};
	const galatGabung = Array.from({ length: M }, (_, i) => peserta.flatMap((p) => p.galat[i]));
	const semuaGalat = galatGabung.flat();
	// kisaran absolut: galat relatif × max(ramalan, rata-rata 4 minggu) (konsisten dengan cara galat dihitung)
	const skalaRamal = Math.max(1, rata(y.slice(-28)));
	const bawah = ramalan.map((v, h) => {
		const g = galatGabung[h % M].length >= 3 ? galatGabung[h % M] : semuaGalat;
		return Math.max(0, v + Math.min(0, kuantil(g, 0.1)) * Math.max(v, skalaRamal));
	});
	const atas = ramalan.map((v, h) => {
		const g = galatGabung[h % M].length >= 3 ? galatGabung[h % M] : semuaGalat;
		return v + Math.max(0, kuantil(g, 0.9)) * Math.max(v, skalaRamal);
	});
	const wapeGabung = peserta.length > 1 ? jumlah(peserta.map((p, i) => p.wape * bobot[i])) / totalBobot : terbaik.wape;
	return {
		metode: peserta.length > 1 ? `Ensemble ${peserta.map((p) => p.nama).join(' + ')}` : terbaik.nama,
		model: cv.map((c) => ({ kunci: c.kunci, nama: c.nama, galat: Math.round(c.wape * 100), dipakai: peserta.some((p) => p.kunci === c.kunci), bobot: peserta.some((p) => p.kunci === c.kunci) ? Math.round((bobot[peserta.findIndex((p) => p.kunci === c.kunci)] / totalBobot) * 100) : 0 })),
		ramalan,
		bawah,
		atas,
		wape: wapeGabung
	};
}

// ─── Titik perubahan ────────────────────────────────────────────────────────

/**
 * Cari satu titik perubahan level pada deret (mis. 60 hari terakhir) — pemisahan dua segmen dengan
 * statistik-t Welch terbesar. Deret sebaiknya sudah dibersihkan dari efek hari (rasio terhadap rata hari).
 * @param {number[]} y
 * @param {{ minimalSegmen?: number, ambangT?: number, ambangUbah?: number }} [opsi]
 * @returns {{ indeks: number, sebelum: number, sesudah: number, ubah: number, t: number } | null}
 */
export function titikPerubahan(y, opsi = {}) {
	const { minimalSegmen = 10, ambangT = 3.5, ambangUbah = 0.15 } = opsi;
	if (y.length < minimalSegmen * 2) return null;
	/** @type {{ indeks: number, sebelum: number, sesudah: number, ubah: number, t: number } | null} */
	let terbaik = null;
	for (let k = minimalSegmen; k <= y.length - minimalSegmen; k++) {
		const a = y.slice(0, k);
		const b = y.slice(k);
		const ra = rata(a);
		const rb = rata(b);
		const se = Math.sqrt(simpanganBaku(a) ** 2 / a.length + simpanganBaku(b) ** 2 / b.length) || 1e-9;
		const t = Math.abs(rb - ra) / se;
		if (!terbaik || t > terbaik.t) terbaik = { indeks: k, sebelum: ra, sesudah: rb, ubah: ra > 0 ? (rb - ra) / ra : 0, t };
	}
	if (!terbaik || terbaik.t < ambangT || Math.abs(terbaik.ubah) < ambangUbah) return null;
	return terbaik;
}

/**
 * Hilangkan efek hari dalam seminggu (rasio terhadap rata-rata hari itu) agar titik perubahan
 * tidak tertukar dengan pola Sabtu-Minggu.
 * @param {number[]} y
 */
export function hilangkanEfekHari(y) {
	const r = rata(y) || 1;
	const indeks = Array.from({ length: M }, (_, d) => (rata(y.filter((_, i) => i % M === d)) || r) / r);
	return y.map((v, i) => v / (indeks[i % M] || 1));
}

// ─── Efek gajian ────────────────────────────────────────────────────────────

/**
 * Bandingkan omzet harian pada masa gajian (tgl 25–akhir & 1–5) vs tanggal lain.
 * @param {number[]} y
 * @param {string[]} tanggal
 * @returns {{ gajian: number, biasa: number, ubah: number, t: number } | null}
 */
export function efekGajian(y, tanggal) {
	if (y.length < 56) return null;
	const deret = hilangkanEfekHari(y);
	/** @type {number[]} */
	const g = [];
	/** @type {number[]} */
	const b = [];
	tanggal.forEach((d, i) => {
		const tgl = Number(d.slice(8, 10));
		(tgl >= 25 || tgl <= 5 ? g : b).push(deret[i]);
	});
	if (g.length < 14 || b.length < 14) return null;
	const se = Math.sqrt(simpanganBaku(g) ** 2 / g.length + simpanganBaku(b) ** 2 / b.length) || 1e-9;
	const ubah = rata(b) > 0 ? (rata(g) - rata(b)) / rata(b) : 0;
	return { gajian: rata(g), biasa: rata(b), ubah, t: (rata(g) - rata(b)) / se };
}

// ─── Market basket ──────────────────────────────────────────────────────────

/**
 * Aturan asosiasi pasangan produk dari daftar keranjang.
 * @param {string[][]} keranjang  setiap elemen = nama produk dalam satu order
 * @param {{ minimalBersama?: number, minimalLift?: number }} [opsi]
 * @returns {{ jika: string, maka: string, bersama: number, support: number, confidence: number, lift: number }[]}
 */
export function aturanAsosiasi(keranjang, opsi = {}) {
	const { minimalBersama = 5, minimalLift = 1.2 } = opsi;
	const unik = keranjang.map((k) => [...new Set(k)]).filter((k) => k.length);
	const n = unik.length;
	if (n < 20) return [];
	/** @type {Map<string, number>} */
	const satu = new Map();
	/** @type {Map<string, number>} */
	const dua = new Map();
	for (const k of unik) {
		for (const a of k) satu.set(a, (satu.get(a) || 0) + 1);
		for (let i = 0; i < k.length; i++)
			for (let j = i + 1; j < k.length; j++) {
				const kunci = [k[i], k[j]].sort().join('\u0000');
				dua.set(kunci, (dua.get(kunci) || 0) + 1);
			}
	}
	/** @type {{ jika: string, maka: string, bersama: number, support: number, confidence: number, lift: number }[]} */
	const aturan = [];
	for (const [kunci, c] of dua) {
		if (c < minimalBersama) continue;
		const [a, b] = kunci.split('\u0000');
		for (const [x, z] of [[a, b], [b, a]]) {
			const confidence = c / (satu.get(x) || 1);
			const lift = confidence / ((satu.get(z) || 1) / n);
			if (lift >= minimalLift) aturan.push({ jika: x, maka: z, bersama: c, support: c / n, confidence, lift });
		}
	}
	return aturan.sort((p, q) => q.lift * q.confidence - p.lift * p.confidence);
}

// ─── Biaya berulang ─────────────────────────────────────────────────────────

/**
 * Deteksi pengeluaran berulang (sewa, gaji, langganan): keterangan sama, nominal mirip (CV < 0,25),
 * jarak antarkejadian teratur (mingguan ±2 hari atau bulanan 26–35 hari).
 * @param {{ ket: string, tanggal: string, nominal: number }[]} keluar
 * @returns {{ ket: string, nominal: number, periode: 'mingguan' | 'bulanan', perBulan: number, berikutnya: string, kali: number }[]}
 */
export function biayaBerulang(keluar) {
	/** @type {Map<string, { tanggal: string, nominal: number }[]>} */
	const grup = new Map();
	for (const k of keluar) {
		const kunci = String(k.ket || '').trim().toUpperCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');
		if (!kunci || kunci === '-') continue;
		const g = grup.get(kunci) || [];
		g.push({ tanggal: k.tanggal.slice(0, 10), nominal: Number(k.nominal) || 0 });
		grup.set(kunci, g);
	}
	/** @type {{ ket: string, nominal: number, periode: 'mingguan' | 'bulanan', perBulan: number, berikutnya: string, kali: number }[]} */
	const hasil = [];
	for (const [ket, g] of grup) {
		// satu kejadian per hari
		const perHari = [...new Map(g.map((x) => [x.tanggal, x])).values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
		if (perHari.length < 2) continue;
		const nominal = perHari.map((x) => x.nominal);
		const cv = simpanganBaku(nominal) / (rata(nominal) || 1);
		if (cv > 0.25) continue;
		const jarak = perHari.slice(1).map((x, i) => (Date.parse(x.tanggal) - Date.parse(perHari[i].tanggal)) / 86_400_000);
		const mj = median(jarak);
		const teratur = (/** @type {number} */ lo, /** @type {number} */ hi) => jarak.every((j) => j >= lo && j <= hi);
		/** @type {'mingguan' | 'bulanan' | null} */
		const periode = mj >= 26 && mj <= 35 && teratur(24, 37) ? 'bulanan' : mj >= 5 && mj <= 9 && teratur(4, 10) && perHari.length >= 3 ? 'mingguan' : null;
		if (!periode) continue;
		const terakhir = perHari[perHari.length - 1].tanggal;
		// bulanan: tanggal yang sama bulan berikutnya (dipotong ke akhir bulan); mingguan: + jarak median
		const [ty, tm, td] = terakhir.split('-').map(Number);
		const berikutnya =
			periode === 'bulanan'
				? new Date(Date.UTC(ty, tm, Math.min(td, new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()))).toISOString().slice(0, 10)
				: new Date(Date.parse(terakhir + 'T00:00:00Z') + Math.round(mj) * 86_400_000).toISOString().slice(0, 10);
		const nom = median(nominal);
		hasil.push({ ket, nominal: nom, periode, perBulan: periode === 'bulanan' ? nom : nom * (30 / mj), berikutnya, kali: perHari.length });
	}
	return hasil.sort((a, b) => b.perBulan - a.perBulan);
}

// ─── Penggerak perubahan ────────────────────────────────────────────────────

/**
 * Kontribusi tiap produk terhadap selisih pendapatan dua periode (diurutkan dari pengaruh terbesar).
 * @param {{ nama: string, kini: number, dulu: number }[]} produk
 * @returns {{ total: number, penggerak: { nama: string, selisih: number, porsi: number }[] }}
 */
export function penggerakPerubahan(produk) {
	const total = jumlah(produk.map((p) => p.kini - p.dulu));
	const penggerak = produk
		.map((p) => ({ nama: p.nama, selisih: p.kini - p.dulu }))
		.filter((p) => p.selisih !== 0)
		.sort((a, b) => Math.abs(b.selisih) - Math.abs(a.selisih))
		.map((p) => ({ ...p, porsi: total !== 0 ? p.selisih / total : 0 }));
	return { total, penggerak };
}

/**
 * Jam ramai dari histogram transaksi per jam: jendela 2 jam dengan porsi terbesar.
 * @param {number[]} perJam  panjang 24
 * @returns {{ mulai: number, akhir: number, porsi: number, sepi: number } | null}
 */
export function jamRamai(perJam) {
	const total = jumlah(perJam);
	if (total < 30 || perJam.filter((v) => v > 0).length < 3) return null;
	let terbaik = { mulai: 0, porsi: 0 };
	for (let j = 0; j < 24; j++) {
		const p = (perJam[j] + perJam[(j + 1) % 24]) / total;
		if (p > terbaik.porsi) terbaik = { mulai: j, porsi: p };
	}
	const buka = perJam.map((v, j) => ({ v, j })).filter((x) => x.v > 0);
	const sepi = buka.sort((a, b) => a.v - b.v)[0]?.j ?? 0;
	return { mulai: terbaik.mulai, akhir: (terbaik.mulai + 2) % 24, porsi: terbaik.porsi, sepi };
}
