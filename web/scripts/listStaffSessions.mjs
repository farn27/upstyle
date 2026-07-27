import { Redis } from "@upstash/redis";
import fs from 'fs';

const url = process.env.UPSTASH_REDIS_REST_URL;
const tokenEnv = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !tokenEnv) {
  console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env");
  process.exit(2);
}

const redis = new Redis({ url, token: tokenEnv });

(async function(){
  try {
    const keys = await redis.keys('staff_session:*');
    console.log('Found', keys.length, 'keys');
    for (const k of keys) {
      const v = await redis.get(k);
      console.log(k, v ? v.slice(0,200) : v);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
