/**
 * File storage service menggunakan Cloudflare R2 via S3-compatible REST API.
 * Menggunakan fetch langsung + AWS Signature V4 — tanpa @aws-sdk dependency.
 *
 * Setup di .env:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import path from 'path';

// ─── Magic Number Detection (File Signature Validation) ─────────────────────────────

/**
 * Magic numbers for common file types
 * Format: [file extension, magic number hex pattern]
 */
const MAGIC_NUMBERS = {
	// Images
	'.jpg': ['FF D8 FF'], // JPEG
	'.jpeg': ['FF D8 FF'],
	'.png': ['89 50 4E 47 0D 0A 1A 0A'], // PNG
	'.webp': ['52 49 46 46'], // WebP (RIFF)
	'.gif': ['47 49 46 38'], // GIF
	// Documents
	'.pdf': ['25 50 44 46'], // PDF
	'.xlsx': ['50 4B 03 04'], // XLSX (ZIP)
	'.csv': [] // CSV has no magic number, validated by content
};

/**
 * Validate file using magic number detection
 * @param {Buffer} buffer - File buffer
 * @param {string} ext - File extension
 * @returns {boolean} - True if file signature matches extension
 */
function validateMagicNumber(buffer, ext) {
	const patterns = MAGIC_NUMBERS[ext.toLowerCase()];
	if (!patterns || patterns.length === 0) {
		// Files without magic numbers (like CSV) pass extension validation
		return true;
	}

	// Check each pattern for this file type
	for (const pattern of patterns) {
		const patternBytes = pattern.split(' ').map(hex => parseInt(hex, 16));
		if (buffer.length < patternBytes.length) continue;

		let match = true;
		for (let i = 0; i < patternBytes.length; i++) {
			if (buffer[i] !== patternBytes[i]) {
				match = false;
				break;
			}
		}
		if (match) return true;
	}

	return false;
}

// ─── AWS Signature V4 ─────────────────────────────────────────────────────────

/**
 * Buat canonical request dan signature untuk S3/R2
 * @param {{ method: string, url: URL, headers: Record<string,string>, body: Buffer|null }} opts
 */
function signRequest({ method, url, headers, body }) {
	const accessKey = env.R2_ACCESS_KEY_ID;
	const secretKey = env.R2_SECRET_ACCESS_KEY;
	const region = 'auto';
	const service = 's3';

	const now = new Date();
	const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 8); // YYYYMMDD
	const dateTimeStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'; // YYYYMMDDTHHmmssZ

	const bodyHash = crypto
		.createHash('sha256')
		.update(body || Buffer.alloc(0))
		.digest('hex');

	// Tambahkan header standar
	headers['x-amz-date'] = dateTimeStr;
	headers['x-amz-content-sha256'] = bodyHash;
	headers['host'] = url.host;

	// Sort header keys untuk canonical request
	const signedHeaderNames = Object.keys(headers).sort();
	const canonicalHeaders = signedHeaderNames.map((k) => `${k.toLowerCase()}:${headers[k]}\n`).join('');
	const signedHeaders = signedHeaderNames.map((k) => k.toLowerCase()).join(';');

	const canonicalUri = url.pathname;
	const canonicalQueryString = url.search.slice(1);

	const canonicalRequest = [
		method,
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		bodyHash
	].join('\n');

	const credentialScope = `${dateStr}/${region}/${service}/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		dateTimeStr,
		credentialScope,
		crypto.createHash('sha256').update(canonicalRequest).digest('hex')
	].join('\n');

	// Derive signing key
	const kDate = hmac(`AWS4${secretKey}`, dateStr);
	const kRegion = hmac(kDate, region);
	const kService = hmac(kRegion, service);
	const kSigning = hmac(kService, 'aws4_request');
	const signature = hmac(kSigning, stringToSign, 'hex');

	headers[
		'Authorization'
	] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

	return headers;
}

/**
 * @param {Buffer|string} key
 * @param {string} data
 * @param {'hex'|'buffer'} [encoding]
 * @returns {Buffer|string}
 */
function hmac(key, data, encoding) {
	const h = crypto.createHmac('sha256', key).update(data);
	if (encoding === 'hex') return h.digest('hex');
	return h.digest();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Cek apakah R2 sudah dikonfigurasi
 */
export function isStorageConfigured() {
	return Boolean(
		env.R2_ACCOUNT_ID &&
			env.R2_ACCESS_KEY_ID &&
			env.R2_SECRET_ACCESS_KEY &&
			env.R2_BUCKET_NAME &&
			env.R2_PUBLIC_URL
	);
}

/**
 * Upload file ke Cloudflare R2
 * @param {{ buffer: Buffer, originalName: string, folder: string, contentType?: string }} opts
 * @returns {Promise<{ url: string, key: string }>}
 */
export async function uploadFile({ buffer, originalName, folder, contentType }) {
	if (!env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME belum dikonfigurasi di .env');
	if (!env.R2_ACCOUNT_ID) throw new Error('R2_ACCOUNT_ID belum dikonfigurasi di .env');
	if (!env.R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL belum dikonfigurasi di .env');

	// Validasi ukuran (max 10MB)
	if (buffer.length > 10 * 1024 * 1024) {
		throw new Error('Ukuran file maksimal 10MB');
	}

	const ext = path.extname(originalName).toLowerCase();
	const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.xlsx', '.csv'];
	if (!allowedExt.includes(ext)) {
		throw new Error(`Tipe file ${ext} tidak diizinkan`);
	}

	// Validasi magic number (file signature)
	if (!validateMagicNumber(buffer, ext)) {
		throw new Error(`File signature tidak valid untuk tipe ${ext}. File mungkin terkorupsi atau salah ekstensi.`);
	}

	const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
	const key = `${folder}/${uniqueName}`;
	const mimeType = contentType || getMimeType(ext);

	const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
	const url = new URL(`/${env.R2_BUCKET_NAME}/${key}`, endpoint);

	/** @type {Record<string, string>} */
	const headers = {
		'Content-Type': mimeType,
		'Content-Length': String(buffer.length),
		'Cache-Control': 'public, max-age=31536000, immutable'
	};

	const signedHeaders = signRequest({ method: 'PUT', url, headers, body: buffer });

	const response = await fetch(url.toString(), {
		method: 'PUT',
		headers: signedHeaders,
		body: buffer
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`R2 upload error ${response.status}: ${text}`);
	}

	const baseUrl = env.R2_PUBLIC_URL.replace(/\/$/, '');
	return { url: `${baseUrl}/${key}`, key };
}

/**
 * Hapus file dari R2
 * @param {string} key
 */
export async function deleteFile(key) {
	if (!key || !env.R2_ACCOUNT_ID || !env.R2_BUCKET_NAME) return;

	try {
		const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
		const url = new URL(`/${env.R2_BUCKET_NAME}/${key}`, endpoint);
		/** @type {Record<string, string>} */
		const headers = {};
		const signedHeaders = signRequest({ method: 'DELETE', url, headers, body: null });

		await fetch(url.toString(), { method: 'DELETE', headers: signedHeaders });
	} catch (err) {
		console.error('[Storage] Gagal hapus file:', err);
	}
}

/**
 * Upload dari SvelteKit File object (dari formData)
 * @param {File} file
 * @param {string} folder
 */
export async function uploadFromFormFile(file, folder) {
	if (!file || typeof file === 'string' || file.size === 0) {
		throw new Error('File tidak valid');
	}
	const buffer = Buffer.from(await file.arrayBuffer());
	return uploadFile({ buffer, originalName: file.name, folder, contentType: file.type || undefined });
}

/**
 * Ekstrak key dari URL R2
 * @param {string} url
 * @returns {string|null}
 */
export function extractKeyFromUrl(url) {
	if (!url) return null;
	const baseUrl = (env.R2_PUBLIC_URL || '').replace(/\/$/, '');
	if (!baseUrl || !url.startsWith(baseUrl)) return null;
	return url.slice(baseUrl.length + 1);
}

/** @param {string} ext */
function getMimeType(ext) {
	/** @type {Record<string, string>} */
	const map = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.gif': 'image/gif',
		'.pdf': 'application/pdf',
		'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'.csv': 'text/csv'
	};
	return map[ext] || 'application/octet-stream';
}
