# Bizgrow KMP — Kotlin Multiplatform

Mobile app untuk Android + iOS menggunakan **Compose Multiplatform**.
Satu codebase, satu UI, dua platform.

## Struktur

```
bizgrow-kmp/
├── shared/                         ← 100% shared code
│   └── src/
│       ├── commonMain/             ← Business logic + UI
│       │   └── kotlin/com/upstyle/bizgrow/
│       │       ├── api/            ← Ktor HTTP client + endpoints
│       │       ├── data/           ← Models + SessionRepository
│       │       ├── di/             ← Koin dependency injection
│       │       └── ui/
│       │           ├── App.kt      ← Root composable
│       │           ├── AppViewModel.kt ← Shared ViewModel
│       │           ├── screens/    ← Semua screens (Auth, Dashboard, POS, dll)
│       │           └── theme/      ← Material 3 theme
│       ├── androidMain/            ← Android specifics
│       └── iosMain/                ← iOS specifics + MainViewController
├── androidApp/                     ← Android entry point
└── iosApp/                         ← iOS entry point (Xcode)
```

## Tech Stack

| Library | Kegunaan |
|---|---|
| Compose Multiplatform 1.7.x | UI shared Android + iOS |
| Ktor 3.x | HTTP client (menggantikan Retrofit) |
| kotlinx.serialization | JSON parsing (menggantikan Moshi) |
| multiplatform-settings | SharedPreferences + NSUserDefaults |
| Koin 4.x | Dependency injection |
| Napier | Multiplatform logger |

## Cara Run

### Android

```bash
cd e:\upstyle\multi_platform\bizgrow-kmp
./gradlew :androidApp:assembleDebug
# APK: androidApp/build/outputs/apk/debug/
```

Atau buka di Android Studio → Run `:androidApp`.

### iOS (butuh Mac + Xcode)

1. Build shared framework dulu:
```bash
./gradlew :shared:iosSimulatorArm64Framework
```
2. Buka `iosApp/iosApp.xcodeproj` di Xcode
3. Run di simulator

## Koneksi Server

App connect ke SvelteKit backend yang sama dengan web dan desktop.

| Platform | URL Default |
|---|---|
| Android Emulator | `http://10.0.2.2:5173` |
| iOS Simulator | `http://localhost:5173` |
| Device Fisik | `http://[IP-WiFi-komputer]:5173` |

URL bisa diubah di app → Settings → Koneksi Server.

## Perbedaan dari bizgro-app-new-main (lama)

| Aspek | Lama (Android only) | Baru (KMP) |
|---|---|---|
| Platform | Android saja | Android + iOS |
| HTTP | Retrofit + Moshi | Ktor + kotlinx.serialization |
| Storage | Android SharedPreferences | Multiplatform Settings |
| UI | Jetpack Compose | Compose Multiplatform |
| Realtime | Socket.io | Socket.io (Android) + polling (iOS) |
| DI | Manual | Koin |
