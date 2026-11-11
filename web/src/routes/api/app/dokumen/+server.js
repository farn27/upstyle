import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { signState } from '$lib/server/crypto';

/**
 * POST /api/app/dokumen  { jenis: 'slip'|'invoice', id, month?, year?, type?: 'pos'|'manual' }
 * → { url } link sementara (10 menit) untuk membuka dokumen di browser HP. Kepemilikan dicek saat dokumen dibuka.
 */
export async function POST({ request, cookies, url }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	const b = await request.json().catch(() => ({}));
	const jenis = String(b?.jenis || '');
	if (!['slip', 'invoice'].includes(jenis) || !b?.id) return json({ success: false, message: 'jenis (slip/invoice) dan id wajib diisi' }, { status: 422 });
	const sekarang = new Date();
	const token = signState({
		u: userId, j: jenis, i: String(b.id),
		m: Number(b.month) || sekarang.getMonth() + 1, y: Number(b.year) || sekarang.getFullYear(),
		t: b.type === 'manual' ? 'manual' : 'pos', x: Date.now() + 10 * 60 * 1000
	});
	return json({ success: true, data: { url: `${url.origin}/api/dokumen?token=${encodeURIComponent(token)}`, berlakuMenit: 10 } });
}
