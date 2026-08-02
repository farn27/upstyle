-- ─── Initial Database Setup ──────────────────────────────────────────────────
-- Dijalankan otomatis saat container MySQL pertama kali dibuat.
-- File ini hanya dieksekusi jika /var/lib/mysql KOSONG (fresh install).

-- Buat database utama (sudah dibuat via env MYSQL_DATABASE, ini backup)
CREATE DATABASE IF NOT EXISTS `finance_engine_db`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `finance_engine_db`;

-- Grant privileges ke user bizgrow
GRANT ALL PRIVILEGES ON `finance_engine_db`.* TO 'bizgrow'@'%';
FLUSH PRIVILEGES;

-- ─── Notes ────────────────────────────────────────────────────────────────────
-- Schema tabel dibuat via Drizzle ORM migration, bukan di sini.
-- Jalankan setelah container up:
--   docker exec bizgrow_app npx drizzle-kit push
-- Atau:
--   docker exec bizgrow_app node run-bp-migration.js
