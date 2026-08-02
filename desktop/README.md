# Upstyle Desktop

Desktop app untuk Upstyle Business Management Platform, dibangun dengan [Tauri v2](https://tauri.app).

## Arsitektur

```
┌─────────────────────────────────────┐
│          Tauri (Rust)               │
│  ┌───────────────────────────────┐  │
│  │    WebView (system browser)   │  │
│  │    ┌─────────────────────┐    │  │
│  │    │   SvelteKit App     │    │  │
│  │    │   (localhost:4173)  │    │  │
│  │    └─────────────────────┘    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Spawn] Node.js SvelteKit Server   │
│  [Spawn] Socket.io Server           │
│  [Tray]  System Tray Icon           │
└─────────────────────────────────────┘
```

**Mode Dev:** Tauri load langsung dari `http://localhost:5173` (SvelteKit dev server).  
**Mode Production:** Tauri spawn Node.js server (adapter-node build) di port random, lalu load dari situ.

## Prerequisites

### 1. Install Rust
```bash
# Windows
winget install Rustlang.Rust.MSVC

# Atau via rustup (semua platform)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Setelah install, restart terminal lalu verify:
```bash
rustc --version
cargo --version
```

### 2. Install dependencies sistem (Windows)
Tauri butuh WebView2 (sudah ada di Windows 11, perlu install di Windows 10):
- Download [Microsoft Edge WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

Visual Studio Build Tools (untuk compile Rust):
```bash
winget install Microsoft.VisualStudio.2022.BuildTools
```

### 3. Install Node.js dependencies

Di folder `web/`:
```bash
cd ../web
npm install
```

Di folder `desktop/`:
```bash
cd desktop
npm install
```

## Development

### 1. Jalankan SvelteKit dev server dulu:
```bash
cd web
npm run dev
```

### 2. Jalankan Tauri dev (di terminal baru):
```bash
cd desktop
npm run dev
```

Tauri akan buka window desktop yang load dari `http://localhost:5173`.

## Build Production

### 1. Build SvelteKit dengan adapter-node:
```bash
cd web
npm run build:desktop
```

Ini akan generate `web/build/` — standalone Node.js server.

### 2. Build Tauri:
```bash
cd desktop
npm run build
```

Output installer ada di `desktop/src-tauri/target/release/bundle/`:
- Windows: `.msi` dan `.exe` (NSIS installer)
- macOS: `.dmg` dan `.app`
- Linux: `.AppImage`, `.deb`, `.rpm`

## Struktur Files

```
desktop/
├── package.json              ← npm scripts (tauri dev, tauri build)
├── README.md
└── src-tauri/
    ├── Cargo.toml            ← Rust dependencies
    ├── build.rs              ← Tauri build script
    ├── tauri.conf.json       ← Konfigurasi utama Tauri
    ├── capabilities/
    │   └── main.json         ← Permission yang diizinkan
    └── src/
        ├── main.rs           ← Entry point (Windows subsystem)
        ├── lib.rs            ← Setup: tray, window, plugins
        ├── server.rs         ← Spawn & manage SvelteKit server
        └── commands.rs       ← Tauri commands (invoke dari JS)

web/
├── svelte.config.desktop.js  ← Svelte config untuk adapter-node
├── vite.config.desktop.js    ← Vite config untuk desktop build
└── src/
    ├── lib/
    │   ├── tauri.js          ← Tauri helpers (safe di web juga)
    │   └── components/
    │       └── DesktopTitleBar.svelte  ← Custom title bar
    └── routes/
        └── +layout.svelte    ← DesktopTitleBar dimount di sini
```

## Fitur Desktop

| Fitur | Keterangan |
|---|---|
| Custom title bar | Drag area, minimize, maximize, close ke tray |
| System tray | App tetap jalan di background, menu dari tray |
| Native notifications | Stock alert, transaksi baru via OS notification |
| Minimize ke tray | Close button tidak quit, tetapi hide ke tray |
| Auto-spawn server | SvelteKit server otomatis dijalankan saat app buka |
| Open in browser | Buka URL di browser default sistem |

## Menggunakan Tauri API dari SvelteKit

```javascript
import { sendNotification, openInBrowser, isTauri } from '$lib/tauri.js';

// Kirim native notification (stock alert, dll)
await sendNotification('Stok Menipis!', 'Produk A tinggal 5 unit');

// Buka invoice di browser
await openInBrowser('https://app.upstyle.id/invoice/123');

// Cek apakah berjalan di desktop
if (isTauri()) {
  console.log('Running as desktop app');
}
```

## Konfigurasi .env untuk Production Desktop

Saat build production, user perlu setup database connection.  
File `.env` dibaca dari App Data directory:

- **Windows:** `%APPDATA%\com.upstyle.desktop\.env`
- **macOS:** `~/Library/Application Support/com.upstyle.desktop/.env`
- **Linux:** `~/.config/com.upstyle.desktop/.env`

Copy dari `web/.env.example` dan isi nilai yang sesuai.

## Icons

Taruh icon app di `src-tauri/icons/`:
- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.icns` (macOS)
- `icon.ico` (Windows)

Generate otomatis dari satu file PNG dengan:
```bash
# Install tauri-cli dulu
npm install -g @tauri-apps/cli

tauri icon path/to/icon-1024x1024.png
```
