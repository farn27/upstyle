import mysql from 'mysql2/promise';

async function main() {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'finance_engine_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    await pool.query("DELETE FROM crm_tasks WHERE owner_id = 1 AND deskripsi LIKE '%Follow up Budi%'");
    await pool.query("DELETE FROM crm_activities WHERE owner_id = 1 AND catatan LIKE '%Seed call%'");
    await pool.query("DELETE FROM crm_contacts WHERE owner_id = 1 AND email = 'budi@example.com'");
    await pool.query("DELETE FROM crm_companies WHERE owner_id = 1 AND nama = 'Acme Sample Co'");

    console.log('Wrong CRM sample data deleted for owner_id = 1');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

main();
