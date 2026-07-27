import { db } from '$lib/server/drizzle';
import { unitBisnis, crmContacts, crmDeals, crmActivities, crmTasks } from '$lib/server/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUserId } from '$lib/server/getUser';

export async function load({ cookies, params }) {
  const userId = await getCurrentUserId(cookies);
  const slug = params.slug;

  if (!userId) return { unit: null, stats: { contacts: 0, deals: 0, activities: 0, tasks: 0 } };

  try {
    const unit = await db.query.unitBisnis.findFirst({
      where: (table) => and(eq(table.slug, slug), eq(table.userId, userId))
    });

    if (!unit) {
      return { unit: null, stats: { contacts: 0, deals: 0, activities: 0, tasks: 0 } };
    }

    const [contactsCount, dealsCount, activitiesCount, tasksCount] = await Promise.all([
      db.select({ count: sql`COUNT(*)` }).from(crmContacts).where(eq(crmContacts.unitId, unit.id)),
      db.select({ count: sql`COUNT(*)` }).from(crmDeals).where(eq(crmDeals.unitId, unit.id)),
      db.select({ count: sql`COUNT(*)` }).from(crmActivities).where(eq(crmActivities.unitId, unit.id)),
      db.select({ count: sql`COUNT(*)` }).from(crmTasks).where(eq(crmTasks.unitId, unit.id)),
    ]);

    return {
      unit,
      stats: {
        contacts: Number(contactsCount[0]?.count ?? 0),
        deals: Number(dealsCount[0]?.count ?? 0),
        activities: Number(activitiesCount[0]?.count ?? 0),
        tasks: Number(tasksCount[0]?.count ?? 0),
      }
    };
  } catch (err) {
    console.error('CRM unit load error:', err);
    return { unit: null, stats: { contacts: 0, deals: 0, activities: 0, tasks: 0 } };
  }
}
