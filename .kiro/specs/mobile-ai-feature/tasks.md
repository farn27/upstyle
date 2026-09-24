# Implementation Plan: Mobile AI Feature

## Overview

Implementasi fitur AI mobile KMP mencakup: auth fix (Bearer token + 401 handling), backend endpoint baru `/api/app/ai-entry`, data models baru, AppViewModel extensions, TransactionEntryScreen baru dengan NLP AI, AI kategori debounce, dan Financial Advisor fix.

Urutan: Auth fix → Data models → Backend endpoint → AppViewModel → UI screens.

---

## Tasks

- [x] 1. Fix ApiClient: pastikan token selalu dikirim dan 401 di-handle

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/api/ApiClient.kt`
  - Tambahkan `HttpResponseValidator` ke `createHttpClient` yang mendeteksi response dengan status 401 — emit event melalui callback/SharedFlow untuk dihandle AppViewModel
  - Verifikasi `DefaultRequest` block sudah membaca token dari `session.getToken()` secara fresh setiap request (sudah ada, tapi perlu dipastikan client di-recreate setelah login)
  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt`
  - Tambahkan `private val _authEvent = MutableSharedFlow<Unit>()` dan `val authEvent: SharedFlow<Unit>`
  - Tambahkan fungsi `fun refreshApiClient()` yang di-invoke setelah `session.saveSession()` berhasil di fungsi `login()` dan `loginWithGoogle()`
  - Di fungsi `login()` dan `loginWithGoogle()` yang sudah ada, tambahkan pemanggilan `refreshApiClient()` setelah token disimpan
  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/App.kt`
  - Collect `viewModel.authEvent` dan navigasi ke `Screen.Login` + panggil `session.clearSession()` saat event diterima
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.1 Unit test: login menyimpan token dan refreshApiClient dipanggil
    - Verifikasi bahwa setelah `login()` berhasil, `session.getToken()` tidak null
    - Verifikasi bahwa request selanjutnya mengandung header `Authorization: Bearer {token}`
    - _Requirements: 1.4_

- [x] 2. Tambah data models AI di KMP

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/data/Models.kt`
  - Tambahkan data class `AiEntryRequest(val unitId: Int, val teksInput: String)`
  - Tambahkan data class `AiEntryHasil(val product_id: String?, val qty: Int, val kategori: String, val coa_id: Int?, val kas_coa_id: Int?, val nominal: Double, val catatan: String)` — semua nullable/dengan default
  - Tambahkan data class `AiEntryData(val hasil: AiEntryHasil)`
  - Tambahkan plain data class (non-serializable) `AiEntryResult` sebagai UI-level model (mirror `AiEntryHasil` dengan nama field Kotlin-style)
  - Tambahkan data class `AiKategoriRequest(val teks: String, val unitId: Int)` — sudah ada `AiKategoriResult` di existing code jika belum tambahkan: `data class AiKategoriResult(val abc_id: Int?, val confidence: Int, val reason: String)`
  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/api/UpstyleApi.kt`
  - Tambahkan fungsi `suspend fun aiEntry(req: AiEntryRequest): ApiResponse<AiEntryData>`  — `POST "api/app/ai-entry"`
  - Tambahkan fungsi `suspend fun aiKategori(req: AiKategoriRequest): ApiResponse<AiKategoriResult>` — `POST "api/ai-kategori"`
  - Verifikasi `aiAdvisor` sudah ada di UpstyleApi (ada sebagai `aiAdvisor(req: AiAdvisorRequest)`) — jika tidak ada, tambahkan
  - _Requirements: 2.2, 4.1, 5.1, 6.1_

- [x] 3. Buat backend endpoint `/api/app/ai-entry`

  - **File baru:** `web/src/routes/api/app/ai-entry/+server.js`
  - Implementasikan `POST` handler dengan autentikasi `getCurrentUserId(cookies, request)`
  - Validasi body: `unitId` (positive integer), `teksInput` (string min 5, max 500) menggunakan zod
  - Return 422 jika `teksInput.length < 5`, 404 jika unit tidak ditemukan atau bukan milik user
  - Query produk unit dari database (id, nama, hargaJual, hargaBeli) dan COA unit (id, namaAkun, tipeAkun)
  - Panggil Groq dengan model `llama-3.1-8b-instant` menggunakan `response_format: { type: "json_object" }` — system prompt menyertakan daftar produk dan COA sebagai JSON, instruksi agar AI parse teks dan return field `product_id`, `qty`, `kategori`, `coa_id`, `kas_coa_id`, `nominal`, `catatan`
  - Parse response Groq ke JSON, validasi struktur, return `apiSuccess({ hasil: parsedJson })`
  - Return 500 dengan pesan deskriptif jika Groq gagal
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 3.1 Unit test backend: validasi input dan auth
    - Test 422 jika teksInput < 5 karakter
    - Test 401 jika tidak ada Bearer token
    - Test 404 jika unitId tidak milik user
    - _Requirements: 6.5, 6.6_

- [x] 4. Checkpoint — verifikasi auth fix dan endpoint baru
  - Pastikan token tersimpan dan dikirim dengan benar ke endpoint yang ada (misalnya `/api/app/finance`)
  - Test `/api/app/ai-entry` dengan curl/Postman menggunakan token valid
  - Pastikan semua test yang ada masih lulus

- [x] 5. Extend AppViewModel: COA loading dan kas accounts

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt`
  - `_chartOfAccounts` dan `loadChartOfAccounts()` sudah ada — verifikasi dan pastikan dipanggil dari `selectUnit()`
  - Tambahkan `val hasCoa: StateFlow<Boolean>` menggunakan `combine` atau `map` dari `_chartOfAccounts` — bernilai `true` jika list tidak kosong
  - Tambahkan `val kasAccounts: StateFlow<List<ChartOfAccount>>` — derived dari `_chartOfAccounts`, filter `tipeAkun == "ASET_LANCAR"` DAN (`namaAkun.lowercase()` mengandung "kas" ATAU "bank" ATAU "transfer")
  - Di fungsi `selectUnit(unitId)` yang sudah ada, tambahkan: `loadChartOfAccounts()` dan `_aiAdvisorResult.value = null`
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 5.1 Unit test: selectUnit mereset AI advisor result dan load COA
    - Verifikasi `_aiAdvisorResult` menjadi null setelah `selectUnit()`
    - Verifikasi `kasAccounts` hanya berisi COA dengan tipe ASET_LANCAR dan nama sesuai filter
    - _Requirements: 7.4, 8.3_

- [x] 6. Extend AppViewModel: prosesAI, aiKategori, aiAdvisor

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt`
  - Tambahkan state flows: `_isAiEntryLoading`, `isAiEntryLoading`, `_aiEntryResult`, `aiEntryResult`, `_aiKategoriSuggestion`, `aiKategoriSuggestion`, `_aiAdvisorResult`, `aiAdvisorResult`, `_isAiAdvisorLoading`, `isAiAdvisorLoading`
  - Tambahkan fungsi `fun prosesAI(teksInput: String)`:
    - Guard: `if (teksInput.length < 5) return`
    - `_isAiEntryLoading.value = true`
    - Panggil `api.aiEntry(AiEntryRequest(unitId, teksInput))`
    - Jika sukses: set `_aiEntryResult.value` dari `res.data.hasil`
    - Jika gagal: `setError("Gagal proses AI: ...")` tanpa mengubah `_aiEntryResult`
    - `_isAiEntryLoading.value = false`
  - Tambahkan fungsi `fun clearAiEntryResult()` — set `_aiEntryResult.value = null`
  - Tambahkan debounce flow untuk AI kategori menggunakan `MutableSharedFlow<String>()` yang di-collect di `init {}`:
    ```kotlin
    private val _keteranganFlow = MutableSharedFlow<String>()
    fun onKeteranganChanged(teks: String) = viewModelScope.launch { _keteranganFlow.emit(teks) }
    // di init: _keteranganFlow.debounce(800).collect { teks -> ... api.aiKategori(...) }
    ```
  - Jika AI kategori berhasil dan `confidence >= 60`: set `_aiKategoriSuggestion.value`; jika tidak: set null
  - Tambahkan fungsi `fun aiAdvisor(question: String)`:
    - Guard: `if (_activeUnitId.value == 0) return`
    - `_isAiAdvisorLoading.value = true`
    - Panggil `api.aiAdvisor(AiAdvisorRequest(unitId, question))`
    - Jika sukses: `_aiAdvisorResult.value = res.data?.analysis`
    - Jika gagal: `setError(...)`
    - `_isAiAdvisorLoading.value = false`
  - _Requirements: 2.2, 2.3, 2.6, 2.7, 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3, 7.4_

  - [ ]* 6.1 Unit test: prosesAI tidak memanggil API jika teks terlalu pendek
    - Verifikasi `prosesAI("")` tidak mengubah `_isAiEntryLoading`
    - Verifikasi `prosesAI("ok")` tidak mengubah `_isAiEntryLoading` (< 5 karakter)
    - _Requirements: 2.2_

- [x] 7. Tambahkan Screen.TransactionEntry ke navigasi

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/Screen.kt`
  - Tambahkan `object TransactionEntry : Screen()` ke sealed class `Screen`
  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/App.kt`
  - Tambahkan `Screen.TransactionEntry -> TransactionEntryScreen(viewModel)` ke routing logic
  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/screens/FinanceScreen.kt`
  - Ganti tombol/FAB "Tambah Transaksi" yang sekarang membuka dialog dengan `viewModel.navigate(Screen.TransactionEntry)`
  - _Requirements: 2.1, 3.1_

- [x] 8. Buat TransactionEntryScreen

  - **File baru:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/screens/TransactionEntryScreen.kt`
  - Buat composable `TransactionEntryScreen(viewModel: AppViewModel)` dengan `Scaffold`, `TopAppBar("Entri Transaksi")`, dan tombol back
  - **NLP Input Card:**
    - `OutlinedTextField` dengan placeholder "Ketik transaksi... (contoh: jual kopi 3 cup)"
    - `Button("Proses AI")` — observe `isAiEntryLoading`, tampilkan `CircularProgressIndicator` saat loading, disable input saat loading
    - Saat tombol ditekan: `viewModel.prosesAI(nlpText)`
  - **AI Kategori Chip:**
    - Observe `aiKategoriSuggestion` dari ViewModel
    - Jika tidak null (confidence sudah difilter di ViewModel ≥ 60): tampilkan `SuggestionChip` dengan nama kategori dan text reason di samping
    - Saat chip ditekan: set `selectedAbcId` ke `suggestion.abc_id`
  - **Form Fields (local state dengan `remember`):**
    - Dropdown tipe arus kas (`Masuk`/`Keluar`): saat berubah, reset COA, produk, nominal, qty, keterangan
    - Dropdown COA: observe `chartOfAccounts`, filter berdasarkan tipe yang dipilih (sesuai mapping di design)
    - Dropdown akun kas: observe `kasAccounts`
    - Dropdown produk: observe `products`, optional
    - TextField qty: default 1, saat produk dipilih dan qty berubah → hitung nominal otomatis
    - TextField nominal: auto-fill dari `hargaJual * qty` (Masuk) atau `hargaBeli * qty` (Keluar) saat produk dipilih
    - TextField keterangan: `onValueChange` memanggil `viewModel.onKeteranganChanged(teks)` untuk debounce AI kategori
  - **`LaunchedEffect(aiEntryResult)`:** saat `aiEntryResult` berubah (non-null), auto-fill semua form fields dan tampilkan `Snackbar("AI Sinkron!")` menggunakan `SnackbarHostState`
  - **COA Warning:** observe `hasCoa`, jika false tampilkan `Card` berisi teks informasi dan `TextButton("Setup COA")` yang navigasi ke `Screen.Coa`
  - **Validasi:** `Button("Simpan Transaksi")` disabled jika COA null, akun kas null, atau nominal ≤ 0
  - **Submit:** panggil `viewModel.createTransactionWithCoa(...)` — fungsi baru yang menerima `coaId` dan `kasCoaId` (lihat task 9)
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 4.3, 4.5_

  - [ ]* 8.1 Unit test: form reset saat tipe arus kas berubah
    - Verifikasi bahwa memilih tipe berbeda mereset selectedCoaId, selectedProductId, nominal, qty
    - _Requirements: 3.5_

- [x] 9. Extend AppViewModel: createTransactionWithCoa

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/AppViewModel.kt`
  - Tambahkan fungsi `fun createTransactionWithCoa(kategoriTrx: String, nominal: Double, keterangan: String, coaId: Int, kasCoaId: Int, productId: String?, qty: Int, abcCategoryId: Int?)` 
  - Fungsi memanggil `api.createTransaction(CreateTransactionRequest(TransactionBody(unitId, kategoriTrx, nominal, keterangan, "COA", abcCategoryId, productId, qty)))` — note: `metodeBayar` menjadi identifier COA
  - Setelah sukses: `loadDashboard()`, `loadFinanceData()`, `setSuccess("Transaksi berhasil disimpan!")`, `navigateBack()`
  - Update `CreateTransactionRequest`/`TransactionBody` di Models.kt jika perlu menambahkan field `coaId` dan `kasCoaId`
  - _Requirements: 3.6, 3.8_

- [x] 10. Fix FinancialAdvisorTab di AiChatScreen

  - **File:** `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/screens/AiChatScreen.kt`
  - Rewrite composable `FinancialAdvisorTab(viewModel: AppViewModel)`:
    - Observe `aiAdvisorResult: StateFlow<String?>` dan `isAiAdvisorLoading: StateFlow<Boolean>` dari ViewModel
    - Tambahkan `var customQuestion by remember { mutableStateOf("") }` dan `OutlinedTextField` untuk pertanyaan custom
    - Tombol "Analisis Sekarang" memanggil `viewModel.aiAdvisor(customQuestion.ifBlank { "Analisis keuangan bisnis saya untuk 3 bulan terakhir..." })`
    - Loading: observe `isAiAdvisorLoading`, tampilkan `CircularProgressIndicator` dan disable tombol
    - Guard `activeUnitId == 0`: disable tombol, tampilkan `Text("Pilih unit bisnis terlebih dahulu")`
    - Tampilkan hasil: jika `aiAdvisorResult != null`, render teks analisis dalam `Card` yang scrollable — **tidak** redirect ke tab Chat
    - Tombol "Coba Lagi" yang visible jika ada error (observe `uiState.error`)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 7.1, 7.2, 7.3_

  - [ ]* 10.1 Unit test: aiAdvisor tidak dipanggil jika activeUnitId == 0
    - Verifikasi guard condition di AppViewModel.aiAdvisor()
    - _Requirements: 5.4_

- [x] 11. Checkpoint final — pastikan semua fitur terintegrasi
  - Pastikan semua tests lulus
  - Verifikasi flow lengkap: Login → pilih unit → buka TransactionEntryScreen → ketik NLP → Proses AI → form terisi → simpan transaksi
  - Verifikasi Financial Advisor: pilih unit → klik "Analisis Sekarang" → hasil tampil di tab (bukan redirect ke Chat)
  - Verifikasi AI Kategori: ketik keterangan ≥ 3 karakter → setelah 800ms chip muncul (jika confidence ≥ 60)
  - Verifikasi ganti unit → `aiAdvisorResult` di-reset
  - Tanyakan ke user jika ada pertanyaan sebelum selesai

---

## Notes

- Tasks bertanda `*` adalah optional dan bisa diskip untuk MVP yang lebih cepat
- Setiap task mereferensikan requirement spesifik untuk traceability
- `createHttpClient` sudah mengimplementasikan token injection via `DefaultRequest` — fokus perbaikan ada di refresh setelah login dan 401 handling
- Backend endpoint `/api/app/ai-entry` mengikuti pola yang sama dengan `/api/ai-advisor` (auth via `getCurrentUserId(cookies, request)`)
- Debounce AI kategori menggunakan `kotlinx.coroutines.flow.debounce` yang tersedia di KMP
- `kasAccounts` adalah derived state — tidak perlu API call terpisah, cukup filter dari `_chartOfAccounts` yang sudah di-load

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["1.1", "3"] },
    { "id": 2, "tasks": ["3.1", "5"] },
    { "id": 3, "tasks": ["5.1", "6"] },
    { "id": 4, "tasks": ["6.1", "7"] },
    { "id": 5, "tasks": ["8", "9"] },
    { "id": 6, "tasks": ["8.1", "10"] },
    { "id": 7, "tasks": ["10.1"] }
  ]
}
```
