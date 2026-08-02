/**
 * Migration: Tambah kolom pos_feature_override ke tabel unit_bisnis
 * Run: node add-pos-feature-override.js
 */
import { db } from './src/lib/server/drizzle.js';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        // Cek apakah kolom sudah ada
        const [cols] = await db.execute(sql`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'unit_bisnis' 
              AND COLUMN_NAME = 'pos_feature_override'
        `);

        if (cols.length > 0) {
            console.log('✅ Kolom pos_feature_override sudah ada, skip.');
            process.exit(0);
        }

        // Tambah kolom
        await db.execute(sql`
            ALTER TABLE unit_bisnis 
            ADD COLUMN pos_feature_override JSON NULL DEFAULT NULL
            COMMENT 'Override fitur POS per unit bisnis'
        `);

        console.log('✅ Kolom pos_feature_override berhasil ditambahkan ke unit_bisnis');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration gagal:', err.message);
        process.exit(1);
    }
}

migrate();
