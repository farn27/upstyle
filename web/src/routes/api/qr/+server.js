/**
 * GET /api/qr?type=product&id=X&unitId=Y
 * Generate QR code untuk berbagai kebutuhan: produk POS, staff login, invoice
 */
import { apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { getCurrentUserId } from '$lib/server/getUser';
import { generateQRBuffer, posProductQRPayload, staffPortalQRPayload, invoiceQRPayload } from '$lib/qrcode.js';
import { env } from '$env/dynamic/private';

export async function GET({ url, cookies, request }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  const type = url.searchParams.get('type') || 'product';
  const id = url.searchParams.get('id') || '';
  const unitId = url.searchParams.get('unitId') || '';
  // Ukuran dibatasi: dulu size bebas (mis. 50000) membuat server membuat gambar raksasa (S-15)
  const sizeMentah = parseInt(url.searchParams.get('size') || '300');
  const size = Number.isFinite(sizeMentah) ? Math.min(1024, Math.max(64, sizeMentah)) : 300;
  if (id.length > 100 || unitId.length > 20) return apiError('Parameter terlalu panjang', 400);

  let payload = '';

  switch (type) {
    case 'product':
      if (!id || !unitId) return apiError('id dan unitId wajib', 400);
      payload = posProductQRPayload(id, unitId);
      break;
    case 'staff':
      if (!id || !unitId) return apiError('id dan unitId wajib', 400);
      payload = staffPortalQRPayload(id, unitId);
      break;
    case 'invoice':
      if (!id) return apiError('id wajib', 400);
      payload = invoiceQRPayload(id, env.ORIGIN || '');
      break;
    case 'text':
      payload = url.searchParams.get('text') || id;
      if (!payload || payload.length > 500) return apiError('Teks QR wajib diisi (maks. 500 karakter)', 400);
      break;
    default:
      return apiError('type tidak valid', 400);
  }

  const buffer = await generateQRBuffer(payload, { size });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="qr-${type}-${id.replace(/[^\w.-]/g, '_').slice(0, 60)}.png"`,
    },
  });
}

