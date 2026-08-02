# Bizgrow Android App

Mobile client untuk platform Upstyle — terhubung ke SvelteKit backend via REST API + Socket.io realtime.

## Tech Stack

- Kotlin + Jetpack Compose
- Retrofit + OkHttp + Moshi (networking)
- Socket.io client (realtime events)
- Room (local cache)
- Coroutines + StateFlow

## Cara Run

### 1. Pastikan backend web sudah jalan

```bash
cd e:\upstyle\web
npm run dev          # SvelteKit di port 5173
npm run socket-server # Socket.io di port 13337
```

### 2. Konfigurasi URL server

**Emulator Android:**
- URL default sudah benar: `http://10.0.2.2:5173`
- `10.0.2.2` = localhost komputer dari dalam emulator

**Physical device (HP nyata):**
- HP dan komputer harus di WiFi yang sama
- Cari IP komputer: `ipconfig` → ambil IPv4 (misal `192.168.1.10`)
- Buka app → Settings → ubah Server URL ke `http://192.168.1.10:5173`

### 3. Buka di Android Studio

1. File → Open → pilih folder `bizgro-app-new-main`
2. Tunggu Gradle sync selesai
3. Run di emulator atau device

## Struktur Project

```
app/src/main/java/com/upstyle/
├── api/
│   ├── UpstyleApi.kt        ← Semua endpoint REST API
│   └── ApiClient.kt         ← Retrofit setup
├── data/
│   ├── Models.kt            ← Semua DTOs (request/response)
│   └── SessionManager.kt    ← Token + session management
├── socket/
│   └── SocketManager.kt     ← Socket.io realtime connection
└── ui/
    ├── MainActivity.kt      ← Entry point + navigation
    ├── MainViewModel.kt     ← Business logic + state
    ├── screens/
    │   ├── AuthScreen.kt    ← Login & Register
    │   ├── UnitsScreen.kt   ← Pilih unit bisnis
    │   ├── DashboardScreen.kt ← Home + BI metrics
    │   ├── FinanceScreen.kt ← Transaksi keuangan
    │   ├── PosScreen.kt     ← Kasir POS
    │   └── SimpleScreens.kt ← HR, CRM, SCM, AI Chat, dll
    └── theme/
        └── Theme.kt         ← Material 3 theme
```

## Fitur

| Fitur | Status |
|---|---|
| Login / Register | ✅ |
| Pilih unit bisnis | ✅ |
| Dashboard + BI metrics | ✅ |
| Transaksi keuangan (CRUD) | ✅ |
| Kasir POS + cart + checkout | ✅ |
| Daftar produk + stok | ✅ |
| HR & karyawan | ✅ |
| CRM pipeline deals | ✅ |
| SCM supplier & PO | ✅ |
| AI Chat (Groq/Bizgrow AI) | ✅ |
| Laporan WA | ✅ |
| Notifikasi realtime (Socket.io) | ✅ |
| Polling fallback (30 detik) | ✅ |
| Settings (server URL, logout) | ✅ |

## Realtime Events dari Socket.io

| Event | Aksi di Android |
|---|---|
| `pos-transaction` | Refresh finance + POS + notif |
| `stock-updated` | Refresh products + notif |
| `stock-alert` | Notif warning stok menipis |
| `notification` | Notif umum |
| `order-status-changed` | Notif status order |
| `pos-cash-alert` | Notif selisih kas |
