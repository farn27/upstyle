/**
 * SEED 50 PRODUK DUMMY
 * Cara pakai: node seed-50-products.js
 */

import { pool } from './src/lib/server/db.js';
import crypto from 'crypto';

const UNIT_SLUG = 'italian-charm-bracelet';

const NAMA_PRODUK = [
    'Gelang Emas 18K', 'Cincin Berlian', 'Kalung Pandora', 'Anting Perak', 'Bros Flower',
    'Gelang Tangan Kulit', 'Cincin Kawin', 'Kalung Rantai', 'Anting Stud', 'Bros Kristal',
    'Gelang Charm', 'Cincin Savanna', 'Kalung Heart', 'Anting Hoop', 'Bros Vintage',
    'Gelang Beads', 'Cincin Gold', 'Kalung Diamond', 'Anting Drop', 'Bros Elegant',
    'Gelang Rubber', 'Cincin Silver', 'Kalung Choker', 'Anting Clip', 'Bros Modern',
    'Gelang Wayfarer', 'Cincin Titanium', 'Kalung Layered', 'Anting Chandelier', 'Bros Art Deco',
    'Gelang Sport', 'Cincin Sapphire', 'Kalung Pendant', 'Anting Minimalis', 'Bros Floral',
    'Gelang Nautical', 'Cincin Emerald', 'Kalung Monogram', 'Anting Geometric', 'Bros Crystal',
    'Gelang Boho', 'Cincin Ruby', 'Kalung Tassel', 'Anting Feather', 'Bros Pearl',
    'Gelang Chain', 'Cincin Topaz', 'Kalung Beaded', 'Anting Threader', 'Bros Statement'
];

const KATEGORI_UMUM = 'UMUM';
const VARIAN_WARNA = ['Emas', 'Perak', 'Rose Gold', 'Hitam', 'Putih', 'Silver', 'Gold', 'Platinum'];
const VARIAN_UKURAN = ['S', 'M', 'L', 'XL', 'XXL', 'Standar', 'Mini', 'Maxi'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
    console.log('🔍 Mencari unit bisnis...');
    const [unitRows] = await pool.execute(
        'SELECT id FROM unit_bisnis WHERE slug = ?',
        [UNIT_SLUG]
    );

    if (unitRows.length === 0) {
        console.error(`❌ Unit dengan slug "${UNIT_SLUG}" tidak ditemukan!`);
        process.exit(1);
    }

    const unitId = unitRows[0].id;
    console.log(`✅ Unit ditemukan: ID ${unitId}`);

    // Cari kategori UMUM, jika belum ada buat baru
    console.log('🔍 Mencari kategori produk...');
    let [katRows] = await pool.execute(
        'SELECT id FROM kategori_produk WHERE nama_kategori = ?',
        [KATEGORI_UMUM]
    );

    let kategoriId;
    if (katRows.length === 0) {
        console.log('📝 Kategori UMUM belum ada, membuat baru...');
        const [result] = await pool.execute(
            'INSERT INTO kategori_produk (nama_kategori) VALUES (?)',
            [KATEGORI_UMUM]
        );
        kategoriId = result.insertId;
        console.log(`✅ Kategori dibuat: ID ${kategoriId}`);
    } else {
        kategoriId = katRows[0].id;
        console.log(`✅ Kategori ditemukan: ID ${kategoriId}`);
    }

    // Clear existing products for this unit (optional - biar gak dobel)
    console.log('🧹 Membersihkan data lama...');
    await pool.execute('DELETE FROM stock_logs WHERE product_id IN (SELECT id FROM products WHERE unit_id = ?)', [unitId]);
    await pool.execute('DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE unit_id = ?)', [unitId]);
    await pool.execute('DELETE FROM products WHERE unit_id = ?', [unitId]);
    console.log('✅ Data lama dibersihkan');

    // Insert 50 products
    console.log('🚀 Memasukkan 50 produk baru...');
    for (let i = 0; i < 50; i++) {
        const namaProduk = NAMA_PRODUK[i] || `Produk Dummy ${i + 1}`;
        const sku = `PRD-${String(i + 1).padStart(3, '0')}-${Date.now().toString().slice(-4)}`;
        const hargaBeli = randomInt(50000, 500000);
        const hargaJual = Math.round(hargaBeli * (1.5 + Math.random()));
        const stok = randomInt(0, 200);
        const minStok = randomInt(5, 20);
        const slug = `${namaProduk.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}-${crypto.randomUUID().slice(0, 5)}`;
        const productId = crypto.randomUUID();

        const [productResult] = await pool.execute(
            `INSERT INTO products 
            (id, user_id, unit_id, kategori_id, nama, foto, sku, harga_beli, harga_jual, stok, min_stok, metadata, has_variant, slug, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                productId,
                1, // default user
                unitId,
                kategoriId,
                namaProduk,
                null,
                sku,
                String(hargaBeli),
                String(hargaJual),
                stok,
                minStok,
                JSON.stringify({}),
                0,
                slug
            ]
        );

        // Insert 1-3 variants per product (30% chance no variant)
        if (Math.random() > 0.3) {
            const jumlahVarian = randomInt(1, 3);
            const varianWarna = randomInt(1, 2) > 0 ? [randomItem(VARIAN_WARNA)] : [];
            const varianUkuran = randomInt(1, 2) > 0 ? [randomItem(VARIAN_UKURAN)] : [];

            const combinations = [];
            if (varianWarna.length > 0 && varianUkuran.length > 0) {
                for (const w of varianWarna) {
                    for (const u of varianUkuran) {
                        combinations.push(`${w} / ${u}`);
                    }
                }
            } else if (varianWarna.length > 0) {
                combinations.push(...varianWarna);
            } else if (varianUkuran.length > 0) {
                combinations.push(...varianUkuran);
            }

            for (let v = 0; v < Math.min(jumlahVarian, combinations.length); v++) {
                const variantHargaJual = Math.round(hargaJual * (0.8 + Math.random() * 0.4));
                const variantStok = randomInt(0, 50);

                await pool.execute(
                    `INSERT INTO product_variants 
                    (id, product_id, nama_variasi, sku, harga_beli, harga_jual, stok, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        crypto.randomUUID(),
                        productId,
                        combinations[v],
                        `${sku}-V${v + 1}`,
                        String(hargaBeli),
                        String(variantHargaJual),
                        variantStok
                    ]
                );
            }
        }

        if ((i + 1) % 10 === 0) {
            console.log(`  ⏳ ${i + 1}/50 produk...`);
        }
    }

    console.log('🎉 SELESAI! 50 produk berhasil dimasukkan.');
    console.log(`📍 Unit: ${UNIT_SLUG} (ID: ${unitId})`);
    console.log(`🔗 Cek: http://localhost:5173/finance/${UNIT_SLUG}/produk`);
}

seed().catch(err => {
    console.error('❌ ERROR:', err);
    process.exit(1);
});