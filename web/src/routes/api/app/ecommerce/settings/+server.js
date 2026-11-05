import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { ambilPengaturanToko, simpanPengaturanToko, TokoError } from '$lib/server/tokoOnline';

// Pengaturan toko online — sama dengan halaman web ecommerce/[slug] (updateSettings).

/** GET ?unitId=X → { storefrontName, description, logoUrl, domainSlug, isActive, payment } */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	try {
		return json({ success: true, data: await ambilPengaturanToko(db, unitId) });
	} catch (err) {
		if (err instanceof TokoError) return json({ success: false, message: err.message }, { status: err.status });
		log.api.error({ err }, 'GET ecommerce/settings');
		return json({ success: false, message: 'Gagal memuat pengaturan toko' }, { status: 500 });
	}
}

/** PUT { unitId, storefrontName?, description?, domainSlug?, isActive? } */
export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
		const { unitId: _u, ...isi } = body;
		const data = await simpanPengaturanToko(db, unitId, isi);
		return json({ success: true, message: 'Pengaturan toko berhasil diperbarui', data });
	} catch (err) {
		if (err instanceof TokoError) return json({ success: false, message: err.message }, { status: err.status });
		log.api.error({ err }, 'PUT ecommerce/settings');
		return json({ success: false, message: 'Gagal memperbarui pengaturan toko' }, { status: 500 });
	}
}
