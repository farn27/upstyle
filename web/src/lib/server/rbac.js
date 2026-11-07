/**
 * Hak akses halaman berdasarkan users.role (dipakai hooks.server.js).
 * Catatan: users.role juga menyimpan paket langganan akun owner (free / pro / enterprise).
 */
export const rolePermissions = {
	CASHIER: [],
	STAFF: [],
	MANAGER: ['.*'],
	ADMIN: ['.*'],
	OWNER: ['.*'],
	USER: ['.*'],
	// Role akun owner juga menyimpan paket langganan (free/pro/enterprise).
	// Dulu PRO & ENTERPRISE tidak terdaftar → jatuh ke STAFF → pelanggan berbayar kena 403 di semua halaman.
	FREE: ['.*'],
	PRO: ['.*'],
	ENTERPRISE: ['.*']
};

/**
 * @param {string | null | undefined} role
 * @param {string} pathname
 * @returns {boolean}
 */
export function peranDiizinkan(role, pathname) {
	const kunci = String(role || 'STAFF').toUpperCase();
	const pola = rolePermissions[/** @type {keyof typeof rolePermissions} */ (kunci)] || rolePermissions.STAFF;
	return pola.some((p) => new RegExp(p).test(pathname));
}
