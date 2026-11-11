/**
 * /api/app/realtime membaca PUBLIC_SOCKET_URL lewat $env/dynamic/public dan hanya memberi token untuk unit milik user.
 * Regresi: dulu dibaca lewat $env/dynamic/private sehingga alamat socket selalu kosong (variabel PUBLIC_ tidak ada di sana).
 */
import { describe, it, expect, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;
const login = vi.hoisted(() => ({ userId: /** @type {number | null} */ (null) }));
vi.mock('$env/dynamic/private', () => ({ env: { ...process.env, SOCKET_API_KEY: 'k'.repeat(40) } }));
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_SOCKET_URL: 'https://socket.contoh.id' } }));
vi.mock('$lib/server/getUser', () => ({ getCurrentUserId: async () => login.userId }));

describe.skipIf(!TEST_DB)('Realtime app', () => {
	it('alamat socket dari env publik + token hanya untuk unit sendiri', async () => {
		const s = await import('../lib/server/schema.js');
		const { db } = await import('../lib/server/drizzle.js');
		const api = await import('../routes/api/app/realtime/+server.js');
		const t = Date.now();
		const [a] = await db.insert(s.users).values({ username: `rta${t}`, email: `rta${t}@x.id`, role: 'enterprise' });
		const [b] = await db.insert(s.users).values({ username: `rtb${t}`, email: `rtb${t}@x.id`, role: 'enterprise' });
		const [ua] = await db.insert(s.unitBisnis).values({ userId: a.insertId, namaUnit: 'RT A', slug: `rt-a-${t}`, kategori: 'RETAIL_TOKO' });
		const [ub] = await db.insert(s.unitBisnis).values({ userId: b.insertId, namaUnit: 'RT B', slug: `rt-b-${t}`, kategori: 'RETAIL_TOKO' });
		const mk = (unitId) => ({ url: new URL(`http://x/?unitId=${unitId}`), cookies: { get() {} }, request: new Request('http://x/'), setHeaders() {} });
		login.userId = a.insertId;
		const ok = await (await api.GET(mk(ua.insertId))).json();
		expect(ok.data.socketUrl).toBe('https://socket.contoh.id');
		expect(ok.data.token.split('.').length).toBe(2);
		const lain = await api.GET(mk(ub.insertId));
		expect(lain.status).toBe(404);
	});
});
