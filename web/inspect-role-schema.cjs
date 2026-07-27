const mysql = require("mysql2/promise");
(async () => {
  try {
    const pool = await mysql.createPool({host:'localhost', user:'root', password:'', database:'finance_engine_db'});
    const [col] = await pool.query("SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='role'");
    console.log(JSON.stringify(col, null, 2));
    const [create] = await pool.query('SHOW CREATE TABLE employees');
    console.log(create[0]['Create Table']);
    await pool.end();
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
