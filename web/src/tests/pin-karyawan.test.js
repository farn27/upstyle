/**
 * PIN karyawan: satu cara simpan (hash) & periksa untuk web dan mobile.
 * Regresi: web menyimpan hash, API mobile menyimpan terenkripsi dan mengirim PIN asli ke klien;
 * verifikasi kasir web selalu salah untuk karyawan buatan web dan meloloskan saat galat.
 */
import { describe, it, expect, vi } from 'vitest';
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64);
vi.mock('$env/dynamic/private', () => ({ env: process.env }));

describe('pinKaryawan', () => {
	it('pinSah: 4–6 digit angka saja', async () => {
		const { pinSah } = await import('../lib/server/pinKaryawan.js');
		for (const p of ['1234', '12345', '123456']) expect(pinSah(p)).toBe(true);
		for (const p of ['123', '1234567', '12a4', '', null, 1234]) expect(pinSah(p)).toBe(false);
	});
	it('hash lalu cocokkan', async () => {
		const { hashPin, cocokkanPin } = await import('../lib/server/pinKaryawan.js');
		const h = await hashPin('4821');
		expect(h.startsWith('$argon2')).toBe(true);
		expect(await cocokkanPin(h, '4821')).toEqual({ cocok: true, perluHashUlang: false });
		expect((await cocokkanPin(h, '0000')).cocok).toBe(false);
	});
	it('PIN lama terenkripsi tetap dikenali dan ditandai untuk di-hash ulang', async () => {
		const { cocokkanPin } = await import('../lib/server/pinKaryawan.js');
		const { encryptField } = await import('../lib/server/encryption.js');
		const lama = encryptField('1111', true);
		expect(await cocokkanPin(lama, '1111')).toEqual({ cocok: true, perluHashUlang: true });
		expect((await cocokkanPin(lama, '2222')).cocok).toBe(false);
	});
	it('tanpa PIN tersimpan / masukan tak sah → tidak cocok (gagal tertutup)', async () => {
		const { cocokkanPin } = await import('../lib/server/pinKaryawan.js');
		expect((await cocokkanPin(null, '1234')).cocok).toBe(false);
		expect((await cocokkanPin('', '1234')).cocok).toBe(false);
		expect((await cocokkanPin('$argon2id$rusak', '1234')).cocok).toBe(false);
		expect((await cocokkanPin('apa-saja', 'apa-saja')).cocok).toBe(false);
	});
});
