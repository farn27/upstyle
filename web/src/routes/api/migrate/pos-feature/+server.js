/**
 * GET /api/migrate/pos-feature
 * One-time migration: tambah kolom pos_feature_override ke unit_bisnis
 * Hapus file ini setelah migration berhasil.
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        // Cek apakah kolom sudah ada
        const cols = await db.execute(sql`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'unit_bisnis' 
              AND COLUMN_NAME = 'pos_feature_override'
        `);

        const rows = Array.isArray(cols) ? cols[0] : cols;

        if (rows && rows.length > 0) {
            return json({ success: true, message: 'Kolom pos_feature_override sudah ada, tidak perlu migrate.' });
        }

        // Tambah kolom
        await db.execute(sql`
            ALTER TABLE unit_bisnis 
            ADD COLUMN pos_feature_override JSON NULL DEFAULT NULL
        `);

        return json({ success: true, message: '✅ Kolom pos_feature_override berhasil ditambahkan!' });

    } catch (err) {
        return json({ success: false, error: err.message }, { status: 500 });
    }
}
