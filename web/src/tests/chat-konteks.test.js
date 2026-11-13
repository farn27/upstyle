/**
 * Logika chat AI tanpa basis data/model: topik, periode, perintah transaksi vs pertanyaan,
 * perapian riwayat (pesan ganda), penyaringan tautan.
 */
import { describe, it, expect } from 'vitest';
import {
	deteksiTopik,
	periodeDariTeks,
	tanggalDariTeks,
	hapusTanggal,
	arahDariTeks,
	perintahTransaksi,
	perintahIngat,
	jumlahNominal,
	sapaan,
	rapikanRiwayat,
	topikSusulan,
	saringTautan,
	halamanRelevan,
	kalender,
	periodeSebelumnya,
	hariPenuh
} from '$lib/server/chatKonteks';
import { kunciCache, ambilCache, simpanCache, kosongkanCacheLokal } from '$lib/server/aiCache';

// Kamis, 12 November 2026 19:45 WIB
const SEKARANG = new Date('2026-11-12T12:45:00Z');

describe('deteksiTopik', () => {
	it('memakai batas kata (dulu "spesial" terbaca KPI/SP, "kasir" terbaca kas, "mobile" terbaca aset)', () => {
		expect(deteksiTopik('mie goreng spesial laku berapa porsi bulan ini?')).toEqual(['produk']);
		expect(deteksiTopik('order kasir hari ini')).not.toContain('keuangan');
		expect(deteksiTopik('aplikasi mobile bisa apa')).not.toContain('aset');
		expect(deteksiTopik('katalog online toko')).not.toContain('audit');
	});
	it('satu pesan bisa beberapa topik', () => {
		expect(deteksiTopik('omzet hari ini dan stok yang menipis')).toEqual(expect.arrayContaining(['keuangan', 'produk']));
	});
	it('pertanyaan "cara …" adalah bantuan, bukan permintaan data', () => {
		expect(deteksiTopik('cara tambah produk gimana?')).toEqual(['bantuan']);
	});
	it('karyawan & piutang', () => {
		expect(deteksiTopik('siapa saja karyawan saya?')).toEqual(['karyawan']);
		expect(deteksiTopik('ada piutang yang jatuh tempo?')).toEqual(['piutang']);
	});
});

describe('periodeDariTeks (WIB)', () => {
	it('hari ini, kemarin, minggu ini', () => {
		expect(periodeDariTeks('omzet hari ini', SEKARANG)).toEqual([expect.objectContaining({ mulai: '2026-11-12', akhir: '2026-11-13' })]);
		expect(periodeDariTeks('kemarin laku berapa', SEKARANG)[0]).toMatchObject({ mulai: '2026-11-11', akhir: '2026-11-12' });
		// Senin 9 Nov 2026
		expect(periodeDariTeks('omzet minggu ini berapa?', SEKARANG)[0]).toMatchObject({ mulai: '2026-11-09', akhir: '2026-11-13' });
		expect(periodeDariTeks('minggu lalu', SEKARANG)[0]).toMatchObject({ mulai: '2026-11-02', akhir: '2026-11-09' });
	});
	it('perbandingan menghasilkan dua periode berurutan', () => {
		const p = periodeDariTeks('bandingkan omzet bulan ini dengan bulan lalu', SEKARANG);
		expect(p.map((x) => [x.mulai, x.akhir])).toEqual([
			['2026-11-01', '2026-11-13'],
			['2026-10-01', '2026-11-01']
		]);
	});
	it('nama bulan, N hari terakhir, lintas tahun', () => {
		expect(periodeDariTeks('pengeluaran oktober', SEKARANG)[0]).toMatchObject({ mulai: '2026-10-01', akhir: '2026-11-01' });
		expect(periodeDariTeks('omzet desember', SEKARANG)[0]).toMatchObject({ mulai: '2025-12-01', akhir: '2026-01-01' });
		expect(periodeDariTeks('7 hari terakhir', SEKARANG)[0]).toMatchObject({ mulai: '2026-11-06', akhir: '2026-11-13' });
		expect(periodeDariTeks('tren 6 bulan terakhir', SEKARANG)[0]).toMatchObject({ mulai: '2026-06-01' });
	});
	it('kalender WIB: lewat tengah malam UTC tetap tanggal WIB yang benar', () => {
		expect(kalender(new Date('2026-11-12T18:30:00Z')).hariIni).toBe('2026-11-13');
	});
});

describe('perintah transaksi vs pertanyaan', () => {
	it('perintah dengan nominal → transaksi', () => {
		expect(perintahTransaksi('catat pengeluaran listrik 200rb via transfer')).toBe(true);
		expect(perintahTransaksi('beli gula 50rb dan es batu 20rb')).toBe(true);
		expect(perintahTransaksi('jual 2 kopi susu gula aren')).toBe(true);
		expect(perintahTransaksi('terima pelunasan Rp 1.500.000')).toBe(true);
	});
	it('pertanyaan tidak dicatat (dulu "transaksi bulan ini gimana" jadi kartu transaksi)', () => {
		expect(perintahTransaksi('transaksi bulan ini gimana')).toBe(false);
		expect(perintahTransaksi('berapa pengeluaran listrik bulan ini?')).toBe(false);
		expect(perintahTransaksi('kenapa penjualan turun 20%')).toBe(false);
		expect(perintahTransaksi('jual apa yang paling laku')).toBe(false);
	});
	it('jumlah nominal untuk memecah banyak transaksi', () => {
		expect(jumlahNominal('beli gula 50rb dan es batu 20rb')).toBe(2);
		expect(jumlahNominal('bayar listrik Rp 300.000')).toBe(1);
	});
});

describe('perintah memori', () => {
	it('"catat …" transaksi bukan memori (dulu ditolak sebagai memori angka)', () => {
		expect(perintahIngat('catat pengeluaran listrik 200rb')).toBeNull();
	});
	it('"ingat bahwa …" dan "simpan preferensi …" adalah memori', () => {
		expect(perintahIngat('ingat bahwa toko libur hari Minggu')).toBe('toko libur hari Minggu');
		expect(perintahIngat('simpan preferensi: jawab singkat saja')).toBe('jawab singkat saja');
	});
});

describe('sapaan', () => {
	it('basa-basi singkat tidak memuat data', () => {
		for (const t of ['halo', 'Hai!', 'makasih ya', 'ok', 'selamat pagi']) expect(sapaan(t)).toBe(true);
		for (const t of ['halo, omzet hari ini berapa?', 'ok catat beli gula 50rb']) expect(sapaan(t)).toBe(false);
	});
});

describe('rapikanRiwayat', () => {
	it('membuang pesan saat ini yang ikut terkirim di riwayat (dulu terkirim dua kali)', () => {
		const r = rapikanRiwayat(
			[
				{ role: 'user', content: 'pengeluaran terbesar bulan ini?' },
				{ role: 'assistant', content: 'Sewa ruko Rp1.200.000 :::metric{label:"X",value:"1"}::: [Riwayat](/finance/a/history)' },
				{ role: 'user', content: 'kenapa?' }
			],
			'kenapa?'
		);
		expect(r).toEqual([
			{ role: 'user', content: 'pengeluaran terbesar bulan ini?' },
			{ role: 'assistant', content: 'Sewa ruko Rp1.200.000  Riwayat' }
		]);
	});
	it('membatasi jumlah & panjang, dan tidak diawali jawaban asisten', () => {
		const banyak = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `pesan ${i} ` + 'x'.repeat(600) }));
		const r = rapikanRiwayat(banyak, 'baru');
		expect(r.length).toBeLessThanOrEqual(6);
		expect(r[0].role).toBe('user');
		expect(r.every((h) => h.content.length <= 301)).toBe(true);
	});
	it('masukan rusak tidak membuat galat', () => {
		expect(rapikanRiwayat(null, 'x')).toEqual([]);
		expect(rapikanRiwayat([null, 5, { role: 'user' }], 'x')).toEqual([]);
	});
});

describe('topikSusulan', () => {
	it('pertanyaan pendek tanpa topik mewarisi topik pesan sebelumnya', () => {
		const r = [
			{ role: 'user', content: 'pengeluaran terbesar bulan ini?' },
			{ role: 'assistant', content: 'Sewa ruko' }
		];
		expect(topikSusulan('kenapa bisa sebesar itu?', r)).toEqual(['keuangan']);
	});
});

describe('tautan', () => {
	it('tautan karangan model dibuang, tautan sah dipertahankan', () => {
		const balasan = 'Cek [Riwayat](/finance/kopi/history) dan [Analisis](/finance/kopi/analisis-ai) atau [situs](https://contoh.com).';
		expect(saringTautan(balasan, 'kopi')).toBe('Cek [Riwayat](/finance/kopi/history) dan Analisis atau situs.');
	});
	it('tanpa unit hanya tautan umum', () => {
		expect(saringTautan('[Dasbor](/finance/kopi)', null)).toBe('Dasbor');
		expect(halamanRelevan(null, ['keuangan'])).toEqual([{ label: 'Pilih Unit Bisnis', path: '/finance' }]);
	});
	it('halaman sesuai topik (hemat token)', () => {
		const h = halamanRelevan('kopi', ['produk']).map((x) => x.path);
		expect(h).toContain('/finance/kopi/produk');
		expect(h).not.toContain('/finance/kopi/hr');
	});
});

describe('periodeSebelumnya (pembanding jawaban instan)', () => {
	const kal = kalender(SEKARANG);
	it('bulan berjalan dibanding tanggal yang sama bulan lalu', () => {
		expect(periodeSebelumnya({ mulai: '2026-11-01', akhir: '2026-11-13' }, kal)).toMatchObject({ mulai: '2026-10-01', akhir: '2026-10-13' });
	});
	it('bulan penuh dibanding bulan sebelumnya (panjang bulan berbeda)', () => {
		expect(periodeSebelumnya({ mulai: '2026-10-01', akhir: '2026-11-01' }, kal)).toMatchObject({ mulai: '2026-09-01', akhir: '2026-10-01' });
		expect(periodeSebelumnya({ mulai: '2026-03-01', akhir: '2026-04-01' }, kal)).toMatchObject({ mulai: '2026-02-01', akhir: '2026-03-01' });
	});
	it('minggu berjalan dibanding hari yang sama minggu lalu', () => {
		expect(periodeSebelumnya({ mulai: '2026-11-09', akhir: '2026-11-12' }, kal)).toMatchObject({ mulai: '2026-11-02', akhir: '2026-11-05' });
	});
	it('periode berjalan dipotong s/d kemarin untuk perbandingan', () => {
		expect(hariPenuh({ label: 'bulan ini', mulai: '2026-11-01', akhir: '2026-11-13' }, kal)).toMatchObject({ mulai: '2026-11-01', akhir: '2026-11-12' });
		expect(hariPenuh({ label: 'hari ini', mulai: '2026-11-12', akhir: '2026-11-13' }, kal)).toBeNull();
		expect(hariPenuh({ label: 'Oktober', mulai: '2026-10-01', akhir: '2026-11-01' }, kal)).toMatchObject({ akhir: '2026-11-01' });
	});
	it('kemarin dibanding hari sebelumnya; hari ini tidak dibandingkan', () => {
		expect(periodeSebelumnya({ mulai: '2026-11-11', akhir: '2026-11-12' }, kal)).toMatchObject({ mulai: '2026-11-10', akhir: '2026-11-11' });
		expect(periodeSebelumnya({ mulai: '2026-11-12', akhir: '2026-11-13' }, kal)).toBeNull();
	});
});

describe('cache jawaban AI', () => {
	it('kunci berubah bila isi prompt (data) berubah', () => {
		expect(kunciCache({ a: 1 })).toBe(kunciCache({ a: 1 }));
		expect(kunciCache({ a: 1 })).not.toBe(kunciCache({ a: 2 }));
	});
	it('simpan, ambil, dan kedaluwarsa', async () => {
		kosongkanCacheLokal();
		const k = kunciCache({ uji: Date.now() });
		expect(await ambilCache(k)).toBeNull();
		await simpanCache(k, 'jawaban', 60);
		expect(await ambilCache(k)).toBe('jawaban');
		await simpanCache(k + 'x', 'lama', -1);
		expect(await ambilCache(k + 'x')).toBeNull();
	});
});

describe('tanggal tunggal di kalimat (temuan uji lapangan 13 Nov)', () => {
	const KINI = new Date('2026-11-13T09:00:00Z'); // Jumat 13 Nov 2026 16.00 WIB
	it('mengenali "tanggal 11", "11 november 2026", "11 nov", "11/11/2026", ISO, "3 hari lalu"', () => {
		expect(tanggalDariTeks('total pendapatan tanggal11 berapa', KINI)).toBe('2026-11-11');
		expect(tanggalDariTeks('pendapatan tanggal 11 november 2026 400.000', KINI)).toBe('2026-11-11');
		expect(tanggalDariTeks('catat pendapatan 11 nov 400rb', KINI)).toBe('2026-11-11');
		expect(tanggalDariTeks('omzet 11/11/2026', KINI)).toBe('2026-11-11');
		expect(tanggalDariTeks('jual 2026-11-09 300rb', KINI)).toBe('2026-11-09');
		expect(tanggalDariTeks('pengeluaran 3 hari lalu 50rb', KINI)).toBe('2026-11-10');
		expect(tanggalDariTeks('omzet tanggal 25', KINI)).toBe('2026-10-25'); // belum lewat bulan ini → bulan lalu
		expect(tanggalDariTeks('omzet 20 desember', KINI)).toBe('2025-12-20'); // tanpa tahun & di masa depan → tahun lalu
		expect(tanggalDariTeks('beli gula 1/2 kg 8rb', KINI)).toBeNull();
		expect(tanggalDariTeks('omzet 31 februari', KINI)).toBeNull();
	});
	it('periode satu hari tanpa ikut menjadi periode sebulan', () => {
		expect(periodeDariTeks('pemasukan tanggal 11 November 2026', KINI)).toEqual([{ label: 'tanggal 11 Nov 2026', mulai: '2026-11-11', akhir: '2026-11-12' }]);
		expect(periodeDariTeks('omzet november 2026', KINI)[0]).toMatchObject({ mulai: '2026-11-01', akhir: '2026-12-01' });
	});
	it('angka tanggal/tahun bukan nominal; kata pendapatan = perintah catat bila ada nominal', () => {
		expect(hapusTanggal('pendapatan tanggal 11 november 2026 400.000 cup besar 75')).toBe('pendapatan 400.000 cup besar 75');
		expect(jumlahNominal('pendapatan tanggal 11 november 2026 400.000 cup besar 75 cup sedang 18')).toBe(1);
		expect(perintahTransaksi('pendapatan tanggal 11 november 2026 400.000 cup besar 75 cup sedang 18 cup kecil 50 cup')).toBe(true);
		expect(perintahTransaksi('pemasukan tanggal 11 November 2026')).toBe(false);
		expect(perintahTransaksi('total pendapatan tanggal 11 berapa')).toBe(false);
	});
	it('arah transaksi tegas dari kata kunci', () => {
		expect(arahDariTeks('pendapatan 400.000 cup besar 75')).toBe('Masuk');
		expect(arahDariTeks('beli gula 50rb')).toBe('Keluar');
		expect(arahDariTeks('jual kopi 20rb lalu beli gula 10rb')).toBeNull();
		expect(arahDariTeks('transfer 100rb')).toBeNull();
	});
});
