import { db, pool } from './src/lib/server/drizzle.js';

async function main() {
    try {
        await pool.execute('ALTER TABLE employees MODIFY pin VARCHAR(255);');
        console.log('Successfully altered table employees to increase pin length.');
    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        process.exit(0);
    }
}

main();
