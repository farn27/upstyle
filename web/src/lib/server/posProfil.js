/**
 * Penyimpanan profil kasir per unit + penyusunan otomatis (aturan, lalu AI bila ada uraian usaha).
 *
 * Tabel pos_profil_unit dibuat saat pertama dipakai. Unit yang TIDAK punya baris di tabel ini tetap
 * memakai perilaku kasir lama (fitur dari kategori + pos_feature_override) — unit yang sudah berjalan
 * tidak berubah sampai pemiliknya sendiri memilih profil.
 */
import { eq, sql } from 'drizzle-orm';
import { unitBisnis } from '$lib/server/schema';
import { nowSqlWIB } from '$lib/server/dateUtils';
import { log } from '$lib/server/logger';
import {
	PROFIL_POS,
	PROMPT_PROFIL_POS,
	tebakProfil,
	pengaturanBawaan,
	normalisasiPengaturan,
	pengaturanDariAi,
	fiturDariProfil
} from '$lib/posProfil';
import { getActivePosFeatures } from '$lib/posFeatures';

const DDL = [
	`CREATE TABLE IF NOT EXISTS pos_profil_unit (
		unit_id INT NOT NULL PRIMARY KEY,
		profil VARCHAR(30) NOT NULL,
		pengaturan JSON NOT NULL,
		sumber VARCHAR(10) NOT NULL DEFAULT 'manual',
		dibuat_pada DATETIME NOT NULL,
		diubah_pada DATETIME NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS pos_bill (
		id INT AUTO_INCREMENT PRIMARY KEY,
		unit_id INT NOT NULL,
		kode VARCHAR(20) NOT NULL,
		meja VARCHAR(20) NULL,
		nama VARCHAR(100) NULL,
		jenis_pesanan VARCHAR(10) NOT NULL DEFAULT 'DINE_IN',
		jumlah_tamu INT NULL,
		items JSON NOT NULL,
		isian JSON NULL,
		catatan VARCHAR(255) NULL,
		status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
		order_id INT NULL,
		versi INT NOT NULL DEFAULT 1,
		dibuka_oleh VARCHAR(100) NULL,
		dibuka_pada DATETIME NOT NULL,
		diubah_pada DATETIME NOT NULL,
		INDEX idx_bill_unit_status (unit_id, status)
	)`,
	`CREATE TABLE IF NOT EXISTS pos_tiket_dapur (
		id INT AUTO_INCREMENT PRIMARY KEY,
		unit_id INT NOT NULL,
		bill_id INT NULL,
		order_id INT NULL,
		stasiun VARCHAR(20) NOT NULL,
		label VARCHAR(60) NOT NULL,
		items JSON NOT NULL,
		status VARCHAR(12) NOT NULL DEFAULT 'BARU',
		dibuat_pada DATETIME NOT NULL,
		diubah_pada DATETIME NOT NULL,
		INDEX idx_tiket_unit_status (unit_id, status)
	)`
];

/** @type {Promise<void> | null} */
let siap = null;
/**
 * Pastikan tabel profil/bill/tiket ada. Panggil DI LUAR transaksi (DDL memicu commit implisit di MySQL).
 * @param {any} db
 */
export function pastikanTabelPos(db) {
	if (!siap) {
		siap = (async () => {
			for (const q of DDL) await db.execute(sql.raw(q));
		})().catch((e) => {
			siap = null;
			throw e;
		});
	}
	return siap;
}

/** @param {unknown} v */
function json(v) {
	if (v == null) return null;
	if (typeof v === 'string') {
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	}
	return v;
}

/** Baris hasil db.execute (mysql2: [rows, fields]) */
export function barisDari(/** @type {any} */ r) {
	return /** @type {any[]} */ (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : Array.isArray(r) ? r : r?.rows || []);
}

/**
 * Profil kasir unit, atau null bila unit belum memakai profil (perilaku lama).
 * @param {any} db @param {number} unitId
 * @returns {Promise<{ profil: string, pengaturan: import('$lib/posProfil').PengaturanPos, sumber: string, diubahPada: string } | null>}
 */
export async function ambilProfilPos(db, unitId) {
	/** @type {any} */
	let r;
	try {
		await pastikanTabelPos(db);
		[r] = barisDari(await db.execute(sql`SELECT profil, pengaturan, sumber, diubah_pada FROM pos_profil_unit WHERE unit_id = ${unitId} LIMIT 1`));
	} catch (err) {
		// Jangan sampai kasir unit lama ikut gagal hanya karena tabel profil bermasalah
		log.pos.warn({ err, unitId }, 'Profil POS tidak terbaca');
		return null;
	}
	if (!r) return null;
	const profil = PROFIL_POS[r.profil] ? r.profil : 'umum';
	return { profil, pengaturan: normalisasiPengaturan(json(r.pengaturan), profil), sumber: r.sumber, diubahPada: String(r.diubah_pada || '') };
}

/**
 * Simpan profil + pengaturan, dan selaraskan saklar fitur POS unit (pos_feature_override)
 * supaya kasir web, aplikasi HP, dan checkout server membaca hal yang sama.
 * @param {any} db @param {number} unitId
 * @param {{ profil: string, pengaturan: unknown, sumber?: 'aturan' | 'ai' | 'manual' }} d
 */
export async function simpanProfilPos(db, unitId, d) {
	await pastikanTabelPos(db);
	const profil = PROFIL_POS[d.profil] ? d.profil : 'umum';
	const pengaturan = normalisasiPengaturan(d.pengaturan, profil);
	const sumber = ['aturan', 'ai', 'manual'].includes(String(d.sumber)) ? String(d.sumber) : 'manual';
	const kini = nowSqlWIB();
	await db.execute(sql`INSERT INTO pos_profil_unit (unit_id, profil, pengaturan, sumber, dibuat_pada, diubah_pada)
		VALUES (${unitId}, ${profil}, ${JSON.stringify(pengaturan)}, ${sumber}, ${kini}, ${kini})
		ON DUPLICATE KEY UPDATE profil = VALUES(profil), pengaturan = VALUES(pengaturan), sumber = VALUES(sumber), diubah_pada = VALUES(diubah_pada)`);

	const [unit] = await db.select({ kategori: unitBisnis.kategori, o: unitBisnis.posFeatureOverride }).from(unitBisnis).where(eq(unitBisnis.id, unitId)).limit(1);
	if (unit) {
		const aktif = getActivePosFeatures(unit.kategori, json(unit.o));
		await db.update(unitBisnis).set({ posFeatureOverride: { ...aktif, ...fiturDariProfil(profil, pengaturan) } }).where(eq(unitBisnis.id, unitId));
	}
	return { profil, pengaturan, sumber };
}

/** Hapus profil → unit kembali ke kasir standar lama. @param {any} db @param {number} unitId */
export async function hapusProfilPos(db, unitId) {
	await pastikanTabelPos(db);
	await db.execute(sql`DELETE FROM pos_profil_unit WHERE unit_id = ${unitId}`);
}

/**
 * Pemanggil AI bawaan (Groq). Diisolasi supaya mudah diganti saat pengujian.
 * @param {string} sistem @param {string} pengguna
 */
export async function panggilAiBawaan(sistem, pengguna) {
	const { groqChatCompletion } = await import('$lib/server/groq');
	const res = await groqChatCompletion({
		model: 'llama-3.1-8b-instant',
		messages: [
			{ role: 'system', content: sistem },
			{ role: 'user', content: pengguna }
		],
		temperature: 0.2,
		max_tokens: 700,
		jenis: 'pos-profil'
	});
	return res.choices?.[0]?.message?.content || '';
}

/**
 * Pemanggil AI yang menghormati kuota AI pengguna; kuota habis → galat → profil memakai aturan.
 * @param {number | string} userId
 * @returns {(sistem: string, pengguna: string) => Promise<string>}
 */
export function aiDenganKuota(userId) {
	return async (sistem, pengguna) => {
		const { cekKuotaAI } = await import('$lib/server/rateLimit');
		const kuota = await cekKuotaAI(userId);
		if (!kuota.allowed) throw new Error(kuota.pesan);
		return panggilAiBawaan(sistem, pengguna);
	};
}

/**
 * Susun profil kasir: aturan dulu (tanpa token). Bila ada uraian usaha dan pemanggil AI, AI menyempurnakan
 * (jumlah meja, stasiun dapur, isian khas). AI gagal → hasil aturan tetap dipakai.
 * @param {{ kategori?: string | null, nama?: string | null, deskripsi?: string | null }} usaha
 * @param {{ panggilAi?: ((sistem: string, pengguna: string) => Promise<string>) | null }} [opsi]
 * @returns {Promise<{ profil: string, pengaturan: import('$lib/posProfil').PengaturanPos, sumber: 'aturan' | 'ai' }>}
 */
export async function susunProfilPos(usaha, opsi = {}) {
	const uraian = String(usaha.deskripsi || '').trim();
	// Kategori isian bebas ("Kedai Kopi", bukan kode seperti FNB_RESTO) ikut dibaca sebagai teks
	const kategoriBebas = /[a-z\s]/.test(String(usaha.kategori || '')) ? String(usaha.kategori) : '';
	const tebakan = tebakProfil(usaha.kategori, `${usaha.nama || ''} ${uraian} ${kategoriBebas}`);
	if (uraian.length >= 8 && opsi.panggilAi) {
		try {
			const { bacaJsonAI } = await import('$lib/server/groq');
			const jawaban = await opsi.panggilAi(
				PROMPT_PROFIL_POS,
				`Nama usaha: ${String(usaha.nama || '-').slice(0, 100)}\nKategori: ${usaha.kategori || '-'}\nUraian: ${uraian.slice(0, 600)}`
			);
			const j = bacaJsonAI(jawaban);
			if (j && typeof j === 'object') return { ...pengaturanDariAi(j, tebakan), sumber: 'ai' };
		} catch (err) {
			log.pos.warn({ err }, 'Profil POS: AI gagal, pakai aturan');
		}
	}
	return { profil: tebakan, pengaturan: pengaturanBawaan(tebakan), sumber: 'aturan' };
}

/**
 * Dipanggil saat unit BARU dibuat (form, aplikasi HP, business plan). Tidak pernah menggagalkan pembuatan unit.
 * @param {any} db @param {number} unitId
 * @param {{ kategori?: string | null, nama?: string | null, deskripsi?: string | null }} usaha
 * @param {{ panggilAi?: ((sistem: string, pengguna: string) => Promise<string>) | null }} [opsi]
 */
export async function profilPosUnitBaru(db, unitId, usaha, opsi = {}) {
	try {
		const hasil = await susunProfilPos(usaha, opsi);
		return await simpanProfilPos(db, unitId, hasil);
	} catch (err) {
		log.pos.warn({ err, unitId }, 'Profil POS unit baru gagal dibuat');
		return null;
	}
}
