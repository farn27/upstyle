-- Migration: 0001_add_email_verification
-- Tambah kolom email_verified_at ke tabel users
-- Jalankan: npx drizzle-kit migrate

ALTER TABLE `users`
  ADD COLUMN `email_verified_at` TIMESTAMP NULL DEFAULT NULL AFTER `created_at`;

-- Index untuk query verifikasi yang cepat
CREATE INDEX `idx_users_email_verified` ON `users` (`email_verified_at`);
