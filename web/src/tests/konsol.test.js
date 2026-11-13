/** Ruang Kendali: akses superadmin, penyamaran email, telemetri, dan utilitas grafik. */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ...process.env, GROQ_API_KEY: 'uji', DATABASE_URL: 'mysql://x:y@127.0.0.1:1/z' } }));
const { termasukSuperadmin, samarkanEmail } = await import('$lib/server/konsol/akses');
const { jenisDariJalur, catatPemakaianAI, catatLog, konteksPermintaan, konteksSaatIni } = await import('$lib/server/telemetri');
const { persentil, deretHari, deretJam, tanggalSah } = await import('$lib/server/konsol/data');
const { treemap, keCSV, singkat, kurva, relatif, msDariWIB } = await import('$lib/components/konsol/util.js');

describe('akses superadmin', () => {
	it('hanya email/ID yang terdaftar; daftar kosong = semua ditolak', () => {
		const u = { id: 7, email: 'Admin@Contoh.ID' };
		expect(termasukSuperadmin(u, { emails: 'admin@contoh.id, lain@x.id', ids: '' })).toBe(true);
		expect(termasukSuperadmin(u, { emails: 'lain@x.id', ids: '7' })).toBe(true);
		expect(termasukSuperadmin(u, { emails: 'lain@x.id', ids: '8' })).toBe(false);
		expect(termasukSuperadmin(u, { emails: '', ids: '' })).toBe(false);
		expect(termasukSuperadmin(u, { emails: undefined, ids: undefined })).toBe(false);
	});
	it('email disamarkan untuk tampilan', () => {
		expect(samarkanEmail('fahmi@gmail.com')).toBe('fa***@gmail.com');
		expect(samarkanEmail('a@b.id')).toBe('a***@b.id');
		expect(samarkanEmail('')).toBe('');
		expect(samarkanEmail('tanpa-at')).toBe('***');
	});
});

describe('telemetri', () => {
	it('jenis fitur AI ditebak dari rute', () => {
		expect(jenisDariJalur('/api/chat/foto')).toBe('foto');
		expect(jenisDariJalur('/api/chat')).toBe('chat');
		expect(jenisDariJalur('/api/ai-advisor')).toBe('advisor');
		expect(jenisDariJalur('/api/sosmed/caption')).toBe('caption');
		expect(jenisDariJalur(null)).toBe('latar');
	});
	it('konteks permintaan terbawa ke kode async; pencatatan dimatikan saat tes (tidak menyentuh DB)', async () => {
		await konteksPermintaan.run({ userId: 42, jalur: '/api/chat' }, async () => {
			await Promise.resolve();
			expect(konteksSaatIni()).toMatchObject({ userId: 42, jalur: '/api/chat' });
			expect(() => catatPemakaianAI({ model: 'm', total: 10 })).not.toThrow();
			await expect(catatLog({ sumber: 'uji', pesan: 'x' })).resolves.toBeUndefined();
		});
		expect(konteksSaatIni()).toEqual({});
	});
});

describe('agregat & utilitas grafik', () => {
	it('persentil, deret waktu WIB, validasi tanggal', () => {
		expect(persentil([5, 1, 3, 2, 4], 50)).toBe(3);
		expect(persentil([10, 20, 30, 40], 95)).toBe(40);
		expect(persentil([], 50)).toBeNull();
		const h = deretHari(30);
		expect(h).toHaveLength(30);
		expect(h[29] > h[0]).toBe(true);
		expect(deretJam(48)[47]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}$/);
		expect(tanggalSah('2026-11-01')).toBe(true);
		expect(tanggalSah("2026-11-01' OR 1=1")).toBe(false);
	});
	it('treemap mengisi seluruh bidang tanpa tumpang tindih luas', () => {
		const t = treemap([{ nilai: 60 }, { nilai: 25 }, { nilai: 10 }, { nilai: 5 }], 400, 200);
		const luas = t.reduce((s, k) => s + k.w * k.h, 0);
		expect(Math.round(luas)).toBe(400 * 200);
		for (const k of t) {
			expect(k.x).toBeGreaterThanOrEqual(-1e-6);
			expect(k.x + k.w).toBeLessThanOrEqual(400 + 1e-6);
			expect(k.y + k.h).toBeLessThanOrEqual(200 + 1e-6);
		}
		expect(treemap([], 10, 10)).toEqual([]);
	});
	it('CSV memakai ; dan meloloskan karakter khusus; angka singkat; kurva; waktu relatif', () => {
		expect(keCSV([{ a: 'x;y', b: 'say "hai"', c: 3 }])).toBe('a;b;c\n"x;y";"say ""hai""";3');
		expect(singkat(1500000)).toBe('1,5 jt');
		expect(singkat(42000)).toBe('42 rb');
		expect(singkat(950)).toBe('950');
		expect(kurva([[0, 0], [1, 1], [2, 0]])).toMatch(/^M0,0 C/);
		const kini = new Date(Date.now() + 7 * 3600e3 - 5 * 60e3).toISOString().slice(0, 19).replace('T', ' ');
		expect(relatif(kini)).toBe('5 mnt lalu');
		expect(relatif(null)).toBe('belum pernah');
		expect(Number.isNaN(msDariWIB('bukan'))).toBe(true);
	});
});
