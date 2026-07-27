import { db } from '$lib/server/drizzle';
import { unitBisnis } from '$lib/server/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
  const userId = await getCurrentUserId(cookies);
  if (!userId) return { unit: null };

  const unit = await db.query.unitBisnis.findFirst({
    where: (table) => and(eq(table.slug, params.slug), eq(table.userId, userId))
  });

  return { unit };
}
