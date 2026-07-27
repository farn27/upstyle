import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis, employees } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { createStaffSession, STAFF_SESSION_TTL_SECONDS } from '$lib/server/staffSession';
import { verifyEmployeePassword, hashEmployeePassword } from '$lib/server/employeePassword';
import { secureCookieOptions } from '$lib/server/cookieOptions';
import { checkRateLimit, getClientIP, PORTAL_LOGIN_LIMIT } from '$lib/server/rateLimit';
import { staffLoginSchema, formDataToObject } from '$lib/server/validation';

export async function load({ params }) {
	const { login_slug } = params;
	try {
		const rows = await db.select({
			id: unitBisnis.id,
			nama_unit: unitBisnis.namaUnit,
			alamat: unitBisnis.alamat,
			slug: unitBisnis.slug,
			login_slug: unitBisnis.loginSlug
		})
		.from(unitBisnis)
		.where(and(eq(unitBisnis.loginSlug, login_slug), eq(unitBisnis.isPortalActive, 1)));

		if (rows.length === 0) {
			throw error(404, 'Portal tidak ditemukan atau tidak aktif');
		}

		return { unit: rows[0] };
	} catch (err) {
		console.error('[Portal] Load error:', err);
		if (err.status) throw err;
		throw error(500, 'Gagal memuat portal');
	}
}

export const actions = {
	login: async ({ request, params, cookies }) => {
		const ip = getClientIP(request);

		// Rate limit per IP
		const rlIP = await checkRateLimit({
			key: `${ip}:${params.login_slug}`,
			prefix: 'rl:portal:login:ip',
			...PORTAL_LOGIN_LIMIT
		});
		if (!rlIP.allowed) {
			return fail(429, {
				message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(rlIP.retryAfter / 60)} menit.`
			});
		}

		const data = await request.formData();
		const raw = formDataToObject(data);

		// Validasi input dengan Zod
		const parsed = staffLoginSchema.safeParse(raw);
		if (!parsed.success) {
			const firstError = parsed.error.errors[0]?.message || 'Input tidak valid';
			return fail(400, { message: firstError });
		}

		const { email, password } = parsed.data;

		// Rate limit per email
		const rlEmail = await checkRateLimit({
			key: `${email}:${params.login_slug}`,
			prefix: 'rl:portal:login:email',
			...PORTAL_LOGIN_LIMIT
		});
		if (!rlEmail.allowed) {
			return fail(429, {
				message: 'Akun ini sementara dikunci. Coba lagi nanti.'
			});
		}

		let isSuccess = false;
		let redirectTarget = '';

		try {
			const unit = await db.select({ id: unitBisnis.id, user_id: unitBisnis.userId })
				.from(unitBisnis)
				.where(and(eq(unitBisnis.loginSlug, params.login_slug), eq(unitBisnis.isPortalActive, 1)))
				.limit(1);

			if (unit.length === 0) {
				return fail(404, { message: 'Portal tidak valid atau belum aktif' });
			}

			const targetUnitId = unit[0].id;

			const karyawan = await db.select({
				id: employees.id,
				full_name: employees.fullName,
				role: employees.role,
				user_id: employees.userId,
				password: employees.password
			})
			.from(employees)
			.where(and(
				eq(employees.email, email),
				eq(employees.companyId, targetUnitId),
				eq(employees.status, 'active'),
				eq(employees.userId, unit[0].user_id)
			))
			.limit(1);

			// Pesan error sama untuk user tidak ada & password salah
			if (karyawan.length === 0) {
				return fail(401, { message: 'Email atau password salah' });
			}

			const { valid, needsRehash } = await verifyEmployeePassword(karyawan[0].password, password);
			if (!valid) {
				return fail(401, { message: 'Email atau password salah' });
			}

			if (needsRehash) {
				const newHash = await hashEmployeePassword(String(password));
				await db.update(employees)
					.set({ password: newHash })
					.where(eq(employees.id, karyawan[0].id));
			}

			const staffPayload = {
				id: karyawan[0].id,
				full_name: karyawan[0].full_name,
				role: karyawan[0].role,
				unit_id: targetUnitId,
				owner_id: unit[0].user_id,
				login_slug: params.login_slug
			};

			const token = await createStaffSession(staffPayload);
			const cookieOpts = secureCookieOptions(STAFF_SESSION_TTL_SECONDS);

			// Hapus cookie JSON lama jika ada (security cleanup)
			cookies.delete('staff_session', { path: '/' });
			// Hanya simpan token reference, bukan payload JSON
			cookies.set('staff_session_token', token, cookieOpts);

			isSuccess = true;
			redirectTarget = `/portal/${params.login_slug}/dashboard`;
		} catch (err) {
			console.error('[Portal Login] Error:', err);
			return fail(500, { message: 'Terjadi kesalahan sistem' });
		}

		if (isSuccess) {
			throw redirect(303, redirectTarget);
		}
	}
};
