import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { employees, unitBisnis } from '$lib/server/schema';
import { eq, and, or } from 'drizzle-orm';
export function getStaffSession(cookies) {
	// Legacy JSON cookie reader — dipertahankan hanya untuk backward compat sementara
	const raw = cookies.get('staff_session');
	if (!raw) return null;
	try {
		const session = JSON.parse(raw);
		if (session && typeof session === 'object') {
			if (session.role) session.role = normalizeRole(session.role);
			if (session.division) session.division = normalizeRole(session.division);
		}
		return session;
	} catch (e) {
		return null;
	}
}

export function normalizeRole(value) {
	return String(value || '').toLowerCase().trim();
}

export function detectRoleCategory(value) {
	const role = normalizeRole(value);
	if (!role) return 'employee';

	if (/(cashier|kasir|teller|pos|point of sale)/.test(role)) return 'cashier';
	if (/(operator|operasi|operasional)/.test(role)) return 'operator';
	if (/(production|produksi|pabrik|manufaktur)/.test(role)) return 'production';
	if (/(warehouse|logistik|gudang|inventori|stock)/.test(role)) return 'warehouse';
	if (/(service|layanan|dukungan|support|customer service|pelayanan pelanggan)/.test(role)) return 'service';
	if (/(resepsionis|receptionist|front office|frontdesk)/.test(role)) return 'frontoffice';
	if (/(back office|administrasi|admin office|clerk)/.test(role)) return 'backoffice';
	if (/(teknisi|technician|support it|engineering|it support)/.test(role)) return 'technical';
	if (/(maintenance|pemeliharaan|perawatan)/.test(role)) return 'maintenance';
	if (/(quality|quality control|qc|qa|safety|k3)/.test(role)) return 'quality';
	if (/(sopir|driver|kurir|delivery)/.test(role)) return 'driver';
	if (/(purchasing|pengadaan|procurement|buyer)/.test(role)) return 'procurement';
	if (/(finance|keuangan|account|akuntansi|billing|pembukuan|audit)/.test(role)) return 'finance';
	if (/(admin|administrator|sysadmin|system administrator|super admin)/.test(role)) return 'admin';
	if (/(manager|manajer|lead|supervisor|kepala|head|boss|kepala cabang)/.test(role)) return 'manager';
	if (/(hr|human resources|sdm|people|talenta|recruiter)/.test(role)) return 'hr';
	if (/(owner|pemilik|founder)/.test(role)) return 'owner';
	if (/(marketing|pemasaran|digital marketing|brand|content|community|event)/.test(role)) return 'marketing';
	if (/(sales|penjualan|business development|bd|growth|e-commerce|ecommerce|online shop)/.test(role)) return 'sales';

	return 'employee';
}

export async function getVerifiedStaffSession(cookies, options = {}) {
	// Gunakan server-side token (lebih aman, tidak ada data di cookie)
	const token = cookies.get('staff_session_token');
	let session = null;

	if (token) {
		try {
			const { getStaffSession: getRedisSession, deleteStaffSession } = await import(
				'$lib/server/staffSession'
			);
			session = await getRedisSession(token);
			if (!session) {
				// Token tidak valid/expired, bersihkan semua cookie
				await deleteStaffSession(token).catch(() => {});
				cookies.delete('staff_session_token', { path: '/' });
				cookies.delete('staff_session', { path: '/' }); // hapus legacy jika ada
			}
		} catch (err) {
			console.warn('[PortalAuth] Failed to resolve staff token session:', err.message);
			session = null;
		}
	}

	// TIDAK ada fallback ke JSON cookie — terlalu berisiko membiarkan data sensitif di cookie
	// Jika token tidak ada atau tidak valid, return null
	if (!session || typeof session !== 'object') return null;

	const staffId = Number(session.id || session.staff_id || session.employee_id);
	const unitId = Number(session.unit_id || session.company_id);
	const ownerId = Number(session.owner_id || session.user_id);
	if (!staffId || !unitId || !ownerId) return null;

	const conditions = [
		eq(employees.id, staffId),
		eq(employees.companyId, unitId),
		eq(employees.userId, ownerId),
		eq(employees.status, 'active')
	];

	if (options.unitSlug) {
		conditions.push(
			or(
				eq(unitBisnis.slug, options.unitSlug),
				eq(unitBisnis.loginSlug, options.unitSlug)
			)
		);
	}

	if (options.loginSlug) {
		conditions.push(
			and(
				eq(unitBisnis.loginSlug, options.loginSlug),
				eq(unitBisnis.isPortalActive, 1)
			)
		);
	}

	const rows = await db
		.select({
			staff_id: employees.id,
			full_name: employees.fullName,
			role: employees.role,
			unit_id: employees.companyId,
			owner_id: employees.userId,
			unit_slug: unitBisnis.slug,
			login_slug: unitBisnis.loginSlug,
			is_portal_active: unitBisnis.isPortalActive
		})
		.from(employees)
		.innerJoin(unitBisnis, eq(employees.companyId, unitBisnis.id))
		.where(and(...conditions))
		.limit(1);

	if (!rows || rows.length === 0) return null;

	const row = rows[0];
	return {
		id: Number(row.staff_id),
		full_name: row.full_name,
		role: normalizeRole(row.role),
		unit_id: Number(row.unit_id),
		owner_id: Number(row.owner_id),
		login_slug: row.login_slug,
		unit_slug: row.unit_slug,
		is_portal_active: row.is_portal_active === 1
	};
}

export async function requireVerifiedStaffSession(cookies, paramsLoginSlug) {
	const session = await getVerifiedStaffSession(cookies, { loginSlug: paramsLoginSlug });
	if (!session) throw redirect(302, `/portal/${paramsLoginSlug}`);
	return session;
}

export function requireRole(session, allowedRoles = []) {
	if (!session) return false;
	const role = normalizeRole(session.role);
	return allowedRoles.map((r) => normalizeRole(r)).includes(role);
}

export function requireCategory(session, allowedCategories = []) {
	if (!session) return false;
	const category = detectRoleCategory(session.role || session.division);
	return allowedCategories.map((c) => normalizeRole(c)).includes(category);
}
