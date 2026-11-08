import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { stockOpname, stockOpnameItems, products } from '$lib/server/schema';
import { prosesOpname } from '$lib/server/stokOpname';
import { TransaksiError } from '$lib/server/catatTransaksi';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';
import crypto from 'crypto';

const tgl = (v) => (v ? (v instanceof Date ? v.toISOString() : String(v)) : null);

// GET /api/app/products/stock-opname?unitId=X
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });

    try {
        const sesi = await db.select().from(stockOpname).where(eq(stockOpname.unitId, Number(unitId))).orderBy(desc(stockOpname.id)).limit(100);
        const idSesi = sesi.map((x) => x.id);
        const baris = idSesi.length ? await db.select().from(stockOpnameItems).where(inArray(stockOpnameItems.opnameId, idSesi)) : [];
        const idProduk = [...new Set(baris.map((i) => i.productId))];
        const prod = idProduk.length ? await db.select({ id: products.id, nama: products.nama }).from(products).where(inArray(products.id, idProduk)) : [];
        const petaProduk = new Map(prod.map((x) => [x.id, x.nama]));

        const data = sesi.map(s => ({
            id: s.id, unitId: s.unitId, warehouseId: s.warehouseId, createdBy: s.createdBy,
            status: s.status || 'COMPLETED', notes: s.notes || '',
            createdAt: tgl(s.createdAt) || '',
            completedAt: tgl(s.completedAt),
            items: baris.filter((i) => i.opnameId === s.id).map(i => ({
                id: i.id, opnameId: i.opnameId, productId: i.productId, productName: petaProduk.get(i.productId) || '',
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

// POST /api/app/products/stock-opname — { unitId, notes, items:[{productId, actualStock, notes?}] }
export async function POST({ request, cookies }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const unitId = Number(body?.unitId);
        if (!unitId) return json({ success: false, message: 'unitId wajib' }, { status: 400 });
        const hasil = await prosesOpname(db, { unitId, userId, notes: body?.notes, items: body?.items });
        return json({ success: true, message: `Stok opname selesai — ${hasil.selisih} produk disesuaikan`, data: hasil });
    } catch (err) {
        if (err instanceof TransaksiError) return json({ success: false, message: err.message }, { status: err.status });
        log.api.error({ err }, 'POST products/stock-opname');
        return json({ success: false, message: 'Gagal proses stok opname' }, { status: 500 });
    }
}
