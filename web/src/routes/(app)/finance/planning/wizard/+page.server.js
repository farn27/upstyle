import { redirect } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/session.js';
import { db } from '$lib/server/drizzle.js';
import { businessPlans } from '$lib/server/businessPlanSchema.js';
import { unitBisnis } from '$lib/server/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export async function load({ cookies, url }) {
  const token = cookies.get('session_id');
  const userId = await getUserIdFromSession(token);
  if (!userId) throw redirect(303, '/auth/login');

  const planId = url.searchParams.get('id');
  let plan = null;

  if (planId) {
    const [found] = await db.select().from(businessPlans)
      .where(and(eq(businessPlans.id, Number(planId)), eq(businessPlans.userId, userId)))
      .limit(1);
    plan = found || null;
  }

  // List unit bisnis user untuk modal apply
  const units = await db.select({ id: unitBisnis.id, namaUnit: unitBisnis.namaUnit, slug: unitBisnis.slug })
    .from(unitBisnis)
    .where(eq(unitBisnis.userId, userId))
    .orderBy(desc(unitBisnis.id));

  return { plan, units, userId };
}
