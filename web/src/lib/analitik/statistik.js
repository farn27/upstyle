/**
 * Mesin analisis statistik Bizgrow — murni (tanpa basis data, tanpa model bahasa, tanpa token).
 *
 * Metode:
 *  - Peramalan: Holt-Winters aditif (level + tren + musiman mingguan), parameter α/β/γ dipilih otomatis
 *    lewat pencarian grid yang meminimalkan galat ramalan satu-langkah; interval prediksi 80% dari
 *    simpangan baku residu. Data pendek → rata-rata per hari dalam seminggu.
 *  - Uji balik (backtest): ramalan 7 hari terakhir dibandingkan data asli → WAPE (galat rata-rata
 *    tertimbang) sebagai ukuran akurasi yang jujur.
 *  - Deteksi anomali: rasio (log) terhadap median hari yang sama di minggu-minggu sebelumnya, diskalakan
 *    dengan MAD (median absolute deviation, minimal ±15%) → skor-z robust, tahan terhadap pencilan.
 *  - Pola hari, tren (regresi linier), koefisien variasi, analisis ABC (Pareto), skor kesehatan
 *    berbobot yang setiap komponennya punya alasan.
 */

// ─── Dasar ──────────────────────────────────────────────────────────────────

/** @param {number[]} a */
export const jumlah = (a) => a.reduce((s, x) => s + x, 0);
/** @param {number[]} a */
export const rata = (a) => (a.length ? jumlah(a) / a.length : 0);
/** @param {number[]} a */
export function median(a) {
	if (!a.length) return 0;
	const b = [...a].sort((x, y) => x - y);
	const m = Math.floor(b.length / 2);
	return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}
/** @param {number[]} a */
export function simpanganBaku(a) {
	if (a.length < 2) return 0;
	const r = rata(a);
	return Math.sqrt(jumlah(a.map((x) => (x - r) ** 2)) / (a.length - 1));
}
/** Median absolute deviation, diskalakan agar setara simpangan baku pada data normal. */
export function mad(/** @type {number[]} */ a) {
	const m = median(a);
	return 1.4826 * median(a.map((x) => Math.abs(x - m)));
}
const batas = (/** @type {number} */ x, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

/**
 * Regresi linier sederhana y = a + b·x untuk x = 0..n-1.
 * @param {number[]} y
 * @returns {{ a: number, b: number, r2: number }}
 */
export function regresiLinier(y) {
	const n = y.length;
	if (n < 2) return { a: y[0] || 0, b: 0, r2: 0 };
	const xr = (n - 1) / 2;
	const yr = rata(y);
	let sxy = 0;
	let sxx = 0;
	let syy = 0;
	for (let i = 0; i < n; i++) {
		sxy += (i - xr) * (y[i] - yr);
		sxx += (i - xr) ** 2;
		syy += (y[i] - yr) ** 2;
	}
	const b = sxx ? sxy / sxx : 0;
	return { a: yr - b * xr, b, r2: syy ? (sxy * sxy) / (sxx * syy) : 0 };
}

// ─── Holt-Winters ───────────────────────────────────────────────────────────

/**
 * Holt-Winters aditif. Mengembalikan ramalan satu-langkah untuk setiap titik (setelah inisialisasi)
 * dan ramalan `horizon` langkah ke depan.
 * @param {number[]} y
 * @param {number} m  panjang musim (7 = mingguan)
 * @param {number} alpha @param {number} beta @param {number} gamma
 * @param {number} horizon
 */
export function holtWinters(y, m, alpha, beta, gamma, horizon) {
	const n = y.length;
	const s1 = y.slice(0, m);
	const s2 = y.slice(m, 2 * m);
	let level = rata(s1);
	let tren = (rata(s2) - rata(s1)) / m;
	const musim = s1.map((v) => v - level);
	/** @type {number[]} */
	const satuLangkah = [];
	for (let t = m; t < n; t++) {
		const prediksi = level + tren + musim[t % m];
		satuLangkah.push(prediksi);
		const levelLama = level;
		level = alpha * (y[t] - musim[t % m]) + (1 - alpha) * (level + tren);
		tren = beta * (level - levelLama) + (1 - beta) * tren;
		musim[t % m] = gamma * (y[t] - level) + (1 - gamma) * musim[t % m];
	}
	const ramalan = Array.from({ length: horizon }, (_, h) => level + (h + 1) * tren + musim[(n + h) % m]);
	return { satuLangkah, ramalan, level, tren };
}

const GRID_A = [0.1, 0.2, 0.3, 0.5, 0.7];
const GRID_B = [0, 0.02, 0.05, 0.1, 0.2];
const GRID_G = [0.05, 0.1, 0.2, 0.3, 0.5];

/**
 * Pilih α, β, γ terbaik (galat kuadrat satu-langkah terkecil) lalu ramalkan.
 * @param {number[]} y  deret harian (urut waktu, tanpa hari yang hilang)
 * @param {number} horizon
 * @returns {{ metode: string, ramalan: number[], bawah: number[], atas: number[], sigma: number, parameter: { alpha: number, beta: number, gamma: number } | null }}
 */
export function ramalkan(y, horizon) {
	const m = 7;
	const nonNol = y.filter((v) => v > 0).length;
	// Data pendek/jarang: rata-rata per hari dalam seminggu (lebih stabil daripada model penuh)
	if (y.length < 3 * m || nonNol < m) {
		const perHari = Array.from({ length: m }, (_, d) => rata(y.filter((_, i) => i % m === d)));
		const ramalan = Array.from({ length: horizon }, (_, h) => Math.max(0, perHari[(y.length + h) % m]));
		const resid = y.map((v, i) => v - perHari[i % m]);
		const sigma = simpanganBaku(resid);
		return { metode: 'rata-rata per hari', ramalan, bawah: ramalan.map((v) => Math.max(0, v - 1.28 * sigma)), atas: ramalan.map((v) => v + 1.28 * sigma), sigma, parameter: null };
	}
	let terbaik = { sse: Infinity, a: 0.3, b: 0.05, g: 0.1 };
	for (const a of GRID_A)
		for (const b of GRID_B)
			for (const g of GRID_G) {
				const { satuLangkah } = holtWinters(y, m, a, b, g, 0);
				// abaikan satu musim pertama setelah inisialisasi (masih "panas")
				let sse = 0;
				for (let i = m; i < satuLangkah.length; i++) sse += (y[i + m] - satuLangkah[i]) ** 2;
				if (sse < terbaik.sse) terbaik = { sse, a, b, g };
			}
	const hw = holtWinters(y, m, terbaik.a, terbaik.b, terbaik.g, horizon);
	const resid = hw.satuLangkah.slice(m).map((p, i) => y[i + 2 * m] - p);
	const sigma = simpanganBaku(resid);
	// Ketidakpastian membesar dengan horizon (pendekatan pemulusan eksponensial)
	const lebar = (/** @type {number} */ h) => 1.28 * sigma * Math.sqrt(1 + h * terbaik.a ** 2 * (1 + h * terbaik.b) ** 2);
	const ramalan = hw.ramalan.map((v) => Math.max(0, v));
	return {
		metode: 'Holt-Winters (musiman mingguan)',
		ramalan,
		bawah: ramalan.map((v, h) => Math.max(0, v - lebar(h))),
		atas: ramalan.map((v, h) => v + lebar(h)),
		sigma,
		parameter: { alpha: terbaik.a, beta: terbaik.b, gamma: terbaik.g }
	};
}

/**
 * Uji balik: latih tanpa `uji` hari terakhir, ramalkan, bandingkan.
 * WAPE = Σ|aktual − ramalan| / Σ aktual.
 * @param {number[]} y
 * @param {number} [uji]
 * @returns {{ wape: number | null, hari: number }}
 */
export function ujiBalik(y, uji = 7) {
	if (y.length < 3 * 7 + uji) return { wape: null, hari: 0 };
	const latih = y.slice(0, -uji);
	const aktual = y.slice(-uji);
	const { ramalan } = ramalkan(latih, uji);
	const total = jumlah(aktual);
	if (total <= 0) return { wape: null, hari: uji };
	return { wape: jumlah(aktual.map((a, i) => Math.abs(a - ramalan[i]))) / total, hari: uji };
}

// ─── Anomali ────────────────────────────────────────────────────────────────

/**
 * Hari yang menyimpang dari pola: dibanding median hari yang sama (Senin vs Senin) dalam
 * `minggu` minggu sebelumnya; skala robust = MAD residu.
 * @param {number[]} y
 * @param {string[]} tanggal  sejajar dengan y (YYYY-MM-DD)
 * @param {{ periksa?: number, minggu?: number, ambangZ?: number, minimal?: number }} [opsi]
 * @returns {{ tanggal: string, nilai: number, normal: number, z: number, arah: 'naik' | 'turun' }[]}
 */
export function deteksiAnomali(y, tanggal, opsi = {}) {
	const { periksa = 21, minggu = 6, ambangZ = 3, minimal = 0 } = opsi;
	// Skala rasio (log) agar penyimpangan diukur relatif terhadap besarnya omzet hari itu
	const c = Math.max(1, median(y.filter((v) => v > 0)) * 0.05);
	/** @type {{ i: number, resid: number, normal: number }[]} */
	const resid = [];
	for (let i = 7 * 2; i < y.length; i++) {
		const sebelum = [];
		for (let k = 1; k <= minggu && i - 7 * k >= 0; k++) sebelum.push(y[i - 7 * k]);
		if (sebelum.length < 2) continue;
		const normal = median(sebelum);
		resid.push({ i, resid: Math.log((y[i] + c) / (normal + c)), normal });
	}
	if (resid.length < 7) return [];
	// Variasi normal minimal ±15%: usaha kecil wajar naik-turun, jangan semua dianggap aneh
	const skala = Math.max(mad(resid.map((r) => r.resid)), 0.15);
	const awal = y.length - periksa;
	return resid
		.filter((r) => r.i >= awal)
		.map((r) => ({ tanggal: tanggal[r.i], nilai: y[r.i], normal: r.normal, z: r.resid / skala, arah: /** @type {'naik' | 'turun'} */ (r.resid >= 0 ? 'naik' : 'turun') }))
		.filter((r) => Math.abs(r.z) >= ambangZ && Math.abs(r.nilai - r.normal) >= minimal)
		.sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

// ─── Pola & produk ──────────────────────────────────────────────────────────

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Rata-rata per hari dalam seminggu dan indeksnya terhadap rata-rata keseluruhan.
 * @param {number[]} y
 * @param {string[]} tanggal
 */
export function polaHari(y, tanggal) {
	const kelompok = Array.from({ length: 7 }, () => /** @type {number[]} */ ([]));
	y.forEach((v, i) => kelompok[new Date(tanggal[i] + 'T00:00:00Z').getUTCDay()].push(v));
	const total = rata(y);
	return kelompok.map((k, d) => ({ hari: NAMA_HARI[d], rata: rata(k), indeks: total > 0 ? rata(k) / total : 0, sampel: k.length }));
}

/**
 * Analisis ABC (Pareto): A = penyumbang 80% pendapatan pertama, B = 15% berikutnya, C = sisanya.
 * @template {{ pendapatan: number }} T
 * @param {T[]} produk
 * @returns {(T & { kelas: 'A' | 'B' | 'C', porsi: number })[]}
 */
export function analisisABC(produk) {
	const urut = [...produk].filter((p) => p.pendapatan > 0).sort((a, b) => b.pendapatan - a.pendapatan);
	const total = jumlah(urut.map((p) => p.pendapatan));
	let kumulatif = 0;
	return urut.map((p) => {
		const sebelum = kumulatif;
		kumulatif += p.pendapatan;
		const kelas = sebelum / total < 0.8 ? 'A' : sebelum / total < 0.95 ? 'B' : 'C';
		return { ...p, kelas: /** @type {'A' | 'B' | 'C'} */ (kelas), porsi: total ? p.pendapatan / total : 0 };
	});
}

/**
 * Perubahan relatif dengan penanganan pembagi nol.
 * @param {number} kini @param {number} dulu
 * @returns {number | null}
 */
export const perubahan = (kini, dulu) => (dulu > 0 ? (kini - dulu) / dulu : kini > 0 ? null : 0);

// ─── Skor kesehatan ─────────────────────────────────────────────────────────

/**
 * @typedef {{ kunci: string, nama: string, skor: number, bobot: number, alasan: string }} Komponen
 */

/**
 * Skor kesehatan 0–100 berbobot; komponen tanpa data dilewati dan bobot dinormalkan ulang.
 * @param {{
 *   masuk30: number, keluar30: number, masukSebelum30: number,
 *   saldo: number, keluarBulanan: number,
 *   cvHarian: number | null,
 *   jumlahProduk: number, produkKritis: number,
 *   piutangLewat: number, omzetBulanan: number, adaPiutang: boolean
 * }} d
 * @returns {{ skor: number, nilai: 'A' | 'B' | 'C' | 'D', komponen: Komponen[] }}
 */
export function skorKesehatan(d) {
	/** @type {Komponen[]} */
	const k = [];
	const pct = (/** @type {number} */ x) => `${Math.round(x * 100)}%`;
	if (d.masuk30 > 0) {
		const margin = (d.masuk30 - d.keluar30) / d.masuk30;
		k.push({ kunci: 'profit', nama: 'Profitabilitas', bobot: 25, skor: batas(((margin + 0.1) / 0.5) * 100), alasan: `Selisih kas 30 hari ${pct(margin)} dari pemasukan` });
	}
	if (d.masukSebelum30 > 0 || d.masuk30 > 0) {
		const g = d.masukSebelum30 > 0 ? (d.masuk30 - d.masukSebelum30) / d.masukSebelum30 : 1;
		k.push({ kunci: 'tumbuh', nama: 'Pertumbuhan', bobot: 20, skor: batas(50 + g * 100), alasan: d.masukSebelum30 > 0 ? `Omzet 30 hari ${g >= 0 ? 'naik' : 'turun'} ${pct(Math.abs(g))} dibanding 30 hari sebelumnya` : 'Belum ada data 30 hari sebelumnya' });
	}
	if (d.keluarBulanan > 0) {
		const bulan = d.saldo / d.keluarBulanan;
		k.push({ kunci: 'kas', nama: 'Ketahanan kas', bobot: 20, skor: batas((bulan / 3) * 100), alasan: `Saldo kas cukup untuk ±${Math.max(0, bulan).toFixed(1)} bulan pengeluaran` });
	}
	if (d.cvHarian !== null) {
		k.push({ kunci: 'stabil', nama: 'Stabilitas omzet', bobot: 15, skor: batas(100 - (d.cvHarian - 0.3) * 100), alasan: `Naik-turun omzet harian ${d.cvHarian < 0.5 ? 'rendah' : d.cvHarian < 1 ? 'sedang' : 'tinggi'} (koefisien variasi ${d.cvHarian.toFixed(2)})` });
	}
	if (d.jumlahProduk > 0) {
		const share = d.produkKritis / d.jumlahProduk;
		k.push({ kunci: 'stok', nama: 'Kesehatan stok', bobot: 10, skor: batas(100 - share * 250), alasan: d.produkKritis ? `${d.produkKritis} dari ${d.jumlahProduk} produk di bawah minimum / segera habis` : 'Tidak ada produk kritis' });
	}
	if (d.adaPiutang) {
		const rasio = d.omzetBulanan > 0 ? d.piutangLewat / d.omzetBulanan : d.piutangLewat > 0 ? 1 : 0;
		k.push({ kunci: 'piutang', nama: 'Piutang', bobot: 10, skor: batas(100 - rasio * 200), alasan: d.piutangLewat > 0 ? `Piutang lewat jatuh tempo ${pct(rasio)} dari omzet bulanan` : 'Tidak ada piutang lewat jatuh tempo' });
	}
	const totalBobot = jumlah(k.map((x) => x.bobot)) || 1;
	const skor = Math.round(jumlah(k.map((x) => x.skor * x.bobot)) / totalBobot);
	const nilai = skor >= 80 ? 'A' : skor >= 65 ? 'B' : skor >= 45 ? 'C' : 'D';
	return { skor: k.length ? skor : 0, nilai, komponen: k.map((x) => ({ ...x, skor: Math.round(x.skor) })) };
}
