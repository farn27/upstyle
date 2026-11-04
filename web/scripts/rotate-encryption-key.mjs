/**
 * Rotasi ENCRYPTION_KEY — enkripsi ulang data karyawan (PIN, NPWP, no. rekening)
 * dari key lama ke key baru. Sekali pakai.
 *
 * Jalankan dari folder `web` (Windows CMD):
 *   set DATABASE_URL=mysql://...           (database PRODUKSI, sama dengan di Vercel)
 *   set OLD_ENCRYPTION_KEY=...             (nilai ENCRYPTION_KEY yang sekarang di Vercel)
 *   set NEW_ENCRYPTION_KEY=...             (key baru)
 *   node scripts/rotate-encryption-key.mjs            ← cek dulu, TIDAK mengubah apa pun
 *   node scripts/rotate-encryption-key.mjs --apply    ← baru benar-benar menulis
 *
 * Aman dijalankan berulang: data yang sudah pakai key baru dilewati.
 * Format enkripsi identik dengan src/lib/server/encryption.js.
 */
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { eq } from 'drizzle-orm';
import { employees } from '../src/lib/server/schema.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;
const FIELDS = ['pin', 'taxId', 'bankAccountNumber'];

const deriveKey = (password, salt) => crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');

function encrypt(text, password) {
	const iv = crypto.randomBytes(IV_LENGTH);
	const salt = crypto.randomBytes(SALT_LENGTH);
	const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(password, salt), iv);
	const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
	return Buffer.concat([salt, iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

/** @returns {string|null} plaintext, atau null kalau bukan terenkripsi dengan key ini */
function tryDecrypt(value, password) {
	try {
		const buffer = Buffer.from(value, 'base64');
		if (buffer.length <= ENCRYPTED_POSITION) return null;
		const salt = buffer.subarray(0, SALT_LENGTH);
		const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
		const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
		const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(password, salt), iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(buffer.subarray(ENCRYPTED_POSITION)), decipher.final()]).toString('utf8');
	} catch {
		return null;
	}
}

const { DATABASE_URL, OLD_ENCRYPTION_KEY, NEW_ENCRYPTION_KEY } = process.env;
const APPLY = process.argv.includes('--apply');

if (!DATABASE_URL || !OLD_ENCRYPTION_KEY || !NEW_ENCRYPTION_KEY) {
	console.error('❌ Set dulu DATABASE_URL, OLD_ENCRYPTION_KEY, dan NEW_ENCRYPTION_KEY');
	process.exit(1);
}
if (OLD_ENCRYPTION_KEY === NEW_ENCRYPTION_KEY) {
	console.error('❌ Key lama dan key baru sama');
	process.exit(1);
}
if (NEW_ENCRYPTION_KEY.length < 32) {
	console.error('❌ NEW_ENCRYPTION_KEY terlalu pendek (minimal 32 karakter)');
	process.exit(1);
}

const isTiDB = DATABASE_URL.includes('tidbcloud') || DATABASE_URL.includes('ssl=');
const pool = mysql.createPool({ uri: DATABASE_URL, ...(isTiDB ? { ssl: { rejectUnauthorized: true } } : {}) });
const db = drizzle(pool);

const stats = { dipindah: 0, sudahBaru: 0, kosong: 0, tidakTerenkripsi: 0 };
const updates = [];

const rows = await db
	.select({ id: employees.id, pin: employees.pin, taxId: employees.taxId, bankAccountNumber: employees.bankAccountNumber })
	.from(employees);

for (const row of rows) {
	const changes = {};
	for (const field of FIELDS) {
		const value = row[field];
		if (!value) { stats.kosong++; continue; }
		if (tryDecrypt(value, NEW_ENCRYPTION_KEY) !== null) { stats.sudahBaru++; continue; }
		const plain = tryDecrypt(value, OLD_ENCRYPTION_KEY);
		if (plain === null) { stats.tidakTerenkripsi++; continue; }
		changes[field] = encrypt(plain, NEW_ENCRYPTION_KEY);
		stats.dipindah++;
	}
	if (Object.keys(changes).length) updates.push({ id: row.id, changes });
}

console.log(`Karyawan diperiksa      : ${rows.length}`);
console.log(`Field dipindah ke key baru: ${stats.dipindah}`);
console.log(`Sudah pakai key baru    : ${stats.sudahBaru}`);
console.log(`Kosong                  : ${stats.kosong}`);
console.log(`Bukan terenkripsi / key lain (dibiarkan): ${stats.tidakTerenkripsi}`);

if (!APPLY) {
	console.log('\nMode cek saja — belum ada yang diubah. Tambahkan --apply untuk menulis.');
} else if (updates.length) {
	await db.transaction(async (tx) => {
		for (const { id, changes } of updates) {
			await tx.update(employees).set(changes).where(eq(employees.id, id));
		}
	});
	console.log(`\n✅ ${updates.length} karyawan diperbarui (dalam satu transaksi).`);
} else {
	console.log('\nTidak ada yang perlu diubah.');
}

await pool.end();
