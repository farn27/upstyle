import { pool } from './src/lib/server/drizzle.js';  
import { pool } from 'e:/upstyle/web/src/lib/server/drizzle.js';

async function createSprint1Tables() {
    try {
        console.log("Creating Sprint 1 tables...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS warehouses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                unit_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                address TEXT,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS warehouse_stock (
                id INT AUTO_INCREMENT PRIMARY KEY,
                warehouse_id INT NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                stock INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_opname (
                id INT AUTO_INCREMENT PRIMARY KEY,
                unit_id INT NOT NULL,
                warehouse_id INT NOT NULL,
                created_by INT NOT NULL,
                status VARCHAR(20) DEFAULT 'DRAFT',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS stock_opname_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                opname_id INT NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                system_stock INT NOT NULL,
                actual_stock INT NOT NULL,
                difference INT NOT NULL,
                notes VARCHAR(255)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_batches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(50) NOT NULL,
                warehouse_id INT NOT NULL,
                batch_number VARCHAR(100),
                expiry_date TIMESTAMP NULL,
                stock INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                po_number VARCHAR(50) NOT NULL UNIQUE,
                unit_id INT NOT NULL,
                supplier_id INT NOT NULL,
                created_by INT NOT NULL,
                status VARCHAR(20) DEFAULT 'DRAFT',
                total_amount DECIMAL(15,2) NOT NULL,
                expected_date TIMESTAMP NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                po_id INT NOT NULL,
                product_id VARCHAR(50) NOT NULL,
                qty_ordered INT NOT NULL,
                qty_received INT DEFAULT 0,
                unit_price DECIMAL(15,2) NOT NULL,
                total_price DECIMAL(15,2) NOT NULL
            );
        `);

        console.log("Sprint 1 tables created successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error creating tables:", err);
        process.exit(1);
    }
}

createSprint1Tables();
