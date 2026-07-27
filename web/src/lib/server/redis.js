// File: src/lib/server/redis.js
import { Redis } from "@upstash/redis"; // <--- Ini library Upstash lurd
import { env } from "$env/dynamic/private";

// Kita cek dulu biar aman, kalau lupa isi .env bakal dikasih tau
if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn("⚠️ UPSTASH URL atau TOKEN belum disetting di file .env lurd! Redis akan disabled.");
}

// Ini dia inisialisasi Upstash-nya
export const redis = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;