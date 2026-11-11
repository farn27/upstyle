import { describe, it, expect, vi, beforeEach } from 'vitest';

const simpan = new Map();
vi.mock('$lib/server/redis', () => ({
	redis: {
		get: async (/** @type {string} */ k) => simpan.get(k) ?? null,
		incr: async (/** @type {string} */ k) => {
			const n = (Number(simpan.get(k)) || 0) + 1;
			simpan.set(k, n);
			return n;
		},
		expire: async () => 1
	}
}));

const { versiCache, tandaiBerubah } = await import('$lib/server/cacheVersi');

describe('cacheVersi — versi cache halaman', () => {
	beforeEach(() => simpan.clear());

	it('versi awal 0.0 dan stabil selama tidak ada perubahan', async () => {
		expect(await versiCache(7, 'toko-a')).toBe('0.0');
		expect(await versiCache(7, 'toko-a')).toBe('0.0');
	});

	it('perubahan oleh pemilik menaikkan versi semua unit miliknya', async () => {
		await tandaiBerubah({ userId: 7 });
		expect(await versiCache(7, 'toko-a')).toBe('1.0');
		expect(await versiCache(7, 'toko-b')).toBe('1.0');
		// pemilik lain tidak terpengaruh
		expect(await versiCache(8, 'toko-c')).toBe('0.0');
	});

	it('perubahan oleh staf (hanya slug) tetap mengubah versi yang dilihat pemilik', async () => {
		await tandaiBerubah({ slug: 'Toko-A' });
		expect(await versiCache(7, 'toko-a')).toBe('0.1');
		expect(await versiCache(7, 'toko-b')).toBe('0.0');
	});

	it('tidak melempar galat walau Redis bermasalah', async () => {
		const { redis } = await import('$lib/server/redis');
		const asli = redis.incr;
		redis.incr = async () => {
			throw new Error('redis mati');
		};
		await expect(tandaiBerubah({ userId: 7, slug: 'toko-a' })).resolves.toBeUndefined();
		redis.incr = asli;
	});
});
