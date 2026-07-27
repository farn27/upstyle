import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const tokenEnv = process.env.UPSTASH_REDIS_REST_TOKEN;
const prefix = process.argv[2];

if (!url || !tokenEnv) {
  console.error("Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in env");
  process.exit(2);
}
if (!prefix) {
  console.error("Usage: node scripts/checkStaffSession.mjs <tokenPrefix>");
  process.exit(2);
}

const redis = new Redis({ url, token: tokenEnv });

async function run() {
  try {
    console.log('Searching keys for pattern:', `staff_session:*${prefix}*`);
    const keys = await redis.keys(`staff_session:*${prefix}*`);
    if (!keys || keys.length === 0) {
      console.log('No keys matched');
      return;
    }
    const results = [];
    for (const k of keys) {
      const v = await redis.get(k);
      results.push({ key: k, value: v });
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
}

run();
