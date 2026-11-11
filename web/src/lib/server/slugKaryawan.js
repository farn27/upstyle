import { eq } from 'drizzle-orm';
import { employees } from '$lib/server/schema';

/**
 * Slug karyawan unik (kolom employees.slug punya unique key). Sebelumnya `nama-NNNN` acak 4 digit tanpa cek,
 * sehingga tabrakan sesekali membuat "Tambah karyawan" gagal 500.
 * @param {any} db
 * @param {string} nama
 */
export async function slugKaryawanUnik(db, nama) {
	const dasar = String(nama || '').toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'karyawan';
	for (let i = 0; i < 8; i++) {
		const slug = `${dasar}-${Math.floor(1000 + Math.random() * 9000)}`;
		const ada = await db.select({ id: employees.id }).from(employees).where(eq(employees.slug, slug)).limit(1);
		if (!ada.length) return slug;
	}
	return `${dasar}-${Date.now().toString(36)}`;
}
