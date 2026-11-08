import test from 'node:test';
import assert from 'node:assert/strict';
import { nilaiEkstraksi, nilaiAkun, usulanAnalitis, angkaDalamTeks } from './nilai.mjs';

const ek = { kategori: 'Masuk', produk: 'Es Teh Lemon', qty: 3, nominal: 21000 };
test('ekstraksi: sesuai penuh', () => assert.equal(nilaiEkstraksi(ek, { kategori: 'Masuk', produk: 'es teh lemon', qty: 3, nominal: 21000 }).nilai, 'Sesuai'));
test('ekstraksi: salah produk → sebagian', () => assert.deepEqual(nilaiEkstraksi(ek, { kategori: 'Masuk', produk: 'Es Teh Susu', qty: 3, nominal: 21000 }), { nilai: 'Sesuai sebagian', salah: 'Salah produk' }));
test('ekstraksi: salah kategori → tidak sesuai', () => assert.equal(nilaiEkstraksi(ek, { kategori: 'Keluar', produk: null, qty: 3, nominal: 21000 }).nilai, 'Tidak sesuai'));
test('ekstraksi: tanpa keluaran', () => assert.equal(nilaiEkstraksi(ek, null).salah, 'Tidak ada keluaran / error'));
test('ekstraksi: pengeluaran terikat produk dianggap salah produk', () => {
	const keluar = { kategori: 'Keluar', produk: null, qty: null, nominal: 33000 };
	assert.equal(nilaiEkstraksi(keluar, { kategori: 'Keluar', produk: null, qty: 1, nominal: 33000 }).nilai, 'Sesuai');
	assert.equal(nilaiEkstraksi(keluar, { kategori: 'Keluar', produk: 'Es Teh Susu', qty: 3, nominal: 33000 }).salah, 'Salah produk');
});
test('akun: keduanya benar / satu benar / salah semua', () => {
	const k = { akun_kode: '4-1001', kas_kode: '1-1001' };
	assert.equal(nilaiAkun(k, { akun_kode: '4-1001', kas_kode: '1-1001' }).nilai, 'Sesuai');
	assert.equal(nilaiAkun(k, { akun_kode: '4-1001', kas_kode: '1-1002' }).nilai, 'Sesuai sebagian');
	assert.equal(nilaiAkun(k, { akun_kode: '4-1002', kas_kode: '1-1002' }).nilai, 'Tidak sesuai');
});
test('angka dalam teks: format Indonesia', () => {
	assert.ok(angkaDalamTeks('Total Rp12.500.000 bulan ini').includes(12500000));
	assert.ok(angkaDalamTeks('sekitar Rp12,5 juta').includes(12500000));
	assert.ok(angkaDalamTeks('Rp350rb').includes(350000));
});
test('analitis: angka acuan ditemukan / tidak', () => {
	const ac = { A01: { angka: [12500000] } };
	assert.equal(usulanAnalitis('A01', 'Pemasukan bulan ini Rp12.500.000', ac).nilai, 'Sesuai');
	assert.equal(usulanAnalitis('A01', 'Pemasukan bulan ini Rp9.000.000', ac).nilai, 'Tidak sesuai');
});
test('analitis: pertanyaan tak terjawab data harus menolak, bukan mengarang', () => {
	const ac = { A19: { tidakTersedia: true } };
	assert.equal(usulanAnalitis('A19', 'Maaf kak, data harian tanggal itu tidak tersedia.', ac).nilai, 'Sesuai');
	assert.equal(usulanAnalitis('A19', 'Omzet tanggal itu Rp1.200.000', ac).salah, 'Mengarang data yang tidak tersedia');
});
