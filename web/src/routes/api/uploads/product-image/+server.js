import { json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import { getCurrentUserId } from '$lib/server/getUser';
import { validateImage, processProductImage } from '$lib/server/imageProcessor.js';
import { uploadToSupabase, isSupabaseConfigured } from '$lib/server/storage.js';

/** POST /api/uploads/product-image */
export async function POST({ request, cookies }) {
    try {
        const userId = await getCurrentUserId(cookies, request);
        if (!userId) {
            return json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile || imageFile.size === 0) {
            return json({ success: false, message: 'No image file provided' }, { status: 400 });
        }

        // Validate & process image
        const rawBuffer = Buffer.from(await imageFile.arrayBuffer());
        const validation = await validateImage(rawBuffer, { maxSizeMB: 5 });
        if (!validation.valid) {
            return json({ success: false, message: validation.error }, { status: 400 });
        }

        const processedBuffer = await processProductImage(rawBuffer, {
            width: 800, height: 800, quality: 80
        });

        const randomId = crypto.randomBytes(8).toString('hex');
        const safeName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
        const filename = `${Date.now()}-${randomId}-${safeName}.webp`;

        let publicUrl;

        if (isSupabaseConfigured()) {
            // Production: upload ke Supabase Storage
            const result = await uploadToSupabase(processedBuffer, filename, 'image/webp', 'products');
            publicUrl = result.url;
            console.log('[Upload] Supabase Storage:', publicUrl);
        } else {
            // Local dev: simpan ke filesystem
            const uploadsDir = join(process.cwd(), 'static', 'uploads', 'products');
            mkdirSync(uploadsDir, { recursive: true });
            writeFileSync(join(uploadsDir, filename), processedBuffer);
            publicUrl = `/uploads/products/${filename}`;
            console.log('[Upload] Local filesystem:', publicUrl);
        }

        return json({ success: true, data: { url: publicUrl, filename } });

    } catch (err) {
        console.error('[Upload] Error:', err);
        return json({ success: false, message: err.message }, { status: 500 });
    }
}
