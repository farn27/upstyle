/**
 * Akses Ruang Kendali (halaman developer) — tiga lapis:
 *  1. Daftar tim di env (dicek di server setiap permintaan):
 *       SUPERADMIN_EMAILS / SUPERADMIN_USER_IDS  → peran "pengelola" (lihat + tindakan kontrol)
 *       KONSOL_PENGAMAT_EMAILS                    → peran "pengamat" (hanya melihat)
 *     Selain anggota tim mendapat 404 supaya keberadaan halaman tidak terungkap.
 *  2. Verifikasi dua langkah (TOTP) → cookie sesi konsol 8 jam (lihat duaFaktor.js).
 *  3. Batas percobaan, jejak audit, dan email pemberitahuan setiap ada yang masuk.
 *
 * Batasan privasi (Kode Etik Akses Data): Ruang Kendali hanya menampilkan data operasional & agregat.
 * Data usaha per unit (Riset) hanya untuk unit yang pemiliknya sudah menyetujui: KONSOL_RISET_UNIT_IDS.
 */
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';
import { COOKIE_SESI, sesiSah } from '$lib/server/konsol/duaFaktor';

/** @param {string | undefined} v */
const daftar = (v) =>
	String(v || '')
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

/** @typedef {'pengelola' | 'pengamat'} Peran */

/**
 * Peran pengguna di tim Ruang Kendali, atau null bila bukan anggota.
 * @param {{ id: number, email: string }} u
 * @param {{ emails?: string, ids?: string, pengamat?: string }} [konfig]
 * @returns {Peran | null}
 */
export function peranTim(u, konfig = { emails: env.SUPERADMIN_EMAILS, ids: env.SUPERADMIN_USER_IDS, pengamat: env.KONSOL_PENGAMAT_EMAILS }) {
	const email = String(u.email || '').toLowerCase();
	if (daftar(konfig.emails).includes(email) || daftar(konfig.ids).includes(String(u.id))) return 'pengelola';
	if (daftar(konfig.pengamat).includes(email)) return 'pengamat';
	return null;
}

/** Kompatibilitas: anggota tim (peran apa pun). @param {{ id: number, email: string }} u @param {any} [konfig] */
export function termasukSuperadmin(u, konfig) {
	return peranTim(u, konfig) !== null;
}

/**
 * Unit yang boleh dibuka di stasiun Riset (pemilik sudah menyetujui pemeriksaan data).
 * @param {number | string} unitId
 * @param {string | undefined} [ids]
 */
export function unitRisetDiizinkan(unitId, ids = env.KONSOL_RISET_UNIT_IDS) {
	return daftar(ids).includes(String(unitId));
}

/**
 * Anggota tim yang sedang login di aplikasi, atau null.
 * @param {App.Locals} locals
 * @returns {Promise<{ id: number, username: string, email: string, peran: Peran } | null>}
 */
export async function anggotaTim(locals) {
	const uid = /** @type {any} */ (locals)?.user?.id;
	if (!uid) return null;
	const [u] = await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, uid)).limit(1);
	if (!u) return null;
	const peran = peranTim(u);
	return peran ? { ...u, peran } : null;
}

/** Untuk halaman: 404 bila bukan anggota tim. @param {App.Locals} locals */
export async function wajibAnggota(locals) {
	const u = await anggotaTim(locals);
	if (!u) throw error(404, 'Not Found');
	return u;
}

/**
 * Untuk API: anggota tim + sesi 2FA sah (+ peran pengelola bila diminta).
 * @param {App.Locals} locals
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {{ pengelola?: boolean }} [opsi]
 */
export async function cekApiSuperadmin(locals, cookies, opsi = {}) {
	const u = await anggotaTim(locals);
	if (!u) return { tolak: json({ message: 'Not Found' }, { status: 404 }) };
	if (!sesiSah(cookies.get(COOKIE_SESI), u.id)) return { tolak: json({ message: 'Verifikasi dua langkah diperlukan', perluVerifikasi: true }, { status: 401 }) };
	if (opsi.pengelola && u.peran !== 'pengelola') return { tolak: json({ message: 'Peran pengamat hanya boleh melihat' }, { status: 403 }) };
	return { u };
}

/**
 * Samarkan email untuk tampilan (fa***@gmail.com).
 * @param {string | null | undefined} email
 */
export function samarkanEmail(email) {
	const e = String(email || '');
	const at = e.indexOf('@');
	if (at < 1) return e ? '***' : '';
	return `${e.slice(0, Math.min(2, at))}***${e.slice(at)}`;
}
