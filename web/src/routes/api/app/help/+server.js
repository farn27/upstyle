import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';

const HELP_ITEMS = [
	{ id: 1, q: "Bagaimana cara mengubah kata sandi?", a: "Buka Pengaturan → Profil → Ubah kata sandi. Masukkan kata sandi lama dan baru (minimal 8 karakter), lalu simpan.", category: "Akun" },
	{ id: 2, q: "Bagaimana menambah unit bisnis atau cabang?", a: "Buka Unit Bisnis, ketuk \"Unit baru\". Pilih jenis usaha, atau centang cabang lalu pilih unit induknya. Jumlah unit mengikuti paket langgananmu.", category: "Akun" },
	{ id: 3, q: "Bagaimana staff saya bisa login?", a: "Di Unit Bisnis, ketuk titik tiga pada unit → \"Portal staff\". Salin link login-nya dan bagikan ke karyawan. Staff masuk dengan akun karyawan yang dibuat di menu HR. Jika link bocor, pilih \"Buat ulang link\".", category: "Akun" },
	{ id: 4, q: "Bagaimana mencatat penjualan di kasir?", a: "Buka Kasir (POS), ketuk produk untuk memasukkan ke keranjang, pilih pelanggan bila perlu, lalu Bayar. Pilih metode bayar dan masukkan uang diterima; struk bisa dicetak atau dibagikan.", category: "Penjualan" },
	{ id: 5, q: "Bagaimana menambahkan PPN pada penjualan?", a: "Di layar pembayaran Kasir, aktifkan PPN lalu pilih tarif dan apakah harga sudah termasuk PPN (inklusif) atau ditambah di atas harga (eksklusif). PPN otomatis masuk jurnal PPN Keluaran dan rekap pajak.", category: "Penjualan" },
	{ id: 6, q: "Mengapa pesanan online tidak muncul?", a: "Pesanan datang dari toko online (halaman /w/…) dan muncul di Pesanan online. Periksa filter status di atas daftar dan pastikan katalog online diaktifkan di menu Katalog.", category: "Penjualan" },
	{ id: 7, q: "Bagaimana membuat penawaran lalu menjadi sales order?", a: "Di CRM → Penawaran buat penawaran, tandai Terkirim lalu Diterima saat pelanggan setuju, kemudian ketuk \"Jadikan sales order\". Penawaran hanya bisa dikonversi satu kali.", category: "Penjualan" },
	{ id: 8, q: "Bagaimana mengimpor produk dari Excel/CSV?", a: "Buka Export/Import → tab Import, pilih tipe Produk, lalu pilih file .xlsx atau .csv (maks 5 MB). Baris pertama harus judul kolom: nama, sku, harga_beli, harga_jual, stok, kategori. Cek hasil validasi lalu ketuk Import Data.", category: "Produk" },
	{ id: 9, q: "Bagaimana mengelola stok yang menipis?", a: "Produk dengan stok di bawah batas minimum muncul di Beranda dan di Pengadaan → Perlu restock. Dari sana kamu bisa langsung membuat Purchase Order ke supplier.", category: "Produk" },
	{ id: 10, q: "Bagaimana mencatat pemasukan atau pengeluaran?", a: "Buka Entri Transaksi, pilih Masuk atau Keluar, isi nominal, kategori/akun, metode bayar, dan keterangan. Jurnal akuntansi dibuat otomatis.", category: "Keuangan" },
	{ id: 11, q: "Apa itu Tutup Buku dan kenapa transaksi ditolak?", a: "Tutup Buku mengunci satu periode agar angkanya tidak berubah. Transaksi, jurnal, atau penyusutan pada periode terkunci akan ditolak; buka kembali kuncinya di Tutup Buku bila perlu koreksi.", category: "Keuangan" },
	{ id: 12, q: "Bagaimana mencatat piutang dan hutang?", a: "Di Piutang/Hutang, tambah tagihan dengan kontak, nominal, dan jatuh tempo. Pembayaran sebagian atau lunas dicatat dari detail tagihan dan otomatis masuk akun kas yang dipilih.", category: "Keuangan" },
	{ id: 13, q: "Bagaimana menjalankan penggajian?", a: "Buka HR → Payroll, pilih periode dan karyawan, lalu proses payroll. Komponen gaji (tunjangan/potongan) diatur di detail karyawan. Tandai Lunas saat gaji dibayarkan agar tercatat sebagai pengeluaran.", category: "HR" },
	{ id: 14, q: "Bagaimana memasukkan lead ke CRM?", a: "Di Marketing → Leads ketuk \"Jadikan kontak CRM\". Kontak dibuat di CRM dengan tahap Lead dan sumber \"landing page\".", category: "Marketing" },
	{ id: 15, q: "Bagaimana menghubungkan akun Shopee?", a: "Buka Integrasi Shopee dan ikuti proses otorisasi. Pesanan Shopee akan tersinkron setelah akun terhubung.", category: "Integrasi" },
	{ id: 16, q: "Apa yang bisa dilakukan Asisten AI?", a: "Asisten AI menjawab pertanyaan tentang bisnismu, membuat ringkasan penjualan, dan membantu mencatat transaksi lewat chat. Jawaban memakai data unit yang sedang aktif.", category: "AI" },
	{ id: 17, q: "Bagaimana upgrade paket?", a: "Buka Pengaturan → Langganan, pilih paket, lalu bayar lewat metode yang tersedia. Paket aktif segera setelah pembayaran dikonfirmasi.", category: "Langganan" }
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
