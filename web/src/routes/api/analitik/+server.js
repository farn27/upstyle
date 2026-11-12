/**
 * GET /api/analitik?unit=<slug>  (web, cookie)  atau  ?unitId=<id>  (Android, Bearer)
 * Analisis Cerdas dasbor: peramalan, anomali, pola, produk, skor kesehatan, rekomendasi.
 * Dihitung dengan statistik di server — tidak memanggil model AI, tidak memakai kuota/token.
 */
import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { unitBisnis } from '$lib/server/schema';
import { analisisUnit } from '$lib/server/analitik';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Sesi tidak valid' }, { status: 401 });

	const slug = url.searchParams.get('unit');
	const id = Number(url.searchParams.get('unitId'));
	if (!slug && !(id > 0)) return json({ success: false, message: 'Parameter unit wajib diisi' }, { status: 400 });

	const [unit] = await db
		.select({ id: unitBisnis.id, nama_unit: unitBisnis.namaUnit, slug: unitBisnis.slug, modal_awal: unitBisnis.modalAwal })
		.from(unitBisnis)
		.where(and(eq(unitBisnis.userId, userId), slug ? eq(unitBisnis.slug, slug) : eq(unitBisnis.id, id)))
		.limit(1);
	if (!unit) return json({ success: false, message: 'Unit tidak ditemukan' }, { status: 404 });

	try {
		const mulai = Date.now();
		const data = await analisisUnit(unit, { pakaiCache: url.searchParams.get('segar') !== '1' });
		log.api.info({ unitId: unit.id, ms: Date.now() - mulai, cache: data.dariCache }, '[Analitik] selesai');
		return json({ success: true, data }, { headers: { 'cache-control': 'private, max-age=60' } });
	} catch (err) {
		log.api.error({ err }, '[Analitik] gagal');
		return json({ success: false, message: 'Analisis gagal dihitung. Coba lagi.' }, { status: 500 });
	}
}
