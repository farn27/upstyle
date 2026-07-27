# Upstyle / Bizgrow - Aturan Pengembangan

## Setup Wajib (Mandatory Tech Stack)
Setiap kali menambahkan atau memodifikasi fitur di proyek ini, pastikan menggunakan teknologi berikut:
- **Drizzle ORM**: SEMUA kueri dan interaksi database HARUS menggunakan Drizzle ORM. DILARANG menggunakan query raw SQL (seperti `pool.execute` atau `pool.query`).
- **Pusher**: Gunakan Pusher untuk semua kebutuhan integrasi *real-time* (notifikasi, live update).
- **Redis**: Gunakan Redis untuk segala bentuk *caching* dan manajemen *state* lintas-sesi yang persisten.
- **Inngest**: Gunakan Inngest untuk mengelola semua *background jobs*, *event-driven workflows*, dan *async tasks*.
