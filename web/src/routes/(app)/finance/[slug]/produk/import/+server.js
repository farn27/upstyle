import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';
import { bacaBarisFile, ImporEksporError } from '$lib/server/imporEkspor';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';
import { imporProduk } from '$lib/server/imporEkspor';

function normalizeRow(row) {
    return {
        nama: row.nama?.toString().trim() || row.name?.toString().trim() || '',
        sku: row.sku?.toString().trim() || '',
        kategori: row.kategori?.toString().trim() || row.category?.toString().trim() || '',
        hargaBeli: Number(row.harga_beli ?? row.hargaBeli ?? row.purchase_price ?? 0),
        hargaJual: Number(row.harga_jual ?? row.hargaJual ?? row.sale_price ?? 0),
        stok: Number(row.stok ?? row.stock ?? 0),
        minStok: Number(row.min_stok ?? row.minStok ?? row.min_stock ?? 5),
        barcode: row.barcode?.toString().trim() || '',
        status: row.status?.toString().trim() || 'active',
    };
}

export async function POST({ request, params, locals }) {
    const user = locals.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
        return json({ error: 'File import tidak ditemukan atau tidak valid.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /** @type {Record<string, any>[]} */
    let rows;
    try {
        // Pembaca bersama berbasis ExcelJS (paket "xlsx" lama rentan saat membaca file buatan penyerang)
        rows = await bacaBarisFile(buffer);
    } catch (error) {
        log.api.error({ err: error.message }, '[import] Gagal membaca file import');
        return json({ error: error instanceof ImporEksporError ? error.message : 'Gagal membaca file import. Pastikan file .xlsx atau .csv valid.' }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
        return json({ error: 'File import kosong atau tidak berisi baris data.' }, { status: 400 });
    }

    const parsedRows = rows.map(normalizeRow).filter((row) => row.nama);
    if (parsedRows.length === 0) {
        return json({ error: 'Tidak ada baris valid. Pastikan kolom nama terisi.' }, { status: 400 });
    }

    const unit = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, params.slug.toLowerCase()), eq(unitBisnis.userId, user.id)),
        columns: { id: true }
    });

    if (!unit) {
        return json({ error: 'Unit bisnis tidak ditemukan atau akses ditolak.' }, { status: 404 });
    }

    let hasil;
    try {
        // Logika bersama dengan import dari app: kategori dicari/dibuat di unit ini saja
        hasil = await imporProduk(db, { userId: user.id, unitId: unit.id, rows });
        if (redis) {
            await redis.del(`cache:products_page_v4:${params.slug.toLowerCase()}:none:${user.id}`);
            await redis.del(`cache:products_page_v4:${params.slug.toLowerCase()}:all:${user.id}`);
        }
    } catch (error) {
        log.api.error({ err: error instanceof Error ? error.message : String(error) }, '[import] Gagal import produk');
        return json({ error: 'Gagal melakukan import produk. Periksa kembali format file.' }, { status: 500 });
    }

    return json({
        success: true,
        message: `${hasil.successRows} produk berhasil diimpor.`,
        importedCount: hasil.successRows
    });
}
