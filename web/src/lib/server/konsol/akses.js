/**
 * Akses Ruang Kendali (halaman developer/superadmin).
 *
 * Hanya akun yang emailnya tercantum di env SUPERADMIN_EMAILS (dipisah koma) atau ID-nya di
 * SUPERADMIN_USER_IDS yang boleh masuk. Pengecekan selalu di server; selain superadmin mendapat 404
 * supaya keberadaan halaman ini tidak terungkap.
 */
import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { users } from '$lib/server/schema';

/** @param {string | undefined} v */
const daftar = (v) =>
	String(v || '')
		.split(',')
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);

/**
 * @param {{ id: number, email: string }} u
 * @param {{ emails?: string, ids?: string }} [konfig]
 */
export function termasukSuperadmin(u, konfig = { emails: env.SUPERADMIN_EMAILS, ids: env.SUPERADMIN_USER_IDS }) {
	const emails = daftar(konfig.emails);
	const ids = daftar(konfig.ids);
	if (!emails.length && !ids.length) return false;
	return emails.includes(String(u.email || '').toLowerCase()) || ids.includes(String(u.id));
}

/**
 * Superadmin yang sedang login, atau null.
 * @param {App.Locals} locals
 * @returns {Promise<{ id: number, username: string, email: string } | null>}
 */
export async function superadminDari(locals) {
	const uid = /** @type {any} */ (locals)?.user?.id;
	if (!uid) return null;
	const [u] = await db.select({ id: users.id, username: users.username, email: users.email }).from(users).where(eq(users.id, uid)).limit(1);
	if (!u || !termasukSuperadmin(u)) return null;
	return u;
}

/** Untuk halaman: 404 bila bukan superadmin. @param {App.Locals} locals */
export async function wajibSuperadmin(locals) {
	const u = await superadminDari(locals);
	if (!u) throw error(404, 'Not Found');
	return u;
}

/** Untuk API: Response 404 bila bukan superadmin, selain itu data pengguna. @param {App.Locals} locals */
export async function cekApiSuperadmin(locals) {
	const u = await superadminDari(locals);
	if (!u) return { tolak: json({ message: 'Not Found' }, { status: 404 }) };
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
