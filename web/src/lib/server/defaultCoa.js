export const DEFAULT_COAS = {
    // 1. GROSIR (Perdagangan Umum / Grosir)
    GROSIR: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kasir Grosir', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang tunai operasional toko grosir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening bank penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Usaha Agen', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan piutang dari agen/reseller' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Barang Grosir', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok barang dagangan di gudang' },
        { kodeAkun: '1-2001', namaAkun: 'Inventaris Gudang', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Rak, palet, forklift' },
        { kodeAkun: '1-2002', namaAkun: 'Kendaraan Operasional', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Truk atau mobil box pengiriman' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Dagang Pemasok', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang ke pabrik/distributor' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Disetor', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal awal pemilik' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Penjualan Partai', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan ke agen (grosir)' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Penjualan Eceran', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan ke end user' },
        { kodeAkun: '4-2001', namaAkun: 'Retur Penjualan', tipeAkun: 'PENDAPATAN', normalBalance: 'DEBIT', deskripsi: 'Pengembalian barang dari agen' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Barang Dagangan', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Harga beli barang yang terjual' },
        { kodeAkun: '6-1001', namaAkun: 'Beban Gaji & Upah Bongkar Muat', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji karyawan dan kuli' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Sewa Gudang', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Sewa gudang penyimpanan' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Pengiriman / Ekspedisi', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Biaya kirim ke pelanggan' }
    ],
    // 2. MINIMARKET
    MINIMARKET: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Laci Kasir', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang kembalian di kasir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang EDC / e-Wallet', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Dana di mesin EDC atau Qris' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Barang Display', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok ritel di rak toko' },
        { kodeAkun: '1-2001', namaAkun: 'Rak Display & Gondola', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Perlengkapan toko' },
        { kodeAkun: '1-2002', namaAkun: 'Sistem POS & Komputer', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Hardware kasir' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Konsinyasi (Titipan)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang barang titipan dari suplier' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Penjualan Toko', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Transaksi kasir offline' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Barang Minimarket', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Harga beli barang terjual' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Shift Kasir & Pramuniaga', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji karyawan toko' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Kantong Plastik & Packaging', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Bahan habis pakai' },
        { kodeAkun: '6-1003', namaAkun: 'Sewa Ruko Minimarket', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Beban sewa bangunan' },
        { kodeAkun: '6-1004', namaAkun: 'Beban Susut Barang (Shrinkage)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Barang hilang atau rusak' }
    ],
    // 3. BUTIK
    BUTIK: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Butik', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas tunai harian' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Marketplace', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Shopee/Tokopedia' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Pakaian & Aksesoris', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok fashion' },
        { kodeAkun: '1-2001', namaAkun: 'Interior & Manekin', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Peralatan display' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Vendor Konveksi', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang pembuatan baju' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Penjualan Butik Offline', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan di toko' },
        { kodeAkun: '4-1002', namaAkun: 'Penjualan E-Commerce', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan online' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Pakaian', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Modal baju terjual' },
        { kodeAkun: '6-1001', namaAkun: 'Beban Gaji SPG', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji penjaga butik' },
        { kodeAkun: '6-1002', namaAkun: 'Biaya Iklan (FB/IG Ads)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Marketing online' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Sewa Stand/Toko', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Sewa mall / ruko' }
    ],
    // 4. RESTORAN
    RESTORAN: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kasir Resto', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang kembalian di kasir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Merchant (Gojek/Grab)', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Dana di ojol' },
        { kodeAkun: '1-1201', namaAkun: 'Persediaan Bahan Mentah', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Daging, sayur, bumbu' },
        { kodeAkun: '1-1202', namaAkun: 'Persediaan Minuman', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok minuman' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Dapur Besar', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Kompor, chiller' },
        { kodeAkun: '1-2002', namaAkun: 'Meja Kursi & Dekorasi', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Area makan' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Suplier Bahan Baku', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang pasar/supplier' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Dine-in', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Makan di tempat' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Delivery (Ojol)', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan online' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Makanan', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Pemakaian bahan baku' },
        { kodeAkun: '5-1002', namaAkun: 'HPP Minuman', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Cost minuman' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Chef & Waiter', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Upah karyawan' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Gas & Listrik', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Utilitas dapur' },
        { kodeAkun: '6-1003', namaAkun: 'Potongan / Komisi Ojol', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Biaya admin aplikasi' }
    ],
    // 5. CAFE
    CAFE: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kasir Cafe', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang kembalian di kasir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1201', namaAkun: 'Persediaan Biji Kopi & Susu', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok bar' },
        { kodeAkun: '1-1202', namaAkun: 'Persediaan Cup & Packaging', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kemasan' },
        { kodeAkun: '1-2001', namaAkun: 'Mesin Espresso & Grinder', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Peralatan bar' },
        { kodeAkun: '1-2002', namaAkun: 'Interior & Furnitur', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Dekorasi cafe' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Roastery', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang biji kopi' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Minuman & Kopi', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan utama' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Snack / Pastry', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan makanan' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Minuman', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Pemakaian kopi/susu' },
        { kodeAkun: '5-1002', namaAkun: 'HPP Kemasan', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Pemakaian cup' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Barista', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji karyawan' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Sewa Ruko', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Sewa bulanan' }
    ],
    // 6. KATERING
    KATERING: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Katering', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang operasional dapur' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening transfer klien' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Klien Instansi', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Invoice catering belum cair' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Sembako', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Beras, minyak, dll' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Masak Massal', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Panci besar, alat katering' },
        { kodeAkun: '2-1002', namaAkun: 'Uang Muka Katering (DP)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'DP dari klien' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Catering Nasi Box', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Pesanan box' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Catering Prasmanan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Pesanan acara/pesta' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Bahan Makanan', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Belanja pasar' },
        { kodeAkun: '5-1002', namaAkun: 'HPP Kemasan Box', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Kotak kardus, plastik' },
        { kodeAkun: '6-1001', namaAkun: 'Upah Tenaga Masak Harian', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji juru masak freelance' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Transportasi / Pengiriman', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Kirim makanan' }
    ],
    // 7. BENGKEL
    BENGKEL: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Bengkel', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas harian' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening bengkel' },
        { kodeAkun: '1-1201', namaAkun: 'Persediaan Sparepart', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Suku cadang' },
        { kodeAkun: '1-1202', namaAkun: 'Persediaan Oli & Pelumas', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Oli' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Mekanik & Hidrolik', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Alat berat bengkel' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Suplier Sparepart', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang suku cadang' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa Service', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Ongkos pasang/perbaikan' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Penjualan Sparepart', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan barang' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Sparepart & Oli', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Modal barang' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Montir / Mekanik', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji karyawan' },
        { kodeAkun: '6-1002', namaAkun: 'Bagi Hasil Mekanik', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Fee per motor/mobil' }
    ],
    // 8. SALON
    SALON: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Salon', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang laci kasir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening transfer' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Produk Kecantikan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Obat rambut, shampoo' },
        { kodeAkun: '1-2001', namaAkun: 'Kursi Cukur & Perlengkapan', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Cermin, kursi hidrolik' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Vendor', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang kosmetik' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa Gunting/Styling', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Jasa utama' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Treatment (Spa/Warna)', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Jasa chemical/spa' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Pemakaian Obat/Kosmetik', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Biaya produk dipakai' },
        { kodeAkun: '6-1001', namaAkun: 'Komisi Kapster / Stylist', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Bagi hasil per kepala' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Air & Listrik', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Utilitas tinggi' }
    ],
    // 9. LAUNDRY
    LAUNDRY: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Laundry', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas tunai kasir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Utama', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening bank' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Deterjen & Parfum', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kimia laundry' },
        { kodeAkun: '1-2001', namaAkun: 'Mesin Cuci & Dryer', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Aset mesin' },
        { kodeAkun: '2-1002', namaAkun: 'Deposit Pelanggan (Prepaid)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Saldo member' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Laundry Kiloan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Jasa kiloan' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Laundry Satuan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Jas, karpet, dll' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Pemakaian Deterjen/Kimia', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Beban chemical' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Karyawan Cuci & Setrika', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Upah operator' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Gas & Listrik', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Utilitas (Sangat besar)' }
    ],
    // 10. EVENT
    EVENT: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Operasional', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Petty cash EO' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Klien', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Sisa pelunasan event' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Sound & Lighting', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Alat event' },
        { kodeAkun: '1-2002', namaAkun: 'Inventaris Properti Dekorasi', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Panggung, bunga artifisial' },
        { kodeAkun: '2-1002', namaAkun: 'Uang Muka Klien (DP Event)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'DP acara' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa EO / WO', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Fee management' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Sewa Alat', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Sewa sound system' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Sewa Vendor Eksternal', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Sewa gedung, catering luar' },
        { kodeAkun: '5-1002', namaAkun: 'Biaya Talent / MC / Pengisi Acara', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Honor talent' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Kru & Staff Event', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji tim internal/freelance' }
    ],
    // 11. KLINIK
    KLINIK: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kasir Klinik', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Pembayaran pasien' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Utama', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Transfer pasien/asuransi' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Asuransi / BPJS', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Klaim belum cair' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Obat & Alkes', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok apotek' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Medis', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Bed, alat periksa' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang PBF (Pemasok Obat)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang ke distributor obat' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa Medis (Dokter)', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Konsultasi' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Penjualan Obat / Apotek', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Jual obat' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Obat & Alkes', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Modal obat terjual' },
        { kodeAkun: '6-1001', namaAkun: 'Bagi Hasil Dokter / Paramedis', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Fee dokter' },
        { kodeAkun: '6-1002', namaAkun: 'Gaji Perawat & Admin', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji tetap' },
        { kodeAkun: '6-1003', namaAkun: 'Biaya Pengolahan Limbah Medis', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Incinerator/Pihak 3' }
    ],
    // 12. SOFTWARE
    SOFTWARE: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Operasional', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Petty cash' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Penerimaan invoice' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Proyek IT', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan termin' },
        { kodeAkun: '1-2001', namaAkun: 'Aset Komputer & Server', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Laptop developer' },
        { kodeAkun: '2-1002', namaAkun: 'Uang Muka Proyek IT', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'DP Klien' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Pembuatan Software', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Custom dev' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Jasa Maintenance', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Retainer bulanan' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Cloud & Server (AWS/GCP)', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Hosting klien' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Programmer & UI/UX', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji tim IT' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Lisensi Tools', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Jira, Github, Figma' }
    ],
    // 13. SAAS
    SAAS: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Operasional', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Petty cash' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Utama', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Payment Gateway', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Dana di Midtrans/Xendit' },
        { kodeAkun: '1-2100', namaAkun: 'Aset Tak Berwujud (IP Platform)', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Nilai kapitalisasi software' },
        { kodeAkun: '2-1002', namaAkun: 'Pendapatan Berlangganan (Diterima Dimuka)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Unearned subscription' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Ventura / Investor', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Funding' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Berlangganan (MRR)', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Subscription fee' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Infrastruktur Server', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'AWS/GCP Cost' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Developer & Product', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Dev team' },
        { kodeAkun: '6-1002', namaAkun: 'Biaya Customer Acquisition (CAC)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Ads, FB, Google' }
    ],
    // 14. KONSTRUKSI
    KONSTRUKSI: [
        { kodeAkun: '1-1001', namaAkun: 'Kas & Bank Proyek', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening khusus proyek' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Termin Proyek', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan termin ke klien' },
        { kodeAkun: '1-1101', namaAkun: 'Piutang Retensi (5%)', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Dana retensi masa pemeliharaan' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Material', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Semen, besi, kayu' },
        { kodeAkun: '1-1300', namaAkun: 'Pekerjaan Dalam Pelaksanaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'WIP (Work In Progress)' },
        { kodeAkun: '1-2001', namaAkun: 'Alat Berat & Kendaraan', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Eskavator, truk, molen' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Subkontraktor', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang ke mandor/vendor' },
        { kodeAkun: '2-1002', namaAkun: 'Uang Muka Proyek', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'DP dari owner proyek' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Kontrak Konstruksi', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Pendapatan termin' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Material Proyek', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Bahan bangunan' },
        { kodeAkun: '5-1002', namaAkun: 'Upah Tukang & Tenaga Kerja', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Gaji pekerja lapangan' },
        { kodeAkun: '5-1003', namaAkun: 'Biaya Subkontraktor', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Jasa borongan luar' },
        { kodeAkun: '6-1001', namaAkun: 'Beban Sewa Alat (Scaffolding dll)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Sewa perlengkapan' },
        { kodeAkun: '7-1001', namaAkun: 'Pajak PPh Final Konstruksi', tipeAkun: 'BEBAN_LAINNYA', normalBalance: 'DEBIT', deskripsi: 'PPh 4(2)' }
    ],
    // 15. AGRIBISNIS
    AGRIBISNIS: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kebun/Peternakan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas harian di lapangan' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1201', namaAkun: 'Persediaan Bibit / Benih', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok benih' },
        { kodeAkun: '1-1202', namaAkun: 'Persediaan Pupuk & Pakan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok saprotan' },
        { kodeAkun: '1-1300', namaAkun: 'Aset Biologis', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Nilai tanaman/hewan belum panen' },
        { kodeAkun: '1-2001', namaAkun: 'Lahan Pertanian', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Tanah garapan' },
        { kodeAkun: '1-2002', namaAkun: 'Traktor & Alat Pertanian', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Mesin panen' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Pemasok Saprotan', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang pakan/pupuk' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Hasil Panen', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan komoditas' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Bibit, Pakan & Pupuk', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Pemakaian material tani' },
        { kodeAkun: '5-1002', namaAkun: 'Upah Buruh Tani / Panen', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Upah harian' },
        { kodeAkun: '6-1001', namaAkun: 'Biaya Pemeliharaan Lahan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Irigasi, traktor' }
    ],
    // 16. PROPERTI
    PROPERTI: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Operasional', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Petty cash kantor' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan fee' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Fee Broker / Komisi', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Komisi belum cair dari developer' },
        { kodeAkun: '1-2001', namaAkun: 'Inventaris Kantor', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Meja, komputer' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Komisi Penjualan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Fee jual beli' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Komisi Sewa', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Fee sewa' },
        { kodeAkun: '6-1001', namaAkun: 'Bagi Hasil Agen / Marketing', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Komisi diteruskan ke agen' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Iklan (Portal Properti)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Rumah123, OLX' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Transport / BBM', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Survey lokasi' }
    ],
    // 17. LOGISTIK
    LOGISTIK: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Operasional Supir', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Uang jalan supir' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening transfer klien' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Ekspedisi', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan ke pengirim' },
        { kodeAkun: '1-2001', namaAkun: 'Armada Truk & Kendaraan', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Aset kendaraan utama' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Leasing Kendaraan', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Cicilan armada' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa Pengiriman', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Ongkos kirim' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya BBM & Tol', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Beban langsung perjalanan' },
        { kodeAkun: '5-1002', namaAkun: 'Uang Jalan Supir & Kernet', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Upah langsung perjalanan' },
        { kodeAkun: '5-1003', namaAkun: 'Biaya Pemeliharaan Armada', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Servis, ban, oli' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Staff Admin & Gudang', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji kantor' },
        { kodeAkun: '6-1002', namaAkun: 'Penyusutan Kendaraan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Depresiasi aset' }
    ],
    // 18. PABRIK
    PABRIK: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Pabrik', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas tunai operasional' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Utama', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Usaha Distributor', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan penjualan' },
        { kodeAkun: '1-1201', namaAkun: 'Persediaan Bahan Baku', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Raw material' },
        { kodeAkun: '1-1202', namaAkun: 'Persediaan Barang Dalam Proses', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'WIP' },
        { kodeAkun: '1-1203', namaAkun: 'Persediaan Barang Jadi', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Finished goods' },
        { kodeAkun: '1-2001', namaAkun: 'Mesin & Peralatan Pabrik', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Mesin produksi' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Supplier Material', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang bahan baku' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Penjualan Produk Pabrik', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penjualan ke agen/distributor' },
        { kodeAkun: '5-1001', namaAkun: 'Biaya Pemakaian Bahan Baku', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Direct material' },
        { kodeAkun: '5-1002', namaAkun: 'Biaya Tenaga Kerja Langsung', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Upah buruh produksi' },
        { kodeAkun: '5-1003', namaAkun: 'Biaya Overhead Pabrik (Listrik/Pabrik)', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'FOH' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Direksi & Admin', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji manajemen' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Distribusi / Ekspedisi', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Ongkos angkut penjualan' }
    ],
    // 19. KOS
    KOS: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Tunai Kos', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas pembayaran tunai' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Sewa Penghuni', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tunggakan kos bulanan' },
        { kodeAkun: '1-2001', namaAkun: 'Bangunan Properti Kos', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Aset gedung' },
        { kodeAkun: '1-2002', namaAkun: 'Inventaris Kamar', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Kasur, AC, Lemari' },
        { kodeAkun: '2-1002', namaAkun: 'Deposit Keamanan (Jaminan)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Uang jaminan kunci/kerusakan' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Sewa Kamar', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Sewa bulanan/tahunan' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Listrik/Laundry Tambahan', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Extra charge' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Penjaga Kos / Cleaning', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Upah karyawan' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Listrik & Air Kos', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Utilitas bangunan' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Internet / Wifi', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Layanan penghuni' },
        { kodeAkun: '6-1004', namaAkun: 'Biaya Perawatan & Perbaikan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Maintenance AC/Kamar' }
    ],
    // 20. YAYASAN
    YAYASAN: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Yayasan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas operasional kecil' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Penerimaan Donasi', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening khusus donasi' },
        { kodeAkun: '1-2001', namaAkun: 'Inventaris Operasional', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Peralatan operasional nirlaba' },
        { kodeAkun: '3-1001', namaAkun: 'Aset Bersih Tidak Terikat', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Dana bebas' },
        { kodeAkun: '3-1002', namaAkun: 'Aset Bersih Terikat Sementara', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Donasi program khusus' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Donasi ZISWAF', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Penerimaan infaq/sedekah' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Hibah / Sponsor', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Dana institusi' },
        { kodeAkun: '6-1001', namaAkun: 'Beban Program Sosial/Penyaluran', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Distribusi donasi' },
        { kodeAkun: '6-1002', namaAkun: 'Gaji Pengurus / Amil', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Hak amil/pengelola' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Administrasi & Umum', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Operasional kantor' }
    ],
    // 21. KONSULTAN
    KONSULTAN: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Kantor', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Petty cash' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening penerimaan fee' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Fee Klien', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Invoice belum cair' },
        { kodeAkun: '1-2001', namaAkun: 'Peralatan Kerja / IT', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Laptop konsultan' },
        { kodeAkun: '2-1002', namaAkun: 'Uang Muka Klien (Retainer)', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'DP Jasa' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Jasa Konsultasi', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Hourly/Project billing' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Success Fee', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Bonus pencapaian' },
        { kodeAkun: '6-1001', namaAkun: 'Gaji Ahli / Konsultan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji profesional' },
        { kodeAkun: '6-1002', namaAkun: 'Biaya Representasi / Entertainment', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Meeting dengan klien' },
        { kodeAkun: '6-1003', namaAkun: 'Biaya Transportasi & Perjalanan', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Tiket pesawat/hotel meeting' }
    ],
    // 22. GYM
    GYM: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Resepsionis', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kasir pendaftaran' },
        { kodeAkun: '1-1002', namaAkun: 'Bank Perusahaan', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening EDC/Transfer' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Merchandise & Suplemen', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok Whey/Baju' },
        { kodeAkun: '1-2001', namaAkun: 'Alat Fitness & Beban', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Treadmill, Dumbell, Mesin' },
        { kodeAkun: '2-1002', namaAkun: 'Pendapatan Member Diterima Dimuka', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Member tahunan/6 bulan' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Membership', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Iuran bulanan/tahunan' },
        { kodeAkun: '4-1002', namaAkun: 'Pendapatan Personal Trainer (PT)', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Sesi latihan' },
        { kodeAkun: '4-1003', namaAkun: 'Pendapatan Jual Suplemen/Minuman', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Kantin gym' },
        { kodeAkun: '5-1001', namaAkun: 'HPP Suplemen & Minuman', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'Modal barang kantin' },
        { kodeAkun: '6-1001', namaAkun: 'Bagi Hasil Personal Trainer', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Komisi PT' },
        { kodeAkun: '6-1002', namaAkun: 'Gaji Admin & Cleaning', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Staff gym' },
        { kodeAkun: '6-1003', namaAkun: 'Beban Listrik (AC & Mesin)', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Utilitas tinggi' },
        { kodeAkun: '6-1004', namaAkun: 'Biaya Perawatan Alat Fitness', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Service treadmill' }
    ],
    // 23. LAINNYA / UMUM (Default General)
    LAINNYA: [
        { kodeAkun: '1-1001', namaAkun: 'Kas Utama', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Kas tunai operasional utama' },
        { kodeAkun: '1-1002', namaAkun: 'Bank BCA', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Rekening bank operasional' },
        { kodeAkun: '1-1100', namaAkun: 'Piutang Usaha', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Tagihan kepada pelanggan' },
        { kodeAkun: '1-1200', namaAkun: 'Persediaan Barang', tipeAkun: 'ASET_LANCAR', normalBalance: 'DEBIT', deskripsi: 'Stok persediaan' },
        { kodeAkun: '1-2001', namaAkun: 'Inventaris Peralatan', tipeAkun: 'ASET_TETAP', normalBalance: 'DEBIT', deskripsi: 'Peralatan operasional' },
        { kodeAkun: '2-1001', namaAkun: 'Hutang Usaha', tipeAkun: 'LIABILITAS_LANCAR', normalBalance: 'KREDIT', deskripsi: 'Hutang kepada supplier' },
        { kodeAkun: '3-1001', namaAkun: 'Modal Owner', tipeAkun: 'EKUITAS', normalBalance: 'KREDIT', deskripsi: 'Modal disetor pemilik' },
        { kodeAkun: '4-1001', namaAkun: 'Pendapatan Usaha', tipeAkun: 'PENDAPATAN', normalBalance: 'KREDIT', deskripsi: 'Pendapatan operasional utama' },
        { kodeAkun: '5-1001', namaAkun: 'Harga Pokok Penjualan', tipeAkun: 'HPP', normalBalance: 'DEBIT', deskripsi: 'HPP barang/jasa' },
        { kodeAkun: '6-1001', namaAkun: 'Beban Gaji & Upah', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Gaji karyawan' },
        { kodeAkun: '6-1002', namaAkun: 'Beban Operasional Lainnya', tipeAkun: 'BEBAN_OPERASIONAL', normalBalance: 'DEBIT', deskripsi: 'Beban sewa, listrik, dll' }
    ]
};
