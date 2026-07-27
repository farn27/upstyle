const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'finance_engine_db' });
  try {
    const [ordersDesc] = await conn.query('DESCRIBE pos_orders');
    const [itemsDesc] = await conn.query('DESCRIBE pos_order_items');
    const [ordersCreate] = await conn.query('SHOW CREATE TABLE pos_orders');
    const [itemsCreate] = await conn.query('SHOW CREATE TABLE pos_order_items');
    const fs = require('fs');
    fs.writeFileSync('e:/upstyle/web/scripts/pos-schema-check.json', JSON.stringify({
      ordersDesc,
      itemsDesc,
      ordersCreate: ordersCreate[0]['Create Table'],
      itemsCreate: itemsCreate[0]['Create Table']
    }, null, 2));
    console.log('wrote');
  } finally {
    await conn.end();
  }
})();
