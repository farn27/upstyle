/** Konten Pusat Bantuan — satu sumber untuk halaman web /help dan aplikasi mobile (lewat GET /api/app/help). */

export const FAQS = [
        {
            q: "Bagaimana cara melakukan Stok Opname?",
            a: "1. Buka menu Katalog Produk -> Stok Opname.\n2. Klik tombol 'Buat Opname Baru'.\n3. Pilih produk atau varian yang ingin disesuaikan.\n4. Input jumlah stok fisik yang dihitung di lapangan.\n5. Sistem otomatis menghitung selisih (selisih positif = masuk, selisih negatif = keluar).\n6. Masukkan alasan penyesuaian (misal: OPNAME, RUSAK, ADJUSTMENT) dan ulasan tambahan.\n7. Klik 'Simpan Penyesuaian'. Sistem akan otomatis memutakhirkan stok sistem dan mencatat riwayat log stok.",
            cat: "produk"
        },
        {
            q: "Bagaimana cara melakukan Tutup Buku akhir bulan?",
            a: "1. Pastikan seluruh transaksi POS, jurnal umum, pengeluaran payroll, dan penagihan piutang bulan ini sudah selesai di-posting.\n2. Masuk ke Master Data -> Tutup Buku.\n3. Pilih periode bulan dan tahun yang ingin dikunci.\n4. Sistem akan melakukan validasi balance debit/kredit.\n5. Klik tombol 'Proses Kunci Periode'.\n6. Sistem akan otomatis memindahkan saldo laba/rugi berjalan ke akun modal ditahan dan mengunci periode tersebut agar tidak dapat diedit kembali demi integritas audit.",
            cat: "finance"
        },
        {
            q: "Bagaimana cara menghubungkan E-Commerce ke Shopee/Tokopedia?",
            a: "1. Buka menu E-Commerce Store -> Integrasi Marketplace.\n2. Pilih platform (misal Shopee atau Tokopedia).\n3. Klik tombol 'Hubungkan Toko'. Anda akan dialihkan ke halaman otorisasi resmi API developer marketplace.\n4. Login dengan akun seller Anda dan berikan izin akses.\n5. Setelah sukses, tentukan aturan pemetaan produk (mapping SKU).\n6. Setelah terhubung, setiap ada transaksi di marketplace atau perubahan stok di Bizgrow, data stok akan tersinkronisasi otomatis dalam 5 menit.",
            cat: "ecommerce"
        },
        {
            q: "Bagaimana cara memproses penggajian (payroll) staf?",
            a: "1. Buka menu SDM / HR Staff -> Penggajian (Payroll).\n2. Pilih periode bulan penggajian yang aktif.\n3. Klik nama staf untuk mengedit lembur, bonus, BPJS, potongan kehadiran, atau insentif komisi sales.\n4. Klik 'Hitung Gaji'. Sistem akan menghitung total gaji bersih secara otomatis berdasarkan data absensi staf.\n5. Klik 'Posting & Bayar'. Slip gaji PDF akan otomatis di-generate dan notifikasi dikirimkan langsung ke nomor WhatsApp staf yang terdaftar.",
            cat: "hr"
        },
        {
            q: "Bagaimana cara kerja Tanya AI?",
            a: "Tanya AI adalah asisten kecerdasan buatan terintegrasi yang dapat membaca data operasional Anda. Anda dapat mengkliknya di pojok kanan atas atau menekan tombol `Ctrl + I`. Tanyakan hal-hal analisis seperti: 'Berapa laba kotor cabang A bulan lalu?', 'Produk apa yang stoknya di bawah batas minimum?', atau 'Buatkan ringkasan performa finansial kuartal ini'. AI akan menyusun data grafik dan ringkasan eksekutif dalam hitungan detik.",
            cat: "sistem"
        },
        {
            q: "Kenapa printer thermal POS kasir tidak merespon?",
            a: "1. Pastikan kabel USB printer terhubung dengan benar ke terminal POS.\n2. Pastikan printer thermal dalam kondisi ON dan indikator kertas tidak berkedip (no paper).\n3. Cek pengaturan printer di sistem POS dengan masuk ke POS -> Pengaturan Printer.\n4. Lakukan cetak uji (Print Test Page).\n5. Jika masih gagal, cek apakah driver printer thermal (biasanya driver POS-80 atau Epson) telah terpasang dengan benar di sistem operasi komputer Anda.",
            cat: "pos"
        },
        {
            q: "Bagaimana cara me-reset password akun staf?",
            a: "1. Hanya administrator atau manajer HR yang dapat mengubah password staf.\n2. Buka menu SDM / HR Staff -> Daftar Staff.\n3. Cari nama staf yang ingin diubah paswordnya, lalu klik tombol 'Detail' atau 'Edit'.\n4. Klik tombol 'Ganti Password'.\n5. Input password baru berdurasi minimal 6 karakter, lalu klik 'Simpan Password'.\n6. Beritahukan password baru tersebut kepada staf terkait untuk digunakan pada login berikutnya.",
            cat: "hr"
        },
        {
            q: "Kenapa saldo Neraca (Balance Sheet) tidak seimbang?",
            a: "Saldo Neraca tidak seimbang biasanya terjadi karena adanya entri jurnal manual yang tidak balance (debit & kredit berbeda), pemetaan akun COA yang keliru pada transaksi otomatis, atau ada jurnal penyesuaian yang belum diposting. Periksa modul Laporan -> Jurnal Tidak Seimbang untuk mengidentifikasi transaksi penyebab selisih tersebut.",
            cat: "finance"
        }
    ];

// Tambahan topik yang sering ditanyakan (berlaku untuk web dan aplikasi)
FAQS.push(
    {
        q: "Bagaimana staf saya bisa login ke portal?",
        a: "1. Buka Struktur Bisnis -> pilih unit -> Pengaturan Bisnis (di aplikasi: titik tiga pada unit -> Portal staff).\n2. Salin link login staf (/portal/…) dan bagikan ke karyawan.\n3. Staf masuk dengan akun karyawan yang dibuat di menu HR.\n4. Bila link bocor, pilih 'Buat ulang link' — link lama langsung tidak berlaku.",
        cat: "hr"
    },
    {
        q: "Bagaimana mengimpor produk atau pelanggan dari Excel/CSV?",
        a: "1. Buka Export/Import (web: Produk -> Import).\n2. Pilih tipe data Produk atau Pelanggan.\n3. Pilih file .xlsx atau .csv (maks 5 MB, 2.000 baris). Baris pertama harus judul kolom: nama, sku, harga_beli, harga_jual, stok, kategori (produk) atau nama, telepon, email, perusahaan (pelanggan).\n4. Periksa hasil validasi, lalu klik Import Data.",
        cat: "produk"
    },
    {
        q: "Bagaimana menambahkan PPN pada penjualan kasir?",
        a: "1. Buat tarif PPN di Master Data -> Pajak (mis. PPN 11%, jadikan default).\n2. Di layar pembayaran Kasir, aktifkan PPN dan pilih apakah harga sudah termasuk PPN (inklusif) atau ditambahkan di atas harga (eksklusif).\n3. PPN otomatis masuk jurnal PPN Keluaran dan rekap pajak bulanan.",
        cat: "pos"
    },
    {
        q: "Bagaimana membuat penawaran lalu menjadi sales order?",
        a: "1. Buka CRM -> Penawaran dan buat penawaran dengan pelanggan dan item produk.\n2. Tandai Terkirim, lalu Diterima saat pelanggan setuju.\n3. Klik 'Jadikan sales order'. Penawaran hanya bisa dikonversi satu kali dan hanya yang berstatus Diterima.",
        cat: "sales"
    },
    {
        q: "Bagaimana memasukkan lead marketing ke CRM?",
        a: "Di Marketing -> Leads, pilih 'Jadikan kontak CRM'. Sistem membuat kontak CRM (tahap Lead, sumber 'landing page') dan menandai lead sebagai sudah ditransfer.",
        cat: "sales"
    },
    {
        q: "Apa itu Business Planning dan bagaimana alurnya?",
        a: "Business Planning memandu kamu memulai bisnis dalam 7 langkah: identitas, target pasar, proposisi nilai, model pendapatan, modal & biaya, channel, lalu konfirmasi. Di akhir, AI memeriksa kelayakan rencana (skor 0-100), membuatkan Business Canvas, dan kamu bisa menerapkannya menjadi bisnis baru atau mengisi bisnis yang ada (produk contoh, akun COA, karyawan template, supplier, pajak).",
        cat: "sistem"
    },
    {
        q: "Bagaimana mengubah status dan prioritas tiket pelanggan (CS)?",
        a: "Buka Customer Service -> pilih tiket. Ubah status (Terbuka, Diproses, Selesai, Ditutup) dan prioritas (Rendah s/d Mendesak), lalu balas pelanggan lewat kolom percakapan. Membalas otomatis mengubah status menjadi Diproses.",
        cat: "sales"
    }
);

export const KATEGORI_FAQ = {
    produk: 'Produk & Stok', finance: 'Keuangan', ecommerce: 'E-Commerce', hr: 'SDM & Payroll',
    sistem: 'Sistem & AI', pos: 'Kasir (POS)', sales: 'Penjualan & CRM'
};

export const PANDUAN = [
        {
            title: "Modul Keuangan & Akuntansi",
            desc: "Panduan penyusunan COA, pencatatan jurnal umum, buku besar, piutang, dan penutupan buku.",
            color: "border-blue-500 bg-blue-50/20 dark:bg-blue-950/10",
            iconColor: "text-blue-500",
            steps: [
                "Atur Bagan Akun (COA) di modul Master Data -> COA sebelum mencatat transaksi.",
                "Gunakan Jurnal Umum untuk menginput entri jurnal manual (misal: penyusutan aset, biaya sewa dimuka).",
                "Periksa Buku Besar secara berkala untuk memantau detail mutasi per akun perkiraan.",
                "Kelola tagihan pelanggan di modul Piutang (AR) dan tagihan vendor di modul Hutang (AP).",
                "Lakukan rekonsiliasi bank dan penutupan buku akhir periode untuk membekukan data demi keamanan audit."
            ]
        },
        {
            title: "Point of Sales (Kasir POS)",
            desc: "Langkah mengoperasikan kasir penjualan ritel, buka/tutup shift, dan manajemen struk.",
            color: "border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10",
            iconColor: "text-indigo-500",
            steps: [
                "Buka shift kasir setiap pagi dengan menginput saldo modal laci awal.",
                "Pilih produk dengan scan barcode atau klik katalog visual pada layar POS.",
                "Terapkan diskon member atau voucher promosi jika ada.",
                "Pilih metode pembayaran (Tunai, QRIS otomatis, Kartu Debit, atau Piutang Pelanggan).",
                "Klik 'Selesaikan Transaksi' untuk mencetak struk thermal dan memutakhirkan stok inventaris secara real-time.",
                "Lakukan tutup shift di sore/malam hari dengan menghitung uang fisik di laci kasir dan mencocokkannya dengan laporan sistem."
            ]
        },
        {
            title: "Pemasaran & Integrasi Campaign",
            desc: "Panduan membuat kampanye promosi, leads tracker, dan pencatatan ad spend ROI.",
            color: "border-fuchsia-500 bg-fuchsia-50/20 dark:bg-fuchsia-950/10",
            iconColor: "text-fuchsia-500",
            steps: [
                "Buat voucher diskon baru di modul Voucher & Diskon dengan batasan kuota dan tanggal kedaluwarsa.",
                "Rancang kampanye iklan (Email, WhatsApp Broadcast, atau Social Media Ads) di sub-kampanye.",
                "Catat pengeluaran biaya iklan di Ad Tracker (Facebook, Google, TikTok Ads) beserta total klik & konversi.",
                "Pantau leads baru yang masuk melalui landing page toko online untuk ditindaklanjuti oleh sales.",
                "Gunakan Dashboard Pemasaran untuk melihat Return on Ad Spend (ROAS) dan metrik akuisisi leads."
            ]
        },
        {
            title: "Layanan Pelanggan (Omnichannel CS)",
            desc: "Langkah penanganan keluhan pelanggan, sistem antrean tiket support, dan SLA.",
            color: "border-cyan-500 bg-cyan-50/20 dark:bg-cyan-950/10",
            iconColor: "text-cyan-500",
            steps: [
                "Hubungkan kanal komunikasi Anda (WhatsApp Business API, Email Support, Livechat) di modul Layanan.",
                "Setiap pesan masuk akan terbuat menjadi tiket baru secara otomatis di antrean support.",
                "Tugaskan tiket ke staf CS yang sedang aktif dan atur prioritas tiket (Low, Medium, High, Urgent).",
                "Gunakan template jawaban cepat (Quick Replies) untuk mempercepat waktu respons (SLA).",
                "Setelah kendala selesai, ubah status tiket menjadi Resolved dan kirimkan survei kepuasan pelanggan."
            ]
        },
        {
            title: "E-Commerce & Sinkronisasi Marketplace",
            desc: "Panduan mengelola toko online mandiri dan integrasi stok multi-channel marketplace.",
            color: "border-amber-500 bg-amber-50/20 dark:bg-amber-950/10",
            iconColor: "text-amber-500",
            steps: [
                "Atur preferensi toko online Anda (Logo, Alamat, Kurir Pengiriman, Aturan Pajak) di Storefront Setting.",
                "Tentukan produk dari katalog utama yang akan dipajang di toko online.",
                "Hubungkan API marketplace Shopee, Tokopedia, dan Lazada di tab Integrasi.",
                "Sistem akan menyinkronkan stok secara otomatis jika ada penjualan baik di toko fisik, toko online, maupun Shopee.",
                "Gunakan Landing Page Creator untuk merancang halaman promo khusus produk tertentu guna menaikkan omzet."
            ]
        }
    ];

export const TROUBLESHOOT = {
        pos: [
            {
                problem: "Printer thermal kasir tidak mencetak kertas struk",
                solution: "1. Matikan printer thermal selama 10 detik, lalu hidupkan kembali.\n2. Cek lampu indikator (jika merah berkedip, kemungkinan kertas habis atau sensor terhalang debu).\n3. Pastikan kabel data USB terhubung erat ke komputer kasir.\n4. Buka Pengaturan Perangkat di komputer Anda (Control Panel -> Devices and Printers) dan pastikan driver printer 'POS-80' atau tipe sejenis dalam status online.\n5. Coba lakukan cetak test page dari driver tersebut.\n6. Di sistem POS Bizgrow, klik tombol refresh printer dan coba cetak ulang struk."
            },
            {
                problem: "Barcode scanner tidak mendeteksi kode produk",
                solution: "1. Pastikan port USB scanner terhubung dengan benar.\n2. Coba scan ke aplikasi Notepad untuk melihat apakah scanner mengeluarkan angka barcode.\n3. Jika angka keluar di notepad tapi tidak di kasir POS, pastikan cursor fokus berada di kolom input scanner kasir.\n4. Bersihkan lensa kaca barcode scanner dari sidik jari atau debu.\n5. Pastikan format barcode di Katalog Produk (SKU) sudah cocok dengan barcode fisik barang."
            },
            {
                problem: "Laci kasir (Cash Drawer) tidak terbuka otomatis",
                solution: "1. Cash drawer biasanya terhubung menggunakan kabel RJ11 ke port belakang printer thermal (bukan ke komputer langsung).\n2. Pastikan printer thermal menyala dan driver printer telah dikonfigurasi untuk mengirim perintah 'Cash Drawer Open' sebelum mencetak.\n3. Cek kunci fisik laci kasir, pastikan tidak berada dalam posisi terkunci mati (horizontal).\n4. Cek apakah ada benda asing/koin yang mengganjal mekanisme rel penarik laci kasir."
            }
        ],
        finance: [
            {
                problem: "Jurnal penyesuaian otomatis tidak masuk ke Buku Besar",
                solution: "1. Masuk ke modul Master Data -> Bagan Akun (COA).\n2. Pastikan akun penyesuaian (misalnya Akumulasi Penyusutan Aset) sudah dipetakan dengan benar di kategori akun terkait.\n3. Cek apakah periode transaksi tersebut sudah terkunci atau belum. Jika periode terkunci (Tutup Buku sudah dilakukan), Anda harus membuka kunci periode terlebih dahulu melalui izin Administrator.\n4. Klik tombol 'Posting Ulang Transaksi' di dashboard Master Data."
            },
            {
                problem: "Laporan Laba Rugi menampilkan data yang keliru",
                solution: "1. Periksa apakah ada transaksi penjualan POS atau pembelian barang yang masih dalam status 'Draft' atau belum diposting.\n2. Cek modul Jurnal Umum, pastikan tidak ada entri jurnal ganda untuk periode tersebut.\n3. Pastikan klasifikasi tipe akun COA (Pemasukan, Harga Pokok Penjualan, Pengeluaran Operasional) diatur dengan benar. Klasifikasi akun yang salah akan menyebabkan penempatan nominal laporan laba rugi terbalik."
            }
        ],
        sync: [
            {
                problem: "Stok produk di Shopee/Tokopedia tidak berkurang setelah terjual offline",
                solution: "1. Buka E-Commerce Store -> Integrasi Marketplace.\n2. Cek status koneksi token API toko Anda (jika kedaluwarsa, klik 'Hubungkan Ulang').\n3. Pastikan SKU produk di Katalog Utama Bizgrow sama persis dengan SKU Produk yang terdaftar di Shopee/Tokopedia.\n4. Cek antrean sinkronisasi stok di tab log Integrasi. Jika antrean macet, klik tombol 'Paksa Sinkronisasi Stok Sekarang'.\n5. Pastikan produk tersebut tidak dalam kondisi 'Diarsipkan' di sistem marketplace."
            }
        ]
    };
