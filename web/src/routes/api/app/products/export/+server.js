import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, productVariants } from '$lib/server/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

// GET /api/app/products/export?unitId=X&format=json|csv
export async function GET({ url, cookies, request }) {
    const userId = await getCurrentUserId(cookies, request);
    if (!userId) return json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const unitId = url.searchParams.get('unitId');
    if (!unitId) return json({ success: false, message: 'unitId wajib diisi' }, { status: 400 });

    const format = (url.searchParams.get('format') || 'json').toLowerCase();

    try {
        const productRows = await db.query.products.findMany({
            where: and(eq(products.unitId, Number(unitId)), isNull(products.deletedAt)),
            with: {
                productVariants: {
                    orderBy: [productVariants.namaVariasi]
                }
            },
            orderBy: [products.nama]
        });

        const rows = productRows.map(p => ({
            id: p.id,
            sku: p.sku || '',
            nama: p.nama,
            hargaBeli: Number(p.hargaBeli || 0),
            hargaJual: Number(p.hargaJual || 0),
            stok: Number(p.stok || 0),
            status: p.status || 'active',
            variants: (p.productVariants || []).map(v => ({
                id: v.id,
                namaVariasi: v.namaVariasi,
                sku: v.sku || '',
                hargaBeli: Number(v.hargaBeli || 0),
                hargaJual: Number(v.hargaJual || 0),
                stok: Number(v.stok || 0)
            }))
        }));

        if (format === 'csv') {
            let csv = 'id,sku,nama,harga_beli,harga_jual,stok,status,variant_id,nama_variasi,variant_sku,variant_harga_beli,variant_harga_jual,variant_stok\n';
            for (const p of rows) {
                if (p.variants.length === 0) {
                    csv += `${p.id},"${p.sku}","${p.nama}",${p.hargaBeli},${p.hargaJual},${p.stok},${p.status}\n`;
                } else {
                    for (const v of p.variants) {
                        csv += `${p.id},"${p.sku}","${p.nama}",${p.hargaBeli},${p.hargaJual},${p.stok},${p.status},"${v.id}","${v.namaVariasi}","${v.sku}",${v.hargaBeli},${v.hargaJual},${v.stok}\n`;
                    }
                }
            }

            return new Response(csv, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="products-${unitId}.csv"`
                }
            });
        }

        const payload = JSON.stringify({ success: true, data: rows, exportedAt: new Date().toISOString() });

        return new Response(payload, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="products-${unitId}.json"`
            }
        });
    } catch (err) {
        log.api.error({ err }, 'GET products/export');
        return json({ success: false, message: 'Gagal export produk' }, { status: 500 });
    }
}
