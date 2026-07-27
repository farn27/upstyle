import mysql from 'mysql2/promise';

async function migrate() {
    const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
    try {
        console.log("Fixing variant_id collation and adding FK...");
        await connection.execute('ALTER TABLE pos_order_items MODIFY COLUMN variant_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
        await connection.execute('ALTER TABLE pos_order_items ADD CONSTRAINT pos_order_items_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL');
        console.log("FK added successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await connection.end();
    }
}
migrate();
