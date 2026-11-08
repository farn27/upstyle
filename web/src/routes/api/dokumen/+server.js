import { verifyState } from '$lib/server/crypto';
import { GET as slipGaji } from '../slip-gaji/[employeeId]/+server.js';
import { GET as invoice } from '../invoice/[orderId]/+server.js';

/**
 * GET /api/dokumen?token=…  — membuka slip gaji / invoice (HTML siap cetak) di browser HP tanpa login ulang.
 * Token terenkripsi dari POST /api/app/dokumen, berlaku 10 menit, terikat ke satu dokumen & satu pemilik.
 */
export async function GET({ url, cookies, request }) {
	const isi = verifyState(url.searchParams.get('token') || '');
	if (!isi || typeof isi.x !== 'number' || Date.now() > isi.x) {
		return new Response('Link dokumen tidak valid atau sudah kedaluwarsa. Buat ulang dari aplikasi.', { status: 410 });
	}
	const locals = { userIdOverride: Number(isi.u) };
	if (isi.j === 'slip') {
		const u = new URL(url.origin + '/');
		u.searchParams.set('month', String(isi.m)); u.searchParams.set('year', String(isi.y));
		return slipGaji({ params: { employeeId: String(isi.i) }, url: u, cookies, request, locals });
	}
	if (isi.j === 'invoice') {
		const u = new URL(url.origin + '/');
		u.searchParams.set('type', isi.t === 'manual' ? 'manual' : 'pos');
		return invoice({ params: { orderId: String(isi.i) }, url: u, cookies, request, locals });
	}
	return new Response('Jenis dokumen tidak dikenal', { status: 400 });
}
