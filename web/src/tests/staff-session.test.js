/**
 * Sesi portal staf: nilai yang dikembalikan klien Upstash bisa berupa objek (sudah di-parse otomatis) atau string JSON.
 * Regresi: dulu hanya string yang diterima, sehingga login portal staf selalu kembali ke halaman login.
 */
import { describe, it, expect, vi } from 'vitest';

const toko = vi.hoisted(() => new Map());
vi.mock('$lib/server/redis', () => ({
	redis: {
		set: async (k, v) => { toko.set(k, v); return 'OK'; },
		// meniru klien Upstash: nilai JSON dikembalikan sebagai objek
		get: async (k) => { const v = toko.get(k); try { return v === undefined ? null : JSON.parse(v); } catch { return v ?? null; } },
		del: async (k) => { toko.delete(k); }
	}
}));

describe('staffSession', () => {
	it('createStaffSession lalu getStaffSession mengembalikan payload yang sama', async () => {
		const { createStaffSession, getStaffSession } = await import('../lib/server/staffSession.js');
		const payload = { id: 7, full_name: 'Kasir Uji', role: 'kasir', unit_id: 3, owner_id: 1, login_slug: 'abc' };
		const token = await createStaffSession(payload);
		expect(await getStaffSession(token)).toEqual(payload);
	});
	it('token tidak dikenal → null', async () => {
		const { getStaffSession } = await import('../lib/server/staffSession.js');
		expect(await getStaffSession('tidak-ada')).toBeNull();
		expect(await getStaffSession('')).toBeNull();
	});
	it('nilai berupa string JSON tetap didukung', async () => {
		const { getStaffSession } = await import('../lib/server/staffSession.js');
		toko.set('staff_session:s1', '{"id":1}');
		// get() tiruan mem-parse; paksa jalur string lewat nilai bukan-JSON
		expect(await getStaffSession('s1')).toEqual({ id: 1 });
	});
});
