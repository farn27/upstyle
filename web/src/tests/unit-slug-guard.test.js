/**
 * Penjaga pusat halaman ber-slug unit (hooks.server.js → lib/server/unitSlugGuard.js).
 * Regresi: halaman integrasi Shopee, Kelola POS, dan kategori produk tidak memeriksa pemilik unit,
 * sehingga user lain bisa membuka/mengubah unit orang dengan mengganti slug.
 */
import { describe, it, expect } from 'vitest';
import { slugUnitDariPath, putuskanAksesUnit, halamanPosManajemen, peranManajer } from '../lib/server/unitSlugGuard.js';

describe('slugUnitDariPath', () => {
	it('mengenali slug unit pada /finance dan /ecommerce', () => {
		expect(slugUnitDariPath('/finance/es-teh-zara/history')).toEqual({ modul: 'finance', slug: 'es-teh-zara' });
		expect(slugUnitDariPath('/finance/es-teh-zara')).toEqual({ modul: 'finance', slug: 'es-teh-zara' });
		expect(slugUnitDariPath('/ecommerce/toko-a/integrasi/shopee')).toEqual({ modul: 'ecommerce', slug: 'toko-a' });
	});
	it('halaman tanpa slug unit dilewati', () => {
		for (const p of ['/finance', '/finance/', '/finance/create', '/finance/planning/wizard', '/ecommerce', '/settings', '/api/app/finance', '/'])
			expect(slugUnitDariPath(p)).toBeNull();
	});
});

describe('putuskanAksesUnit', () => {
	const dasar = { pathname: '/finance/x/history', sesiStaf: null };
	it('pemilik unit boleh semua halaman', () => {
		expect(putuskanAksesUnit({ ...dasar, userId: 5, pemilikUnitId: 5 })).toBe('lanjut');
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/kelola/promo', userId: 5, pemilikUnitId: 5, sesiStaf: null })).toBe('lanjut');
	});
	it('user lain atau unit tidak ada → ditolak', () => {
		expect(putuskanAksesUnit({ ...dasar, userId: 5, pemilikUnitId: 9 })).toBe('bukan_milik');
		expect(putuskanAksesUnit({ ...dasar, userId: 5, pemilikUnitId: null })).toBe('bukan_milik');
	});
	it('staf kasir boleh kasir, tidak boleh halaman manajemen kasir', () => {
		const kasir = { role: 'kasir' };
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos', userId: null, pemilikUnitId: null, sesiStaf: kasir })).toBe('lanjut');
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/shift', userId: null, pemilikUnitId: null, sesiStaf: kasir })).toBe('lanjut');
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/kelola/fitur', userId: null, pemilikUnitId: null, sesiStaf: kasir })).toBe('staf_dibatasi');
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/reports', userId: null, pemilikUnitId: null, sesiStaf: kasir })).toBe('staf_dibatasi');
		// user login unit lain + sesi staf unit ini: tetap dinilai sebagai staf
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/kelola', userId: 5, pemilikUnitId: 9, sesiStaf: kasir })).toBe('staf_dibatasi');
	});
	it('staf manajer boleh halaman manajemen kasir', () => {
		expect(putuskanAksesUnit({ pathname: '/finance/x/pos/kelola/promo', userId: null, pemilikUnitId: null, sesiStaf: { role: 'manager' } })).toBe('lanjut');
	});
	it('belum login → diserahkan ke guard login', () => {
		expect(putuskanAksesUnit({ ...dasar, userId: null, pemilikUnitId: null })).toBe('lanjut');
	});
});

describe('bantu', () => {
	it('halamanPosManajemen & peranManajer', () => {
		expect(halamanPosManajemen('/finance/a/pos/kelola')).toBe(true);
		expect(halamanPosManajemen('/finance/a/pos/reports')).toBe(true);
		expect(halamanPosManajemen('/finance/a/pos/retur')).toBe(false);
		expect(peranManajer('Manager')).toBe(true);
		expect(peranManajer('kasir')).toBe(false);
		expect(peranManajer(null)).toBe(false);
	});
});
