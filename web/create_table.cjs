const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS \`marketplace_integrations\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`unit_id\` int NOT NULL,
        \`platform\` enum('shopee','tokopedia','tiktok') NOT NULL,
        \`shop_id\` varchar(255) NOT NULL,
        \`access_token\` text,
        \`refresh_token\` text,
        \`token_expires_at\` timestamp,
        \`is_active\` tinyint DEFAULT 1,
        \`sync_orders\` tinyint DEFAULT 1,
        \`sync_products\` tinyint DEFAULT 1,
        \`created_at\` timestamp DEFAULT (CURRENT_TIMESTAMP),
        \`updated_at\` timestamp DEFAULT (CURRENT_TIMESTAMP) ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`marketplace_integrations_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`marketplace_integrations_unit_id_unit_bisnis_id_fk\` FOREIGN KEY (\`unit_id\`) REFERENCES \`unit_bisnis\`(\`id\`) ON DELETE cascade ON UPDATE no action
    );
  `);
  
  await connection.execute(`
    ALTER TABLE \`marketplace_integrations\` ADD UNIQUE INDEX \`idx_unit_platform\` (\`unit_id\`, \`platform\`);
  `).catch(e => console.log('Index might already exist', e.message));

  console.log('Table created!');
  await connection.end();
}

run().catch(console.error);
