const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'finance_engine_db' });
  try {
    const [orderRes] = await conn.execute(
      'INSERT INTO pos_orders (order_number, unit_id, customer_id, created_by, cashier_id, subtotal, discount, total, payment_method, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ['VERIFY-POS-1', 1, null, 1, null, '10.00', '0.00', '10.00', 'CASH', 'PAID', 'verify']
    );
    const orderId = orderRes.insertId;
    const [itemRes] = await conn.execute(
      'INSERT INTO pos_order_items (order_id, product_id, product_name, sku, qty, price, total, cost_total, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [orderId, 'verify-product', 'Verify Product', 'V1', 1, '10.00', '10.00', '5.00']
    );
    fs.writeFileSync('e:/upstyle/web/scripts/verify-pos-insert-result.json', JSON.stringify({ orderId, itemId: itemRes.insertId, ok: true }, null, 2));
    console.log('ok');
  } catch (err) {
    fs.writeFileSync('e:/upstyle/web/scripts/verify-pos-insert-result.json', JSON.stringify({ ok: false, error: err.message, sql: err.sql }, null, 2));
    console.error(err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
