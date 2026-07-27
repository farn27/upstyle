import { db } from './src/lib/server/drizzle.js';
import { users } from './src/lib/server/schema.js';

async function main() {
    try {
        const [result] = await db.insert(users).values({
            username: 'costum ku',
            email: 'costumku27@gmail.com',
            googleId: '113048336195991232162',
            avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocJG1388MAtUDav3A7knsIcG25lk_rbRqEwd5UmF3qQBCAohgQ=s96-c'
        });
        console.log("Success:", result);
    } catch (err) {
        console.error("Exact DB Error:", err.message);
        console.error("Code:", err.code);
        console.error("SQL State:", err.sqlState);
        console.error(err);
    }
    process.exit(0);
}

main();
