import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import { aturProdukPos, daftarProdukPos } from '$lib/server/posKelola';

// Produk yang tampil di kasir — sama dengan halaman web pos/kelola/produk.

/** GET ?unitId=X → [{ id, nama, sku, hargaJual, stok, showInPos }] */
export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const unitId = Number(url.searchParams.get('unitId'));
	if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });
	try {
		return json({ success: true, data: await daftarProdukPos(db, unitId) });
	} catch (err) {
		log.api.error({ err }, 'GET pos/products');
		return json({ success: false, message: 'Gagal memuat produk POS' }, { status: 500 });
	}
}

/** PUT { unitId, productId, showInPos: true|false } */
export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	try {
		const body = await request.json();
		const unitId = Number(body?.unitId);
		if (!unitId || !body?.productId || typeof body?.showInPos !== 'boolean') {
			return json({ success: false, message: 'unitId, productId, dan showInPos (true/false) wajib diisi' }, { status: 400 });
		}
		const ok = await aturProdukPos(db, unitId, body.productId, body.showInPos);
		if (!ok) return json({ success: false, message: 'Produk tidak ditemukan' }, { status: 404 });
		return json({ success: true, message: body.showInPos ? 'Produk ditampilkan di kasir' : 'Produk disembunyikan dari kasir' });
	} catch (err) {
		log.api.error({ err }, 'PUT pos/products');
		return json({ success: false, message: 'Gagal mengubah produk POS' }, { status: 500 });
	}
}
