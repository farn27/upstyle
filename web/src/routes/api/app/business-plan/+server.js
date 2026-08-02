/**
 * API: Business Planning Wizard
 * GET    /api/app/business-plan        → list plans milik user
 * POST   /api/app/business-plan        → create / update step (upsert by id)
 * GET    /api/app/business-plan/[id]   → ambil 1 plan
 * POST   /api/app/business-plan/apply  → apply plan → seed semua modul
 * DELETE /api/app/business-plan?id=    → hapus plan
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { businessPlans, businessPlanSeedLogs } from '$lib/server/businessPlanSchema.js';
import { eq, and, desc } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';

// GET — list plans atau single plan (?id=N)
export async function GET({ url, cookies, request }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  const id = url.searchParams.get('id');
  try {
    if (id) {
      const [plan] = await db.select().from(businessPlans)
        .where(and(eq(businessPlans.id, Number(id)), eq(businessPlans.userId, userId)))
        .limit(1);
      if (!plan) return apiError('Plan tidak ditemukan', 404);
      return apiSuccess(plan);
    }

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

    return apiSuccess(plans);
  } catch (err) {
    return apiError('Gagal mengambil data: ' + err.message, 500);
  }
}

// POST — create atau update plan
export async function POST({ request, cookies }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  try {
    const body = await request.json();
    const { id, ...data } = body;

    // Bersihkan field yang tidak ada di schema
    const allowed = [
      'namaBisnis', 'kategori', 'deskripsi', 'visi', 'misi',
      'targetPasar', 'problemSolving', 'targetUsia', 'targetLokasi',
      'nilaiUtama', 'keunggulan', 'kompetitorUtama',
      'modelPendapatan', 'estimasiHarga', 'estimasiVolumePerBulan', 'proyeksiRevenuePerBulan',
      'modalAwal', 'biayaOperasionalPerBulan', 'breakEvenPoint', 'roiEstimasi',
      'channelPenjualan', 'platformOnline',
      'canvasJson', 'aiSummary', 'status', 'currentStep'
    ];

    const cleanData = {};
    for (const key of allowed) {
      if (data[key] !== undefined) cleanData[key] = data[key];
    }

    if (id) {
      // Update existing plan
      const [existing] = await db.select({ id: businessPlans.id })
        .from(businessPlans)
        .where(and(eq(businessPlans.id, Number(id)), eq(businessPlans.userId, userId)))
        .limit(1);
      if (!existing) return apiError('Plan tidak ditemukan', 404);

      await db.update(businessPlans).set(cleanData).where(eq(businessPlans.id, Number(id)));
      return apiSuccess({ id: Number(id) }, 'Plan berhasil diperbarui');
    } else {
      // Create new plan
      if (!cleanData.namaBisnis || !cleanData.kategori) {
        return apiError('namaBisnis dan kategori wajib diisi', 400);
      }
      const [result] = await db.insert(businessPlans).values({ userId, ...cleanData });
      return apiSuccess({ id: result.insertId }, 'Plan berhasil dibuat');
    }
  } catch (err) {
    return apiError('Gagal menyimpan plan: ' + err.message, 500);
  }
}

// DELETE — hapus plan
export async function DELETE({ url, cookies, request }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  const id = url.searchParams.get('id');
  if (!id) return apiError('id wajib', 400);

  try {
    await db.delete(businessPlans)
      .where(and(eq(businessPlans.id, Number(id)), eq(businessPlans.userId, userId)));
    return apiSuccess(null, 'Plan berhasil dihapus');
  } catch (err) {
    return apiError('Gagal hapus: ' + err.message, 500);
  }
}
