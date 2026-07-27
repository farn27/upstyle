import mysql from 'mysql2/promise';

async function main() {
    try {
        const connection = await mysql.createConnection('mysql://root:@localhost:3306/finance_engine_db');
        await connection.execute('SET FOREIGN_KEY_CHECKS=0;');
        await connection.execute('ALTER TABLE employees MODIFY pin VARCHAR(255);');
        await connection.execute('SET FOREIGN_KEY_CHECKS=1;');
        console.log('Successfully altered table employees to increase pin length.');
        await connection.end();
    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        process.exit(0);
    }
}

main();
