-- Jawaban acuan AI-Analitis (sheet AI-Analitis, kolom E). Jalankan di basis data server uji,
-- PADA HARI YANG SAMA dengan pengujian dan SEBELUM chat dijalankan. Ganti @unit dengan ID unit Tenant A.
-- Simpan hasilnya (tangkapan layar / ekspor) sebagai bukti, lalu isi acuan-analitis.json.
-- Catatan penyesuaian terhadap apa yang benar-benar dilihat AI (kode /api/chat):
--   * A13: AI hanya melihat 8 transaksi terakhir (bukan 20) → LIMIT 8.
--   * Bulan dihitung WIB (UTC+7) oleh server; jika DB berzona waktu UTC, pakai CONVERT_TZ agar batas bulan sama.
SET @unit = 0; -- <== ISI

-- A01 / A02 / A03
SELECT SUM(CASE WHEN kategori_trx='MASUK'  THEN nominal END) AS masuk_bulan_ini,
       SUM(CASE WHEN kategori_trx='KELUAR' THEN nominal END) AS keluar_bulan_ini,
       SUM(CASE WHEN kategori_trx='MASUK' THEN nominal ELSE -nominal END) AS saldo_bulan_ini
FROM transaksi WHERE unit_id=@unit AND DATE(tanggal) >= DATE_FORMAT(CURDATE(),'%Y-%m-01');

-- A04 / A05 / A06
SELECT SUM(CASE WHEN kategori_trx='MASUK'  THEN nominal END) AS masuk_bulan_lalu,
       SUM(CASE WHEN kategori_trx='KELUAR' THEN nominal END) AS keluar_bulan_lalu,
       COUNT(*) AS jumlah_trx_bulan_lalu
FROM transaksi WHERE unit_id=@unit
  AND DATE(tanggal) >= DATE_FORMAT(CURDATE()-INTERVAL 1 MONTH,'%Y-%m-01')
  AND DATE(tanggal) <  DATE_FORMAT(CURDATE(),'%Y-%m-01');

-- A07 = masuk_bulan_ini - masuk_bulan_lalu (naik/turun)

-- A08 / A09
SELECT SUM(CASE WHEN kategori_trx='MASUK' THEN nominal END) AS masuk_semua,
       SUM(CASE WHEN kategori_trx='MASUK' THEN nominal ELSE -nominal END) AS saldo_semua
FROM transaksi WHERE unit_id=@unit;

-- A10 (tren) & A11 (bulan tertinggi) — jendela 6 bulan seperti kode chat
SELECT YEAR(tanggal) th, MONTH(tanggal) bl,
       SUM(CASE WHEN kategori_trx='MASUK' THEN nominal ELSE 0 END) masuk
FROM transaksi WHERE unit_id=@unit AND tanggal >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY th, bl ORDER BY th, bl;

-- A12 (transaksi terakhir) & A13 (pengeluaran terbesar di 8 transaksi terakhir)
SELECT id, tanggal, kategori_trx, nominal, keterangan
FROM transaksi WHERE unit_id=@unit ORDER BY tanggal DESC LIMIT 8;
SELECT MAX(nominal) AS keluar_terbesar_dari_8_terakhir
FROM (SELECT nominal, kategori_trx FROM transaksi WHERE unit_id=@unit ORDER BY tanggal DESC LIMIT 8) t
WHERE kategori_trx='KELUAR';

-- A14 / A15 / A16 / A17 / A18 (AI melihat 10 produk dengan stok terendah)
SELECT nama, stok, min_stok, harga_jual FROM products
WHERE unit_id=@unit AND deleted_at IS NULL ORDER BY stok ASC LIMIT 10;
SELECT COUNT(*) AS jumlah_menipis FROM products
WHERE unit_id=@unit AND deleted_at IS NULL AND stok <= min_stok;

-- A19 / A20: tidak ada acuan angka (data tidak dikirim ke AI) → "tidakTersedia": true
