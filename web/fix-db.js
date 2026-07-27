import mysql from 'mysql2/promise';

async function main() {
    try {
        const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
        
        console.log("Connected to database. Modifying users table...");
        
        // Add AUTO_INCREMENT to id column
        await connection.execute(`
            ALTER TABLE users 
            MODIFY COLUMN id INT NOT NULL AUTO_INCREMENT;
        `);
        
        console.log("Success! Added AUTO_INCREMENT to id column.");
        await connection.end();
    } catch (err) {
        console.error("Error:", err.message);
    }
    process.exit(0);
}

main();
