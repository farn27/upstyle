import { db } from '$lib/server/drizzle';
import { unitBisnis, kategoriProduk } from '$lib/server/schema';
import { resolvePosUnitAccess } from '$lib/server/posAuth';
import { eq } from 'drizzle-orm';
import { fail, error } from '@sveltejs/kit';
import { getActivePosFeatures, POS_FEATURE_DEFAULTS } from '$lib/posFeatures';
import { log } from '$lib/server/logger';
import { ambilProfilPos, simpanProfilPos, hapusProfilPos, susunProfilPos, aiDenganKuota } from '$lib/server/posProfil';
import { PROFIL_POS } from '$lib/posProfil';
import { getCurrentUserId } from '$lib/server/getUser';
import { peranManajer } from '$lib/server/unitSlugGuard';

/** Hanya pemilik atau staf berperan pemilik/manajer/admin yang boleh mengubah pengaturan kasir */
async function aksesKelola(/** @type {any} */ cookies, /** @type {any} */ params, /** @type {any} */ locals) {
	const akses = await resolvePosUnitAccess(cookies, params, locals);
	if (!akses.isOwner && !(akses.isStaff && peranManajer(akses.staffSession?.role))) throw error(403, 'Hanya pemilik atau manajer yang boleh mengubah pengaturan kasir');
	return akses;
}

/** @param {unknown} v */
const obj = (v) => {
	if (!v) return null;
	if (typeof v === 'string') {
		try {
			return JSON.parse(v);
		} catch {
			return null;
		}
	}
	return v;
};

export async function load({ params, cookies, locals }) {
	const { unit } = await aksesKelola(cookies, params, locals);
	const override = obj(unit.posFeatureOverride);
	const kategori = await db.select({ nama: kategoriProduk.namaKategori }).from(kategoriProduk).where(eq(kategoriProduk.unitId, unit.id));
	return {
		unit: { id: unit.id, nama: unit.nama_unit, slug: unit.slug },
		category: unit.kategori || 'UMUM',
		activeFeatures: getActivePosFeatures(unit.kategori, override),
		defaultFeatures: POS_FEATURE_DEFAULTS[unit.kategori || 'UMUM'] || getActivePosFeatures(unit.kategori, null),
		overrideObj: override || {},
		profilPos: await ambilProfilPos(db, Number(unit.id)),
		kategoriProduk: [...new Set(kategori.map((k) => String(k.nama || '').toUpperCase()).filter(Boolean))]
	};
}

export const actions = {
	updateFeatures: async ({ request, params, cookies, locals }) => {
		const { unit } = await aksesKelola(cookies, params, locals);
		const form = await request.formData();
		/** @type {Record<string, boolean>} */
		const newOverrides = {};
		for (const key of Object.keys(POS_FEATURE_DEFAULTS['UMUM'])) newOverrides[key] = form.get(key) === 'true';
		try {
			await db.update(unitBisnis).set({ posFeatureOverride: newOverrides }).where(eq(unitBisnis.id, unit.id));
			return { success: true, pesan: 'Fitur kasir disimpan' };
		} catch (err) {
			log.pos.error({ err }, 'POS Feature override error');
			return fail(500, { error: 'Gagal menyimpan pengaturan fitur' });
		}
	},
	resetDefaults: async ({ params, cookies, locals }) => {
		const { unit } = await aksesKelola(cookies, params, locals);
		try {
			await db.update(unitBisnis).set({ posFeatureOverride: null }).where(eq(unitBisnis.id, unit.id));
			return { success: true, pesan: 'Fitur kembali ke bawaan kategori' };
		} catch (err) {
			log.pos.error({ err }, 'POS Feature reset error');
			return fail(500, { error: 'Gagal me-reset pengaturan fitur' });
		}
	},
	/** Simpan profil + pengaturan dari editor (JSON) */
	simpanProfil: async ({ request, params, cookies, locals }) => {
		const { unit } = await aksesKelola(cookies, params, locals);
		const form = await request.formData();
		const profil = String(form.get('profil') || '');
		if (!PROFIL_POS[profil]) return fail(400, { error: 'Profil tidak dikenal' });
		const pengaturan = obj(String(form.get('pengaturan') || ''));
		if (!pengaturan) return fail(400, { error: 'Pengaturan tidak valid' });
		try {
			const hasil = await simpanProfilPos(db, Number(unit.id), { profil, pengaturan, sumber: 'manual' });
			return { success: true, pesan: `Kasir ${PROFIL_POS[hasil.profil].label} disimpan`, profilPos: hasil };
		} catch (err) {
			log.pos.error({ err }, 'Simpan profil POS gagal');
			return fail(500, { error: 'Gagal menyimpan pengaturan kasir' });
		}
	},
	/** Susun ulang kasir dari uraian usaha (AI, dengan cadangan aturan). Hasil BELUM disimpan — ditinjau dulu di editor. */
	susunAi: async ({ request, params, cookies, locals }) => {
		const { unit } = await aksesKelola(cookies, params, locals);
		const form = await request.formData();
		const deskripsi = String(form.get('deskripsi') || '').trim().slice(0, 600);
		if (deskripsi.length < 8) return fail(400, { error: 'Ceritakan usahamu minimal satu kalimat' });
		const userId = locals.user?.id ?? (await getCurrentUserId(cookies)) ?? unit.user_id;
		const hasil = await susunProfilPos({ kategori: unit.kategori, nama: unit.nama_unit, deskripsi }, { panggilAi: aiDenganKuota(userId) });
		return {
			success: true,
			usulan: hasil,
			pesan: hasil.sumber === 'ai' ? 'Usulan AI siap — tinjau lalu simpan' : 'AI sedang tidak tersedia; usulan disusun dari jenis usaha. Tinjau lalu simpan.'
		};
	},
	/** Kembali ke kasir standar (profil dihapus; fitur tetap seperti terakhir) */
	hapusProfil: async ({ params, cookies, locals }) => {
		const { unit } = await aksesKelola(cookies, params, locals);
		await hapusProfilPos(db, Number(unit.id));
		return { success: true, pesan: 'Kasir kembali ke mode standar', profilPos: null };
	}
};

