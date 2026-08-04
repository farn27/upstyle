import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';

const HELP_ITEMS = [
	{
		id: 1,
		q: 'Bagaimana cara mengubah kata sandi?',
		a: 'Buka halaman Pengaturan Akun, lalu pilih Ubah Kata Sandi. Masukkan kata sandi lama dan baru, lalu simpan.',
		category: 'Akun'
	},
	{
		id: 2,
		q: 'Mengapa pesanan saya tidak muncul di daftar?',
		a: 'Periksa status pesanan dan filter yang diterapkan. Jika tetap tidak muncul, coba muat ulang atau hubungi tim dukungan.',
		category: 'Pesanan'
	},
	{
		id: 3,
		q: 'Apakah saya bisa menambahkan lebih dari satu unit bisnis?',
		a: 'Ya, Anda bisa menambahkan beberapa unit bisnis dari menu Organisasi, asumsi paket mendukung.',
		category: 'Akun'
	},
	{
		id: 4,
		q: 'Cara menghubungkan akun Shopee?',
		a: 'Buka Pengaturan Integrasi, pilih Shopee, lalu ikuti proses授权. Saat ini tersedia placeholder untuk koneksi awal.',
		category: 'Integrasi'
	},
	{
		id: 5,
		q: 'Bagaimana cara menggunakan landing page template?',
		a: 'Pilih menu Landing Page, klik Templates, lalu pilih template yang sesuai untuk membuat halaman baru.',
		category: 'Panduan'
	}
];

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const query = (url.searchParams.get('q') || '').trim().toLowerCase();
		const category = (url.searchParams.get('category') || '').trim();

		let items = HELP_ITEMS;
		if (category) {
			items = items.filter(item => item.category === category);
		}
		if (query) {
			items = items.filter(item => item.q.toLowerCase().includes(query) || item.a.toLowerCase().includes(query));
		}

		return apiSuccess({ items, total: items.length }, 'OK');
	} catch (err) {
		log.api.error({ err }, 'GET /api/app/help');
		return apiError('Gagal memuat pusat bantuan', 500);
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return apiUnauthorized();

	try {
		const body = await request.json();
		const id = Number(body?.id);
		const feedback = String(body?.feedback || '').trim();
		const rating = body?.rating;

		if (!id || !feedback) {
			return apiError('id dan feedback wajib diisi', 422);
		}
		if (rating === undefined || rating === null) {
			return apiError('rating wajib diisi', 422);
		}

		const item = HELP_ITEMS.find(entry => entry.id === id);
		if (!item) {
			return apiError('Item bantuan tidak ditemukan', 404);
		}

		log.api.info(
			{ userId, id, feedback, rating },
			'help.feedback'
		);

		return apiSuccess({ message: 'Feedback bantuan berhasil dikirim' }, 'OK');
	} catch (err) {
		log.api.error({ err }, 'POST /api/app/help/feedback');
		return apiError('Gagal mengirim feedback bantuan', 500);
	}
}
