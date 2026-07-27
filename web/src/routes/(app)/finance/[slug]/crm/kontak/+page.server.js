import { db } from '$lib/server/drizzle';
import { crmContacts, unitBisnis } from '$lib/server/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
  const userId = await getCurrentUserId(cookies);
  const slug = params.slug;

  if (!userId) return { unit: null, contacts: [] };

  const unit = await db.query.unitBisnis.findFirst({
    where: (table) => and(eq(table.slug, slug), eq(table.userId, userId))
  });

  if (!unit) {
    return { unit: null, contacts: [] };
  }

  const contacts = await db.query.crmContacts.findMany({
    where: (table) => and(eq(table.unitId, unit.id), eq(table.ownerId, userId)),
    orderBy: [desc(crmContacts.createdAt)],
    limit: 100,
  });

  return { unit, contacts };
}
