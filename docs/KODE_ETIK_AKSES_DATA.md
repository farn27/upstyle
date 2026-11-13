# Kode Etik Akses Data — Tim Bizgrow

Berlaku untuk setiap orang yang memegang akses Ruang Kendali (`/konsol`) atau akses teknis lain ke sistem Bizgrow.
Dasar: **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)** — data hanya diproses sesuai tujuan,
seminimal mungkin, dan dijaga keamanannya.

## 1. Tujuan akses yang sah

1. Menjaga sistem tetap berjalan: memantau kesehatan layanan, galat, kapasitas, dan biaya AI.
2. Riset yang **sudah disetujui** pemilik usaha (Lembar B — Persetujuan Responden).

Di luar dua tujuan itu, data pengguna tidak boleh dibuka.

## 2. Yang boleh dilihat

| Data | Bentuk |
|---|---|
| Kesehatan layanan, versi, ukuran basis data | Teknis |
| Galat server & AI | Disamarkan otomatis (email, nomor HP, token, angka panjang) |
| Aktivitas per unit | **Jumlah** transaksi/order/aksi — bukan isinya |
| Pemakaian AI per pengguna | Jumlah token & permintaan (kuota, biaya) |
| Identitas tenant | Nama usaha, username, email yang disamarkan |

## 3. Yang tidak boleh — dikunci di sistem

1. Isi transaksi: keterangan, nama barang, nominal per transaksi, foto nota.
2. Total uang tenant: omzet, saldo kas, laba.
3. Data pelanggan: nama, nomor HP, alamat (POS, CRM, e-commerce).
4. Data karyawan: identitas, gaji, dokumen, absensi.
5. Isi percakapan dengan asisten AI (tidak disimpan di server).
6. Kredensial: kata sandi, token sesi, PIN kasir, kunci pembayaran.
7. Fitur "masuk sebagai pengguna" serta mengubah atau menghapus data tenant — **tidak dibuat**.

## 4. Pengecualian riset

Data usaha per unit (kueri Lembar G) hanya untuk unit yang ID-nya tercantum di `KONSOL_RISET_UNIT_IDS`,
yaitu unit yang pemiliknya sudah menyetujui pemeriksaan data. Setiap kueri tercatat di Jejak. Hasil hanya dipakai
untuk skripsi, disajikan tanpa nama pelanggan, dan dihapus dari perangkat pribadi setelah penelitian selesai.

## 5. Pengamanan akses

- **Daftar tim di env Vercel** — `SUPERADMIN_EMAILS` (pengelola), `KONSOL_PENGAMAT_EMAILS` (pengamat, hanya melihat).
  Hanya pemilik sistem yang mengubahnya. Selain anggota tim mendapat 404.
- **Verifikasi dua langkah (TOTP)** setiap masuk; sesi konsol berakhir setelah 8 jam atau saat menekan *Kunci*.
- **5 kali salah kode → dikunci 15 menit.** Kode yang sudah dipakai tidak bisa dipakai ulang.
- **Semua akses tercatat** di stasiun Jejak; pemberitahuan email ke `KONSOL_NOTIF_EMAIL` setiap ada yang masuk.
- **Kredensial basis data hanya dipegang pemilik sistem.** Anggota tim memakai Ruang Kendali, bukan akses langsung ke DB.
- HP hilang / ganti HP: pemilik sistem menghapus baris pengguna itu di tabel `konsol_2fa`, lalu anggota mendaftar ulang.

## 6. Kewajiban anggota tim

- Tidak menyalin, memotret, mengunduh, atau membagikan data tenant di luar tujuan pada bagian 1.
- Tidak membagikan akun, kode 2FA, atau kunci authenticator.
- Segera melapor ke pemilik sistem bila menemukan kebocoran atau akses mencurigakan.

## 7. Pelanggaran

1. Akses dicabut seketika (email dihapus dari env tim).
2. Bukti diambil dari Jejak.
3. Pemilik data yang terdampak diberi tahu paling lambat **3 × 24 jam** (kewajiban UU PDP).
4. Pelanggaran yang disengaja dapat diproses pidana: UU PDP Pasal 67 — memperoleh atau menggunakan data pribadi
   secara melawan hukum diancam penjara paling lama 5 tahun dan/atau denda paling banyak Rp5 miliar;
   mengungkapkannya diancam paling lama 4 tahun dan/atau denda paling banyak Rp4 miliar.
