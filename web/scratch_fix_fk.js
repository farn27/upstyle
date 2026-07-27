import mysql from 'mysql2/promise';

async function run() {
    const pool = mysql.createPool({
        uri: 'mysql://root:@localhost:3306/finance_engine_db'
    });
    
    try {
        console.log("Dropping old index...");
        try {
            await pool.query('ALTER TABLE `employees` DROP INDEX `user_id`');
        } catch (e) { console.log(e.message) }
        
        console.log("Dropping old FK...");
        try {
            await pool.query('ALTER TABLE `employees` DROP FOREIGN KEY `employees_company_id_companies_id_fk`');
        } catch(e) { console.log(e.message) }
        
        console.log("Adding new FK to employees...");
        await pool.query('ALTER TABLE `employees` ADD CONSTRAINT `employees_company_id_unit_bisnis_id_fk` FOREIGN KEY (`company_id`) REFERENCES `unit_bisnis`(`id`) ON DELETE cascade ON UPDATE no action');
        console.log("FK added successfully!");
    } catch(err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
