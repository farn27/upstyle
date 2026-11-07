/**
 * Tes unit hasil audit keamanan (tanpa database):
 * RBAC paket berbayar, kunci enkripsi tanpa cadangan hardcode, IP klien untuk rate limit,
 * pembaca file impor (ExcelJS) yang kebal header __proto__, tanggal WIB, dan pencabutan sesi.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

const envPalsu = vi.hoisted(() => /** @type {Record<string, string | undefined>} */ ({}));
const appEnv = vi.hoisted(() => ({ dev: false, building: false }));
vi.mock('$env/dynamic/private', () => ({ env: envPalsu }));
vi.mock('$app/environment', () => appEnv);

// Redis palsu di memori (cukup untuk session.js)
const redisPalsu = vi.hoisted(() => {
	/** @type {Map<string, any>} */
	const data = new Map();
	return {
		data,
		async set(/** @type {string} */ k, /** @type {any} */ v) { data.set(k, v); return 'OK'; },
		async get(/** @type {string} */ k) { return data.has(k) ? data.get(k) : null; },
		async del(/** @type {string[]} */ ...ks) { let n = 0; for (const k of ks) n += data.delete(k) ? 1 : 0; return n; },
		async expire() { return 1; },
		async sadd(/** @type {string} */ k, /** @type {string[]} */ ...v) { const s = data.get(k) || new Set(); v.forEach((x) => s.add(x)); data.set(k, s); return v.length; },
		async srem(/** @type {string} */ k, /** @type {string[]} */ ...v) { const s = data.get(k); if (!s) return 0; v.forEach((x) => s.delete(x)); return v.length; },
		async smembers(/** @type {string} */ k) { return [...(data.get(k) || [])]; }
	};
});
vi.mock('$lib/server/redis', () => ({ redis: redisPalsu }));

describe('RBAC paket langganan', () => {
	it('owner paket free / pro / enterprise boleh membuka halaman aplikasi', async () => {
		const { peranDiizinkan } = await import('../lib/server/rbac.js');
		for (const role of ['free', 'pro', 'enterprise', 'PRO', 'user']) {
			expect(peranDiizinkan(role, '/finance/toko-a/laporan')).toBe(true);
		}
	});
	it('role kasir / staff / tak dikenal tetap ditolak', async () => {
		const { peranDiizinkan } = await import('../lib/server/rbac.js');
		for (const role of ['cashier', 'staff', 'peran-aneh', null]) {
			expect(peranDiizinkan(role, '/finance')).toBe(false);
		}
	});
});

describe('Kunci enkripsi (signState / verifyState)', () => {
	const KUNCI_LAMA = Buffer.from('bizgrow_upstyle_super_secret_key', 'utf-8');
	/** Token buatan penyerang dengan kunci lama yang dulu tertulis di source code */
	const tokenPalsuKunciLama = () => {
		const iv = crypto.randomBytes(12);
		const c = crypto.createCipheriv('aes-256-gcm', KUNCI_LAMA, iv);
		const isi = Buffer.concat([c.update(JSON.stringify({ u: 1, n: 1, t: 'finance', f: 'csv', x: Date.now() + 60_000 }), 'utf8'), c.final()]);
		return Buffer.concat([iv, c.getAuthTag(), isi]).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	};

	beforeEach(() => {
		vi.resetModules();
		for (const k of Object.keys(envPalsu)) delete envPalsu[k];
		appEnv.dev = false;
	});

	it('memakai turunan ENCRYPTION_KEY dan menolak token yang ditandatangani kunci lama', async () => {
		envPalsu.ENCRYPTION_KEY = 'k'.repeat(64);
		const c = await import('../lib/server/crypto.js');
		const token = c.signState({ a: 1 });
		expect(c.verifyState(token)).toEqual({ a: 1 });
		expect(c.verifyState(tokenPalsuKunciLama())).toBeNull();
	});

	it('produksi tanpa kunci: gagal (tidak diam-diam memakai kunci cadangan)', async () => {
		const c = await import('../lib/server/crypto.js');
		expect(c.signState({ a: 1 })).toBe('');
		expect(c.verifyState(tokenPalsuKunciLama())).toBeNull();
	});

	it('ENCRYPTION_MASTER_KEY 32 karakter tetap didukung', async () => {
		envPalsu.ENCRYPTION_MASTER_KEY = 'm'.repeat(32);
		const c = await import('../lib/server/crypto.js');
		expect(c.decrypt(c.encrypt('rahasia'))).toBe('rahasia');
	});
});

describe('getClientIP', () => {
	const req = (/** @type {Record<string, string>} */ h) => new Request('http://x', { headers: h });
	afterEach(() => {
		delete process.env.VERCEL;
		delete process.env.TRUSTED_PROXY_HOPS;
	});

	it('di server sendiri memakai IP yang ditambahkan proxy (paling kanan), bukan isian klien', async () => {
		const { getClientIP } = await import('../lib/server/rateLimit.js');
		expect(getClientIP(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }))).toBe('203.0.113.9');
		process.env.TRUSTED_PROXY_HOPS = '2';
		expect(getClientIP(req({ 'x-forwarded-for': '1.1.1.1, 198.51.100.7, 10.0.0.2' }))).toBe('198.51.100.7');
	});

	it('di Vercel memakai entri pertama (Vercel menimpa header ini)', async () => {
		process.env.VERCEL = '1';
		const { getClientIP } = await import('../lib/server/rateLimit.js');
		expect(getClientIP(req({ 'x-forwarded-for': '203.0.113.9' }))).toBe('203.0.113.9');
	});
});

describe('Pembaca file impor (ExcelJS)', () => {
	it('membaca .xlsx: header jadi kunci, sel kosong jadi string kosong', async () => {
		const ExcelJS = (await import('exceljs')).default;
		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet('Data');
		ws.addRow(['nama', 'harga', 'stok']);
		ws.addRow(['Kopi', 15000, null]);
		ws.addRow(['Teh', { formula: '1+1', result: 2 }, 5]);
		const buf = Buffer.from(await wb.xlsx.writeBuffer());
		const { bacaBarisFile } = await import('../lib/server/imporEkspor.js');
		expect(await bacaBarisFile(buf)).toEqual([
			{ nama: 'Kopi', harga: 15000, stok: '' },
			{ nama: 'Teh', harga: 2, stok: 5 }
		]);
	});

	it('membaca .csv (koma / titik koma, tanda kutip) dan mengabaikan kolom __proto__', async () => {
		const { bacaBarisFile } = await import('../lib/server/imporEkspor.js');
		const csv = '﻿nama;__proto__;keterangan\n"Kopi; Susu";x;"kata ""enak"""\n';
		const rows = await bacaBarisFile(Buffer.from(csv, 'utf8'));
		expect(rows).toEqual([{ nama: 'Kopi; Susu', keterangan: 'kata "enak"' }]);
		expect(/** @type {any} */ ({}).x).toBeUndefined();
	});
});

describe('Tanggal WIB', () => {
	afterEach(() => vi.useRealTimers());
	it('jam 01:30 WIB tetap tanggal hari itu (bukan kemarin seperti tanggal UTC)', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-11-06T18:30:00Z')); // = 7 Nov 01:30 WIB
		const d = await import('../lib/server/dateUtils.js');
		expect(d.todayStrWIB()).toBe('2026-11-07');
		expect(d.nowSqlWIB()).toBe('2026-11-07 01:30:00');
		expect(d.tanggalWIBPlusHari(30)).toBe('2026-12-07');
	});
});

describe('Sesi login', () => {
	beforeEach(() => {
		vi.resetModules();
		redisPalsu.data.clear();
	});

	it('ganti / reset password mengakhiri semua sesi lain', async () => {
		const sesi = await import('../lib/server/session.js');
		const a = await sesi.createSession(7);
		const b = await sesi.createSession(7);
		const lain = await sesi.createSession(8);
		expect(await sesi.getUserIdFromSession(a)).toBe(7);

		expect(await sesi.hapusSemuaSesiUser(7, { kecuali: a })).toBe(1);
		expect(await sesi.getUserIdFromSession(a)).toBe(7);
		expect(await sesi.getUserIdFromSession(b)).toBeNull();
		expect(await sesi.getUserIdFromSession(lain)).toBe(8);

		await sesi.hapusSemuaSesiUser(7);
		expect(await sesi.getUserIdFromSession(a)).toBeNull();
	});
});
