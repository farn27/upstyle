import mysql from 'mysql2/promise';

async function backup() {
    const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
    try {
        console.log("Checking if backup table exists...");
        await connection.execute(`DROP TABLE IF EXISTS transaksi_abc_backup`);
        
        console.log("Creating backup...");
        await connection.execute(`CREATE TABLE transaksi_abc_backup AS SELECT id, abc_category_id FROM transaksi WHERE abc_category_id IS NOT NULL`);
        
        console.log("Backup completed.");
    } catch (e) {
        console.error("Backup failed:", e);
    } finally {
        await connection.end();
    }
}
backup();
