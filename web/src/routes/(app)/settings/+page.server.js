import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { users, unitBisnis } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import argon2 from 'argon2';
import { z } from 'zod';

export const load = async ({ cookies }) => {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Silakan login ulang');

	try {
		const userData = await db.query.users.findFirst({
			where: eq(users.id, userId),
			columns: {
				id: true,
				username: true,
				email: true,
				role: true,
				avatarUrl: true,
				createdAt: true,
				emailVerifiedAt: true
			}
		});

		const units = await db.query.unitBisnis.findMany({
			where: eq(unitBisnis.userId, userId),
			columns: {
				id: true,
				namaUnit: true,
				slug: true,
				kategori: true,
				alamat: true,
				telepon: true,
				modalAwal: true,
				loginSlug: true,
				isPortalActive: true
			}
		});

		return { profile: userData, units };
	} catch (err) {
		console.error('[Settings] Load error:', err);
		throw error(500, 'Gagal memuat pengaturan');
	}
};

function generateSlug(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)+/g, '');
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
	username: z.string().min(3, 'Username minimal 3 karakter').max(50).trim(),
	email: z.string().email('Format email tidak valid').max(100).toLowerCase().trim(),
	avatarUrl: z.string().url('URL avatar tidak valid').max(500).optional().or(z.literal(''))
});

const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, 'Password lama wajib diisi'),
	newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(255),
	confirmPassword: z.string()
}).refine((d) => d.newPassword === d.confirmPassword, {
	message: 'Password baru dan konfirmasi tidak cocok',
	path: ['confirmPassword']
});

const createUnitSchema = z.object({
	namaUnit: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(255).trim(),
	kategori: z.enum(['RETAIL', 'F&B', 'JASA', 'DISTRIBUTOR', 'ENTERPRISE']),
	alamat: z.string().max(500).optional(),
	telepon: z.string().max(20).optional(),
	modalAwal: z.coerce.number().min(0).default(0)
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions = {
	updateProfile: async ({ request, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const raw = {
			username: formData.get('username'),
			email: formData.get('email'),
			avatarUrl: formData.get('avatarUrl') || ''
		};

		const parsed = updateProfileSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.errors[0]?.message || 'Input tidak valid' });
		}

		const { username, email, avatarUrl } = parsed.data;

		try {
			// Cek email sudah dipakai user lain
			const existing = await db.select({ id: users.id })
				.from(users)
				.where(and(eq(users.email, email), sql`${users.id} != ${userId}`))
				.limit(1);
			if (existing.length > 0) {
				return fail(400, { message: 'Email sudah dipakai akun lain' });
			}

			await db.update(users)
				.set({ username, email, avatarUrl: avatarUrl || null })
				.where(eq(users.id, userId));

			return { success: true, message: 'Profil berhasil diperbarui' };
		} catch (err) {
			console.error('[Settings] updateProfile error:', err);
			return fail(500, { message: 'Gagal memperbarui profil' });
		}
	},

	changePassword: async ({ request, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const raw = {
			currentPassword: formData.get('currentPassword'),
			newPassword: formData.get('newPassword'),
			confirmPassword: formData.get('confirmPassword')
		};

		const parsed = changePasswordSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { passwordError: parsed.error.errors[0]?.message });
		}

		try {
			const rows = await db.select({ password: users.password })
				.from(users)
				.where(eq(users.id, userId))
				.limit(1);
			if (rows.length === 0) return fail(404, { passwordError: 'User tidak ditemukan' });

			const user = rows[0];
			if (!user.password) {
				return fail(400, { passwordError: 'Akun ini login via Google, tidak punya password lokal' });
			}

			const valid = await argon2.verify(user.password, parsed.data.currentPassword);
			if (!valid) {
				return fail(400, { passwordError: 'Password lama tidak cocok' });
			}

			const newHash = await argon2.hash(parsed.data.newPassword);
			await db.update(users).set({ password: newHash }).where(eq(users.id, userId));

			return { passwordSuccess: true, message: 'Password berhasil diubah' };
		} catch (err) {
			console.error('[Settings] changePassword error:', err);
			return fail(500, { passwordError: 'Terjadi kesalahan server' });
		}
	},

	createUnit: async ({ request, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const raw = {
			namaUnit: formData.get('namaUnit'),
			kategori: formData.get('kategori'),
			alamat: formData.get('alamat'),
			telepon: formData.get('telepon'),
			modalAwal: formData.get('modalAwal')
		};

		const parsed = createUnitSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.errors[0]?.message });
		}

		const { namaUnit, kategori, alamat, telepon, modalAwal } = parsed.data;
		const slug = generateSlug(namaUnit);

		try {
			let finalSlug = slug;
			const existing = await db.query.unitBisnis.findFirst({ where: eq(unitBisnis.slug, slug) });
			if (existing) {
				finalSlug = `${slug}-${Math.floor(Math.random() * 9000) + 1000}`;
			}

			await db.insert(unitBisnis).values({
				userId,
				namaUnit,
				slug: finalSlug,
				kategori,
				alamat: alamat || null,
				telepon: telepon || null,
				modalAwal: String(modalAwal),
				loginSlug: finalSlug,
				isPortalActive: 1
			});

			return { success: true, message: `Unit bisnis "${namaUnit}" berhasil dibuat` };
		} catch (err) {
			console.error('[Settings] createUnit error:', err);
			return fail(500, { message: 'Gagal membuat unit bisnis' });
		}
	},

	updateUnit: async ({ request, cookies }) => {
		const userId = await getCurrentUserId(cookies);
		if (!userId) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		if (!id) return fail(400, { message: 'ID unit tidak valid' });

		const raw = {
			namaUnit: formData.get('namaUnit'),
			kategori: formData.get('kategori'),
			alamat: formData.get('alamat'),
			telepon: formData.get('telepon'),
			modalAwal: formData.get('modalAwal')
		};

		const parsed = createUnitSchema.safeParse(raw);
		if (!parsed.success) {
			return fail(400, { message: parsed.error.errors[0]?.message });
		}

		try {
			const unit = await db.query.unitBisnis.findFirst({
				where: eq(unitBisnis.id, id),
				columns: { userId: true }
			});
			if (!unit || unit.userId !== userId) {
				return fail(403, { message: 'Akses ditolak' });
			}

			await db.update(unitBisnis)
				.set({
					namaUnit: parsed.data.namaUnit,
					kategori: parsed.data.kategori,
					alamat: parsed.data.alamat || null,
					telepon: parsed.data.telepon || null,
					modalAwal: String(parsed.data.modalAwal)
				})
				.where(eq(unitBisnis.id, id));

			return { success: true, message: 'Unit bisnis berhasil diperbarui' };
		} catch (err) {
			console.error('[Settings] updateUnit error:', err);
			return fail(500, { message: 'Gagal memperbarui unit bisnis' });
		}
	}
};
