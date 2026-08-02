import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { products, kategoriProduk, unitBisnis } from '$lib/server/schema';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { redis } from '$lib/server/redis';
import { log } from '$lib/server/logger';

function createSlug(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

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

    let workbook;
    try {
        workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch (error) {
        log.api.error({ err: error.message }, '[import] Gagal membaca file import');
        return json({ error: 'Gagal membaca file import. Pastikan file .xlsx atau .csv valid.' }, { status: 400 });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return json({ error: 'File import tidak memiliki sheet yang valid.' }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

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

    const insertedNames = [];

    try {
        await db.transaction(async (tx) => {
            for (const row of parsedRows) {
                let kategoriId = null;

                if (row.kategori) {
                    const existingCategory = await tx.query.kategoriProduk.findFirst({
                        where: eq(kategoriProduk.namaKategori, row.kategori),
                        columns: { id: true }
                    });

                    if (existingCategory) {
                        kategoriId = existingCategory.id;
                    } else {
                        const [newCategory] = await tx.insert(kategoriProduk).values({
                            namaKategori: row.kategori
                        }).$returningId();
                        kategoriId = newCategory.id;
                    }
                }

                const baseSlug = createSlug(row.nama);
                let slug = baseSlug || `produk-${crypto.randomUUID().slice(0, 5)}`;
                let suffix = 0;
                while (await tx.query.products.findFirst({ where: eq(products.slug, slug) })) {
                    suffix += 1;
                    slug = `${baseSlug}-${suffix}`;
                }

                await tx.insert(products).values({
                    id: crypto.randomUUID(),
                    userId: user.id,
                    unitId: unit.id,
                    kategoriId: kategoriId,
                    nama: row.nama,
                    sku: row.sku || `SKU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                    slug,
                    barcode: row.barcode || null,
                    status: row.status || 'active',
                    hargaBeli: row.hargaBeli,
                    hargaJual: row.hargaJual,
                    stok: row.stok,
                    minStok: row.minStok,
                    metadata: { imported: true },
                    createdAt: new Date(),
                    hasVariant: 0
                });

                insertedNames.push(row.nama);
            }
        });

        await redis.del(`cache:products_page_v4:${params.slug.toLowerCase()}:none:${user.id}`);
        await redis.del(`cache:products_page_v4:${params.slug.toLowerCase()}:all:${user.id}`);
    } catch (error) {
        log.api.error({ err: error.message }, '[import] Gagal import produk');
        return json({ error: 'Gagal melakukan import produk. Periksa kembali format file.' }, { status: 500 });
    }

    return json({
        success: true,
        message: `${insertedNames.length} produk berhasil diimpor.`,
        importedCount: insertedNames.length
    });
}
