import { db } from './src/lib/server/drizzle.js';
import { users } from './src/lib/server/schema.js';
import { eq } from 'drizzle-orm';

async function test() {
    try {
        const rows = await db.select().from(users).limit(1);
        console.log('Success:', rows);
    } catch (e) {
        console.error('Exact error:', e.message);
        console.error(e);
    }
    process.exit(0);
}
test();