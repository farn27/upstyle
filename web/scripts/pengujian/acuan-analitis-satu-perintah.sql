-- Acuan jawaban AI-Analitis (A01–A18) dalam SATU tabel. Jalankan di MySQL pada hari pengujian, SEBELUM chat dijalankan.
-- Ganti angka pada SET @unit di bawah dengan ID unit Tenant A (di proyek ini: 12).
-- Semua batas data mengikuti yang benar-benar dilihat AI (lihat TEMUAN_DAN_REVISI.md): 8 transaksi terakhir, 10 produk stok terendah, tren 6 bulan.
SET @unit = 12;
SET @bi = DATE_FORMAT(CURDATE(), '%Y-%m-01');                              -- awal bulan ini
SET @bl = DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01');           -- awal bulan lalu
SET @b2 = DATE_FORMAT(CURDATE() - INTERVAL 2 MONTH, '%Y-%m-01');           -- awal 2 bulan lalu

SELECT kasus, keterangan, nilai FROM (
 SELECT 'A01' kasus, 'pemasukan bulan ini' keterangan, CAST(COALESCE(SUM(nominal),0) AS CHAR) nilai FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bi
 UNION ALL SELECT 'A02','pengeluaran bulan ini', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='KELUAR' AND DATE(tanggal)>=@bi
 UNION ALL SELECT 'A03','saldo bulan ini (masuk-keluar)', CAST(COALESCE(SUM(CASE WHEN kategori_trx='MASUK' THEN nominal ELSE -nominal END),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND DATE(tanggal)>=@bi
 UNION ALL SELECT 'A04','pemasukan bulan lalu', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bl AND DATE(tanggal)<@bi
 UNION ALL SELECT 'A05','pengeluaran bulan lalu', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='KELUAR' AND DATE(tanggal)>=@bl AND DATE(tanggal)<@bi
 UNION ALL SELECT 'A06','jumlah transaksi bulan lalu', CAST(COUNT(*) AS CHAR) FROM transaksi WHERE unit_id=@unit AND DATE(tanggal)>=@bl AND DATE(tanggal)<@bi
 UNION ALL SELECT 'A07','selisih pemasukan bulan ini - bulan lalu (negatif = turun)', CAST(
     (SELECT COALESCE(SUM(nominal),0) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bi)
   - (SELECT COALESCE(SUM(nominal),0) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bl AND DATE(tanggal)<@bi) AS CHAR)
 UNION ALL SELECT 'A08','pemasukan seluruh waktu', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK'
 UNION ALL SELECT 'A09','saldo bersih seluruh waktu', CAST(COALESCE(SUM(CASE WHEN kategori_trx='MASUK' THEN nominal ELSE -nominal END),0) AS CHAR) FROM transaksi WHERE unit_id=@unit
 UNION ALL SELECT 'A10','tren pemasukan: 2 bulan lalu', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@b2 AND DATE(tanggal)<@bl
 UNION ALL SELECT 'A10','tren pemasukan: bulan lalu', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bl AND DATE(tanggal)<@bi
 UNION ALL SELECT 'A10','tren pemasukan: bulan ini', CAST(COALESCE(SUM(nominal),0) AS CHAR) FROM transaksi WHERE unit_id=@unit AND kategori_trx='MASUK' AND DATE(tanggal)>=@bi
 UNION ALL SELECT 'A11','bulan pemasukan tertinggi (6 bulan terakhir)', CONCAT(bulan,' = ',total) FROM (
     SELECT DATE_FORMAT(tanggal,'%Y-%m') bulan, SUM(nominal) total FROM transaksi
     WHERE unit_id=@unit AND kategori_trx='MASUK' AND tanggal >= NOW() - INTERVAL 6 MONTH GROUP BY bulan ORDER BY total DESC LIMIT 1) t11
 UNION ALL SELECT 'A12','transaksi terakhir (tanggal, jenis, nominal, keterangan)', CONCAT(tanggal,' | ',kategori_trx,' | ',CAST(nominal AS CHAR),' | ',COALESCE(keterangan,'')) FROM (
     SELECT tanggal, kategori_trx, nominal, keterangan FROM transaksi WHERE unit_id=@unit ORDER BY tanggal DESC LIMIT 1) t12
 UNION ALL SELECT 'A13','pengeluaran terbesar di 8 transaksi terakhir', COALESCE(CAST(MAX(nominal) AS CHAR),'(tidak ada pengeluaran di 8 transaksi terakhir)') FROM (
     SELECT nominal, kategori_trx FROM transaksi WHERE unit_id=@unit ORDER BY tanggal DESC LIMIT 8) t13 WHERE kategori_trx='KELUAR'
 UNION ALL SELECT 'A14','stok Es Teh Lemon', CAST(stok AS CHAR) FROM products WHERE unit_id=@unit AND nama='Es Teh Lemon' AND deleted_at IS NULL
 UNION ALL SELECT 'A15','produk dengan stok paling sedikit', CONCAT(nama,' (stok ',stok,')') FROM (
     SELECT nama, stok FROM products WHERE unit_id=@unit AND deleted_at IS NULL ORDER BY stok ASC LIMIT 1) t15
 UNION ALL SELECT 'A16','produk stok menipis (stok <= min_stok)', COALESCE(GROUP_CONCAT(CONCAT(nama,' (stok ',stok,', min ',min_stok,')') SEPARATOR '; '),'(tidak ada)') FROM products WHERE unit_id=@unit AND deleted_at IS NULL AND stok <= min_stok
 UNION ALL SELECT 'A17','harga jual Es Teh Susu', CAST(harga_jual AS CHAR) FROM products WHERE unit_id=@unit AND nama='Es Teh Susu' AND deleted_at IS NULL
 UNION ALL SELECT 'A18','jumlah produk stok <= min_stok', CAST(COUNT(*) AS CHAR) FROM products WHERE unit_id=@unit AND deleted_at IS NULL AND stok <= min_stok
) hasil ORDER BY kasus;
