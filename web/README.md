# Upstyle — Business Management Platform

Platform manajemen bisnis all-in-one untuk UMKM Indonesia. Menggabungkan keuangan, inventory, POS, HR/payroll, CRM, akuntansi, dan AI assistant dalam satu aplikasi multi-tenant.

## Tech Stack

- **Frontend:** Svelte 5 + SvelteKit 2, Tailwind CSS v4
- **Backend:** SvelteKit server routes (monolith SSR)
- **Database:** MySQL 8+ dengan Drizzle ORM
- **Session & Cache:** Upstash Redis
- **Realtime:** Pusher
- **AI:** Groq (llama-3.1-8b-instant)
- **Background Jobs:** Inngest

---

## Prerequisites

- Node.js >= 18
- MySQL 8+
- Akun [Upstash Redis](https://upstash.com) (free tier cukup untuk dev)
- Akun [Pusher](https://pusher.com) (free tier cukup untuk dev)
- Akun [Groq](https://console.groq.com) untuk AI features

---

## Setup Development

### 1. Clone & Install

```bash
git clone <repo-url>
cd web
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Buka `.env` dan isi semua value. Variable yang **wajib**:

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `AUTH_SECRET` | Random string min 32 char untuk session |
| `UPSTASH_REDIS_REST_URL` | URL Upstash Redis instance |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash Redis |
| `ORIGIN` | URL app kamu (misal `http://localhost:5173`) |
| `WA_WEBHOOK_SECRET` | Secret untuk WA webhook (wajib jika pakai fitur WA) |

Generate `AUTH_SECRET` dan `WA_WEBHOOK_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Setup Database

Buat database MySQL:
```sql
CREATE DATABASE finance_engine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Jalankan migrasi schema dengan Drizzle Kit:
```bash
# Generate SQL migration dari schema
npx drizzle-kit generate

# Push langsung ke database (untuk development)
npx drizzle-kit push
```

Atau gunakan file migrasi yang sudah ada:
```bash
npx drizzle-kit migrate
```

### 4. Jalankan Development Server

```bash
npm run dev
```

App akan berjalan di `http://localhost:5173`

---

## Struktur Project

```
src/
├── hooks.server.js          ← Auth middleware + CORS + Security headers
├── lib/
│   ├── server/
│   │   ├── schema.js        ← Drizzle MySQL schema
│   │   ├── drizzle.js       ← DB instance
│   │   ├── session.js       ← Redis session (owner)
│   │   ├── staffSession.js  ← Redis session (staff)
│   │   ├── portalAuth.js    ← Staff portal auth + role detection
│   │   ├── rateLimit.js     ← Rate limiter (Redis sliding window)
│   │   ├── apiResponse.js   ← Standar format response API
│   │   ├── validation.js    ← Zod validation schemas
│   │   ├── planLimits.js    ← SaaS tier logic
│   │   └── ...
│   └── components/          ← Shared Svelte components
└── routes/
    ├── (app)/finance/       ← Protected owner app
    ├── auth/                ← Login, register, Google OAuth
    ├── api/                 ← JSON API untuk mobile (Android/Flutter)
    ├── portal/[login_slug]  ← Staff portal
    └── pusher/auth          ← Pusher channel auth
```

---

## Modul Aplikasi

| Modul | Path | Keterangan |
|---|---|---|
| Dashboard | `/finance` | Overview semua unit bisnis |
| Transaksi | `/finance/[slug]/entry` | Input transaksi masuk/keluar |
| Laporan Keuangan | `/finance/[slug]/laporan` | P&L, cash flow, dll |
| Buku Besar | `/finance/[slug]/buku-besar` | Ledger entries |
| Jurnal Umum | `/finance/[slug]/jurnal-umum` | Double-entry journal |
| Piutang | `/finance/[slug]/piutang` | Accounts receivable |
| Hutang | `/finance/[slug]/hutang` | Accounts payable |
| Master Data Akuntansi | `/finance/[slug]/master-data` | COA, pajak, aset, budget |
| Produk & Inventory | `/finance/[slug]/produk` | Katalog produk + stok |
| POS | `/finance/[slug]/pos` | Point of sale |
| HR & Payroll | `/finance/[slug]/hr` | Karyawan, gaji, cuti, absensi |
| CRM | `/finance/[slug]/crm` | Kontak, deal pipeline, aktivitas |
| Pengaturan | `/finance/[slug]/settings` | Konfigurasi unit bisnis |
| Staff Portal | `/portal/[login_slug]` | Login portal untuk karyawan |

---

## API Mobile (Android/Flutter)

Base URL: `/api`

| Endpoint | Method | Keterangan |
|---|---|---|
| `/api/auth/login` | POST | Login dengan email + password |
| `/api/auth/register` | POST | Registrasi akun baru |
| `/api/auth/google` | POST | Login dengan Google ID Token |
| `/api/app/business` | GET | List unit bisnis milik user |
| `/api/app/business` | POST | Buat unit bisnis baru |
| `/api/chat` | POST | AI chat dengan konteks bisnis |
| `/api/webhook-wa` | POST | WA webhook → AI → auto transaksi |
| `/api/ai-advisor` | POST | AI Financial Advisor deep analysis |
| `/api/ai-kategori` | POST | Auto-suggest kategori ABC |
| `/api/laporan-wa` | POST | Generate laporan ringkasan WA |
| `/api/invoice/[orderId]` | GET | Generate HTML invoice PDF-ready |
| `/api/slip-gaji/[employeeId]` | GET | Generate slip gaji + PPh 21 |
| `/api/low-stock` | GET | Daftar produk stok menipis |
| `/api/stock-alert` | POST | Trigger cek & kirim alert stok |
| `/api/payment/snap` | POST | Buat Midtrans Snap transaction |
| `/api/payment/webhook` | POST | Midtrans payment webhook |

Semua response menggunakan format standar:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

Error response:
```json
{
  "success": false,
  "message": "Pesan error untuk user",
  "code": "ERROR_CODE_MACHINE_READABLE",
  "details": [...]
}
```

---

## Rate Limiting

Semua endpoint login/register dilindungi rate limiter berbasis Redis (sliding window):

| Endpoint | Limit |
|---|---|
| Web login | 10x per 15 menit per IP + per identitas |
| Web register | 5x per jam per IP |
| API login | 15x per 15 menit per IP + per email |
| Staff portal login | 10x per 15 menit per IP + per email |
| WA Webhook | 60x per menit per IP |

---

## Security

- Semua password di-hash dengan **Argon2id**
- Session disimpan di **Redis** (bukan di cookie) — cookie hanya menyimpan token UUID
- **Security headers** diterapkan ke semua response: `X-Frame-Options`, `X-Content-Type-Options`, `HSTS`, dll.
- **CORS** dikonfigurasi via `ORIGIN` dan `ALLOWED_ORIGINS` di `.env`
- **WA Webhook** memerlukan secret yang dikirim via header `x-webhook-secret`
- Staff portal **tidak** menyimpan data sensitif di cookie — hanya token reference ke Redis

---

## Build Production

```bash
npm run build
```

Pastikan `ORIGIN` di `.env` sudah diset ke URL production sebelum build.

---

## Storybook (Component Development)

```bash
npm run storybook
```

---

## Notes untuk Deployment

1. Pastikan `NODE_ENV=production` di `.env` production
2. Gunakan HTTPS — cookie session menggunakan `secure: true` saat `NODE_ENV=production` atau `ORIGIN` dimulai dengan `https://`
3. Setup `ALLOWED_ORIGINS` untuk CORS jika mobile app mengakses dari domain berbeda
4. `argon2` membutuhkan build tools (node-gyp) — pastikan C++ compiler tersedia di server
5. Upstash Redis free tier: 10,000 requests/hari — upgrade jika traffic tinggi
