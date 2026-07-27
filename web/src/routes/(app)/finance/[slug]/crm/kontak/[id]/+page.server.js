import { db } from '$lib/server/drizzle';
import { crmContacts, crmActivities, unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
  const userId = await getCurrentUserId(cookies);
  const slug = params.slug;
  const id = Number(params.id);

  if (!userId || !id) return { kontak: null, aktivitas: [], unit: null };

  const unit = await db.query.unitBisnis.findFirst({
    where: (table) => and(eq(table.slug, slug), eq(table.userId, userId))
  });

  if (!unit) return { kontak: null, aktivitas: [], unit: null };

  const kontak = await db.query.crmContacts.findFirst({
    where: (table) => and(eq(table.id, id), eq(table.unitId, unit.id), eq(table.ownerId, userId))
  });

  if (!kontak) return { kontak: null, aktivitas: [], unit };

  const aktivitas = await db.query.crmActivities.findMany({
    where: (table) => and(eq(table.kontakId, id), eq(table.unitId, unit.id)),
    orderBy: [{ column: crmActivities.tanggal, order: 'desc' }],
    limit: 50,
  });

  return { unit, kontak, aktivitas };
}
