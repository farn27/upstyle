-- Performance Indexes Migration
-- Add missing indexes for optimal query performance

-- Index for products table (unit_id is frequently used in WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_products_unit ON products(unit_id);

-- Index for transaksi table (unit_id + created_at composite index for common queries)
CREATE INDEX IF NOT EXISTS idx_transaksi_unit_date ON transaksi(unit_id, created_at);

-- Index for transaksi table (kategori_trx for filtering by transaction type)
CREATE INDEX IF NOT EXISTS idx_transaksi_kategori ON transaksi(kategori_trx);

-- Index for employees table (unit_id for filtering by unit)
CREATE INDEX IF NOT EXISTS idx_employees_unit ON employees(unit_id);

-- Index for unit_bisnis table (slug for URL-based lookups)
CREATE INDEX IF NOT EXISTS idx_unit_bisnis_slug ON unit_bisnis(slug);

-- Index for unit_bisnis table (user_id for user-specific queries)
CREATE INDEX IF NOT EXISTS idx_unit_bisnis_user_id ON unit_bisnis(user_id);

-- Index for riwayat_aksi table (user_id for user activity logs)
CREATE INDEX IF NOT EXISTS idx_riwayat_aksi_user_id ON riwayat_aksi(user_id);

-- Index for riwayat_aksi table (waktu for time-based queries)
CREATE INDEX IF NOT EXISTS idx_riwayat_aksi_waktu ON riwayat_aksi(waktu);
