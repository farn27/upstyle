import mysql from 'mysql2/promise';

async function main() {
    try {
        const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
        
        console.log("Connected to database. Trying insert...");
        
        try {
            await connection.execute(
                `INSERT INTO users (id, username, email, password, google_id, avatar_url, role, company_id, created_at, email_verified_at) 
                 VALUES (default, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                ['costum ku', 'costumku27@gmail.com', null, '113048336195991232162', 'https://lh3.googleusercontent.com/a/ACg8ocJG1388MAtUDav3A7knsIcG25lk_rbRqEwd5UmF3qQBCAohgQ=s96-c', 'admin', null, '2026-07-15 14:56:55', null]
            );
            console.log("Insert Success!");
        } catch (err) {
            console.error("Exact Insert Error:", err.message);
        }

        await connection.end();
    } catch (err) {
        console.error("Connection Error:", err.message);
    }
    process.exit(0);
}

main();
