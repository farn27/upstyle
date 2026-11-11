import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { versiCache } from '$lib/server/cacheVersi';

/**
 * GET /api/updates?slug=… — dipakai polling klien (cadangan bila event Socket.io tidak sampai).
 * Mengembalikan nomor versi data pemilik + unit; klien memuat ulang halaman hanya kalau versinya berubah.
 *
 * Dulu endpoint ini mengirim 10 transaksi & 10 produk terakhir di SETIAP polling (pembanding waktunya
 * mencampur WIB dan UTC), lalu dasbor menambahkan transaksi itu lagi ke angka pengeluaran — sumber
 * angka dasbor yang berkedip/berlipat dan muat ulang halaman riwayat 10× tiap 15 detik.
 */
export async function GET({ url, cookies, request, setHeaders }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }
    const slug = url.searchParams.get('slug');
    if (!slug) {
        return json({ error: 'Missing slug parameter' }, { status: 400 });
    }
    setHeaders({ 'cache-control': 'no-store' });
    return json({ versi: await versiCache(userId, slug), timestamp: Date.now() });
}
