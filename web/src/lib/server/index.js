/**
 * Barrel export — semua server utilities
 * Import dari satu tempat: import { sendEmail, log, exportTransaksiExcel } from '$lib/server'
 */

// Email
export { sendEmail, emailTemplates, emailBase } from './email.js';

// Logger
export { logger, log } from './logger.js';

// Image Processing
export { processProductImage, createThumbnail, processAvatar, validateImage } from './imageProcessor.js';

// PDF Generation
export { generateInvoicePDF, generateLaporanPDF } from './pdfGenerator.js';

// Excel Export
export { exportTransaksiExcel, exportProdukExcel, exportKaryawanExcel } from './excelExport.js';

// Existing utilities (re-export untuk convenience)
export { apiSuccess, apiError, apiUnauthorized } from './apiResponse.js';
export { checkRateLimit, getClientIP } from './rateLimit.js';
export { createSession, getUserIdFromSession, deleteSession } from './session.js';
export { encrypt, decrypt, encryptField, decryptField } from './encryption.js';
export { redis } from './redis.js';
export { db, pool } from './drizzle.js';
