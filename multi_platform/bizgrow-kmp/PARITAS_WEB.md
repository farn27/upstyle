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
| CRM / CS | 🟡 | Kontak, pipeline, aktivitas, tiket dasar. ❌ kampanye CRM, detail kontak |
| Settings / billing / help | 🟡 | ❌ avatar URL, modal awal & kategori, ulasan aplikasi |
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
