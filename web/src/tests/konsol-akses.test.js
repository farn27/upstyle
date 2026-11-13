/** Ruang Kendali: 2FA TOTP (RFC 6238), sesi konsol, peran tim, izin riset, penyamaran log. */
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ...process.env, ENCRYPTION_KEY: 'kunci-uji-0123456789abcdef0123456789', DATABASE_URL: 'mysql://x:y@127.0.0.1:1/z' } }));
const { kodeTotp, cocokTotp, base32Enkode, base32Dekode, buatRahasia, buatSesi, sesiSah, uriOtp } = await import('$lib/server/konsol/duaFaktor');
const { peranTim, unitRisetDiizinkan } = await import('$lib/server/konsol/akses');
const { samarkanTeks } = await import('$lib/server/telemetri');

// Rahasia RFC 6238 (SHA-1): "12345678901234567890"
const RFC = base32Enkode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
	it('cocok dengan vektor uji resmi RFC 6238 (6 digit terakhir)', () => {
		expect(RFC).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
		expect(kodeTotp(RFC, Math.floor(59 / 30))).toBe('287082');
		expect(kodeTotp(RFC, Math.floor(1111111109 / 30))).toBe('081804');
		expect(kodeTotp(RFC, Math.floor(1234567890 / 30))).toBe('005924');
		expect(kodeTotp(RFC, Math.floor(2000000000 / 30))).toBe('279037');
	});
	it('toleransi ±1 langkah; kode di luar jendela / format salah ditolak', () => {
		const t = 1234567890 * 1000;
		const langkah = Math.floor(1234567890 / 30);
		expect(cocokTotp(RFC, '005924', t)).toBe(langkah);
		expect(cocokTotp(RFC, kodeTotp(RFC, langkah - 1), t)).toBe(langkah - 1);
		expect(cocokTotp(RFC, kodeTotp(RFC, langkah + 1), t)).toBe(langkah + 1);
		expect(cocokTotp(RFC, kodeTotp(RFC, langkah - 3), t)).toBeNull();
		expect(cocokTotp(RFC, '12345', t)).toBeNull();
		expect(cocokTotp(RFC, 'abcdef', t)).toBeNull();
	});
	it('rahasia acak 160-bit, base32 bolak-balik, URI otpauth', () => {
		const r = buatRahasia();
		expect(r).toMatch(/^[A-Z2-7]{32}$/);
		expect(base32Enkode(base32Dekode(r))).toBe(r);
		expect(buatRahasia()).not.toBe(r);
		expect(uriOtp(r, 'dev')).toMatch(/^otpauth:\/\/totp\/Bizgrow%20Ruang%20Kendali%3Adev\?secret=[A-Z2-7]+&issuer=/);
	});
});

describe('sesi konsol', () => {
	it('sah hanya untuk pengguna yang sama, sebelum kedaluwarsa, dan tanpa diubah', () => {
		const t0 = Date.parse('2026-11-13T00:00:00Z');
		const s = buatSesi(7, t0);
		expect(sesiSah(s, 7, t0 + 3600e3)).toBe(true);
		expect(sesiSah(s, 8, t0 + 3600e3)).toBe(false);
		expect(sesiSah(s, 7, t0 + 9 * 3600e3)).toBe(false);
		const [isi, sig] = s.split('.');
		const palsu = Buffer.from(JSON.stringify({ u: 7, e: 9999999999 })).toString('base64url');
		expect(sesiSah(`${palsu}.${sig}`, 7, t0)).toBe(false);
		expect(sesiSah(`${isi}.x${sig.slice(1)}`, 7, t0)).toBe(false);
		expect(sesiSah(undefined, 7, t0)).toBe(false);
		expect(sesiSah('rusak', 7, t0)).toBe(false);
	});
});

describe('peran tim & izin riset', () => {
	const k = { emails: 'Dev@Bizgrow.id', ids: '99', pengamat: 'dosen@kampus.ac.id, teman@x.id' };
	it('pengelola, pengamat, atau bukan anggota', () => {
		expect(peranTim({ id: 1, email: 'dev@bizgrow.id' }, k)).toBe('pengelola');
		expect(peranTim({ id: 99, email: 'siapa@x.id' }, k)).toBe('pengelola');
		expect(peranTim({ id: 2, email: 'DOSEN@kampus.ac.id' }, k)).toBe('pengamat');
		expect(peranTim({ id: 3, email: 'pemilik.umkm@gmail.com' }, k)).toBeNull();
		expect(peranTim({ id: 3, email: 'x@y.z' }, { emails: '', ids: '', pengamat: '' })).toBeNull();
	});
	it('riset hanya untuk unit yang menyetujui', () => {
		expect(unitRisetDiizinkan(3, '3, 7')).toBe(true);
		expect(unitRisetDiizinkan('7', '3,7')).toBe(true);
		expect(unitRisetDiizinkan(1, '3,7')).toBe(false);
		expect(unitRisetDiizinkan(3, '')).toBe(false);
		expect(unitRisetDiizinkan(3, undefined)).toBe(false);
	});
});

describe('penyamaran log', () => {
	it('email, telepon, token, kata sandi, angka panjang disamarkan; pesan teknis tetap', () => {
		expect(samarkanTeks('kirim ke budi.s@gmail.com gagal')).toBe('kirim ke [email] gagal');
		expect(samarkanTeks('hp 0812-3456-7890 / +6281234567890')).toBe('hp [telepon] / [telepon]');
		expect(samarkanTeks('Authorization: Bearer abcDEF123456789xyz')).toBe('Authorization: Bearer [rahasia]');
		expect(samarkanTeks('password=rahasia123 pin: 4321')).toBe('password [rahasia] pin [rahasia]');
		expect(samarkanTeks('key gsk_abcdefghijklmnop1234')).toBe('key [rahasia]');
		expect(samarkanTeks('NIK 3201234567890001')).toBe('NIK [angka]');
		expect(samarkanTeks('Groq API error: 429 Rate limit reached for model openai/gpt-oss-120b')).toBe('Groq API error: 429 Rate limit reached for model openai/gpt-oss-120b');
		expect(samarkanTeks(null)).toBe('');
	});
});
