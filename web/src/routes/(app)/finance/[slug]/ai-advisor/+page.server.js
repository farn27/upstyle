import { error } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';

export async function load({ params, cookies }) {
	const userId = await getCurrentUserId(cookies);
	if (!userId) throw error(401, 'Login diperlukan');

	const rows = await db.select({
		id: unitBisnis.id,
		nama_unit: unitBisnis.namaUnit,
		kategori: unitBisnis.kategori
	})
	.from(unitBisnis)
	.where(and(eq(unitBisnis.slug, params.slug), eq(unitBisnis.userId, userId)))
	.limit(1);

	if (!rows.length) throw error(404, 'Unit tidak ditemukan');

	return { unit: rows[0] };
}
