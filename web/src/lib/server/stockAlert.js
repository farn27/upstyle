/**
 * Stock Alert Service
 * Cek stok menipis dan kirim notifikasi + email ke owner
 */
import { db } from '$lib/server/drizzle';
import { products, riwayatAksi, users, unitBisnis } from '$lib/server/schema';
import { eq, and, lte, gte, isNull, asc } from 'drizzle-orm';
import { redis } from '$lib/server/redis';
import { sendEmail } from '$lib/server/email';
import { env } from '$env/dynamic/private';

const ALERT_COOLDOWN = 60 * 60 * 6; // 6 jam — jangan spam

/**
 * Cek dan kirim alert stok menipis untuk satu unit
 * @param {number} unitId
 * @param {number} userId
 * @param {string} unitName
 */
export async function checkAndAlertLowStock(unitId, userId, unitName) {
	const cooldownKey = `stock_alert_sent:${unitId}`;
	const alreadySent = await redis.get(cooldownKey);
	if (alreadySent) return { skipped: true };

	// Ambil produk stok menipis
	const lowStockRows = await db
		.select({
			id: products.id,
			nama: products.nama,
			stok: products.stok,
			min_stok: products.minStok,
			sku: products.sku
		})
		.from(products)
		.where(
			and(
				eq(products.unitId, unitId),
				isNull(products.deletedAt),
				lte(products.stok, products.minStok),
				gte(products.stok, 0)
			)
		)
		.orderBy(asc(products.stok))
		.limit(20);

	if (!lowStockRows.length) return { sent: false, count: 0 };

	// Simpan riwayat notifikasi in-app
	const pesan = `${lowStockRows.length} produk stok menipis di ${unitName}`;
	await db.insert(riwayatAksi).values({
		userId: userId,
		unitId: unitId,
		pesan: pesan,
		tipe: 'info',
		kategori: 'stok',
		link: `/finance/${await getUnitSlug(unitId)}/produk`
	}).catch(() => {});

	// Kirim email ke owner (non-blocking)
	try {
		const userRows = await db
			.select({
				email: users.email,
				username: users.username
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);
		if (userRows.length > 0) {
			const { email, username } = userRows[0];
			const itemList = lowStockRows
				.map((p) => `<li><b>${p.nama}</b> — Stok: <b style="color:#ef4444">${p.stok}</b> (min: ${p.min_stok})${p.sku ? ` [${p.sku}]` : ''}</li>`)
				.join('');

			await sendEmail({
				to: email,
				subject: `⚠️ ${lowStockRows.length} Produk Stok Menipis — ${unitName}`,
				html: `
				<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f8fafc;padding:32px;">
				<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
					<div style="background:#1e1b4b;padding:24px 32px">
						<h1 style="margin:0;color:#fff;font-size:18px;font-weight:900">Upstyle</h1>
					</div>
					<div style="padding:32px">
						<h2 style="color:#1e293b;margin:0 0 8px">⚠️ Peringatan Stok Menipis</h2>
						<p style="color:#475569;font-size:14px">Hai <b>${username}</b>, ada <b>${lowStockRows.length} produk</b> di unit <b>${unitName}</b> yang stoknya sudah di bawah minimum.</p>
						<ul style="color:#374151;font-size:14px;line-height:2">${itemList}</ul>
						<a href="${env.ORIGIN || 'http://localhost:5173'}/finance/${await getUnitSlug(unitId)}/produk" 
						   style="display:inline-block;margin-top:16px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px">
							Kelola Stok Sekarang
						</a>
					</div>
				</div>
				</body></html>`
			});
		}
	} catch (emailErr) {
		console.error('[StockAlert] Email error:', emailErr.message);
	}

	// Set cooldown agar tidak spam
	await redis.set(cooldownKey, '1', { ex: ALERT_COOLDOWN });

	return { sent: true, count: lowStockRows.length, products: lowStockRows };
}

/** @param {number} unitId */
async function getUnitSlug(unitId) {
	const rows = await db
		.select({ slug: unitBisnis.slug })
		.from(unitBisnis)
		.where(eq(unitBisnis.id, unitId))
		.limit(1);
	return rows[0]?.slug || '';
}

/**
 * Ambil daftar produk stok menipis (untuk dashboard)
 * @param {number} unitId
 * @param {number} [limit]
 */
export async function getLowStockProducts(unitId, limit = 10) {
	const rows = await db
		.select({
			id: products.id,
			nama: products.nama,
			stok: products.stok,
			min_stok: products.minStok,
			sku: products.sku,
			foto: products.foto
		})
		.from(products)
		.where(
			and(
				eq(products.unitId, unitId),
				isNull(products.deletedAt),
				lte(products.stok, products.minStok),
				gte(products.stok, 0)
			)
		)
		.orderBy(asc(products.stok))
		.limit(Number(limit));
	return rows;
}
