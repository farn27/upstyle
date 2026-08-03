import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { stockOpname, stockOpnameItems, products, stockLogs, riwayatAksi } from '$lib/server/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

// GET /api/app/products/stock-opname?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const sessions = await db.query.stockOpname.findMany({
            where: eq(stockOpname.unitId, Number(unitId)),
            orderBy: [desc(stockOpname.id)],
            with: { items: { with: { product: true } } }
        });

        const data = sessions.map(s => ({
            id: s.id, unitId: s.unitId, status: s.status, notes: s.notes || '',
            createdAt: s.createdAt?.toISOString() || '',
            completedAt: s.completedAt?.toISOString() || null,
            items: (s.items || []).map(i => ({
                id: i.id, productId: i.productId, productName: i.product?.nama || '',
                systemStock: i.systemStock, actualStock: i.actualStock, difference: i.difference,
                notes: i.notes || ''
            }))
        }));

        return json({ success: true, data });
    } catch (err) {
        log.api.error({ err }, 'GET products/stock-opname');
        return json({ success: false, message: 'Gagal memuat stok opname' }, { status: 500 });
    }
}

// POST /api/app/products/stock-opname — buat opname baru + selesaikan
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { unitId, warehouseId, notes, items } = body;
        if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

        const wId = warehouseId || 1; // default warehouse

        const [result] = await db.insert(stockOpname).values({
            unitId: Number(unitId), warehouseId: Number(wId),
            createdBy: userId, status: 'COMPLETED',
            notes: notes || null, completedAt: new Date()
        });
        const opnameId = result.insertId;

        if (Array.isArray(items)) {
            for (const item of items) {
                await db.insert(stockOpnameItems).values({
                    opnameId, productId: item.productId,
                    systemStock: Number(item.systemStock),
                    actualStock: Number(item.actualStock),
                    difference: Number(item.actualStock) - Number(item.systemStock),
                    notes: item.notes || null
                });

                // Adjust stock if there's a difference
                const diff = Number(item.actualStock) - Number(item.systemStock);
                if (diff !== 0) {
                    await db.update(products)
                        .set({ stok: Number(item.actualStock) })
                        .where(eq(products.id, item.productId));

                    await db.insert(stockLogs).values({
                        id: crypto.randomUUID(), productId: item.productId,
                        userId: String(userId), unitId: Number(unitId),
                        stokAwal: Number(item.systemStock), perubahan: diff,
                        stokAkhir: Number(item.actualStock), alasan: 'OPNAME',
                        keterangan: `Stok Opname #${opnameId}`
                    });
                }
            }
        }

        await db.insert(riwayatAksi).values({
            userId, unitId: Number(unitId),
            pesan: `Stok Opname #${opnameId} selesai. ${(items || []).length} produk diverifikasi.`,
            kategori: 'PRODUK', tipe: 'success'
        });

        return json({ success: true, message: 'Stok opname berhasil diselesaikan', data: { id: opnameId } });
    } catch (err) {
        log.api.error({ err }, 'POST products/stock-opname');
        return json({ success: false, message: 'Gagal proses stok opname' }, { status: 500 });
    }
}
