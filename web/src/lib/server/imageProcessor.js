/**
 * Image Processor — Sharp
 * Resize, compress, dan convert gambar untuk upload produk, avatar, dll.
 */
import sharp from 'sharp';

/**
 * Process foto produk — resize + compress ke WebP
 * @param {Buffer} buffer
 * @param {{ width?: number, height?: number, quality?: number }} opts
 * @returns {Promise<Buffer>}
 */
export async function processProductImage(buffer, opts = {}) {
  const { width = 800, height = 800, quality = 80 } = opts;
  return sharp(buffer)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/**
 * Buat thumbnail kecil untuk grid produk
 * @param {Buffer} buffer
 */
export async function createThumbnail(buffer) {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover', position: 'center' })
    .webp({ quality: 70 })
    .toBuffer();
}

/**
 * Compress avatar user
 * @param {Buffer} buffer
 */
export async function processAvatar(buffer) {
  return sharp(buffer)
    .resize(200, 200, { fit: 'cover', position: 'center' })
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Get image metadata
 * @param {Buffer} buffer
 */
export async function getImageMeta(buffer) {
  const meta = await sharp(buffer).metadata();
  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    size: meta.size,
  };
}

/**
 * Validate image file
 * @param {Buffer} buffer
 * @param {{ maxSizeMB?: number }} opts
 */
export async function validateImage(buffer, { maxSizeMB = 5 } = {}) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (buffer.length > maxBytes) {
    return { valid: false, error: `Ukuran file maksimal ${maxSizeMB}MB` };
  }
  try {
    const meta = await sharp(buffer).metadata();
    const allowed = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    if (!allowed.includes(meta.format || '')) {
      return { valid: false, error: 'Format hanya JPEG, PNG, WebP, GIF' };
    }
    return { valid: true, meta };
  } catch {
    return { valid: false, error: 'File bukan gambar valid' };
  }
}
