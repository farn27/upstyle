/**
 * Pengaturan toko online & metode bayar — SATU logika untuk halaman web
 * (ecommerce/[slug], ecommerce/[slug]/integrasi) dan API mobile (/api/app/ecommerce/*).
 *
 * Server key Midtrans TIDAK disimpan maupun dikirim balik (sama seperti web: hanya tanda '***').
 * Checkout toko saat ini memakai key Midtrans platform (env MIDTRANS_SERVER_KEY).
 */
import { domainSlugUnik } from '$lib/server/unitBaru';
import { z } from 'zod';
import { and, eq, ne } from 'drizzle-orm';
import { ecommerceSettings, unitBisnis } from '$lib/server/schema';

export class TokoError extends Error {
	/** @param {string} message @param {number} [status] */
	constructor(message, status = 422) {
		super(message);
		this.name = 'TokoError';
		this.status = status;
	}
}

/** @param {unknown} v */
const keObjek = (v) => {
	if (!v) return {};
	if (typeof v === 'string') { try { return JSON.parse(v) || {}; } catch { return {}; } }
	return /** @type {Record<string, any>} */ (v);
};

/** Bentuk aman untuk dikirim ke klien — tanpa server key */
export function konfigurasiBayarAman(/** @type {unknown} */ paymentConfigJson) {
	const m = keObjek(paymentConfigJson).midtrans || {};
	return {
		midtrans: {
			clientKey: m.clientKey || '',
			sandbox: Boolean(m.sandbox),
			configured: Boolean(m.configured),
			serverKeySet: Boolean(m.serverKey)
		}
	};
}

/** Ambil pengaturan; buat bawaan kalau belum ada (sama seperti halaman toko di web) */
export async function ambilPengaturanToko(/** @type {any} */ db, /** @type {number} */ unitId) {
	let s = await db.query.ecommerceSettings.findFirst({ where: eq(ecommerceSettings.unitId, unitId) });
	if (!s) {
		const unit = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.id, unitId) });
		if (!unit) throw new TokoError('Unit tidak ditemukan', 404);
		await db.insert(ecommerceSettings).values({ unitId, storefrontName: `${unit.namaUnit} Store`, domainSlug: await domainSlugUnik(db, unit.slug || unit.namaUnit, 'toko'), isActive: false });
		s = await db.query.ecommerceSettings.findFirst({ where: eq(ecommerceSettings.unitId, unitId) });
	}
	return {
		unitId,
		storefrontName: s.storefrontName,
		description: s.description || '',
		logoUrl: s.logoUrl || '',
		domainSlug: s.domainSlug,
		isActive: Boolean(s.isActive),
		payment: konfigurasiBayarAman(s.paymentConfigJson)
	};
}

const tokoSchema = z.object({
	storefrontName: z.string().trim().min(1, 'Nama toko wajib diisi').max(150).optional(),
	description: z.string().max(5000).nullable().optional(),
	domainSlug: z.string().trim().toLowerCase()
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Alamat toko hanya huruf kecil, angka, dan tanda "-"')
		.min(3, 'Alamat toko minimal 3 karakter').max(100).optional(),
	isActive: z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean().optional())
});

/**
 * @param {any} db @param {number} unitId @param {Record<string, unknown>} input
 */
export async function simpanPengaturanToko(db, unitId, input) {
	const hasil = tokoSchema.safeParse(input);
	if (!hasil.success) throw new TokoError(hasil.error.issues[0]?.message || 'Input tidak valid');
	await ambilPengaturanToko(db, unitId); // pastikan barisnya ada (dulu update diam-diam tidak menyimpan apa pun)
	/** @type {Record<string, any>} */
	const ubah = {};
	for (const [k, v] of Object.entries(hasil.data)) if (v !== undefined) ubah[k] = v;
	if (ubah.domainSlug) {
		const dipakai = await db.query.ecommerceSettings.findFirst({
			where: and(eq(ecommerceSettings.domainSlug, ubah.domainSlug), ne(ecommerceSettings.unitId, unitId)),
			columns: { id: true }
		});
		if (dipakai) throw new TokoError('Alamat toko sudah dipakai toko lain', 409);
	}
	if (Object.keys(ubah).length > 0) {
		await db.update(ecommerceSettings).set(ubah).where(eq(ecommerceSettings.unitId, unitId));
	}
	return ambilPengaturanToko(db, unitId);
}

/**
 * Simpan konfigurasi Midtrans unit. Server key hanya ditandai ada/tidak ('***'), tidak disimpan.
 * @param {any} db @param {number} unitId
 * @param {{ clientKey?: string, serverKey?: string, sandbox?: boolean }} input
 */
export async function simpanKonfigurasiBayar(db, unitId, input) {
	await ambilPengaturanToko(db, unitId);
	const clientKey = String(input.clientKey || '').trim();
	const serverKey = String(input.serverKey || '').trim();
	const config = {
		midtrans: {
			clientKey,
			serverKey: serverKey ? '***' : '',
			sandbox: Boolean(input.sandbox),
			configured: Boolean(clientKey && serverKey)
		}
	};
	await db.update(ecommerceSettings).set({ paymentConfigJson: config }).where(eq(ecommerceSettings.unitId, unitId));
	return konfigurasiBayarAman(config);
}
