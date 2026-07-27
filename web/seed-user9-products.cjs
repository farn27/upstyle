const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'finance_engine_db',
  waitForConnections: true,
  connectionLimit: 5
});

async function seed() {
  try {
    // 1. Cari unit milik user 9
    const [unitRows] = await pool.execute(
      'SELECT id FROM unit_bisnis WHERE user_id = 9 LIMIT 1'
    );
    
    if (unitRows.length === 0) {
      console.log('❌ Unit untuk user 9 tidak ditemukan');
      return;
    }
    
    const unitId = unitRows[0].id;
    console.log(`✅ Unit ditemukan: id=${unitId}`);
    
    // 2. Cek berapa produk yang udah ada
    const [existing] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM products WHERE user_id = 9 AND unit_id = ?',
      [unitId]
    );
    
    console.log(`📦 Produk existing untuk user 9: ${existing[0].cnt}`);
    
    // 3. Generate 20 produk baru
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const values = [];
    
    for (let i = 1; i <= 20; i++) {
      const id = `PRD${Date.now()}${i}`;
      const nama = `Produk ${i}`;
      const slug = `produk-${i}-${Date.now()}`;
      const hargaBeli = Math.floor(Math.random() * 50000) + 10000;
      const hargaJual = Math.floor(Math.random() * 100000) + 20000;
      const stok = Math.floor(Math.random() * 100) + 10;
      
      values.push([id, nama, slug, 9, unitId, hargaBeli, hargaJual, stok, 5, now]);
    }
    
    // 4. Insert batch (pakai placeholders manual biar aman di semua versi mysql2)
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const [result] = await pool.execute(
      `INSERT INTO products (id, nama, slug, user_id, unit_id, harga_beli, harga_jual, stok, min_stok, created_at) VALUES ${placeholders}`,
      values.flat()
    );
    
    console.log(`✅ Berhasil insert ${result.affectedRows} produk baru untuk user 9`);
    
    // 5. Tampilkan sample
    const [sample] = await pool.execute(
      'SELECT id, nama, harga_jual, stok FROM products WHERE user_id = 9 ORDER BY id DESC LIMIT 5'
    );
    console.log('\n📋 Sample produk terbaru:');
    console.table(sample);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();