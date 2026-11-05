import { error } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { idAngka, konteksHalaman } from '$lib/server/pengadaanAksi';
import { detailPO } from '$lib/server/pengadaan';

export async function load(event) {
	const { unit } = await konteksHalaman(event);
	const detail = await detailPO(db, unit.id, idAngka(event.params.id));
	if (!detail) throw error(404, 'Purchase Order tidak ditemukan');
	return { unit, ...JSON.parse(JSON.stringify(detail)) };
}
