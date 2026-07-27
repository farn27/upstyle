import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

(async () => {
    let connection;
    try {
        connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log("Connected to DB");

        console.log("Adding unit_id column...");
        await connection.query('ALTER TABLE kategori_produk ADD COLUMN unit_id INT NULL');

        console.log("Fetching first unit_id...");
        const [units] = await connection.query('SELECT id FROM unit_bisnis ORDER BY id ASC LIMIT 1');
        let firstUnitId = null;
        if (units.length > 0) {
            firstUnitId = units[0].id;
            console.log("Assigning existing categories to unit_id:", firstUnitId);
            await connection.query('UPDATE kategori_produk SET unit_id = ? WHERE unit_id IS NULL', [firstUnitId]);
        }

        const keysToDrop = ['nama_kategori', 'nama_kategori_2', 'nama_kategori_3', 'idx_kategori_global'];
        for (const key of keysToDrop) {
            try {
                console.log(`Dropping index ${key}...`);
                await connection.query(`ALTER TABLE kategori_produk DROP INDEX ${key}`);
            } catch (err) {
                console.log(`Index ${key} might not exist. Skipping...`);
            }
        }

        console.log("Adding composite unique index (unit_id, nama_kategori)...");
        await connection.query('ALTER TABLE kategori_produk ADD UNIQUE INDEX idx_kategori_unit (unit_id, nama_kategori)');

        try {
            console.log("Adding foreign key constraint for unit_id...");
            await connection.query('ALTER TABLE kategori_produk ADD CONSTRAINT fk_kategori_unit FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE');
        } catch (e) {
            console.log("Failed to add foreign key, maybe some orphan unit_id exists. Skipping...", e.message);
        }

        console.log("Database migration successful!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
})();
