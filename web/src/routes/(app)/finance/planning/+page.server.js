import { redirect } from '@sveltejs/kit';
import { getUserIdFromSession } from '$lib/server/session.js';
import { db } from '$lib/server/drizzle.js';
import { businessPlans } from '$lib/server/businessPlanSchema.js';
import { eq, desc } from 'drizzle-orm';

export async function load({ cookies }) {
  const token = cookies.get('session_id');
  const userId = await getUserIdFromSession(token);
  if (!userId) throw redirect(303, '/auth/login');

  const plans = await db.select({
    id: businessPlans.id,
    namaBisnis: businessPlans.namaBisnis,
    kategori: businessPlans.kategori,
    status: businessPlans.status,
    currentStep: businessPlans.currentStep,
    isSeeded: businessPlans.isSeeded,
    createdAt: businessPlans.createdAt,
  }).from(businessPlans)
    .where(eq(businessPlans.userId, userId))
    .orderBy(desc(businessPlans.id));

  return { plans, userId };
}
