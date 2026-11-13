/**
 * Telemetri ringan untuk Ruang Kendali (halaman developer):
 *  - pemakaian_ai : satu baris per panggilan model (token, model, durasi, berhasil/gagal, pengguna, jalur)
 *  - log_sistem   : galat server (5xx, exception), kegagalan AI, dan jejak akses Ruang Kendali
 *
 * Tabel dibuat otomatis (CREATE TABLE IF NOT EXISTS) saat pertama dipakai, jadi tidak perlu migrasi manual.
 * Semua penulisan bersifat "tembak dan lupakan": galat telemetri tidak boleh mengganggu permintaan pengguna.
 * Data lebih dari 30 hari dibersihkan sesekali.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { nowSqlWIB } from '$lib/server/dateUtils';

/** @typedef {{ userId?: number | null, jalur?: string | null, rute?: string | null }} KonteksPermintaan */

/** Konteks per permintaan (diisi hooks.server.js) supaya telemetri tahu siapa & dari jalur mana. */
export const konteksPermintaan = new AsyncLocalStorage();

/** @returns {KonteksPermintaan} */
export function konteksSaatIni() {
	return /** @type {KonteksPermintaan} */ (konteksPermintaan.getStore() || {});
}

const MATI = Boolean(process.env.VITEST) || process.env.TELEMETRI === 'mati';

export const DDL = [
	`CREATE TABLE IF NOT EXISTS pemakaian_ai (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		waktu DATETIME NOT NULL,
		user_id INT NULL,
		jalur VARCHAR(120) NULL,
		jenis VARCHAR(40) NULL,
		model VARCHAR(120) NULL,
		prompt INT NOT NULL DEFAULT 0,
		completion INT NOT NULL DEFAULT 0,
		total INT NOT NULL DEFAULT 0,
		ms INT NULL,
		ok TINYINT NOT NULL DEFAULT 1,
		status SMALLINT NULL,
		INDEX idx_pa_waktu (waktu),
		INDEX idx_pa_user_waktu (user_id, waktu)
	)`,
	`CREATE TABLE IF NOT EXISTS log_sistem (
		id BIGINT AUTO_INCREMENT PRIMARY KEY,
		waktu DATETIME NOT NULL,
		level VARCHAR(10) NOT NULL,
		sumber VARCHAR(40) NOT NULL,
		pesan VARCHAR(500) NOT NULL,
		status SMALLINT NULL,
		user_id INT NULL,
		meta TEXT NULL,
		INDEX idx_ls_waktu (waktu),
		INDEX idx_ls_level_waktu (level, waktu)
	)`
];

/** @type {Promise<any> | null} */
let siap = null;

/** Pool MySQL (diimpor malas supaya modul ini aman dipakai di tes tanpa basis data). */
async function pool() {
	const m = await import('$lib/server/drizzle');
	return m.pool;
}

/** Pastikan tabel telemetri ada (sekali per instans). */
export async function pastikanTabel() {
	if (!siap) {
		siap = (async () => {
			const p = await pool();
			for (const q of DDL) await p.query(q);
			return p;
		})().catch((e) => {
			siap = null;
			throw e;
		});
	}
	return siap;
}

/** Bersihkan data > 30 hari, kira-kira sekali tiap 200 penulisan. */
async function mungkinBersihkan(/** @type {any} */ p) {
	if (Math.random() > 0.005) return;
	const batas = new Date(Date.now() + 7 * 3600e3 - 30 * 86400e3).toISOString().slice(0, 19).replace('T', ' ');
	await p.query('DELETE FROM pemakaian_ai WHERE waktu < ?', [batas]).catch(() => {});
	await p.query("DELETE FROM log_sistem WHERE waktu < ? AND level <> 'audit'", [batas]).catch(() => {});
}

/** @param {unknown} v @param {number} n */
const pendek = (v, n) => (v == null ? null : String(v).slice(0, n));

/**
 * Catat satu panggilan model AI.
 * @param {{ jenis?: string|null, model?: string|null, prompt?: number, completion?: number, total?: number, ms?: number, ok?: boolean, status?: number|null }} d
 */
export function catatPemakaianAI(d) {
	if (MATI) return;
	const k = konteksSaatIni();
	const jenis = d.jenis || jenisDariJalur(k.rute || k.jalur);
	(async () => {
		const p = await pastikanTabel();
		await p.query(
			'INSERT INTO pemakaian_ai (waktu, user_id, jalur, jenis, model, prompt, completion, total, ms, ok, status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
			[
				nowSqlWIB(),
				k.userId ?? null,
				pendek(k.rute || k.jalur, 120),
				pendek(jenis, 40),
				pendek(d.model, 120),
				Math.max(0, Math.round(d.prompt || 0)),
				Math.max(0, Math.round(d.completion || 0)),
				Math.max(0, Math.round(d.total || (d.prompt || 0) + (d.completion || 0))),
				d.ms == null ? null : Math.round(d.ms),
				d.ok === false ? 0 : 1,
				d.status ?? null
			]
		);
		await mungkinBersihkan(p);
	})().catch(() => {});
}

/**
 * Catat galat/peristiwa sistem.
 * @param {{ level?: 'error'|'warn'|'info'|'audit', sumber: string, pesan: string, status?: number|null, meta?: unknown, userId?: number|null }} d
 * @returns {Promise<void>}
 */
export function catatLog(d) {
	if (MATI) return Promise.resolve();
	const k = konteksSaatIni();
	return (async () => {
		const p = await pastikanTabel();
		let meta = null;
		if (d.meta !== undefined) {
			try {
				meta = JSON.stringify(d.meta).slice(0, 4000);
			} catch {
				meta = null;
			}
		}
		await p.query('INSERT INTO log_sistem (waktu, level, sumber, pesan, status, user_id, meta) VALUES (?,?,?,?,?,?,?)', [
			nowSqlWIB(),
			d.level || 'error',
			pendek(d.sumber, 40),
			pendek(d.pesan, 500) || '-',
			d.status ?? null,
			d.userId ?? k.userId ?? null,
			meta
		]);
		await mungkinBersihkan(p);
	})().catch(() => {});
}

/**
 * Jenis fitur AI dari jalur/rute permintaan (dipakai bila pemanggil tidak menyebutkan).
 * @param {string | null | undefined} jalur
 */
export function jenisDariJalur(jalur) {
	const j = String(jalur || '');
	if (/chat\/foto/.test(j)) return 'foto';
	if (/chat\/upload/.test(j)) return 'unggah-berkas';
	if (/\/chat/.test(j)) return 'chat';
	if (/advisor/.test(j)) return 'advisor';
	if (/caption|sosmed|social/.test(j)) return 'caption';
	if (/business-plan|planning/.test(j)) return 'business-plan';
	if (/laporan|report|wa/.test(j)) return 'laporan';
	if (/kategori|category/.test(j)) return 'kategori';
	if (/ai-entry|entry/.test(j)) return 'entri';
	return j ? 'lainnya' : 'latar';
}
