# Bizgrow Desktop

Aplikasi desktop Bizgrow untuk **Windows, macOS, dan Linux**, dibangun dengan [Tauri v2](https://tauri.app).

## Cara kerja

```
┌──────────────────────────────────────────────┐
│  Bizgrow Desktop (Tauri, ±10 MB)             │
│  ┌────────────────────────────────────────┐  │
│  │ Layar pembuka lokal (dist/index.html)  │  │
│  │  → cek koneksi → buka server Bizgrow   │──┼──► https://bizgrows-ten.vercel.app
│  │  → offline: pesan + coba lagi otomatis │  │    (server yang sama dengan web & Android)
│  └────────────────────────────────────────┘  │
│  Tray · notifikasi · unduhan · satu instance │
└──────────────────────────────────────────────┘
```

Aplikasi **tidak** menjalankan server atau database di komputer pengguna. Ia membuka server Bizgrow
yang sama dengan web dan Android, sehingga data selalu sinkron dan tidak perlu Node.js atau kredensial
database di PC kasir. Fitur khusus desktop:

| Fitur | Perilaku |
|---|---|
| Layar pembuka | Logo + "Menghubungkan…"; bila offline tampil pesan dan coba lagi tiap 10 detik |
| Tutup jendela | Aplikasi diperkecil ke tray (sesi & notifikasi tetap jalan). Keluar lewat menu tray |
| Tray | Tampilkan · Muat ulang · Buka di browser · Keluar (klik kiri = tampilkan) |
| Satu instance | Membuka aplikasi lagi hanya memunculkan jendela yang sudah ada |
| Tautan luar | WhatsApp, invoice, Midtrans, dll. dibuka di browser/aplikasi bawaan |
| Unduhan | Ekspor Excel/PDF tersimpan di folder Unduhan + notifikasi |
| Posisi jendela | Ukuran & posisi terakhir diingat |
| Login | Sesi tersimpan; membuka ulang aplikasi langsung masuk |

### Server sendiri (opsional)

Untuk memakai server lain (mis. instalasi on-premise), buat file `server_url.txt` berisi alamatnya:

- Windows: `%APPDATA%\id.bizgrow.desktop\server_url.txt`
- macOS: `~/Library/Application Support/id.bizgrow.desktop/server_url.txt`
- Linux: `~/.config/id.bizgrow.desktop/server_url.txt`

Alamat bawaan saat build juga bisa diganti dengan env `BIZGROW_SERVER_URL`.
Tambahkan alamat tersebut ke `remote.urls` di `src-tauri/capabilities/main.json` agar notifikasi
desktop bisa dipanggil dari halaman.

## Mengunduh installer

Setiap perubahan di folder `desktop/` pada branch `main` membangun installer otomatis lewat GitHub Actions
(`.github/workflows/desktop.yml`). Buka tab **Actions → Desktop Build → run terakhir → Artifacts**:

- **Windows**: `.msi` atau `-setup.exe`
- **macOS**: `.dmg` (Apple Silicon & Intel)
- **Linux**: `.deb`, `.AppImage`, `.rpm`

> Installer belum ditandatangani (code signing). Windows SmartScreen / macOS Gatekeeper akan
> memperingatkan saat pertama dibuka — pilih "More info → Run anyway" (Windows) atau klik kanan → Open (macOS).

## Pengembangan

Prasyarat: [Rust](https://rustup.rs), Node.js 20, dan di Linux:

```bash
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev
```

```bash
cd desktop
npm ci
# membuka server produksi
npm run dev
# atau server lokal (web/: npm run dev)
BIZGROW_DEV_URL=http://localhost:5173 npm run dev
# installer untuk OS saat ini
npm run build
```

Ikon ada di `src-tauri/icons/` (sumber 1024 px: `icon.png`).
