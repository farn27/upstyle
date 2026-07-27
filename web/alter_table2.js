import mysql from 'mysql2/promise';
import 'dotenv/config';
async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  await connection.execute(ALTER TABLE \\marketplace_integrations\\ MODIFY \\shop_id\\ varchar(255) NULL, ADD COLUMN \\partner_id\\ varchar(255) NULL AFTER \\shop_id\\, ADD COLUMN \\partner_key\\ text NULL AFTER \\partner_id\\, MODIFY \\is_active\\ tinyint DEFAULT 0;);
  console.log('Table altered!');
  await connection.end();
}
run().catch(console.error);
