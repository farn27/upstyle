import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    try {
        try {
            await connection.execute(`
                CREATE TABLE \`pos_returns\` (
                    \`id\` int AUTO_INCREMENT NOT NULL,
                    \`return_number\` varchar(50) NOT NULL,
                    \`order_id\` int NOT NULL,
                    \`unit_id\` int NOT NULL,
                    \`handled_by\` varchar(50),
                    \`total_refund\` decimal(15,2) NOT NULL,
                    \`reason\` text,
                    \`status\` enum('COMPLETED','PENDING') DEFAULT 'COMPLETED',
                    \`created_at\` varchar(255),
                    CONSTRAINT \`pos_returns_id\` PRIMARY KEY(\`id\`),
                    CONSTRAINT \`pos_returns_return_number_unique\` UNIQUE(\`return_number\`)
                )
            `);
            await connection.execute(`CREATE INDEX \`idx_pos_returns_order\` ON \`pos_returns\` (\`order_id\`)`);
            await connection.execute(`CREATE INDEX \`idx_pos_returns_unit\` ON \`pos_returns\` (\`unit_id\`)`);
        } catch (e) {
            console.log('pos_returns already exists');
        }

        try {
            await connection.execute(`
                CREATE TABLE \`pos_return_items\` (
                    \`id\` int AUTO_INCREMENT NOT NULL,
                    \`return_id\` int NOT NULL,
                    \`order_item_id\` int NOT NULL,
                    \`product_id\` varchar(50),
                    \`qty_returned\` int NOT NULL,
                    \`refund_amount\` decimal(15,2) NOT NULL,
                    \`created_at\` varchar(255),
                    CONSTRAINT \`pos_return_items_id\` PRIMARY KEY(\`id\`)
                )
            `);
            await connection.execute(`CREATE INDEX \`idx_pos_return_items_return\` ON \`pos_return_items\` (\`return_id\`)`);
        } catch(e) { console.log('pos_return_items already exists'); }

        try {
            await connection.execute(`
                CREATE TABLE \`pos_cash_transactions\` (
                    \`id\` int AUTO_INCREMENT NOT NULL,
                    \`shift_id\` int NOT NULL,
                    \`type\` enum('CASH_IN','CASH_OUT') NOT NULL,
                    \`amount\` decimal(15,2) NOT NULL,
                    \`description\` text,
                    \`created_at\` varchar(255),
                    CONSTRAINT \`pos_cash_tx_id\` PRIMARY KEY(\`id\`)
                )
            `);
            await connection.execute(`CREATE INDEX \`idx_pos_cash_tx_shift\` ON \`pos_cash_transactions\` (\`shift_id\`)`);
        } catch(e) { console.log('pos_cash_transactions already exists'); }

        // Also add variant_id to pos_order_items if not present
        try {
            await connection.execute(`ALTER TABLE pos_order_items ADD COLUMN variant_id int;`);
        } catch (e) {
            console.log('variant_id may already exist');
        }
        try {
            await connection.execute(`ALTER TABLE products ADD COLUMN show_in_pos TINYINT DEFAULT 1;`);
        } catch(e) {
            console.log('show_in_pos may already exist');
        }

        try {
            await connection.execute(`ALTER TABLE pos_shifts ADD COLUMN kas_akhir_aktual decimal(15,2) DEFAULT '0.00';`);
            await connection.execute(`ALTER TABLE pos_shifts ADD COLUMN selisih decimal(15,2) DEFAULT '0.00';`);
        } catch (e) {
            console.log('Columns in pos_shifts may already exist');
        }

        console.log('Migration for Returns and Cash Transactions successful!');
    } catch (err) {
        console.error('Migration failed:', err);
    }
    await connection.end();
}
run();
