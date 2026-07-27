const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'finance_engine_db' });
  try {
    const [orders] = await conn.query('DESCRIBE pos_orders');
    const [items] = await conn.query('DESCRIBE pos_order_items');
    const fs = require('fs');
    fs.writeFileSync('e:/upstyle/web/scripts/pos-tables-inspect.json', JSON.stringify({ orders, items }, null, 2));
    console.log('WROTE_SCHEMA');
  } catch (err) {
    const fs = require('fs');
    fs.writeFileSync('e:/upstyle/web/scripts/pos-tables-inspect-error.txt', err.message);
    console.error(err.message);
  } finally {
    await conn.end();
  }
})();
