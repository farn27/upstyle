/** Pembersih ketikan chat AI: singkatan, salah ketik, angka dalam kata, dan tanya balik dengan pilihan. */
import { describe, it, expect } from 'vitest';
import { normalisasi, angkaDariKata, koreksiKata, jarakEdit, tebakMaksud, tidakDikenali, ambilPilihan } from '$lib/server/chatNormal';
import { perintahTransaksi, periodeDariTeks, deteksiTopik, tanggalDariTeks, arahDariTeks } from '$lib/server/chatKonteks';

const KINI = new Date('2026-11-13T09:00:00Z');
const n = (/** @type {string} */ t) => normalisasi(t).teks;

describe('normalisasi ketikan', () => {
	it('singkatan & bahasa chat', () => {
		expect(n('brp pndptn kmrn')).toBe('berapa pendapatan kemarin');
		expect(n('tlg liat stock yg mau habis')).toBe('tolong lihat stok yang mau habis');
		expect(n('omset bln ini gmn')).toBe('omzet bulan ini gimana');
	});
	it('salah ketik (Damerau-Levenshtein) hanya ke kata kunci, kata biasa tidak diubah', () => {
		expect(n('pendaptaan novmber')).toBe('pendapatan november');
		expect(n('pengluaran kemarn')).toBe('pengeluaran kemarin');
		expect(koreksiKata('bukan')).toBeNull();
		expect(koreksiKata('pesan')).toBeNull();
		expect(koreksiKata('bebas')).toBeNull();
		expect(jarakEdit('pendaptaan', 'pendapatan')).toBe(1);
	});
	it('huruf berulang & kata dempet', () => {
		expect(n('omzeeet tanggal11 brp')).toBe('omzet tanggal 11 berapa');
		expect(n('omst 11nov')).toBe('omzet 11 nov');
		expect(n('beli 2pcs 22oz 50rb')).toBe('beli 2pcs 22oz 50rb');
	});
	it('angka dalam kata', () => {
		expect(angkaDariKata('empat ratus ribu')).toBe('400000');
		expect(angkaDariKata('dua ratus lima puluh ribu')).toBe('250000');
		expect(angkaDariKata('sejuta lima ratus ribu')).toBe('1500000');
		expect(angkaDariKata('setengah juta')).toBe('500000');
		expect(angkaDariKata('lima belas ribu')).toBe('15000');
		expect(angkaDariKata('seribu lima ratus')).toBe('1500');
		expect(angkaDariKata('beli lima gelas')).toBe('beli 5 gelas');
	});
	it('teks rapi langsung dipahami aturan yang ada', () => {
		expect(periodeDariTeks(n('brp pndptn kmrn'), KINI)[0]).toMatchObject({ mulai: '2026-11-12' });
		expect(deteksiTopik(n('tlg liat stock yg mau habis'))).toContain('produk');
		const catat = n('pendaptaan tgl 11 novmber 2026 empat ratus ribu');
		expect(perintahTransaksi(catat)).toBe(true);
		expect(tanggalDariTeks(catat, KINI)).toBe('2026-11-11');
		expect(arahDariTeks(catat)).toBe('Masuk');
	});
});

describe('tanya balik dengan pilihan', () => {
	it('pesan tak dikenali → pilihan terdekat lebih dulu', () => {
		expect(tidakDikenali('asdf qwer')).toBe(true);
		expect(tidakDikenali('cek stok')).toBe(false);
		expect(tidakDikenali('berapa omzet hari ini kak')).toBe(false);
		expect(tebakMaksud('stk abis')[0]).toBe('Apa saja yang perlu di-restock?');
		expect(tebakMaksud('asdf')).toHaveLength(4);
	});
	it('arah uang ambigu tidak dipaksa; pilihan "uang masuk/keluar" tegas', () => {
		expect(arahDariTeks('transfer 100rb')).toBeNull();
		expect(arahDariTeks('catat uang masuk: transfer 100rb')).toBe('Masuk');
		expect(arahDariTeks('catat uang keluar: transfer 100rb')).toBe('Keluar');
		expect(arahDariTeks('transfer dari pelanggan 100rb')).toBe('Masuk');
		expect(arahDariTeks('transfer ke supplier 100rb')).toBe('Keluar');
	});
	it('baris PILIHAN dari model menjadi tombol', () => {
		const r = ambilPilihan('Maksudnya periode yang mana kak?\nPILIHAN: Omzet hari ini | Omzet kemarin | "Omzet bulan ini"');
		expect(r.teks).toBe('Maksudnya periode yang mana kak?');
		expect(r.pilihan).toEqual(['Omzet hari ini', 'Omzet kemarin', 'Omzet bulan ini']);
		expect(ambilPilihan('Jawaban biasa tanpa pilihan').pilihan).toEqual([]);
	});
});
