import { redis } from '$lib/server/redis';
import crypto from 'crypto';

const STAFF_SESSION_TTL = 60 * 60 * 24; // 24 hours

export async function createStaffSession(sessionObj) {
  const token = crypto.randomUUID();
  const key = `staff_session:${token}`;
  await redis.set(key, JSON.stringify(sessionObj), { ex: STAFF_SESSION_TTL });
  return token;
}

export async function getStaffSession(token) {
  if (!token) return null;
  const key = `staff_session:${token}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function deleteStaffSession(token) {
  if (!token) return;
  const key = `staff_session:${token}`;
  await redis.del(key);
}

export const STAFF_SESSION_TTL_SECONDS = STAFF_SESSION_TTL;
