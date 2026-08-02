import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { stockOpname, stockOpnameItems, products } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

export async function GET({ url, cookies, request }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	const unitId = url.searchParams.get('unitId');
	if (!unitId) return json({ success: false, message: "unitId wajib diisi" }, { status: 400 });

	try {
		const records = await db.query.stockOpname.findMany({
			where: eq(stockOpname.unitId, Number(unitId)),
			orderBy: [desc(stockOpname.createdAt)],
			with: {
				items: true
			}
		});

		return json({
			success: true,
			message: "Berhasil mengambil data stock opname",
			data: records
		});
	} catch (err) {
		log.product.error({ err }, 'API GET stock-opname error');
		return json({ success: false, message: "Gagal mengambil data stock opname" }, { status: 500 });
	}
}

export async function POST({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	try {
		const body = await request.json();
		const { unitId, warehouseId, notes, items } = body;

		if (!unitId || !warehouseId || !Array.isArray(items)) {
			return json({ success: false, message: "unitId, warehouseId, dan items wajib diisi" }, { status: 400 });
		}

		const createdOpnameId = await db.transaction(async (tx) => {
			const [result] = await tx.insert(stockOpname).values({
				unitId: Number(unitId),
				warehouseId: Number(warehouseId),
				createdBy: userId,
				status: 'DRAFT',
				notes: notes || null
			});
			const opnameId = result.insertId;

			if (items.length > 0) {
				const opnameItems = items.map(item => {
					const sysStock = Number(item.systemStock || 0);
					const actStock = Number(item.actualStock || 0);
					const diff = actStock - sysStock;
					return {
						opnameId,
						productId: String(item.productId),
						systemStock: sysStock,
						actualStock: actStock,
						difference: diff,
						notes: item.notes || null
					};
				});

				await tx.insert(stockOpnameItems).values(opnameItems);
			}

			return opnameId;
		});

		return json({
			success: true,
			message: "Stock opname berhasil dibuat",
			data: { id: createdOpnameId }
		});
	} catch (err) {
		log.product.error({ err }, 'API POST stock-opname error');
		return json({ success: false, message: "Gagal membuat stock opname: " + err.message }, { status: 500 });
	}
}

export async function PUT({ request, cookies }) {
	const userId = await getCurrentUserId(cookies, request);
	if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

	try {
		const body = await request.json();
		const { opnameId } = body;

		if (!opnameId) {
			return json({ success: false, message: "opnameId wajib diisi" }, { status: 400 });
		}

		await db.transaction(async (tx) => {
			const opname = await tx.query.stockOpname.findFirst({
				where: eq(stockOpname.id, Number(opnameId))
			});

			if (!opname) {
				throw new Error("Stock opname tidak ditemukan");
			}

			if (opname.status === 'COMPLETED') {
				throw new Error("Stock opname sudah dalam status COMPLETED");
			}

			const items = await tx.query.stockOpnameItems.findMany({
				where: eq(stockOpnameItems.opnameId, Number(opnameId))
			});

			for (const item of items) {
				if (item.difference !== 0) {
					await tx.update(products)
						.set({ stok: item.actualStock })
						.where(eq(products.id, item.productId));
				}
			}

			await tx.update(stockOpname)
				.set({
					status: 'COMPLETED',
					completedAt: new Date()
				})
				.where(eq(stockOpname.id, Number(opnameId)));
		});

		return json({
			success: true,
			message: "Stock opname berhasil diselesaikan"
		});
	} catch (err) {
		log.product.error({ err }, 'API PUT stock-opname error');
		return json({ success: false, message: err.message || "Gagal menyelesaikan stock opname" }, { status: 500 });
	}
}
