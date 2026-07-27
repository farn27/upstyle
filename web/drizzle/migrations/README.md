# Database Migrations

Folder ini berisi versioned SQL migrations untuk perubahan schema database.

## Cara Jalankan

```bash
# Generate migration baru dari perubahan schema.js
npx drizzle-kit generate

# Jalankan semua migration yang belum dijalankan
npx drizzle-kit migrate

# Push langsung ke DB tanpa migration (development only!)
npx drizzle-kit push
```

## Urutan Migration

| File | Deskripsi |
|---|---|
| `0001_add_email_verification.sql` | Tambah `email_verified_at` ke tabel `users` |

## ⚠️ Aturan Penting

- **JANGAN** gunakan `drizzle-kit push` di production — bisa drop kolom tanpa warning
- **SELALU** backup database sebelum menjalankan migration di production
- Migration bersifat **satu arah** — buat rollback script jika perlu undo
- Test migration di environment staging dulu sebelum production
