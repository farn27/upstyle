import { db } from './src/lib/server/drizzle.js';
import { sql } from 'drizzle-orm';

async function main() {
    try {
        const result = await db.execute(sql`SHOW CREATE TABLE users`);
        console.log(result[0][0]['Create Table']);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

main();
