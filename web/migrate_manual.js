import mysql from 'mysql2/promise';

async function migrate() {
    const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
    try {
        console.log("Starting manual migration...");
        
        // Disable foreign key checks temporarily to avoid constraint issues during drop
        await connection.execute('SET FOREIGN_KEY_CHECKS=0;');

        try {
            await connection.execute('ALTER TABLE transaksi DROP FOREIGN KEY transaksi_abc_category_id_abc_categories_id_fk');
            console.log("Dropped old FK.");
        } catch (e) {
            console.log("FK might not exist or name differs. Skipping...");
        }

        try {
            await connection.execute('ALTER TABLE transaksi DROP COLUMN abc_category_id');
            console.log("Dropped abc_category_id.");
        } catch (e) {
            console.log("Column abc_category_id already dropped.");
        }

        try {
            await connection.execute('ALTER TABLE transaksi ADD COLUMN journal_id INT');
            await connection.execute('ALTER TABLE transaksi ADD CONSTRAINT transaksi_journal_id_journal_entries_id_fk FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE SET NULL');
            console.log("Added journal_id.");
        } catch (e) {
            console.log("journal_id might already exist.", e.message);
        }

        try {
            await connection.execute('ALTER TABLE transaksi ADD COLUMN coa_id INT');
            await connection.execute('ALTER TABLE transaksi ADD CONSTRAINT transaksi_coa_id_chart_of_accounts_id_fk FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL');
            console.log("Added coa_id.");
        } catch (e) {
            console.log("coa_id might already exist.", e.message);
        }

        try {
            await connection.execute('ALTER TABLE pos_order_items ADD COLUMN variant_id VARCHAR(50)');
            await connection.execute('ALTER TABLE pos_order_items ADD CONSTRAINT pos_order_items_variant_id_product_variants_id_fk FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL');
            console.log("Added variant_id.");
        } catch (e) {
            console.log("variant_id might already exist.", e.message);
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS=1;');
        console.log("Migration completed.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await connection.end();
    }
}
migrate();
