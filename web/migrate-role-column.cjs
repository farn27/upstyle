const mysql = require('mysql2/promise');
(async () => {
  try {
    const pool = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'finance_engine_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const [result] = await pool.query("ALTER TABLE employees MODIFY role varchar(100) DEFAULT 'employee'");
    console.log('Migration result:', result);
    await pool.end();
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
})();
