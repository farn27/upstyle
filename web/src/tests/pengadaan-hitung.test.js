/**
 * Hitungan modul Pengadaan (tanpa database).
 */
import { describe, it, expect } from 'vitest';
import {
	hargaRataRata,
	hitungPorsi,
	hitungTotalPO,
	nomorBerikut,
	sisaDiretur,
	sisaDiterima,
	sisaDitagih,
	statusHutang,
	tambahHari
} from '../lib/pengadaan.js';

describe('hitungTotalPO', () => {
	it('diskon memotong dasar PPN, ongkir tidak kena PPN', () => {
		const h = hitungTotalPO([{ qty: 10, unitPrice: 10000 }], { diskon: 10000, ongkir: 5000, ppnPersen: 11 });
		expect(h).toEqual({ subtotal: 100000, diskon: 10000, dpp: 90000, ongkir: 5000, ppn: 9900, total: 104900 });
	});

	it('tanpa biaya tambahan, total sama dengan subtotal', () => {
		expect(hitungTotalPO([{ qty: 3, unitPrice: 2500 }]).total).toBe(7500);
	});
});

describe('hitungPorsi', () => {
	const biaya = { diskon: 10000, ongkir: 5000, ppnPersen: 11 };

	it('seluruh barang = total PO', () => {
		const p = hitungPorsi(100000, 100000, biaya);
		expect(p.total).toBe(hitungTotalPO([{ qty: 1, unitPrice: 100000 }], biaya).total);
		expect(p.persediaan + p.ppn).toBe(p.total);
	});

	it('sebagian barang dapat biaya proporsional', () => {
		const p = hitungPorsi(25000, 100000, biaya);
		expect(p).toEqual({ nilaiBarang: 25000, diskon: 2500, ongkir: 1250, ppn: 2475, persediaan: 23750, total: 26225 });
	});

	it('PO bernilai 0 tidak membagi dengan nol', () => {
		expect(hitungPorsi(0, 0, biaya).total).toBe(0);
	});
});

describe('hargaRataRata', () => {
	it('rata-rata tertimbang stok lama dan barang baru', () => {
		expect(hargaRataRata(10, 1000, 10, 2000)).toBe(1500);
	});

	it('stok kosong atau minus memakai harga barang baru', () => {
		expect(hargaRataRata(0, 1000, 5, 2000)).toBe(2000);
		expect(hargaRataRata(-3, 1000, 5, 2000)).toBe(2000);
	});
});

describe('sisa barang', () => {
	const item = { qtyOrdered: 10, qtyReceived: 6, qtyInvoiced: 2, qtyReturned: 1 };

	it('dihitung dari kolom jumlah', () => {
		expect(sisaDiterima(item)).toBe(4);
		expect(sisaDitagih(item)).toBe(3);
		expect(sisaDiretur(item)).toBe(5);
	});

	it('tidak pernah minus dan tahan kolom kosong', () => {
		expect(sisaDiterima({ qtyOrdered: 2, qtyReceived: 5 })).toBe(0);
		expect(sisaDitagih({ qtyReceived: null, qtyInvoiced: null, qtyReturned: null })).toBe(0);
	});
});

describe('pembantu lain', () => {
	it('statusHutang', () => {
		expect(statusHutang(100, 0)).toBe('BELUM_BAYAR');
		expect(statusHutang(100, 40)).toBe('SEBAGIAN');
		expect(statusHutang(100, 100)).toBe('LUNAS');
		expect(statusHutang(0, 0)).toBe('LUNAS');
	});

	it('nomorBerikut melanjutkan urutan', () => {
		expect(nomorBerikut('PO-1-2611-', null)).toBe('PO-1-2611-0001');
		expect(nomorBerikut('PO-1-2611-', 'PO-1-2611-0041')).toBe('PO-1-2611-0042');
	});

	it('tambahHari melewati akhir bulan', () => {
		expect(tambahHari('2026-11-15', 30)).toBe('2026-12-15');
		expect(tambahHari('2026-12-31', 1)).toBe('2027-01-01');
	});
});
