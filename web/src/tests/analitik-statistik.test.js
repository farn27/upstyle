/** Mesin statistik dasbor: peramalan, uji balik, anomali, pola hari, ABC, skor kesehatan. */
import { describe, it, expect } from 'vitest';
import { median, mad, regresiLinier, ramalkan, ujiBalik, deteksiAnomali, polaHari, analisisABC, skorKesehatan, holtWinters } from '$lib/analitik/statistik';

// Deret sintetis: pola mingguan (Sabtu/Minggu ramai) + tren naik + derau kecil deterministik
const POLA = [1.4, 0.8, 0.9, 0.9, 1.0, 1.1, 1.5]; // Minggu..Sabtu
const awal = Date.parse('2026-08-02T00:00:00Z'); // Minggu
const tanggal = Array.from({ length: 84 }, (_, i) => new Date(awal + i * 86_400_000).toISOString().slice(0, 10));
const deret = tanggal.map((_, i) => Math.round(1_000_000 * POLA[i % 7] * (1 + i * 0.004) * (1 + 0.03 * Math.sin(i * 1.7))));

describe('dasar', () => {
	it('median, MAD, regresi', () => {
		expect(median([5, 1, 3])).toBe(3);
		expect(median([1, 2, 3, 4])).toBe(2.5);
		expect(mad([1, 1, 1, 1, 100])).toBe(0); // tahan pencilan
		const r = regresiLinier([2, 4, 6, 8]);
		expect(r.b).toBeCloseTo(2);
		expect(r.r2).toBeCloseTo(1);
	});
});

describe('peramalan Holt-Winters', () => {
	it('menangkap pola mingguan dan tren dengan galat kecil', () => {
		const latih = deret.slice(0, 77);
		const { ramalan, metode, parameter } = ramalkan(latih, 7);
		expect(metode).toMatch(/Holt-Winters/);
		expect(parameter).not.toBeNull();
		const aktual = deret.slice(77);
		const wape = aktual.reduce((s, a, i) => s + Math.abs(a - ramalan[i]), 0) / aktual.reduce((s, a) => s + a, 0);
		expect(wape).toBeLessThan(0.08);
		// Sabtu (indeks 6) lebih ramai daripada Senin (indeks 1)
		const idxSabtu = ramalan.findIndex((_, h) => (77 + h) % 7 === 6);
		const idxSenin = ramalan.findIndex((_, h) => (77 + h) % 7 === 1);
		expect(ramalan[idxSabtu]).toBeGreaterThan(ramalan[idxSenin] * 1.4);
	});
	it('interval prediksi melebar dan tidak negatif', () => {
		const { bawah, atas, ramalan } = ramalkan(deret, 14);
		expect(atas[13] - bawah[13]).toBeGreaterThanOrEqual(atas[0] - bawah[0]);
		expect(Math.min(...bawah)).toBeGreaterThanOrEqual(0);
		ramalan.forEach((v, h) => expect(v).toBeGreaterThanOrEqual(bawah[h]));
	});
	it('data pendek memakai rata-rata per hari', () => {
		expect(ramalkan([0, 0, 50_000, 0, 20_000, 0, 0, 10_000], 3).metode).toBe('rata-rata per hari');
	});
	it('uji balik menghasilkan WAPE', () => {
		const u = ujiBalik(deret, 7);
		expect(u.wape).not.toBeNull();
		expect(/** @type {number} */ (u.wape)).toBeLessThan(0.1);
		expect(ujiBalik(deret.slice(0, 20), 7).wape).toBeNull();
	});
	it('holtWinters menghasilkan ramalan satu-langkah sejumlah n - m', () => {
		expect(holtWinters(deret, 7, 0.3, 0.05, 0.1, 0).satuLangkah).toHaveLength(deret.length - 7);
	});
});

describe('deteksi anomali', () => {
	it('menandai hari yang jauh dari pola hari yang sama, bukan hari ramai biasa', () => {
		const y = [...deret];
		y[80] = Math.round(y[80] * 0.15); // anjlok
		const a = deteksiAnomali(y, tanggal, { periksa: 21 });
		expect(a[0]).toMatchObject({ tanggal: tanggal[80], arah: 'turun' });
		// Sabtu ramai yang normal tidak ditandai
		expect(a.some((x) => new Date(x.tanggal + 'T00:00:00Z').getUTCDay() === 6 && x.arah === 'naik')).toBe(false);
	});
});

describe('pola & produk', () => {
	it('pola hari: Sabtu paling ramai', () => {
		const p = polaHari(deret, tanggal);
		const top = [...p].sort((a, b) => b.rata - a.rata)[0];
		expect(top.hari).toBe('Sabtu');
	});
	it('ABC: penyumbang 80% pertama kelas A', () => {
		const r = analisisABC([
			{ nama: 'x', pendapatan: 700 },
			{ nama: 'y', pendapatan: 200 },
			{ nama: 'z', pendapatan: 60 },
			{ nama: 'w', pendapatan: 40 },
			{ nama: 'nol', pendapatan: 0 }
		]);
		expect(r.map((x) => x.kelas)).toEqual(['A', 'A', 'B', 'C']);
	});
});

describe('skor kesehatan', () => {
	it('usaha sehat mendapat nilai tinggi, usaha rugi rendah; komponen tanpa data dilewati', () => {
		const sehat = skorKesehatan({ masuk30: 30e6, keluar30: 15e6, masukSebelum30: 25e6, saldo: 60e6, keluarBulanan: 15e6, cvHarian: 0.35, jumlahProduk: 10, produkKritis: 0, piutangLewat: 0, omzetBulanan: 30e6, adaPiutang: true });
		const rugi = skorKesehatan({ masuk30: 10e6, keluar30: 14e6, masukSebelum30: 20e6, saldo: 2e6, keluarBulanan: 14e6, cvHarian: 1.4, jumlahProduk: 10, produkKritis: 6, piutangLewat: 5e6, omzetBulanan: 10e6, adaPiutang: true });
		expect(sehat.nilai).toBe('A');
		expect(rugi.nilai).toBe('D');
		const tanpaProduk = skorKesehatan({ masuk30: 1e6, keluar30: 5e5, masukSebelum30: 1e6, saldo: 1e6, keluarBulanan: 5e5, cvHarian: null, jumlahProduk: 0, produkKritis: 0, piutangLewat: 0, omzetBulanan: 1e6, adaPiutang: false });
		expect(tanpaProduk.komponen.map((k) => k.kunci)).toEqual(['profit', 'tumbuh', 'kas']);
		expect(sehat.komponen.every((k) => k.alasan.length > 5)).toBe(true);
	});
});
