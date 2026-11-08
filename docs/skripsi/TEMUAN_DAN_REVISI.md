# Temuan, Ketidaksesuaian, dan Usulan Revisi Skripsi

Hasil mencocokkan **skripsi (v4)** dan **Lembar Pengujian** dengan kode Bizgrow di repositori (HEAD `6225628`, 8 Nov 2026) dan
konfigurasi produksi di Vercel (hanya *nama* variabel, nilai tidak dibaca). Semua butir di bawah dapat ditelusuri ke berkas kode
yang disebut. **Tidak ada satu pun hasil pengujian yang saya isi atau karang**; butir "prediksi" adalah hasil membaca kode dan
harus dibuktikan dengan menjalankan pengujian.

---

## A. Ketidaksesuaian antara tulisan dan kode

| # | Tertulis di | Isi tertulis | Kenyataan di kode | Tindakan |
|---|---|---|---|---|
| A1 | Lampiran 3, kalimat penutup | "Setelah 3 Oktober 2026 tidak tercatat perubahan kode…" | Git mencatat **96 commit** (92 non-merge) setelah `c2702a1`, seluruhnya 4–8 Nov: perbaikan keamanan (token Socket.io per unit, RBAC paket berbayar, enkripsi, rate limit, **kuota AI 20/menit & 300/hari**), **sistem memori & optimasi prompt chat AI (5 Nov)**, modul Pengadaan, jenis barang, tanggal WIB, perbaikan kebocoran data lintas tenant pada modul lain, dsb. | **Wajib dikoreksi.** Bekukan satu commit untuk diuji (lihat §E-1) dan tambahkan baris ke Lampiran 3 (§D-5). |
| A2 | Lembar `Petunjuk` B17 | Versi kode `c2702a1` (3 Okt) | Commit itu ada, tetapi kode yang berjalan sekarang jauh berbeda (termasuk prompt chat AI). | Isi dengan commit yang **ter-deploy pada hari uji**. |
| A3 | Lembar `Petunjuk` B16 | Chat: temperature 0,35 / max_tokens 1200 | `/api/chat`: **0,3 / 650**. Entry web: 0,1 (tanpa max_tokens → 1024). `/api/app/ai-entry`: 0 / 300. | Sudah dikoreksi di `…_revisi.xlsx`. Isi Bab IV "parameter [ ]" sesuai. |
| A4 | Bab III & IV, lembar | Tiap tenant punya "akun berperan pemilik, manajer, staf, kasir" (padahal kedua studi kasus tanpa karyawan; uji POS memakai akun pemilik) | Hanya pemilik yang berupa akun `users`. Manajer/staf/kasir adalah **karyawan** yang login lewat `/portal/<login_slug>` dengan PIN (cookie `staff_session_token`). Peran `MANAGER/ADMIN/OWNER` di `rbac.js` memang berakses penuh, tetapi tidak ada alur UI yang membuat akun `users` berperan itu. | Ubah kalimat peran (§D-1). Skenario 3 diuji dengan sesi portal kasir. |
| A5 | Bab III 4.a, lembar `AI-Ekstraksi/Akun` | "Input transaksi AI (web: …/entry; mobile: /api/app/ai-entry)" seolah satu fitur | Dua jalur berbeda: **web** menghitung nominal produk di server (harga × qty) dan hanya meminta `nominal_manual` dari model untuk pengeluaran; **API mobile** menyerahkan perhitungan nominal ke model (T=0, 300 token). Prompt dan data konteks juga beda. | Tentukan jalur yang dievaluasi dan tulis (§D-3). Rekomendasi: **`/api/app/ai-entry`** (scriptable, memuat harga di prompt). |
| A6 | Lembar `Fungsional` AIF-02 | "Pratinjau transaksi dari chat" masuk "Fitur AI" | Pratinjau chat ("beli gula 50rb") dibuat oleh **parser regex** `parseTransactionNL` lebih dulu; model hanya cadangan. | Boleh tetap diuji sebagai fungsi, tetapi jangan disebut kemampuan model. |
| A7 | Tabel 4.8, lembar `Performa` kolom C, Bab II ("WebSocket untuk event kritis (POS, peringatan stok)") | "Peringatan stok realtime" diukur dari transaksi sampai peringatan tampil | **Tidak ada fitur itu.** Event socket `stock-alert` hanya dikirim cron Inngest **08.00 setiap hari**; email peringatan stok punya *cooldown* 6 jam; banner di UI memanggil `/api/low-stock`. Transaksi tidak memicu push peringatan stok. | Putuskan §E-3. |
| A8 | Lampiran 2 (tabel arsitektur) | Realtime = "Socket.io dan **Pusher**" | `lib/server/pusher.js` hanya pembungkus yang meneruskan ke Socket.io; tidak ada pemakaian Pusher sungguhan. | Tulis "Socket.io". |
| A9 | Lampiran 2 C | "75 tabel, 69 tabel menyimpan `unitId`" | Skema saat ini: **84 tabel**, **51** punya kolom `unit_id` (basis uji lokal; produksi bisa sedikit berbeda). | Hitung ulang di basis data uji dengan SQL §F, lalu perbarui angka. |
| A10 | Lembar `AI-Analitis` A13 | Acuan memakai 20 transaksi terakhir | AI hanya diberi **8** transaksi terakhir (`limit(8)`), dan 10 produk dengan stok terendah, tren 6 bulan. | Dikoreksi (LIMIT 8) di `…_revisi.xlsx` dan `acuan-analitis.sql`. |
| A11 | Lembar `AI-Analitis` A20 | "Data pelanggan tidak dikirim ke AI" | Kata *pelanggan* mengaktifkan intent CRM → konteks CRM **dikirim**. | Acuan dirumuskan ulang di `…_revisi.xlsx`. |
| A12 | Lembar `Fungsional` STK-06 | Aturan "[isi aturan Bizgrow]" | Pengurangan stok atomik dengan syarat `stok ≥ qty`; jika kurang → **HTTP 409** "Stok … tidak mencukupi! (Sisa: n)". | Sudah diisi. |
| A13 | Lembar `Fungsional` POS-04 | Bayar kurang → ditolak/peringatan | Peringatan "Uang belum cukup! Kurang …" hanya di **UI**; `POST /api/app/pos` tidak memvalidasi `amountPaid < total`. | Uji via UI; catat celah API sebagai temuan (Tabel 4.20). |
| A14 | Bab II (KMP) | "berbagi basis kode antara Android dan iOS" | Hanya Android yang dibangun & dicoba. iOS belum diverifikasi. | Tulis "Android; iOS belum diuji". |
| A15 | Bab III 4.c / lembar | Setiap kasus 3× tanpa gangguan | Kuota AI per akun: 20/menit, 300/hari. Bila 429 atau galat Groq, sistem **otomatis jatuh ke GPT-OSS-20B** (429) atau GPT-OSS-120B (404); jawaban analitis bisa berasal dari model yang bukan 120B. | Skrip menandai galat & mengulang; cek log server `[Groq] Rate limit reached` dan ulangi kasus tersebut (sudah di Petunjuk langkah 6). |
| A16 | Chat AI (sejak 5 Nov) | — | Ada **memori AI** per unit/user yang ikut masuk prompt. | Pakai tenant uji tanpa memori (`reset semua memori`) dan `history: []` (skrip sudah begitu). |
| A17 | Skenario 4 | Bergantung pada pembatasan | Pembatasan memakai Redis dan **fail-open**: jika Redis mati, tidak ada batas. | Verifikasi `UPSTASH_REDIS_REST_*` terpasang (ada di Vercel per 8 Nov) sebelum menguji. |

## B. Prediksi hasil dari pembacaan kode (belum terbukti — jalankan pengujian)

Ini bukan hasil, tetapi tempat yang paling mungkin menghasilkan **Gagal** sehingga Anda tidak terkejut dan bisa merencanakan.

1. **A06 "ada berapa transaksi bulan lalu?" dan A12 "transaksi terakhir yang tercatat apa?"** — kata *transaksi* cocok dengan pola
   `transaction_input` di `detectIntent`. Intent itu mematikan pemuatan konteks keuangan dan memakai prompt *pengurai transaksi*.
   Kemungkinan besar jawabannya salah/bukan jawaban. (Sebagai kontras, A01–A05, A07–A11, A13 → intent `finance`; A14–A18 → inventori; A19 → `finance`.)
2. **A20 "jumlah pelanggan yang beli minggu ini"** — intent CRM; AI menerima daftar kontak/deal dan bisa tergoda menjawab angka.
3. **POS-04** lewat API langsung (§A13).
4. **Performa "peringatan stok"** tidak dapat diukur (§A7).
5. Pola `hr_advanced` memuat `|sp|` tanpa batas kata, sehingga kata yang mengandung "sp" (mis. *spesial*, *respons*) bisa terlempar ke intent HR. Tidak ada kasus AI-Analitis yang terkena, tetapi relevan sebagai temuan kualitas.

**Cara melaporkannya dengan jujur dan tetap kuat:** jalankan pengujian pada commit yang dibekukan; kasus gagal dilaporkan apa adanya
(Tabel 4.9–4.10), dimasukkan ke Tabel 4.20 sebagai temuan + rekomendasi. Jika Anda memperbaiki lalu menguji ulang, laporkan
**kedua** hasilnya (sebelum/sesudah, dengan commit masing-masing) — itu justru bahan pembahasan yang bagus. Jangan mengubah acuan
setelah melihat hasil (aturan Bab III). Saya bisa menyiapkan perbaikannya di cabang terpisah bila Anda memilih jalur ini.

## C. Bug yang ditemukan dan sudah diperbaiki saat memvalidasi skrip

- **Realtime mobile selalu kosong:** `GET /api/app/realtime` membaca `PUBLIC_SOCKET_URL` lewat `$env/dynamic/private`, padahal
  variabel ber-awalan `PUBLIC_` tidak ada di sana (SvelteKit) — jadi alamat Socket.io yang dikembalikan **selalu kosong**, meski
  variabel sudah diset di Vercel. Sekarang memakai `$env/dynamic/public` + tes regresi `realtime-app.test.js`.
  **Perlu deploy** agar berlaku di produksi. (Koreksi atas saran saya sebelumnya: `PUBLIC_SOCKET_URL` memang sudah ada di Vercel;
  yang belum ada hanya `SUPPORT_EMAIL`.)

## D. Usulan teks pengganti

**D-1. Bab III, "Lingkungan dan data uji"** — ganti "…yang masing-masing memiliki akun berperan pemilik, manajer, staf, dan kasir, serta satu sesi tanpa autentikasi" menjadi:
> …yang masing-masing memiliki satu akun pemilik. Karena kedua UMKM tidak memiliki karyawan, seluruh pengujian fungsional dijalankan dengan akun pemilik. Satu karyawan kasir uji (login portal staf dengan PIN) dan satu sesi tanpa autentikasi dipakai khusus pada pengujian keamanan.

**D-2. Bab III, item 3 "Pengujian Realtime dan Performa"** — ganti kalimat pertama:
> Mengukur waktu dari permintaan pembayaran transaksi POS hingga event `pos-transaction` diterima klien Socket.io yang terhubung ke unit yang sama, sebanyak 20 percobaan dengan jeda 3 detik, pada satu perangkat uji agar tidak dipengaruhi selisih jam antarperangkat. Waktu respons asisten AI diambil dari pencatatan waktu setiap panggilan pada evaluasi AI.

*(Hapus "peringatan stok realtime" atau ganti dengan "waktu respons pemuatan peringatan stok menipis (`/api/low-stock`)" — lihat §E-3.)*

**D-3. Bab III 4.a, tambahkan paragraf "Jalur yang dievaluasi":**
> Kategori ekstraksi transaksi dan pemetaan akun dievaluasi melalui endpoint `POST /api/app/ai-entry` yang dipakai aplikasi mobile (model GPT-OSS-20B, temperature 0, maksimum 300 token, keluaran JSON), dengan konteks daftar produk dan akun unit uji. Jalur input transaksi pada halaman web memakai prompt dan perhitungan nominal yang berbeda sehingga tidak dievaluasi terpisah. Pratinjau transaksi pada kolom chat dihasilkan oleh parser aturan (regex) dan diuji hanya sebagai fungsi pada Tabel 4.6. Jawaban analitis dievaluasi melalui `POST /api/chat` (GPT-OSS-120B, temperature 0,3, maksimum 650 token) tanpa riwayat percakapan dan tanpa memori AI.

**D-4. Bab III 4.b, tambahkan:** "Data yang diterima model pada pertanyaan analitis dibatasi sistem: ringkasan semua waktu, bulan berjalan, dan bulan lalu; tren enam bulan; delapan transaksi terakhir; dan sepuluh produk dengan stok terendah. Acuan pada kasus yang bergantung pada data tersebut disusun mengikuti batas itu."

**D-5. Lampiran 3, ganti kalimat penutup** dan tambahkan baris (kelompokkan dari `git log`; contoh):

| Tanggal | Perubahan | Bagian | Kaitan dengan evaluasi |
|---|---|---|---|
| 4–5 Nov 2026 | Token Socket.io per unit, perbaikan 20 bug dasbor, perbaikan keamanan akses unit di API mobile, antrean offline dengan Idempotency-Key | Keamanan, dasbor, mobile | Memengaruhi pengujian keamanan (skenario 6–7) dan realtime |
| 5 Nov 2026 | Optimasi prompt chat AI dan sistem memori AI | Asisten AI | **Mengubah prompt yang dievaluasi** |
| 6 Nov 2026 | Modul Pengadaan, jenis barang, harga dari server di POS, RBAC paket berbayar, rate limit, kuota AI 20/menit & 300/hari, tanggal WIB | POS, keamanan, AI | Memengaruhi skenario 3–4 dan pacing uji AI |
| 7–8 Nov 2026 | Penyelarasan aplikasi mobile dengan web, perbaikan kebocoran data lintas tenant pada modul pemasaran dan penggajian, perbaikan Pusat Bantuan dan realtime mobile | Mobile, keamanan | Relevan bagi Bubur Bang Jandi (POS mobile) |

Kalimat penutup: "Perubahan setelah [tanggal commit uji] tidak dievaluasi dalam penelitian ini." Sesuaikan tanggal dengan commit yang Anda bekukan (§E-1).

**D-6. Lampiran 2 B (tabel arsitektur):** "Realtime — Socket.io — Pembaruan transaksi POS, notifikasi, dan status pesanan tanpa memuat ulang halaman." (hapus Pusher dan klaim peringatan stok realtime).

**D-7. Bab II, paragraf "Keempat":** ganti "(POS, peringatan stok)" → "(misalnya transaksi POS dan notifikasi)", dan tambahkan "peringatan stok menipis dikirim terjadwal setiap pagi".

## E. Keputusan yang perlu Anda ambil sebelum menguji

1. **Bekukan versi uji.** `git tag uji-skripsi` pada commit yang di-deploy ke server uji; catat hash di `Petunjuk` B17 dan Lampiran 3. Semua hasil berlaku hanya untuk commit itu.
2. **Uji apa adanya atau perbaiki dulu** temuan §B (rekomendasi: uji apa adanya → laporkan → perbaiki → uji ulang kasus terdampak).
3. **Peringatan stok realtime:** (a) hapus dari Tabel 4.8 dan Bab II/III, atau (b) ganti dengan waktu respons `/api/low-stock`, atau (c) implementasikan push stok saat transaksi lalu ukur (butuh pengembangan + deploy).
4. **Jalur AI ekstraksi/akun:** konfirmasi `ai-entry` (rekomendasi) vs web.
5. **Lingkungan uji:** hanya ada satu proyek Vercel (`bizgrows`) dengan satu basis data. Bila tenant uji berada di server produksi itu, tulis jujur di Bab III bahwa "terpisah" berarti *tenant dan akun terpisah*, bukan server terpisah; atau siapkan instalasi lokal/Docker (`web/docker-compose.dev.yml`).
6. **Penilai kedua** (nama/peran) dan **tanggal pengujian AI** (semua kasus analitis di hari yang sama).

## F. SQL bantu untuk angka di Lampiran 2

```sql
-- jumlah tabel dan yang punya unit_id (jalankan di basis data uji)
SELECT COUNT(*) AS jumlah_tabel FROM information_schema.tables
 WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';
SELECT COUNT(DISTINCT table_name) AS tabel_dengan_unit_id FROM information_schema.columns
 WHERE table_schema = DATABASE() AND column_name = 'unit_id';
```
