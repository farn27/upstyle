/**
 * Verifikasi dua langkah (2FA) Ruang Kendali — TOTP standar RFC 6238 (Google Authenticator,
 * Microsoft Authenticator, Authy, dll.): kode 6 digit yang berganti tiap 30 detik.
 *
 * - Rahasia TOTP disimpan TERENKRIPSI (AES-256-GCM, ENCRYPTION_KEY) di tabel konsol_2fa.
 * - Kode yang sudah dipakai tidak bisa dipakai ulang (langkah_terakhir).
 * - 5 kali salah → dikunci 15 menit.
 * - Sesi konsol = cookie httpOnly bertanda tangan HMAC, berlaku 8 jam, terpisah dari sesi aplikasi.
 * - Lupa/hilang HP: pemilik sistem menghapus baris pengguna itu di konsol_2fa → daftar ulang.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { encrypt, decrypt } from '$lib/server/encryption';
import { redis } from '$lib/server/redis';

export const COOKIE_SESI = 'konsol_sesi';
export const UMUR_SESI_DETIK = 8 * 3600;
export const MAKS_GAGAL = 5;
export const KUNCI_DETIK = 15 * 60;
const LANGKAH = 30;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* ───────────────────────────── TOTP (RFC 6238 / 4226) ───────────────────────────── */

/** @param {Buffer} buf */
export function base32Enkode(buf) {
	let bit = 0;
	let nilai = 0;
	let out = '';
	for (const b of buf) {
		nilai = (nilai << 8) | b;
		bit += 8;
		while (bit >= 5) {
			out += B32[(nilai >>> (bit - 5)) & 31];
			bit -= 5;
		}
	}
	if (bit > 0) out += B32[(nilai << (5 - bit)) & 31];
	return out;
}

/** @param {string} s */
export function base32Dekode(s) {
	const bersih = s.toUpperCase().replace(/[^A-Z2-7]/g, '');
	let bit = 0;
	let nilai = 0;
	const out = [];
	for (const c of bersih) {
		nilai = (nilai << 5) | B32.indexOf(c);
		bit += 5;
		if (bit >= 8) {
			out.push((nilai >>> (bit - 8)) & 255);
			bit -= 8;
		}
	}
	return Buffer.from(out);
}

/**
 * Kode TOTP untuk satu langkah waktu.
 * @param {string} rahasia base32
 * @param {number} langkah  floor(unix / 30)
 * @param {number} [digit]
 */
export function kodeTotp(rahasia, langkah, digit = 6) {
	const pesan = Buffer.alloc(8);
	pesan.writeBigUInt64BE(BigInt(langkah));
	const h = createHmac('sha1', base32Dekode(rahasia)).update(pesan).digest();
	const o = h[h.length - 1] & 0xf;
	const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
	return String(bin % 10 ** digit).padStart(digit, '0');
}

/**
 * Cocokkan kode dengan toleransi ±1 langkah (jam HP sedikit meleset).
 * @param {string} rahasia
 * @param {string} kode
 * @param {number} [waktuMs]
 * @returns {number | null} langkah yang cocok, atau null
 */
export function cocokTotp(rahasia, kode, waktuMs = Date.now()) {
	const k = String(kode || '').replace(/\D/g, '');
	if (k.length !== 6) return null;
	const kini = Math.floor(waktuMs / 1000 / LANGKAH);
	for (const d of [0, -1, 1]) {
		const harap = Buffer.from(kodeTotp(rahasia, kini + d));
		if (timingSafeEqual(harap, Buffer.from(k))) return kini + d;
	}
	return null;
}

export function buatRahasia() {
	return base32Enkode(randomBytes(20));
}

/** @param {string} rahasia @param {string} akun */
export function uriOtp(rahasia, akun) {
	const penerbit = 'Bizgrow Ruang Kendali';
	return `otpauth://totp/${encodeURIComponent(`${penerbit}:${akun}`)}?secret=${rahasia}&issuer=${encodeURIComponent(penerbit)}&algorithm=SHA1&digits=6&period=30`;
}

/* ───────────────────────────── Sesi konsol (cookie bertanda tangan) ───────────────────────────── */

function kunciTanda() {
	const k = env.AUTH_SECRET || env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
	if (!k || k.length < 16) throw new Error('AUTH_SECRET / ENCRYPTION_KEY belum diset');
	return `konsol:${k}`;
}

/** @param {string} isi */
const tanda = (isi) => createHmac('sha256', kunciTanda()).update(isi).digest('base64url');

/**
 * @param {number} userId
 * @param {number} [sekarangMs]
 */
export function buatSesi(userId, sekarangMs = Date.now()) {
	const isi = Buffer.from(JSON.stringify({ u: userId, e: Math.floor(sekarangMs / 1000) + UMUR_SESI_DETIK })).toString('base64url');
	return `${isi}.${tanda(isi)}`;
}

/**
 * @param {string | undefined} token
 * @param {number} userId  pengguna yang sedang login di aplikasi (sesi konsol harus miliknya)
 * @param {number} [sekarangMs]
 */
export function sesiSah(token, userId, sekarangMs = Date.now()) {
	if (!token || !token.includes('.')) return false;
	const [isi, sig] = token.split('.');
	let harap;
	try {
		harap = tanda(isi);
	} catch {
		return false;
	}
	const a = Buffer.from(sig || '');
	const b = Buffer.from(harap);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
	try {
		const d = JSON.parse(Buffer.from(isi, 'base64url').toString());
		return d.u === userId && d.e > Math.floor(sekarangMs / 1000);
	} catch {
		return false;
	}
}

/* ───────────────────────────── Penyimpanan rahasia ───────────────────────────── */

/** @type {Promise<any> | null} */
let siap = null;
async function tabel() {
	if (!siap) {
		siap = (async () => {
			const { pool } = await import('$lib/server/drizzle');
			await pool.query(`CREATE TABLE IF NOT EXISTS konsol_2fa (
				user_id INT PRIMARY KEY,
				rahasia TEXT NOT NULL,
				aktif TINYINT NOT NULL DEFAULT 0,
				langkah_terakhir BIGINT NULL,
				dibuat DATETIME NOT NULL,
				terakhir DATETIME NULL
			)`);
			return pool;
		})().catch((e) => {
			siap = null;
			throw e;
		});
	}
	return siap;
}

const waktu = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 19).replace('T', ' ');

/**
 * Status 2FA pengguna. Bila belum aktif, siapkan (atau pakai ulang) rahasia tertunda untuk pendaftaran.
 * @param {number} userId
 * @returns {Promise<{ aktif: boolean, rahasia: string | null }>}
 */
export async function status2fa(userId) {
	const p = await tabel();
	const [rows] = await p.query('SELECT rahasia, aktif FROM konsol_2fa WHERE user_id = ?', [userId]);
	const r = /** @type {any[]} */ (rows)[0];
	if (r?.aktif) return { aktif: true, rahasia: null };
	if (r) return { aktif: false, rahasia: decrypt(r.rahasia) };
	const baru = buatRahasia();
	await p.query('INSERT INTO konsol_2fa (user_id, rahasia, aktif, dibuat) VALUES (?, ?, 0, ?)', [userId, encrypt(baru), waktu()]);
	return { aktif: false, rahasia: baru };
}

/**
 * Periksa kode 2FA; aktifkan pendaftaran bila ini kode pertama yang benar.
 * @param {number} userId
 * @param {string} kode
 * @returns {Promise<{ ok: boolean, baruAktif?: boolean, alasan?: string }>}
 */
export async function periksaKode(userId, kode) {
	const p = await tabel();
	const [rows] = await p.query('SELECT rahasia, aktif, langkah_terakhir FROM konsol_2fa WHERE user_id = ?', [userId]);
	const r = /** @type {any[]} */ (rows)[0];
	if (!r) return { ok: false, alasan: 'Belum terdaftar. Muat ulang halaman.' };
	const langkah = cocokTotp(decrypt(r.rahasia), kode);
	if (langkah == null) return { ok: false, alasan: 'Kode salah' };
	if (r.langkah_terakhir != null && langkah <= Number(r.langkah_terakhir)) return { ok: false, alasan: 'Kode ini sudah dipakai. Tunggu kode berikutnya.' };
	await p.query('UPDATE konsol_2fa SET aktif = 1, langkah_terakhir = ?, terakhir = ? WHERE user_id = ?', [langkah, waktu(), userId]);
	return { ok: true, baruAktif: !r.aktif };
}

/* ───────────────────────────── Batas percobaan ───────────────────────────── */

/** @type {Map<string, { n: number, sampai: number }>} */
const lokal = new Map();
/** @param {number} userId */
const kunciGagal = (userId) => `konsol:2fa:gagal:${userId}`;

/** Sisa detik terkunci (0 = tidak terkunci). @param {number} userId */
export async function sisaKunci(userId) {
	if (redis) {
		try {
			const n = Number(await redis.get(kunciGagal(userId))) || 0;
			if (n < MAKS_GAGAL) return 0;
			return Math.max(1, Number(await redis.ttl(kunciGagal(userId))) || KUNCI_DETIK);
		} catch {
			/* jatuh ke memori */
		}
	}
	const l = lokal.get(kunciGagal(userId));
	if (!l || l.sampai < Date.now() || l.n < MAKS_GAGAL) return 0;
	return Math.ceil((l.sampai - Date.now()) / 1000);
}

/** Catat satu kegagalan; kembalikan sisa percobaan. @param {number} userId */
export async function catatGagal(userId) {
	if (redis) {
		try {
			const n = Number(await redis.incr(kunciGagal(userId)));
			if (n === 1 || n === MAKS_GAGAL) await redis.expire(kunciGagal(userId), KUNCI_DETIK);
			return Math.max(0, MAKS_GAGAL - n);
		} catch {
			/* jatuh ke memori */
		}
	}
	const k = kunciGagal(userId);
	const l = lokal.get(k);
	const n = l && l.sampai > Date.now() ? l.n + 1 : 1;
	lokal.set(k, { n, sampai: Date.now() + KUNCI_DETIK * 1000 });
	return Math.max(0, MAKS_GAGAL - n);
}

/** @param {number} userId */
export async function hapusGagal(userId) {
	lokal.delete(kunciGagal(userId));
	if (redis) await redis.del(kunciGagal(userId)).catch(() => {});
}
