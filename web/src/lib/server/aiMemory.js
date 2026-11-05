// File: src/lib/server/aiMemory.js
import { redis } from './redis.js';

// Fallback in-memory jika Redis sedang disabled atau belum terkonfigurasi
const inMemoryStore = new Map();

const MAX_MEMORIES_PER_TARGET = 15;

/**
 * Filter ketat: DILARANG menyimpan memori angka transaksi / keuangan.
 * User rule: "jangan simpan memori data transaksi berupa angka , karena nanti bisa ke ikut angka yang di ingat kemaren kemaren nanti malah di masukin ke konteks terbaru , simpan dan ingat memori hanya konteks saja atau yang lain , jangan memori angka transaksi atau data yang lain"
 * 
 * @param {string} text
 * @returns {boolean} true jika terdeteksi mengandung angka transaksi / keuangan
 */
export function isFinancialOrTransactionData(text) {
	if (!text || typeof text !== 'string') return true;

	const lower = text.toLowerCase().trim();

	// 1. Pola mata uang eksplisit (Rp 50.000, IDR 100k, dsb)
	const currencyPattern = /(?:rp\.?|idr)\s*[\d\.,]+|[\d\.,]+\s*(?:rb|ribu|jt|juta|miliar|k|perak)\b/i;
	if (currencyPattern.test(lower)) return true;

	// 2. Format nominal ribuan berulang (misal 50.000, 100,000, 1.500.000)
	const formattedNominalPattern = /\b\d{1,3}(?:[.,]\d{3})+\b/;
	if (formattedNominalPattern.test(lower)) return true;

	// 3. Kata kunci keuangan yang disertai angka (misal "saldo 5000", "omzet 10", "hutang 200")
	const financialContext = /\b(saldo|omzet|omset|pemasukan|pengeluaran|untung|rugi|laba|profit|kas\s*masuk|kas\s*keluar|bayar|hutang|piutang|tagihan|nominal|transaksi)\b/i;
	if (financialContext.test(lower) && /\d+/.test(lower)) {
		return true;
	}

	// 4. Angka besar 5 digit atau lebih tanpa kata "tahun" (misal: 50000)
	const largeNumberPattern = /(?<!tahun\s*)\b\d{5,}\b/i;
	if (largeNumberPattern.test(lower)) return true;

	return false;
}

/**
 * Buat key Redis unik per unit bisnis atau per user
 * @param {number|null} unitId
 * @param {number} userId
 * @returns {string}
 */
function getMemoryKey(unitId, userId) {
	if (unitId) return `bizgrow:ai_memory:unit:${unitId}`;
	return `bizgrow:ai_memory:user:${userId}`;
}

/**
 * Ambil daftar memori aktif untuk unit/user
 * @param {number|null} unitId
 * @param {number} userId
 * @returns {Promise<Array<{id: string, fact: string, category: string, createdAt: string}>>}
 */
export async function getAiMemories(unitId, userId) {
	const key = getMemoryKey(unitId, userId);
	try {
		if (redis) {
			const data = await redis.get(key);
			if (data) {
				return typeof data === 'string' ? JSON.parse(data) : data;
			}
			return [];
		}
		return inMemoryStore.get(key) || [];
	} catch (err) {
		console.warn('[AIMemory] Gagal membaca memori dari Redis, pakai in-memory:', err.message);
		return inMemoryStore.get(key) || [];
	}
}

/**
 * Simpan satu fakta / preferensi konteks ke memori
 * @param {number|null} unitId
 * @param {number} userId
 * @param {string} fact
 * @param {string} [category='context']
 * @returns {Promise<{success: boolean, message: string, memory?: object}>}
 */
export async function saveAiMemory(unitId, userId, fact, category = 'context') {
	const cleanFact = String(fact || '').trim();
	if (!cleanFact) {
		return { success: false, message: 'Memori tidak boleh kosong.' };
	}

	// VALIDASI GUARDRAIL KETAT: Tolak jika mengandung data angka transaksi / keuangan
	if (isFinancialOrTransactionData(cleanFact)) {
		return {
			success: false,
			message: 'Ditolak: Data angka transaksi dan keuangan tidak disimpan di memori permanen agar tidak bercampur dengan data real-time database.'
		};
	}

	const key = getMemoryKey(unitId, userId);
	const existing = await getAiMemories(unitId, userId);

	// Cek apakah fakta serupa sudah ada (mencegah duplikasi)
	const isDuplicate = existing.some(m => m.fact.toLowerCase() === cleanFact.toLowerCase());
	if (isDuplicate) {
		return { success: true, message: 'Konteks ini sudah diingat sebelumnya.', memory: null };
	}

	const newMemory = {
		id: 'mem_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
		fact: cleanFact,
		category, // 'preference', 'profile', 'business_fact', 'operation', 'note'
		createdAt: new Date().toISOString()
	};

	// Batasi maksimal 15 memori agar token tetap hemat dan akurat
	const updated = [newMemory, ...existing].slice(0, MAX_MEMORIES_PER_TARGET);

	try {
		if (redis) {
			await redis.set(key, JSON.stringify(updated));
		}
		inMemoryStore.set(key, updated);
		return { success: true, message: 'Konteks berhasil disimpan ke memori.', memory: newMemory };
	} catch (err) {
		console.error('[AIMemory] Gagal menyimpan ke Redis, fallback in-memory:', err.message);
		inMemoryStore.set(key, updated);
		return { success: true, message: 'Disimpan ke memori sesi.', memory: newMemory };
	}
}

/**
 * Hapus memori berdasarkan ID atau kata kunci teks
 * @param {number|null} unitId
 * @param {number} userId
 * @param {string} keywordOrId
 * @returns {Promise<{success: boolean, removedCount: number}>}
 */
export async function deleteAiMemory(unitId, userId, keywordOrId) {
	const key = getMemoryKey(unitId, userId);
	const existing = await getAiMemories(unitId, userId);
	const target = String(keywordOrId || '').toLowerCase().trim();

	const filtered = existing.filter(m => m.id !== keywordOrId && !m.fact.toLowerCase().includes(target));
	const removedCount = existing.length - filtered.length;

	try {
		if (redis) {
			await redis.set(key, JSON.stringify(filtered));
		}
		inMemoryStore.set(key, filtered);
		return { success: true, removedCount };
	} catch (err) {
		console.error('[AIMemory] Gagal menghapus:', err.message);
		inMemoryStore.set(key, filtered);
		return { success: false, removedCount: 0 };
	}
}

/**
 * Hapus seluruh memori unit/user
 * @param {number|null} unitId
 * @param {number} userId
 * @returns {Promise<{success: boolean}>}
 */
export async function clearAllAiMemories(unitId, userId) {
	const key = getMemoryKey(unitId, userId);
	try {
		if (redis) {
			await redis.del(key);
		}
		inMemoryStore.delete(key);
		return { success: true };
	} catch (err) {
		console.error('[AIMemory] Gagal reset memori:', err.message);
		inMemoryStore.delete(key);
		return { success: false };
	}
}

/**
 * Format memori untuk disuntikkan ke System Prompt AI
 * @param {Array<{id: string, fact: string}>} memories
 * @returns {string}
 */
export function formatMemoriesForPrompt(memories) {
	if (!Array.isArray(memories) || memories.length === 0) return '';

	const items = memories.map(m => `  • ${m.fact}`).join('\n');
	return `\n## 🧠 MEMORI & KONTEKS KHUSUS YANG DIINGAT (Preferensi & Profil Pengguna)
${items}
(PANDUAN: Gunakan memori di atas murni sebagai konteks preferensi atau profil bisnis. DILARANG menggunakan memori lama ini untuk menjawab nominal transaksi/saldo, karena seluruh angka finansial selalu merujuk live dari database di atas).\n`;
}
