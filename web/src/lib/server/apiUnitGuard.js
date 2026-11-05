/**
 * Guard terpusat untuk API mobile (/api/app/*):
 * setiap unitId yang dikirim (query string atau body JSON) HARUS milik user yang login.
 *
 * Tanpa ini, user mana pun bisa membaca / mengubah data unit orang lain
 * cukup dengan mengganti unitId.
 *
 * Endpoint yang hanya menerima ID resource (mis. /crm/contacts/[contactId]) tetap
 * wajib mengecek sendiri bahwa resource itu milik unit si user.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { unitBisnis, employees, products, productVariants } from '$lib/server/schema';

const NAMA_FIELD = new Set(['unitId', 'unit_id']);

/** @param {unknown} nilai */
function keAngka(nilai) {
	if (nilai === null || nilai === undefined || nilai === '') return null;
	const n = Number(nilai);
	return Number.isFinite(n) ? n : NaN;
}

/**
 * Kumpulkan semua unitId dari body JSON: level atas + satu level objek di dalamnya
 * (mis. { transaction: { unitId } }, { asset: { unitId } }) + isi array level atas.
 * @param {unknown} body
 * @returns {number[]}
 */
export function unitIdDariBody(body) {
	/** @type {number[]} */
	const hasil = [];
	/** @param {unknown} obj @param {number} kedalaman */
	const telusuri = (obj, kedalaman) => {
		if (!obj || typeof obj !== 'object') return;
		if (Array.isArray(obj)) {
			if (kedalaman <= 1) obj.forEach((x) => telusuri(x, kedalaman + 1));
			return;
		}
		for (const [kunci, nilai] of Object.entries(obj)) {
			if (NAMA_FIELD.has(kunci)) {
				const n = keAngka(nilai);
				if (n !== null) hasil.push(n);
			} else if (kedalaman < 1 && nilai && typeof nilai === 'object') {
				telusuri(nilai, kedalaman + 1);
			}
		}
	};
	telusuri(body, 0);
	return hasil;
}

/**
 * @param {URL} url
 * @param {Request} request
 * @returns {Promise<number[]>}
 */
export async function kumpulkanUnitId(url, request) {
	/** @type {number[]} */
	const ids = [];
	for (const kunci of NAMA_FIELD) {
		for (const v of url.searchParams.getAll(kunci)) {
			const n = keAngka(v);
			if (n !== null) ids.push(n);
		}
	}
	const jenis = request.headers.get('content-type') || '';
	if (request.method !== 'GET' && request.method !== 'HEAD' && jenis.includes('application/json')) {
		try {
			ids.push(...unitIdDariBody(await request.clone().json()));
		} catch {
			// body bukan JSON valid → biar endpoint yang membalas 400/422
		}
	}
	return ids;
}

/**
 * @param {any} db
 * @param {number} userId
 * @param {number[]} unitIds
 * @returns {Promise<boolean>} true kalau SEMUA unitId milik user
 */
export async function semuaUnitMilikUser(db, userId, unitIds) {
	const unik = [...new Set(unitIds)];
	if (unik.length === 0) return true;
	if (unik.some((n) => !Number.isInteger(n) || n <= 0)) return false;
	const milik = await db
		.select({ id: unitBisnis.id })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.userId, userId), inArray(unitBisnis.id, unik)));
	return milik.length === unik.length;
}

/**
 * Dipanggil dari hooks.server.js untuk setiap request /api/app/*.
 * @param {any} db
 * @param {{ url: URL, request: Request }} event
 * @param {number | null | undefined} userId
 * @returns {Promise<Response | null>} Response 404 kalau ditolak, null kalau boleh lanjut
 */
export async function guardUnitApiApp(db, event, userId) {
	if (!event.url.pathname.startsWith('/api/app/')) return null;
	if (!userId) return null; // tanpa login → endpoint sendiri membalas 401
	const ids = await kumpulkanUnitId(event.url, event.request);
	if (await semuaUnitMilikUser(db, userId, ids)) return null;
	return new Response(JSON.stringify({ success: false, message: 'Unit tidak ditemukan', code: 'UNIT_NOT_FOUND' }), {
		status: 404,
		headers: { 'Content-Type': 'application/json' }
	});
}

/**
 * Cek satu unit milik user. Dipakai endpoint yang menerima ID resource (bukan unitId):
 *   const row = await db.query.x.findFirst({ where: eq(x.id, id) });
 *   if (!row || !(await unitMilikUser(db, userId, row.unitId))) return 404;
 * @param {any} db
 * @param {number} userId
 * @param {unknown} unitId
 */
export async function unitMilikUser(db, userId, unitId) {
	const n = Number(unitId);
	if (!userId || !Number.isInteger(n) || n <= 0) return false;
	return semuaUnitMilikUser(db, userId, [n]);
}

/**
 * Karyawan milik salah satu unit user (employees.companyId = unit). null kalau bukan.
 * @param {any} db
 * @param {number} userId
 * @param {unknown} employeeId
 */
export async function karyawanMilikUser(db, userId, employeeId) {
	const id = Number(employeeId);
	if (!Number.isInteger(id) || id <= 0) return null;
	const emp = await db.query.employees.findFirst({ where: eq(employees.id, id) });
	if (!emp || !(await unitMilikUser(db, userId, emp.companyId))) return null;
	return emp;
}

/**
 * Produk milik salah satu unit user. null kalau bukan.
 * @param {any} db @param {number} userId @param {unknown} productId
 */
export async function produkMilikUser(db, userId, productId) {
	if (productId === null || productId === undefined || productId === '') return null;
	const prod = await db.query.products.findFirst({ where: eq(products.id, String(productId)) });
	if (!prod || !(await unitMilikUser(db, userId, prod.unitId))) return null;
	return prod;
}

/**
 * Varian produk milik salah satu unit user. null kalau bukan.
 * @param {any} db @param {number} userId @param {unknown} variantId
 */
export async function varianMilikUser(db, userId, variantId) {
	if (variantId === null || variantId === undefined || variantId === '') return null;
	const varian = await db.query.productVariants.findFirst({ where: eq(productVariants.id, String(variantId)) });
	if (!varian || !(await produkMilikUser(db, userId, varian.productId))) return null;
	return varian;
}
