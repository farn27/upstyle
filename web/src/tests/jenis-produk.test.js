/**
 * Jenis barang di data produk: normalisasi dan aturan jual (tanpa database).
 */
import { describe, it, expect } from 'vitest';
import { bisaDijual, DAFTAR_JENIS, JENIS_DIJUAL, normalisasiJenis } from '../lib/jenisProduk.js';
import { normalisasiProduk } from '../lib/server/imporEkspor.js';

describe('normalisasiJenis', () => {
	it('menerima nilai baku dalam berbagai penulisan', () => {
		expect(normalisasiJenis('BAHAN_BAKU')).toBe('BAHAN_BAKU');
		expect(normalisasiJenis('bahan baku')).toBe('BAHAN_BAKU');
		expect(normalisasiJenis(' kemasan ')).toBe('KEMASAN');
		expect(normalisasiJenis('perlengkapan')).toBe('PERLENGKAPAN');
		expect(normalisasiJenis('raw-material')).toBe('BAHAN_BAKU');
	});

	it('kosong atau tidak dikenal dianggap barang jadi (perilaku lama tetap)', () => {
		for (const v of [undefined, null, '', 'apa saja', 123]) expect(normalisasiJenis(v)).toBe(JENIS_DIJUAL);
	});

	it('hanya barang jadi yang bisa dijual', () => {
		expect(DAFTAR_JENIS.filter(bisaDijual)).toEqual(['BARANG_JADI']);
		expect(bisaDijual(undefined)).toBe(true);
	});
});

describe('impor produk', () => {
	it('membaca kolom jenis opsional', () => {
		expect(normalisasiProduk({ Nama: 'Biji Kopi', Jenis: 'Bahan Baku' }).jenis).toBe('BAHAN_BAKU');
		expect(normalisasiProduk({ nama: 'Es Kopi' }).jenis).toBe('BARANG_JADI');
	});
});
