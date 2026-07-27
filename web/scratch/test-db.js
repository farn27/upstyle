import mysql from "mysql2/promise";

const connectionString = "mysql://root:@localhost:3306/finance_engine_db";

async function run() {
    const pool = mysql.createPool({ uri: connectionString });
    try {
        console.log("=== DESCRIBE transaksi ===");
        const [rows1] = await pool.query("DESCRIBE transaksi");
        console.table(rows1);
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await pool.end();
    }
}
run();
