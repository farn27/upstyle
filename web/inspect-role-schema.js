const mysql = require('mysql2/promise');
(async () => {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'finance_engine_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    const [col] = await pool.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'employees'
         AND COLUMN_NAME = 'role'`
    );
    console.log('role column metadata:', JSON.stringify(col, null, 2));
    const [create] = await pool.query('SHOW CREATE TABLE employees');
    console.log('\nCREATE TABLE employees:\n', create[0]['Create Table']);
    await pool.end();
  } catch (e) {
    console.error('ERROR:', e);
    process.exit(1);
  }
})();
