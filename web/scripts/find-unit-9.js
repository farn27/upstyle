import mysql from 'mysql2/promise';

async function main() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'finance_engine_db',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  const [rows] = await pool.query(
    `SELECT id, slug, user_id, nama_unit FROM unit_bisnis WHERE user_id = ? OR nama_unit LIKE ? OR slug LIKE ? LIMIT 50`,
    [9, '%italian%', '%italian%']
  );

  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
