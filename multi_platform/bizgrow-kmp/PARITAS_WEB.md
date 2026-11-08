# Paritas fitur: web ↔ mobile (BizGrow)

Dibuat dari audit otomatis 117 halaman web (`web/src/routes`) vs layar Kotlin (`ui/screens`), lalu diverifikasi
manual per modul. ✅ = setara web · 🟡 = sebagian · ❌ = belum ada. E-commerce/Shopee sengaja tidak dikerjakan.

| Modul (halaman web) | Status | Catatan |
|---|---|---|
| Beranda web (`/`) | ✅ | Kalender deadline pajak (dihitung otomatis), update, Academy, bantuan, kartu AI |
| Struktur bisnis (`/finance`) | ✅ | Pisah Kantor Pusat / Cabang, kartu Business Planning |
| Dashboard unit (`finance/[slug]`) | ✅ | Periode, ringkasan, analisis, target bulan ini, risk assessment, kas & bank, stok menipis, tagihan jatuh tempo, audit log. ❌ mode grafik "ITEMS" |
| Chat AI (`ChatAI.svelte`) | ✅ | Sambutan 4 tab + prompt, saran lanjutan, riwayat sesi 30 hari, konteks unit, tabel/metric/alert/progress/grid/steps, grafik, kartu transaksi (kas/COA), salin, detail, mode instan. ❌ unggah file CSV/gambar (butuh file picker native) |
| AI Advisor / Laporan WA | 🟡 | Ada sebagai tab di layar AI; tampilan belum dirombak |
| Riwayat transaksi (`history`) | ✅ | Filter periode/jenis/pencarian, urutan, detail + saldo setelah transaksi, ekspor lewat layar Ekspor. ❌ filter kategori ABC, cetak invoice, paginasi (100 terbaru) |
| Entri transaksi (`entry`) | ✅ | AI sinkron, COA, kas, produk, qty + cek stok. ❌ tambah akun kas baru dari form (lewat layar COA) |
| Laporan (`laporan`) | ✅ | Dashboard analisis, laba rugi formal, neraca (data sama dgn web via helper bersama) |
| Buku besar / Jurnal umum | 🟡 | Filter bulan/tahun & referensi belum lengkap |
| Piutang / Hutang | ✅ | Pilih akun kas saat bayar; hutang asal pengadaan kini dijurnal. ❌ cetak PDF |
| Master data: pajak, aset tetap, anggaran, COA, tutup buku | ✅ | CRUD lengkap. ❌ COA parent/generate AI, aset ↔ akun COA, realisasi anggaran |
| Master data: kontak akuntansi | ✅ | CRUD + termin & limit kredit |
| HR: tambah karyawan | ✅ | Identitas, pekerjaan, kompensasi, kontak darurat, akses portal |
| HR: detail karyawan / payroll / absensi | ✅ | Profil lengkap + ubah, KPI, riwayat jabatan, dokumen, tandai payroll lunas, edit departemen. ❌ komponen gaji earnings/deductions, slip PDF, dasbor HR eksekutif |
| POS kasir | ✅ | Dine in/takeaway/delivery, meja, antrean, voucher, diskon Rp/%, split payment, catatan, kembalian |
| POS: antrean & dapur | ✅ | Auto-refresh 15 dtk |
| POS: voucher/promo | ✅ | CRUD + kuota |
| POS: shift (setor/tarik kas), laporan kasir, pesanan ditunda | ✅ | Pesanan ditunda hilang jika aplikasi ditutup. ❌ PIN otorisasi (tidak relevan untuk pemilik), kelola fitur POS & produk tampil di POS |
| Produk | 🟡 | ❌ atribut/varian lengkap di form tambah, impor CSV (file picker) |
| Pengadaan | ✅ | Detail PO: terima barang, tagihan, retur, bayar faktur, tutup/batal + saran restock. ❌ laporan pembelian, cetak PO |
| CRM | ✅ | Deal (nama, nilai, tahap, hapus), kontak (daftar, cari, detail, ubah, hapus), aktivitas, tugas follow-up, pipeline kanban. ❌ kampanye CRM (halaman web hanya placeholder) |
| Penjualan: penawaran & sales order | ✅ | Buat dengan item, alur status, konversi penawaran ACCEPTED → sales order (sekali) |
| CS (tiket) | ✅ | Inbox dengan filter & pencarian, detail + percakapan, ubah status/prioritas, pelanggan tersimpan |
| Pesanan toko online | ✅ | Status bayar & kirim terpisah seperti web, detail, WhatsApp pelanggan |
| Marketing / Landing page / Sosmed / Website / Katalog | ✅ | Lead per unit → kontak CRM, slug unik, jadwal posting, foto dari galeri, URL publik asli, katalog aktif/nonaktif tersimpan |
| Unit bisnis: portal staff | ✅ | Lihat/salin/buat ulang link login staff |
| Impor produk/pelanggan | ✅ (Android) | Pemilih file CSV/Excel + validasi; iOS belum |
| Settings / billing / help | ✅ | Ganti password (argon2), FAQ bantuan nyata. ❌ avatar URL, ulasan aplikasi |
| Planning wizard | ✅ | 7 langkah lengkap + bantuan AI + proyeksi, ringkasan AI. Terapkan ke unit lewat daftar plan |
| Portal staff, toko publik, auth web | — | Bukan bagian aplikasi pemilik |

## Perbaikan kontrak API yang ditemukan saat audit
- `GET /api/app/finance` tidak mengirim `summary/alerts/bankBalances/kpi` dan mengabaikan `start/end` → saldo & peringatan di app kosong (diperbaiki).
- `GET /api/app/finance/laporan` mengirim bentuk berbeda dari model Kotlin → laporan nol (ditambah `type=report`).
- `hr/departments` & `products/categories` memakai kunci selain `data` → daftar kosong di app (diperbaiki).
- Tutup buku di app hanya menampilkan snackbar palsu; server menghitung laba/rugi seluruh riwayat, bukan periode (diperbaiki).
- `create-employee` membuang email/telepon/dll dan memakai password bawaan `123456` (diperbaiki).

- `POST /api/app/finance/payables` (bayar hutang) tidak menjurnal/kas keluar untuk tagihan pengadaan → kini memakai `bayarTagihan` seperti web.
- `pos` action `verify-pin` selalu gagal dan bisa dipakai menebak PIN karyawan tenant lain → diperbaiki.
- Payroll: status `DIBAYAR` vs `PAID` dan filter bulan memakai teks → dipakai `periodMonth/periodYear`.

## Perbaikan sesi "lengkapi semua modul"
- **Klien Ktor tidak mengirim properti bernilai default** (`action = "checkout"`, `"create-contact"`, …) → banyak tombol berujung "aksi tidak dikenali". Sekarang `encodeDefaults = true` + `@EncodeDefault` pada semua `action`.
- `GET crm?type=contacts` tidak ada → tab Kontak selalu kosong; daftar deal terpotong 20 baris; kontak tertanam di deal tanpa `ownerId/unitId` membuat seluruh deal gagal dibaca.
- Status tiket CS (`Open` vs `OPEN`) tidak cocok → inbox selalu kosong; ubah status mengirim nilai enum salah.
- Pesanan toko online: model app memerlukan `status` yang tidak dikirim server → daftar pesanan tidak pernah terbaca.
- **Kebocoran lintas tenant**: lead marketing (semua unit) dan riwayat payroll (gaji semua unit) tidak difilter unit → diperbaiki + tes.
- Penawaran: konversi lama membuat POS order dan mengisi status `CONVERTED` yang tidak ada di enum → selalu gagal; sales order lama mencatat pemasukan sebelum dibayar.
- Katalog online "tersimpan" padahal server tidak menyimpan apa pun; situs publik tetap terbuka walau dinonaktifkan; URL contoh palsu (`katalog.bizgrow.id`).
- Slug unik: karyawan (tabrakan acak 4 digit), landing page, situs web; jadwal sosmed memakai `new Date()` → zona waktu salah.
- Laporan WA: app mengirim label tampilan ("Bulan Ini") yang ditolak server.
- Ganti password app memakai plaintext (tidak cocok argon2); link portal staff mengubah slug unit.

## Audit "setengah jadi & hardcode" di mobile
- **Neraca palsu**: layar Neraca berisi angka karangan (Kas Rp125 jt, dst.) → diganti memakai laporan neraca asli.
- **Pemindai barcode simulasi** (kotak gelap + animasi laser, tanpa kamera) → kini CameraX + ML Kit; ketik manual tetap ada. iOS: belum.
- **Realtime Socket.io tidak pernah tersambung** dan alamatnya di-hardcode (IP sslip.io) → alamat & token kini dari `GET /api/app/realtime` (env `PUBLIC_SOCKET_URL`); sambung ulang otomatis saat token habis.
- **Stok opname hanya riwayat** & server selalu gagal (gudang tidak ada) → form hitung fisik, gudang bawaan otomatis, stok disesuaikan, selisih dijurnal; akun jurnal opname web juga diperbaiki.
- **Cuti/lembur hanya daftar** → setujui/tolak + catat atas nama karyawan; status huruf besar/kecil dinormalkan.
- **Harga & margin**: tombol "Edit Harga…" cuma snackbar → editor harga beli/jual/stok minimum + margin.
- **Target sales**: edit membuat target baru (duplikat) → memakai update-target.
- **Kampanye**: bisa ubah status & hapus.
- **Slip gaji & invoice**: link sementara bertanda tangan (`/api/dokumen`) dibuka di browser HP; nama karyawan di slip tadinya "undefined".
- **Tiket dukungan ke tim Bizgrow** selalu gagal → email ke `SUPPORT_EMAIL`.
- **Integrasi Shopee palsu** (status disimpan di memori server, token tidak diverifikasi) → dihapus dari app & server.
- **Foto produk**: URL ui-avatars/placeholder.com & path relatif `/uploads/..` → `ProductThumb` (inisial lokal + alamat server dari `LocalServerUrl`).
- Alamat server bawaan kini dari konfigurasi build (`-Pbizgrow.serverUrl`), batas unit paket dari server, nama karyawan (bukan "Karyawan #id") di HR.
- CI tidak lagi mencetak respons Appetize (berisi privateKey).

## Business Planning (lobi → wizard → AI → terapkan)
- **Lobi (Beranda)**: kartu Business Planning ungu di bagian atas (sebelumnya tersembunyi di bawah daftar divisi): "Mulai Business Planning", atau "Lanjutkan rencana … langkah x/7", atau "siap diterapkan".
- **Alur sama di web & app**: 7 langkah → *AI mengonfirmasi rencana* (skor 0–100, kekuatan, perbaikan) → *generate Business Canvas* (9 blok + ringkasan eksekutif, disimpan) → *terapkan* (unit baru atau unit yang ada: kategori produk, produk contoh, COA, karyawan template, supplier, ABC, pajak).
- Paritas: 6 model pendapatan, 6 channel, 6 platform online (nama sama dengan web), tombol "Minta AI review" di langkah 3, canvas tersimpan (`canvasJson`).
- Server: mode AI baru `review`; konteks AI kini ringkasan berlabel lengkap (dulu JSON dipotong 400–600 karakter sehingga modal, biaya, dan channel sering tidak terbaca AI); prompt canvas meminta JSON murni.
- Daftar rencana (app) menampilkan progres langkah, status Draf/Selesai/Diterapkan; "Terapkan" dulu memakai unit aktif secara diam-diam — kini memilih tujuan secara eksplisit.
