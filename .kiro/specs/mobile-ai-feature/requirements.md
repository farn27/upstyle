# Requirements Document

## Introduction

Fitur AI di platform web (SvelteKit/Bizgrow) sudah mature dan mencakup tiga kapabilitas utama:
1. **AI Transaction Entry (prosesAI)** — user mengetik teks natural language seperti "jual es teh 5 cup" lalu AI otomatis mengisi form transaksi (kategori, produk, nominal, COA, kas).
2. **AI Kategori Suggestion (ai-kategori)** — saat user mengetik keterangan transaksi, AI menyarankan kategori ABC secara real-time.
3. **AI Financial Advisor** — analisis mendalam 3 bulan tren keuangan, prediksi cash flow, deteksi anomali, rekomendasi aksi.

Mobile KMP sudah punya `AiChatScreen` (chat umum + laporan WA), dan stub `FinancialAdvisorTab`, namun **sama sekali belum memiliki** fitur (1) dan (2). Selain itu, terdapat error **"sesi tidak valid silakan login ulang"** yang menunjukkan sesi token tidak tersimpan dengan benar atau tidak dikirimkan ke server saat request API.

Spec ini mencakup requirements untuk mengadopsi semua mekanisme AI web ke mobile KMP (Kotlin/Compose Multiplatform, Android-first).

## Glossary

- **AppViewModel**: ViewModel utama KMP yang mengelola semua state dan pemanggilan API di shared module.
- **ApiClient**: Ktor HTTP client KMP yang menambahkan `Authorization: Bearer {token}` header otomatis dari `SessionRepository`.
- **SessionRepository**: Penyimpanan sesi berbasis `multiplatform-settings` (SharedPreferences di Android). Menyimpan token, unit aktif, server URL.
- **UpstyleApi**: Wrapper semua endpoint REST backend (`api/chat`, `api/ai-advisor`, `api/ai-kategori`, form action `?/prosesAI`).
- **prosesAI**: Backend action (SvelteKit form action) yang menerima teks natural language, memanggil Groq AI, dan mengembalikan field transaksi yang sudah diisi otomatis.
- **AI_Advisor**: Backend endpoint `POST /api/ai-advisor` yang menerima `unitId` + optional `question`, mengembalikan analisis keuangan markdown.
- **AI_Kategori**: Backend endpoint `POST /api/ai-kategori` yang menerima `teks` + `unitId`, mengembalikan `abc_id`, `confidence`, `reason`.
- **NLP_Entry**: Fitur Natural Language Processing untuk pengisian form transaksi otomatis — padanan mobile dari `prosesAI` web.
- **Transaction_Entry_Screen**: Layar form entri transaksi mobile (saat ini hanya dialog sederhana di `FinanceScreen`).
- **COA**: Chart of Accounts — daftar akun keuangan double-entry (kas, pendapatan, beban, dll).
- **Groq**: Provider LLM yang digunakan backend (model `llama-3.1-8b-instant` untuk parsing, `llama-3.3-70b-versatile` untuk analisis).
- **Bearer_Token**: JWT/session token yang dikirim via `Authorization: Bearer {token}` header ke semua API endpoint.
- **ABC_Category**: Kategori pengeluaran/pendapatan bisnis yang dikelola user (Activity-Based Costing categories).

---

## Requirements

### Requirement 1: Perbaikan Autentikasi Sesi (Auth Fix)

**User Story:** Sebagai pengguna mobile, saya ingin semua fitur AI berjalan tanpa error "sesi tidak valid silakan login ulang", sehingga saya bisa menggunakan AI tanpa harus logout dan login ulang berulang kali.

#### Acceptance Criteria

1. WHEN pengguna sudah login dan token tersimpan di `SessionRepository`, THE `ApiClient` SHALL menyertakan header `Authorization: Bearer {token}` pada setiap request HTTP ke backend.
2. WHEN backend mengembalikan HTTP 401 atau response `success: false` dengan pesan mengandung "login ulang" atau "unauthorized", THE `AppViewModel` SHALL memanggil `session.clearSession()` lalu mengarahkan pengguna ke `LoginScreen`.
3. WHEN `SessionRepository.getToken()` mengembalikan null atau string kosong saat aplikasi dibuka, THE `App` composable SHALL menampilkan `LoginScreen` alih-alih layar utama.
4. WHEN pengguna berhasil login dan menerima token dari `POST /api/auth/login`, THE `SessionRepository` SHALL menyimpan token tersebut segera sebelum navigasi ke HomeScreen.
5. THE `ApiClient` SHALL membuat ulang instance HTTP client setelah token diperbarui, sehingga request berikutnya menggunakan token terbaru.

---

### Requirement 2: Entri Transaksi dengan NLP AI (Mobile prosesAI)

**User Story:** Sebagai pemilik UMKM, saya ingin mengetik deskripsi transaksi secara natural seperti "jual ayam geprek 3 porsi" di layar mobile, lalu AI otomatis mengisi form transaksi (kategori masuk/keluar, produk, nominal, COA, akun kas), sehingga saya bisa mencatat transaksi lebih cepat daripada mengisi form manual.

#### Acceptance Criteria

1. THE `Transaction_Entry_Screen` SHALL menampilkan field input teks NLP di bagian atas form, dengan placeholder "Ketik transaksi... (contoh: jual kopi 3 cup)".
2. WHEN pengguna menekan tombol "Proses AI" dan panjang teks input minimal 5 karakter, THE `AppViewModel` SHALL memanggil endpoint `POST /api/app/ai-entry` dengan body `{ "unitId": number, "teksInput": string }`.
3. WHEN backend mengembalikan response sukses dengan field `hasil`, THE `Transaction_Entry_Screen` SHALL mengisi otomatis: kategori (Masuk/Keluar), produk terpilih, qty, nominal, COA id, dan akun kas id.
4. WHEN AI mengidentifikasi `product_id` dalam response, THE `Transaction_Entry_Screen` SHALL memilih produk tersebut dari daftar produk unit dan menghitung nominal otomatis dari `hargaJual * qty`.
5. WHEN AI tidak dapat mengidentifikasi akun kas, THE `Transaction_Entry_Screen` SHALL memilih akun kas default pertama dari daftar `kasAccounts` unit.
6. WHILE proses AI berjalan, THE `Transaction_Entry_Screen` SHALL menampilkan indikator loading pada tombol "Proses AI" dan menonaktifkan input.
7. IF panggilan AI gagal karena error jaringan, THEN THE `AppViewModel` SHALL menampilkan pesan error yang informatif tanpa mengubah state form yang sudah diisi user.
8. WHEN field form terisi oleh AI, THE `Transaction_Entry_Screen` SHALL menampilkan notifikasi singkat "AI Sinkron!" untuk memberi tahu user bahwa form sudah diisi.

---

### Requirement 3: Layar Entri Transaksi Lengkap dengan COA

**User Story:** Sebagai pemilik UMKM, saya ingin layar entri transaksi mobile yang setara dengan versi web, termasuk pemilihan COA, akun kas, dan produk, sehingga transaksi yang dicatat memiliki data akuntansi double-entry yang lengkap.

#### Acceptance Criteria

1. THE `Transaction_Entry_Screen` SHALL menampilkan dropdown pemilihan tipe arus kas (Masuk/Keluar).
2. THE `Transaction_Entry_Screen` SHALL menampilkan dropdown akun COA yang difilter berdasarkan tipe: jika Masuk tampilkan hanya akun PENDAPATAN dan PENDAPATAN_LAINNYA; jika Keluar tampilkan BEBAN_OPERASIONAL, BEBAN_LAINNYA, dan HPP.
3. THE `Transaction_Entry_Screen` SHALL menampilkan dropdown akun kas/bank (tipe ASET_LANCAR) sebagai metode bayar.
4. WHEN pengguna memilih produk, THE `Transaction_Entry_Screen` SHALL mengisi nominal otomatis dari `hargaJual * qty` untuk kategori Masuk dan `hargaBeli * qty` untuk kategori Keluar.
5. WHEN pengguna mengubah tipe arus kas (Masuk/Keluar), THE `Transaction_Entry_Screen` SHALL mereset pilihan COA, produk, nominal, qty, dan keterangan ke nilai default.
6. THE `Transaction_Entry_Screen` SHALL memvalidasi bahwa COA dipilih, akun kas dipilih, dan nominal lebih dari 0 sebelum mengizinkan submit.
7. WHEN `chartOfAccounts` untuk unit belum ada (hasCoa = false), THE `Transaction_Entry_Screen` SHALL menampilkan informasi bahwa COA belum di-setup dan tombol navigasi ke layar COA.
8. WHEN transaksi berhasil disimpan via `POST /api/app/finance`, THE `AppViewModel` SHALL merefresh data keuangan dan menampilkan notifikasi sukses.

---

### Requirement 4: Saran Kategori ABC Berbasis AI

**User Story:** Sebagai pemilik UMKM, saya ingin AI menyarankan kategori ABC secara otomatis saat saya mengetik keterangan transaksi, sehingga kategorisasi pengeluaran/pendapatan lebih konsisten dan cepat.

#### Acceptance Criteria

1. WHEN pengguna mengetik keterangan transaksi minimal 3 karakter di `Transaction_Entry_Screen`, THE `AppViewModel` SHALL memanggil `POST /api/ai-kategori` dengan body `{ "teks": string, "unitId": number }` setelah jeda debounce 800ms.
2. WHEN backend mengembalikan saran dengan `confidence >= 60`, THE `Transaction_Entry_Screen` SHALL menampilkan chip saran kategori di bawah field keterangan.
3. WHEN pengguna menekan chip saran kategori, THE `Transaction_Entry_Screen` SHALL memilih kategori ABC tersebut pada form transaksi.
4. IF saran kategori memiliki `confidence < 60`, THEN THE `Transaction_Entry_Screen` SHALL tidak menampilkan chip saran.
5. THE `Transaction_Entry_Screen` SHALL menampilkan teks singkat alasan saran (`reason`) di samping chip kategori.

---

### Requirement 5: AI Financial Advisor yang Terhubung ke Data Nyata

**User Story:** Sebagai pemilik UMKM, saya ingin tab Financial Advisor di `AiChatScreen` memanggil endpoint analisis keuangan yang sesungguhnya dengan data transaksi 3 bulan terakhir, sehingga saran AI relevan dan berbasis data bisnis saya.

#### Acceptance Criteria

1. WHEN pengguna menekan tombol "Analisis Sekarang" di tab Financial Advisor, THE `AppViewModel` SHALL memanggil `POST /api/ai-advisor` dengan body `{ "unitId": number, "question": string }`.
2. WHEN backend mengembalikan response sukses dengan field `data.analysis`, THE `AiChatScreen` SHALL menampilkan teks analisis secara langsung di tab Financial Advisor (bukan redirect ke tab Chat).
3. THE `AiChatScreen` SHALL menampilkan indikator loading selama panggilan `ai-advisor` berlangsung dan menonaktifkan tombol analisis.
4. WHEN `activeUnitId` adalah 0 (tidak ada unit aktif), THE `AiChatScreen` SHALL menonaktifkan tombol analisis dan menampilkan pesan "Pilih unit bisnis terlebih dahulu".
5. WHEN pengguna mengetik pertanyaan custom di field input tab Financial Advisor, THE `AppViewModel` SHALL menyertakan pertanyaan tersebut dalam field `question` pada request `ai-advisor`.
6. IF panggilan `ai-advisor` gagal, THEN THE `AiChatScreen` SHALL menampilkan pesan error dan memungkinkan pengguna mencoba ulang.

---

### Requirement 6: API Endpoint Mobile untuk NLP Transaction Entry

**User Story:** Sebagai developer backend, saya ingin endpoint API mobile khusus yang memproses teks natural language transaksi dan mengembalikan field form yang sudah diisi, sehingga mobile tidak perlu menggunakan form action SvelteKit yang hanya dirancang untuk web.

#### Acceptance Criteria

1. THE `Backend` SHALL menyediakan endpoint `POST /api/app/ai-entry` yang menerima body JSON `{ "unitId": number, "teksInput": string }`.
2. WHEN request diterima, THE `Backend` SHALL memvalidasi bahwa `unitId` milik user yang terautentikasi via `Authorization: Bearer` header.
3. WHEN validasi berhasil, THE `Backend` SHALL memanggil Groq AI dengan model `llama-3.1-8b-instant` dengan system prompt yang menyertakan daftar produk dan COA unit tersebut.
4. THE `Backend` SHALL mengembalikan JSON response `{ "success": true, "data": { "hasil": { "product_id": string|null, "qty": number, "kategori": "Masuk"|"Keluar", "coa_id": number|null, "kas_coa_id": number|null, "nominal": number, "catatan": string } } }`.
5. IF `teksInput` kurang dari 5 karakter, THEN THE `Backend` SHALL mengembalikan error 422 dengan pesan "Teks terlalu pendek".
6. IF unit tidak ditemukan atau tidak milik user, THEN THE `Backend` SHALL mengembalikan error 404.
7. IF Groq API gagal, THEN THE `Backend` SHALL mengembalikan error 500 dengan pesan yang informatif.

---

### Requirement 7: Persistensi dan Sinkronisasi State AI

**User Story:** Sebagai pengguna mobile, saya ingin hasil analisis AI Financial Advisor tersimpan sementara selama sesi aplikasi berjalan, sehingga saya tidak perlu memanggil ulang AI setiap kali berpindah tab.

#### Acceptance Criteria

1. THE `AppViewModel` SHALL menyimpan hasil analisis terakhir dari `ai-advisor` dalam `StateFlow<String?>` bernama `_aiAdvisorResult`.
2. WHEN pengguna berpindah tab dari Financial Advisor dan kembali lagi, THE `AiChatScreen` SHALL menampilkan kembali hasil analisis terakhir tanpa memanggil API lagi.
3. WHEN pengguna menekan tombol "Analisis Sekarang" kembali, THE `AppViewModel` SHALL mengganti `_aiAdvisorResult` dengan hasil terbaru.
4. WHEN pengguna berpindah ke unit bisnis yang berbeda via unit picker, THE `AppViewModel` SHALL mengosongkan `_aiAdvisorResult` agar analisis lama tidak tampil untuk unit yang salah.

---

### Requirement 8: Integrasi Data COA di AppViewModel

**User Story:** Sebagai developer mobile, saya ingin `AppViewModel` dapat memuat dan menyimpan data Chart of Accounts (COA) milik unit aktif, sehingga `Transaction_Entry_Screen` dan fitur AI entry dapat menampilkan pilihan akun yang valid.

#### Acceptance Criteria

1. THE `AppViewModel` SHALL menyediakan fungsi `loadChartOfAccounts(unitId: Int)` yang memanggil `GET /api/app/finance/coa?unitId={unitId}`.
2. WHEN data COA berhasil dimuat, THE `AppViewModel` SHALL menyimpannya dalam `StateFlow<List<ChartOfAccount>>` bernama `_chartOfAccounts`.
3. THE `AppViewModel` SHALL menyediakan fungsi `loadKasAccounts(unitId: Int)` yang memfilter COA dengan `tipeAkun == "ASET_LANCAR"` dan nama mengandung "kas" atau "bank" atau "transfer".
4. WHEN unit aktif berubah, THE `AppViewModel` SHALL otomatis memanggil ulang `loadChartOfAccounts` untuk unit yang baru dipilih.
5. THE `AppViewModel` SHALL menyediakan `StateFlow<Boolean>` bernama `_hasCoa` yang bernilai `true` jika `_chartOfAccounts` tidak kosong.
