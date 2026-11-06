/**
 * Sekali jalan: ubah password karyawan yang masih tersimpan sebagai teks biasa menjadi hash argon2.
 *
 * Login portal karyawan masih menerima password teks biasa lama dan meng-hash-nya saat login berhasil,
 * tapi karyawan yang belum pernah login lagi tetap tersimpan sebagai teks biasa di database.
 * Skrip ini meng-hash semuanya sekaligus. Aman dijalankan berulang (yang sudah di-hash dilewati).
 *
 * Jalankan di server (VPS) dari folder web/:
 *   DATABASE_URL="mysql://user:pass@host:3306/nama_db" node scripts/hash-password-karyawan.mjs
 * Tambah --cek untuk hanya menghitung tanpa mengubah apa pun.
 */
import mysql from 'mysql2/promise';
import argon2 from 'argon2';

const hanyaCek = process.argv.includes('--cek');
const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL wajib diset');
	process.exit(1);
}

const pool = mysql.createPool({ uri: url, ...(/tidbcloud|ssl=/.test(url) ? { ssl: { rejectUnauthorized: true } } : {}) });

try {
	const [rows] = await pool.query(
		"SELECT id, password FROM employees WHERE password IS NOT NULL AND password <> '' AND password NOT LIKE '$argon2%'"
	);
	console.log(`Password karyawan teks biasa: ${rows.length}`);
	if (hanyaCek || rows.length === 0) process.exit(0);

	let selesai = 0;
	for (const row of rows) {
		const hash = await argon2.hash(String(row.password));
		// Syarat password lama di WHERE: jangan menimpa kalau karyawan baru saja ganti password
		const [hasil] = await pool.query('UPDATE employees SET password = ? WHERE id = ? AND password = ?', [hash, row.id, row.password]);
		if (hasil.affectedRows) selesai++;
	}
	console.log(`Selesai: ${selesai} password di-hash.`);
} finally {
	await pool.end();
}
