/**
 * QR Code utilities — qrcode + @zxing/library
 * Client + server safe:
 * - generateQR: server-side (Node.js), generate QR sebagai data URL / Buffer
 * - scanQR: client-side only (browser), scan QR dari kamera atau gambar
 */

// ─── SERVER SIDE: Generate QR ─────────────────────────────────────────────────

/**
 * Generate QR code sebagai data URL (base64 PNG)
 * Dipanggil dari server route atau API endpoint.
 *
 * @param {string} text - Konten QR (URL, ID, JSON string)
 * @param {{ size?: number, margin?: number, dark?: string, light?: string }} opts
 * @returns {Promise<string>} data URL base64
 */
export async function generateQRDataURL(text, opts = {}) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toDataURL(text, {
    width: opts.size || 300,
    margin: opts.margin ?? 2,
    color: {
      dark: opts.dark || '#0f172a',
      light: opts.light || '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate QR code sebagai Buffer PNG
 * Untuk embed ke PDF / kirim via API
 *
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
export async function generateQRBuffer(text, opts = {}) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toBuffer(text, {
    width: opts.size || 300,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generate QR code sebagai SVG string
 * Untuk embed langsung di HTML/email
 *
 * @param {string} text
 */
export async function generateQRSVG(text) {
  const QRCode = (await import('qrcode')).default;
  return QRCode.toString(text, { type: 'svg', errorCorrectionLevel: 'H' });
}

// ─── QR Payload Helpers ───────────────────────────────────────────────────────

/**
 * QR untuk produk POS — encode productId + unitId
 */
export function posProductQRPayload(productId, unitId) {
  return JSON.stringify({ type: 'PRODUCT', productId, unitId });
}

/**
 * QR untuk login staff portal — encode employeeId + unitSlug
 */
export function staffPortalQRPayload(employeeId, unitSlug) {
  return JSON.stringify({ type: 'STAFF_LOGIN', employeeId, unitSlug });
}

/**
 * QR untuk invoice — URL ke halaman invoice
 */
export function invoiceQRPayload(orderId, origin = '') {
  return `${origin}/api/invoice/${orderId}`;
}

// ─── CLIENT SIDE: Scan QR (Browser only) ─────────────────────────────────────

/**
 * Scan QR code dari HTMLVideoElement (live camera)
 * Pakai di Svelte component — import secara dynamic
 *
 * Usage di Svelte:
 * ```svelte
 * import { startQRScanner, stopQRScanner } from '$lib/qrcode.js';
 * const { stop } = await startQRScanner(videoElement, (result) => console.log(result));
 * ```
 */
export async function startQRScanner(videoElement, onResult) {
  if (typeof window === 'undefined') throw new Error('QR scanner hanya bisa di browser');

  const { BrowserQRCodeReader } = await import('@zxing/library');
  const reader = new BrowserQRCodeReader();

  // Start decode dari camera stream
  const controls = await reader.decodeFromVideoDevice(null, videoElement, (result, err) => {
    if (result) onResult(result.getText());
  });

  return {
    stop: () => controls.stop(),
    reader,
  };
}

/**
 * Scan QR dari file gambar (upload)
 * @param {File} file
 * @returns {Promise<string>} decoded text
 */
export async function scanQRFromFile(file) {
  if (typeof window === 'undefined') throw new Error('Hanya bisa di browser');
  const { BrowserQRCodeReader } = await import('@zxing/library');
  const reader = new BrowserQRCodeReader();
  const imageUrl = URL.createObjectURL(file);
  try {
    const result = await reader.decodeFromImageUrl(imageUrl);
    return result.getText();
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
