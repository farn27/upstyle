import { json } from '@sveltejs/kit';
import { getCurrentUserId } from '$lib/server/getUser';
import { log } from '$lib/server/logger';

/**
 * POST /api/chat/upload
 * Handles file uploads for AI processing in chat.
 * Supports: CSV (transaction bulk import), images (receipt scanning)
 */
export async function POST({ request, cookies }) {
	try {
		const userId = await getCurrentUserId(cookies, request);
		if (!userId) {
			return json({ success: false, message: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		const unitSlug = formData.get('unit') || '';

		if (!file || !(file instanceof File)) {
			return json({ success: false, message: 'File tidak ditemukan' }, { status: 400 });
		}

		// Validate file size (max 5MB)
		const MAX_SIZE = 5 * 1024 * 1024;
		if (file.size > MAX_SIZE) {
			return json({ success: false, message: 'Ukuran file maksimal 5MB' }, { status: 400 });
		}

		const fileName = file.name.toLowerCase();
		const mimeType = file.type;

		// Detect file type
		const isCSV = fileName.endsWith('.csv') || mimeType === 'text/csv' || mimeType === 'application/csv';
		const isImage = mimeType.startsWith('image/') ||
			['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => fileName.endsWith(ext));
		const isText = fileName.endsWith('.txt') || mimeType === 'text/plain';
		const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ||
			mimeType.includes('spreadsheet') || mimeType.includes('excel');

		let result = null;
		let fileTypeLabel = 'unknown';

		if (isCSV) {
			fileTypeLabel = 'csv';
			const text = await file.text();
			result = await processCSV(text);
		} else if (isImage) {
			fileTypeLabel = 'image';
			result = processImage(file.name, file.size);
		} else if (isText) {
			fileTypeLabel = 'text';
			const text = await file.text();
			result = processText(text, file.name);
		} else if (isExcel) {
			fileTypeLabel = 'excel';
			result = {
				message: 'File Excel terdeteksi. Untuk import transaksi, silakan export ke format CSV terlebih dahulu.',
				suggestion: 'Di Excel: File → Save As → CSV (Comma delimited)',
				transactions: []
			};
		} else {
			return json({
				success: false,
				message: `Format file tidak didukung (${mimeType || fileName}). Gunakan CSV atau gambar (JPG, PNG).`
			}, { status: 400 });
		}

		return json({
			success: true,
			fileType: fileTypeLabel,
			fileName: file.name,
			fileSize: file.size,
			data: result
		});

	} catch (err) {
		log.api?.error?.({ err }, '[Chat Upload API]');
		console.error('[Chat Upload API]', err);
		return json({ success: false, message: 'Gagal memproses file. Silakan coba lagi.' }, { status: 500 });
	}
}

// ── CSV Processor ──────────────────────────────────────────────────────────────
function processCSV(text) {
	const lines = text.trim().split('\n').filter(l => l.trim());
	if (lines.length < 2) {
		return { transactions: [], error: 'CSV kosong atau hanya berisi header', summary: '0 transaksi ditemukan' };
	}

	// Parse headers
	const rawHeaders = lines[0];
	const separator = rawHeaders.includes(';') ? ';' : ',';
	const headers = rawHeaders.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/\s+/g, '_'));

	const transactions = [];
	const errors = [];

	for (let i = 1; i < Math.min(lines.length, 101); i++) { // max 100 rows
		const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
		const row = {};
		headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

		const nominal = parseNominal(row);
		if (nominal <= 0) {
			errors.push(`Baris ${i + 1}: nominal tidak valid`);
			continue;
		}

		transactions.push({
			line: i + 1,
			kategori_trx: detectKategori(row),
			nominal,
			keterangan: getField(row, ['keterangan', 'description', 'deskripsi', 'note', 'catatan', 'memo', 'ket']),
			tanggal: getField(row, ['tanggal', 'date', 'tgl', 'waktu', 'datetime']),
			raw: row
		});
	}

	return {
		transactions,
		headers,
		totalRows: lines.length - 1,
		processedRows: transactions.length,
		skippedRows: errors.length,
		summary: `${transactions.length} transaksi valid dari ${lines.length - 1} baris`,
		errors: errors.slice(0, 5), // show max 5 errors
		hasMore: lines.length > 101
	};
}

function detectKategori(row) {
	// Check kategori/type field
	const typeField = getField(row, ['kategori', 'type', 'jenis', 'tipe', 'flow', 'direction', 'in_out']);
	if (/masuk|income|in|kredit|credit|pemasukan/i.test(typeField)) return 'Masuk';
	if (/keluar|expense|out|debit|pengeluaran/i.test(typeField)) return 'Keluar';

	// Fallback: check if separate debit/credit columns
	const debit = parseFloat(String(getField(row, ['debit', 'keluar', 'out', 'expense'])).replace(/[^0-9.]/g, '') || '0');
	const kredit = parseFloat(String(getField(row, ['kredit', 'masuk', 'in', 'income', 'credit'])).replace(/[^0-9.]/g, '') || '0');
	if (kredit > 0 && debit === 0) return 'Masuk';
	if (debit > 0 && kredit === 0) return 'Keluar';

	return 'Masuk'; // default
}

function parseNominal(row) {
	const fields = ['nominal', 'jumlah', 'amount', 'nilai', 'total', 'harga', 'debit', 'kredit', 'masuk', 'keluar', 'in', 'out'];
	for (const field of fields) {
		const val = row[field];
		if (val) {
			const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
			if (!isNaN(num) && num > 0) return num;
		}
	}
	return 0;
}

function getField(row, candidates) {
	for (const key of candidates) {
		if (row[key] !== undefined && row[key] !== '') return row[key];
	}
	return '';
}

// ── Image Processor ────────────────────────────────────────────────────────────
function processImage(fileName, fileSize) {
	return {
		type: 'image',
		fileName,
		fileSize,
		message: 'Gambar berhasil diupload. Fitur OCR struk/nota akan segera tersedia di pembaruan berikutnya.',
		suggestion: 'Untuk saat ini, lihat gambar dan input transaksi secara manual menggunakan tombol "Input Transaksi" di chat.',
		ocr: null
	};
}

// ── Text Processor ─────────────────────────────────────────────────────────────
function processText(text, fileName) {
	return {
		type: 'text',
		fileName,
		content: text.slice(0, 1000),
		totalChars: text.length,
		message: `File teks "${fileName}" berhasil dibaca (${text.length} karakter).`,
		suggestion: 'AI dapat menganalisis konten ini untuk mengekstrak data transaksi.'
	};
}
