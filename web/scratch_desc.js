import mysql from 'mysql2/promise';

async function run() {
    const pool = mysql.createPool({ uri: 'mysql://root:@localhost:3306/finance_engine_db' });
    try {
        console.log("Adding FK for warehouse_stock.product_id...");
        await pool.query("ALTER TABLE `warehouse_stock` ADD CONSTRAINT `warehouse_stock_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action");
        console.log("Success!");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
