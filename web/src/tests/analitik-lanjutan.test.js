/** Analisis lanjutan: kompetisi model, titik perubahan, gajian, market basket, biaya berulang, penggerak, jam ramai. */
import { describe, it, expect } from 'vitest';
import { ramalkanCerdas, validasiSilang, medianHari, naifMusiman, titikPerubahan, hilangkanEfekHari, efekGajian, aturanAsosiasi, biayaBerulang, penggerakPerubahan, jamRamai } from '$lib/analitik/lanjutan';

const POLA = [1.4, 0.8, 0.9, 0.9, 1.0, 1.1, 1.5];
const awal = Date.parse('2026-07-05T00:00:00Z'); // Minggu
const tanggal = Array.from({ length: 112 }, (_, i) => new Date(awal + i * 86_400_000).toISOString().slice(0, 10));
const deret = tanggal.map((_, i) => Math.round(1_000_000 * POLA[i % 7] * (1 + 0.04 * Math.sin(i * 2.3))));

describe('kompetisi model peramalan', () => {
	it('model dasar menghasilkan ramalan sepanjang horizon dan mengikuti pola hari', () => {
		expect(naifMusiman(deret, 7)).toEqual(deret.slice(-7));
		const m = medianHari(deret, 14);
		expect(m).toHaveLength(14);
		expect(m[(6 - (deret.length % 7) + 7) % 7]).toBeGreaterThan(m[(1 - (deret.length % 7) + 7) % 7]);
	});
	it('validasi silang mengurutkan model dari galat terkecil', () => {
		const cv = validasiSilang(deret);
		expect(cv.length).toBeGreaterThanOrEqual(4);
		for (let i = 1; i < cv.length; i++) expect(cv[i].wape).toBeGreaterThanOrEqual(cv[i - 1].wape);
		expect(cv[0].wape).toBeLessThan(0.1);
	});
	it('ramalan cerdas akurat, kisaran empiris mengapit ramalan, model dicatat', () => {
		const latih = deret.slice(0, 105);
		const r = ramalkanCerdas(latih, 7);
		const aktual = deret.slice(105);
		const wape = aktual.reduce((s, a, i) => s + Math.abs(a - r.ramalan[i]), 0) / aktual.reduce((s, a) => s + a, 0);
		expect(wape).toBeLessThan(0.1);
		r.ramalan.forEach((v, h) => {
			expect(r.bawah[h]).toBeLessThanOrEqual(v);
			expect(r.atas[h]).toBeGreaterThanOrEqual(v);
		});
		expect(r.model.some((m) => m.dipakai)).toBe(true);
		expect(r.metode.length).toBeGreaterThan(3);
	});
	it('data sangat pendek tetap menghasilkan ramalan', () => {
		expect(ramalkanCerdas([100, 0, 50], 7).ramalan).toHaveLength(7);
	});
});

describe('titik perubahan', () => {
	it('menemukan penurunan level 30% dan tidak tertipu pola mingguan', () => {
		const y = deret.slice(0, 60).map((v, i) => (i >= 35 ? v * 0.7 : v));
		const p = titikPerubahan(hilangkanEfekHari(y));
		expect(p).not.toBeNull();
		expect(Math.abs(/** @type {any} */ (p).indeks - 35)).toBeLessThanOrEqual(2);
		expect(/** @type {any} */ (p).ubah).toBeLessThan(-0.2);
		expect(titikPerubahan(hilangkanEfekHari(deret.slice(0, 60)))).toBeNull();
	});
});

describe('efek gajian', () => {
	it('terdeteksi bila omzet tgl 25–5 lebih tinggi', () => {
		const y = deret.map((v, i) => {
			const t = Number(tanggal[i].slice(8, 10));
			return t >= 25 || t <= 5 ? v * 1.3 : v;
		});
		const g = /** @type {any} */ (efekGajian(y, tanggal));
		expect(g.ubah).toBeGreaterThan(0.2);
		expect(g.t).toBeGreaterThan(3);
		expect(Math.abs(/** @type {any} */ (efekGajian(deret, tanggal)).ubah)).toBeLessThan(0.05);
	});
});

describe('market basket', () => {
	it('menemukan pasangan yang sering dibeli bersama (lift > 1)', () => {
		/** @type {string[][]} */
		const k = [];
		for (let i = 0; i < 100; i++) {
			const order = [];
			if (i % 2 === 0) order.push('Bakso', 'Es Jeruk');
			else order.push('Mie Ayam');
			if (i % 5 === 0) order.push('Kerupuk');
			k.push(order);
		}
		const a = aturanAsosiasi(k);
		expect(a[0]).toMatchObject({ bersama: 50 });
		expect([a[0].jika, a[0].maka].sort()).toEqual(['Bakso', 'Es Jeruk']);
		expect(a[0].lift).toBeCloseTo(2, 1);
		expect(aturanAsosiasi(k.slice(0, 10))).toEqual([]);
	});
});

describe('biaya berulang', () => {
	it('sewa bulanan & gaji mingguan terdeteksi, belanja acak tidak', () => {
		const keluar = [
			...['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01'].map((t) => ({ ket: 'Sewa tempat', tanggal: t, nominal: 3_000_000 })),
			...['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24'].map((t) => ({ ket: 'Gaji Budi minggu 1', tanggal: t, nominal: 500_000 })),
			{ ket: 'Servis kompor', tanggal: '2026-10-12', nominal: 450_000 },
			{ ket: 'Servis kompor', tanggal: '2026-11-08', nominal: 1_200_000 }
		];
		const b = biayaBerulang(keluar);
		expect(b.map((x) => x.periode)).toEqual(['bulanan', 'mingguan']);
		expect(b[0]).toMatchObject({ nominal: 3_000_000, berikutnya: '2026-12-01' });
		expect(b[1].perBulan).toBeGreaterThan(2_000_000);
	});
});

describe('penggerak & jam ramai', () => {
	it('penggerak perubahan diurutkan dari pengaruh terbesar', () => {
		const r = penggerakPerubahan([
			{ nama: 'A', kini: 100, dulu: 300 },
			{ nama: 'B', kini: 150, dulu: 100 },
			{ nama: 'C', kini: 10, dulu: 10 }
		]);
		expect(r.total).toBe(-150);
		expect(r.penggerak[0]).toMatchObject({ nama: 'A', selisih: -200 });
		expect(r.penggerak.map((p) => p.nama)).toEqual(['A', 'B']);
	});
	it('jam ramai: jendela 2 jam terbesar', () => {
		const h = Array(24).fill(0);
		h[11] = 30; h[12] = 40; h[18] = 20; h[9] = 5;
		expect(jamRamai(h)).toMatchObject({ mulai: 11, akhir: 13, sepi: 9 });
		expect(jamRamai(Array(24).fill(0))).toBeNull();
	});
});
