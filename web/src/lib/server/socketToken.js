/**
 * Socket.io auth token (HMAC-SHA256)
 *
 * Format: base64url(JSON payload) + "." + base64url(signature)
 * Payload: { sub, unitId, exp }
 *
 * Kunci tanda tangan diturunkan dari SOCKET_API_KEY (domain-separated),
 * jadi tidak butuh env baru. Socket-server di VPS memakai derivasi yang sama.
 */

import { createHmac } from 'crypto';
import { env } from '$env/dynamic/private';

const TOKEN_TTL_SECONDS = 60 * 60; // 1 jam — client minta token baru setiap (re)connect
const KEY_CONTEXT = 'bizgrow-socket-token-v1';

function getSigningKey() {
	const apiKey = env.SOCKET_API_KEY;
	if (!apiKey) throw new Error('SOCKET_API_KEY belum diset');
	return createHmac('sha256', apiKey).update(KEY_CONTEXT).digest();
}

/**
 * @param {{ sub: string, unitId: number }} claims
 * @returns {{ token: string, exp: number }}
 */
export function signSocketToken({ sub, unitId }) {
	const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
	const payload = Buffer.from(JSON.stringify({ sub, unitId, exp })).toString('base64url');
	const signature = createHmac('sha256', getSigningKey()).update(payload).digest('base64url');
	return { token: `${payload}.${signature}`, exp };
}
