import { Redis } from "@upstash/redis";

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
    const results = [];
    for (const k of keys) {
      const v = await redis.get(k);
      results.push({ key: k, value: v });
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
