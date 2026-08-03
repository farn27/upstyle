/**
 * Skema validasi Zod terpusat untuk semua input form & API.
 * Import dari sini agar konsisten di seluruh codebase.
 */
import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
	username: z
		.string({ required_error: 'Username / email wajib diisi' })
		.min(1, 'Username / email wajib diisi')
		.max(100, 'Terlalu panjang')
		.trim(),
	password: z
		.string({ required_error: 'Password wajib diisi' })
		.min(1, 'Password wajib diisi')
		.max(255, 'Password terlalu panjang')
});

export const registerSchema = z.object({
	username: z
		.string({ required_error: 'Username wajib diisi' })
		.min(3, 'Username minimal 3 karakter')
		.max(50, 'Username maksimal 50 karakter')
		.regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore')
		.trim(),
	email: z
		.string({ required_error: 'Email wajib diisi' })
		.email('Format email tidak valid')
		.max(100, 'Email terlalu panjang')
		.toLowerCase()
		.trim(),
	password: z
		.string({ required_error: 'Password wajib diisi' })
		.min(8, 'Password minimal 8 karakter')
		.max(255, 'Password terlalu panjang')
});

export const apiLoginSchema = z.object({
	email: z
		.string({ required_error: 'Email wajib diisi' })
		.email('Format email tidak valid')
		.max(100)
		.toLowerCase()
		.trim(),
	password: z
		.string({ required_error: 'Password wajib diisi' })
		.min(1, 'Password wajib diisi')
		.max(255)
});

export const apiRegisterSchema = z.object({
	username: z
		.string({ required_error: 'Username wajib diisi' })
		.min(3, 'Username minimal 3 karakter')
		.max(50)
		.regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore')
		.trim(),
	email: z
		.string({ required_error: 'Email wajib diisi' })
		.email('Format email tidak valid')
		.max(100)
		.toLowerCase()
		.trim(),
	password: z
		.string({ required_error: 'Password wajib diisi' })
		.min(8, 'Password minimal 8 karakter')
		.max(255)
});

export const staffLoginSchema = z.object({
	email: z
		.string({ required_error: 'Email wajib diisi' })
		.email('Format email tidak valid')
		.max(100)
		.toLowerCase()
		.trim(),
	password: z
		.string({ required_error: 'Password wajib diisi' })
		.min(1, 'Password wajib diisi')
		.max(255)
});

export const googleTokenSchema = z.object({
	googleToken: z.string({ required_error: 'Google token wajib diisi' }).min(10, 'Google token terlalu pendek')
});

// ─── Transaksi ─────────────────────────────────────────────────────────────

export const transaksiSchema = z.object({
	unit_id: z.coerce.number().int().positive(),
	kategori_trx: z.enum(['MASUK', 'KELUAR']),
	nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
	keterangan: z.string().max(500).optional(),
	metode_bayar: z.string().max(100).optional().default('KAS'),
	abc_category_id: z.coerce.number().int().positive().optional().nullable(),
	product_id: z.string().max(50).optional().nullable(),
	qty: z.coerce.number().int().positive().optional().default(1)
});

// ─── WA Webhook ────────────────────────────────────────────────────────────

export const waWebhookSchema = z.object({
	message: z.string({ required_error: 'message wajib diisi' }).min(1).max(1000),
	userId: z.coerce.number().int().positive('userId harus angka positif'),
	unitId: z.coerce.number().int().positive('unitId harus angka positif')
});

// ─── Helper: parse FormData ke object ──────────────────────────────────────

/**
 * Konversi FormData ke plain object untuk di-parse Zod
 * @param {FormData} formData
 * @returns {Record<string, unknown>}
 */
export function formDataToObject(formData) {
	/** @type {Record<string, unknown>} */
	const obj = {};
	for (const [key, value] of formData.entries()) {
		obj[key] = value;
	}
	return obj;
}
