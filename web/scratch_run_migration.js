import fs from 'fs';
import mysql from 'mysql2/promise';

async function run() {
    const pool = mysql.createPool({
        uri: 'mysql://root:@localhost:3306/finance_engine_db',
        multipleStatements: true
    });
    
    try {
        const sql = fs.readFileSync('e:/upstyle/web/drizzle/migrations/0002_parched_millenium_guard.sql', 'utf-8');
        const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
        
        console.log(`Found ${statements.length} statements. Executing...`);
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`Executing ${i+1}/${statements.length}: ${stmt.substring(0, 50)}...`);
            try {
                await pool.query(stmt);
            } catch (err) {
                console.error(`Error on statement ${i+1}:`, err.message);
            }
        }
        
        console.log("Migration 0002 applied successfully (ignoring individual errors)!");
    } catch(err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
