import { db } from '$lib/server/drizzle';
import { crmContacts, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';
import { error, fail, redirect } from '@sveltejs/kit';

export async function load({ cookies, params }) {
  const userId = await getCurrentUserId(cookies);
  if (!userId) throw error(401, 'Unauthorized');

  const unit = await db.query.unitBisnis.findFirst({
    where: (table) => and(eq(table.slug, params.slug), eq(table.userId, userId))
  });

  if (!unit) {
    return { unit: null, error: 'Unit bisnis tidak ditemukan atau Anda tidak memiliki akses ke unit ini.' };
  }

  return { unit };
}

export const actions = {
  default: async ({ request, cookies, params }) => {
    const userId = await getCurrentUserId(cookies);
    if (!userId) return { status: 401, errors: { message: 'Unauthorized' } };

    const form = await request.formData();
    const teks = (/** @type {string} */ k, /** @type {number} */ maks) => String(form.get(k) ?? '').trim().slice(0, maks);
    const nama = teks('nama', 150);
    const telepon = teks('telepon', 30) || null;
    const email = teks('email', 150) || null;
    const perusahaan = teks('perusahaan', 150) || null;
    const stage = teks('stage', 30) || 'lead';
    // Dulu nama kosong langsung dikirim ke database (kolom wajib) → galat 500
    if (!nama) return fail(400, { message: 'Nama kontak wajib diisi' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, { message: 'Format email tidak valid' });

    const unit = await db.query.unitBisnis.findFirst({
      where: (table) => and(eq(table.slug, params.slug), eq(table.userId, userId))
    });

    if (!unit) {
      return { status: 403, errors: { message: 'Unit bisnis tidak ditemukan atau Anda tidak memiliki akses.' } };
    }

    await db.insert(crmContacts).values({
      ownerId: userId,
      unitId: unit.id,
      nama,
      telepon,
      email,
      perusahaan,
      companyId: null,
      stage,
      sumber: 'manual',
      tags: ''
    });

    return { success: true, redirect: `/finance/${params.slug}/crm/kontak` };
  }
};
