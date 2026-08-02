import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products } from '$lib/server/schema';
import { eq, and, desc, isNotNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const unitId = url.searchParams.get('unitId');
	if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

	try {
		const trashProducts = await db.query.products.findMany({
			where: and(eq(products.unitId, Number(unitId)), isNotNull(products.deletedAt)),
			orderBy: [desc(products.deletedAt)]
		});

		return json({
			success: true,
			message: "Berhasil mengambil daftar produk di tempat sampah",
			data: trashProducts
		});
	} catch (err) {
		log.product.error({ err }, 'API GET products trash error');
		return json({ success: false, message: "Gagal mengambil produk terhapus" }, { status: 500 });
	}
}

export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	try {
		const body = await request.json();
		const { productId } = body;

		if (!productId) {
			return json({ success: false, message: "productId wajib diisi" }, { status: 400 });
		}

		await db.update(products)
			.set({ deletedAt: null, status: null })
			.where(eq(products.id, String(productId)));

		return json({
			success: true,
			message: "Produk berhasil dipulihkan"
		});
	} catch (err) {
		log.product.error({ err }, 'API PUT products trash restore error');
		return json({ success: false, message: "Gagal memulihkan produk: " + err.message }, { status: 500 });
	}
}

export async function DELETE({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const productId = url.searchParams.get('productId');
	if (!productId) return json({ success: false, message: "productId wajib diisi" }, { status: 400 });

	try {
		await db.delete(products).where(eq(products.id, String(productId)));

		return json({
			success: true,
			message: "Produk berhasil dihapus permanen"
		});
	} catch (err) {
		log.product.error({ err }, 'API DELETE products trash hard-delete error');
		return json({ success: false, message: "Gagal menghapus produk secara permanen" }, { status: 500 });
	}
}
