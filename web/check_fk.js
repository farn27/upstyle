import mysql from 'mysql2/promise';

async function check() {
    const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
    try {
        const [rows] = await connection.execute('SHOW CREATE TABLE product_variants');
        console.log(rows[0]['Create Table']);
        const [rows2] = await connection.execute('SHOW CREATE TABLE pos_order_items');
        console.log(rows2[0]['Create Table']);
    } catch (e) {
        console.error(e);
    } finally {
        await connection.end();
    }
}
check();
