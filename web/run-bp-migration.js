/**
 * Migration: Business Plan tables
 * Jalankan: node run-bp-migration.js
 */
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
console.log('✅ Connected');

const statements = [
  `CREATE TABLE IF NOT EXISTS \`business_plans\` (
    \`id\` INT AUTO_INCREMENT NOT NULL,
    \`user_id\` INT NOT NULL,
    \`unit_id\` INT DEFAULT NULL,
    \`nama_bisnis\` VARCHAR(255) NOT NULL,
    \`kategori\` VARCHAR(100) NOT NULL,
    \`deskripsi\` TEXT,
    \`visi\` TEXT,
    \`misi\` TEXT,
    \`target_pasar\` TEXT,
    \`problem_solving\` TEXT,
    \`target_usia\` VARCHAR(100),
    \`target_lokasi\` VARCHAR(255),
    \`nilai_utama\` TEXT,
    \`keunggulan\` TEXT,
    \`kompetitor_utama\` TEXT,
    \`model_pendapatan\` VARCHAR(50),
    \`estimasi_harga\` DECIMAL(15,2),
    \`estimasi_volume_per_bulan\` INT,
    \`proyeksi_revenue_per_bulan\` DECIMAL(15,2),
    \`modal_awal\` DECIMAL(15,2),
    \`biaya_operasional_per_bulan\` DECIMAL(15,2),
    \`break_even_point\` INT,
    \`roi_estimasi\` DECIMAL(5,2),
    \`channel_penjualan\` JSON,
    \`platform_online\` JSON,
    \`canvas_json\` JSON,
    \`ai_summary\` TEXT,
    \`status\` ENUM('DRAFT','COMPLETE','APPLIED') DEFAULT 'DRAFT',
    \`current_step\` INT DEFAULT 1,
    \`is_seeded\` TINYINT DEFAULT 0,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_bp_user\` (\`user_id\`),
    INDEX \`idx_bp_unit\` (\`unit_id\`),
    FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`unit_id\`) REFERENCES \`unit_bisnis\`(\`id\`) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS \`business_plan_seed_logs\` (
    \`id\` INT AUTO_INCREMENT NOT NULL,
    \`plan_id\` INT NOT NULL,
    \`unit_id\` INT NOT NULL,
    \`module\` VARCHAR(50) NOT NULL,
    \`records_created\` INT DEFAULT 0,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    INDEX \`idx_bp_seed_plan\` (\`plan_id\`),
    FOREIGN KEY (\`plan_id\`) REFERENCES \`business_plans\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/);
    if (match) console.log(`✅ Table ready: ${match[1]}`);
  } catch (err) {
    console.error('❌', err.message.substring(0, 120));
  }
}

await conn.end();
console.log('\n✅ Migration selesai! Sekarang buka: http://localhost:5173/finance/planning');
