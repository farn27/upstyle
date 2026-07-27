import mysql from 'mysql2/promise';

async function main() {
    try {
        const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
        
        console.log("Connected to database. Modifying users table...");
        
        // Add email_verified_at if it doesn't exist
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN email_verified_at TIMESTAMP NULL;
            `);
            console.log("Added email_verified_at column.");
        } catch (e) {
            console.log("email_verified_at may already exist: " + e.message);
        }
        
        // Let's also make sure google_id and avatar_url exist, just in case!
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN google_id VARCHAR(255) NULL;
            `);
            console.log("Added google_id column.");
        } catch (e) { }

        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN avatar_url TEXT NULL;
            `);
            console.log("Added avatar_url column.");
        } catch (e) { }
        
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN company_id INT NULL;
            `);
            console.log("Added company_id column.");
        } catch (e) { }
        
        console.log("Success! Columns ensured.");
        await connection.end();
    } catch (err) {
        console.error("Error:", err.message);
    }
    process.exit(0);
}

main();
