import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Connecting to Redis...");
    try {
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        console.log("Setting test key...");
        await redis.set('test', '123', { ex: 10 });
        console.log("Success! Test key set.");
    } catch (e) {
        console.error("Redis Error:", e);
    }
}
main();
