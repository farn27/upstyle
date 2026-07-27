import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'finance_engine_db' });
console.log('connected');
const [rows] = await conn.query('SHOW TABLES LIKE ?', ['pos_%']);
console.log(JSON.stringify(rows));
await conn.end();
