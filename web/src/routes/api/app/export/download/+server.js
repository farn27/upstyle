import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';
import { verifyState } from '$lib/server/crypto';
import { log } from '$lib/server/logger';
import { buatFileEkspor, ImporEksporError } from '$lib/server/imporEkspor';

/**
 * GET /api/app/export/download?token=…  — token dari POST /api/app/export (berlaku 10 menit).
 * Token terenkripsi (AES-GCM) jadi tidak bisa dipalsukan; unit dicek ulang masih milik user.
 */
export async function GET({ url }) {
	const isi = verifyState(url.searchParams.get('token') || '');
	if (!isi || typeof isi.x !== 'number' || Date.now() > isi.x) {
		return new Response('Link unduhan tidak valid atau sudah kedaluwarsa. Buat export baru dari aplikasi.', { status: 410 });
	}
	try {
		const unit = await db.query.unitBisnis.findFirst({
			where: and(eq(unitBisnis.id, Number(isi.n)), eq(unitBisnis.userId, Number(isi.u))),
			columns: { namaUnit: true }
		});
		if (!unit) return new Response('Unit tidak ditemukan', { status: 404 });
		const file = await buatFileEkspor(db, { unitId: Number(isi.n), unitName: unit.namaUnit, dataType: isi.t, format: isi.f, startDate: isi.s, endDate: isi.e });
		return new Response(new Uint8Array(file.buffer), {
			headers: {
				'Content-Type': file.contentType,
				'Content-Disposition': `attachment; filename="${file.fileName}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		if (err instanceof ImporEksporError) return new Response(err.message, { status: err.status });
		log.api.error({ err }, 'GET app/export/download');
		return new Response('Gagal membuat file', { status: 500 });
	}
}
