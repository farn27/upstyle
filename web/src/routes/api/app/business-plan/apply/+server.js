/**
 * POST /api/app/business-plan/apply
 * Apply business plan → seed semua modul ke unit bisnis yang dipilih.
 *
 * Yang di-seed:
 * 1. Unit Bisnis (baru atau pakai existing)
 * 2. Kategori Produk
 * 3. Produk (sample dari template)
 * 4. Chart of Accounts (COA)
 * 5. Karyawan (template struktur)
 * 6. Supplier
 * 7. ABC Categories (transaksi)
 * 8. Tax Rates
 * 9. Budget awal (opsional)
 */
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/drizzle';
import { getCurrentUserId } from '$lib/server/getUser';
import { businessPlans, businessPlanSeedLogs } from '$lib/server/businessPlanSchema.js';
import {
  unitBisnis, kategoriProduk, products, chartOfAccounts,
  employees, suppliers, abcCategories, taxRates, riwayatAksi
} from '$lib/server/schema.js';
import { eq, and } from 'drizzle-orm';
import { apiSuccess, apiError, apiUnauthorized } from '$lib/server/apiResponse';
import { log } from '$lib/server/logger';
import {
  PRODUCT_TEMPLATES, EMPLOYEE_TEMPLATES, SUPPLIER_TEMPLATES,
  ABC_CATEGORY_TEMPLATES, TAX_RATE_TEMPLATES, CATEGORY_TO_COA,
  getTemplate
} from '$lib/server/businessPlanTemplates.js';
import { DEFAULT_COAS } from '$lib/server/defaultCoa.js';
import crypto from 'crypto';
import { hashEmployeePassword } from '$lib/server/employeePassword.js';
import { encryptField } from '$lib/server/encryption.js';

export async function POST({ request, cookies }) {
  const userId = await getCurrentUserId(cookies, request);
  if (!userId) return apiUnauthorized();

  let body;
  try { body = await request.json(); } catch { return apiError('Invalid JSON', 400); }

  const { planId, unitId: existingUnitId } = body;
  if (!planId) return apiError('planId wajib', 400);

  // Ambil plan
  const [plan] = await db.select().from(businessPlans)
    .where(and(eq(businessPlans.id, Number(planId)), eq(businessPlans.userId, userId)))
    .limit(1);
  if (!plan) return apiError('Plan tidak ditemukan', 404);
  if (plan.isSeeded) return apiError('Plan ini sudah pernah di-apply', 400);

  const kategori = plan.kategori;
  const seedResults = {};

  try {
    await db.transaction(async (tx) => {

      // ── STEP 1: Buat atau pakai unit bisnis ─────────────────────────────
      let unitId = existingUnitId;

      if (!unitId) {
        const slug = plan.namaBisnis.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
          .substring(0, 50) + '-' + Date.now().toString().slice(-4);

        const [unitResult] = await tx.insert(unitBisnis).values({
          userId,
          namaUnit: plan.namaBisnis,
          slug,
          kategori,
          modalAwal: String(plan.modalAwal || 0),
          alamat: plan.targetLokasi || 'Alamat belum diisi',
        });
        unitId = unitResult.insertId;
        seedResults.unit = { id: unitId, created: true };
      } else {
        seedResults.unit = { id: unitId, created: false };
      }

      // ── STEP 2: Kategori Produk ─────────────────────────────────────────
      const prodCats = getTemplateCategories(kategori);
      let catCount = 0;
      const catIdMap = {};

      for (const catName of prodCats) {
        try {
          const [catResult] = await tx.insert(kategoriProduk).values({
            unitId, namaKategori: catName.toUpperCase()
          });
          catIdMap[catName.toUpperCase()] = catResult.insertId;
          catCount++;
        } catch { /* skip duplicate */ }
      }
      seedResults.kategoriProduk = catCount;

      // ── STEP 3: Produk ──────────────────────────────────────────────────
      const prodTemplates = getTemplate(PRODUCT_TEMPLATES, kategori);
      let prodCount = 0;

      for (const prod of prodTemplates) {
        const prodId = crypto.randomUUID();
        const prodSlug = prod.nama.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') + '-' + prodId.slice(0, 5);
        const catKey = prod.kategori?.toUpperCase();
        const catId = catIdMap[catKey] || null;

        try {
          await tx.insert(products).values({
            id: prodId, userId, unitId,
            kategoriId: catId,
            nama: prod.nama,
            sku: prod.sku || `SKU-${prodId.slice(0, 8).toUpperCase()}`,
            slug: prodSlug,
            hargaBeli: String(prod.hargaBeli || 0),
            hargaJual: String(prod.hargaJual || 0),
            stok: prod.stok || 0,
            minStok: 5,
          });
          prodCount++;
        } catch { /* skip duplicate */ }
      }
      seedResults.products = prodCount;

      // ── STEP 4: Chart of Accounts ───────────────────────────────────────
      const coaKey = CATEGORY_TO_COA[kategori] || 'MINIMARKET';
      const coaList = DEFAULT_COAS[coaKey] || DEFAULT_COAS['MINIMARKET'] || [];
      let coaCount = 0;

      for (const coa of coaList) {
        try {
          await tx.insert(chartOfAccounts).values({
            unitId,
            kodeAkun: coa.kodeAkun,
            namaAkun: coa.namaAkun,
            tipeAkun: coa.tipeAkun,
            normalBalance: coa.normalBalance,
            deskripsi: coa.deskripsi || null,
            isActive: 1,
          });
          coaCount++;
        } catch { /* skip duplicate */ }
      }
      seedResults.coa = coaCount;

      // ── STEP 5: Karyawan (Template) ─────────────────────────────────────
      const empTemplates = getTemplate(EMPLOYEE_TEMPLATES, kategori);
      let empCount = 0;

      for (const emp of empTemplates) {
        const pinHash = await hashEmployeePassword(emp.pin || '1234');
        const encryptedPin = encryptField(emp.pin || '1234', true);
        const slug = emp.fullName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
          + '-' + Math.floor(1000 + Math.random() * 9000);
        try {
          await tx.insert(employees).values({
            companyId: unitId, userId,
            fullName: emp.fullName, slug,
            position: emp.position,
            salary: String(emp.salary || 0),
            role: emp.role || 'staff',
            password: pinHash,
            pin: encryptedPin,
            status: 'active',
          });
          empCount++;
        } catch { /* skip duplicate */ }
      }
      seedResults.employees = empCount;

      // ── STEP 6: Supplier ────────────────────────────────────────────────
      const supplierTemplates = getTemplate(SUPPLIER_TEMPLATES, kategori);
      let supCount = 0;

      for (const sup of supplierTemplates) {
        try {
          await tx.insert(suppliers).values({ unitId, namaSupplier: sup.namaSupplier, kontak: sup.kontak });
          supCount++;
        } catch { /* skip */ }
      }
      seedResults.suppliers = supCount;

      // ── STEP 7: ABC Categories ──────────────────────────────────────────
      const abcTemplates = getTemplate(ABC_CATEGORY_TEMPLATES, kategori);
      let abcCount = 0;

      for (const abc of abcTemplates) {
        try {
          await tx.insert(abcCategories).values({
            namaKategori: abc.namaKategori,
            abcLevel: abc.abcLevel || 'B',
            jenis: abc.jenis || 'keluar',
          });
          abcCount++;
        } catch { /* skip duplicate */ }
      }
      seedResults.abcCategories = abcCount;

      // ── STEP 8: Tax Rates ───────────────────────────────────────────────
      const taxKey = CATEGORY_TO_COA[kategori] || 'DEFAULT';
      const taxTemplates = TAX_RATE_TEMPLATES[taxKey] || TAX_RATE_TEMPLATES['DEFAULT'];
      let taxCount = 0;

      for (const tax of taxTemplates) {
        try {
          await tx.insert(taxRates).values({
            unitId,
            namaPajak: tax.namaPajak,
            persentase: String(tax.persentase),
            tipe: tax.tipe,
            isDefault: tax.isDefault || 0,
            isActive: 1,
          });
          taxCount++;
        } catch { /* skip */ }
      }
      seedResults.taxRates = taxCount;

      // ── STEP 9: Log & Update Plan ────────────────────────────────────────
      for (const [module, count] of Object.entries(seedResults)) {
        if (module === 'unit') continue;
        await tx.insert(businessPlanSeedLogs).values({
          planId: Number(planId), unitId,
          module, recordsCreated: Number(count) || 0,
        });
      }

      await tx.update(businessPlans).set({
        unitId, isSeeded: 1, status: 'APPLIED'
      }).where(eq(businessPlans.id, Number(planId)));

      // Log ke riwayat aksi
      await tx.insert(riwayatAksi).values({
        userId, unitId,
        pesan: `Business Plan "${plan.namaBisnis}" berhasil di-apply. ${Object.values(seedResults).reduce((a, b) => a + (Number(b) || 0), 0)} data di-generate.`,
        tipe: 'success',
        kategori: 'PLANNING',
      });
    });

    return apiSuccess({
      unitId: existingUnitId || seedResults.unit?.id,
      seedResults,
      totalRecords: Object.values(seedResults).reduce((a, b) => a + (Number(b) || 0), 0),
    }, `Business Plan berhasil di-apply! Semua modul telah disiapkan.`);

  } catch (err) {
    log.planning.error({ err }, '[BusinessPlan Apply]');
    return apiError('Gagal apply plan: ' + err.message, 500);
  }
}

// Helper: get template kategori produk per bisnis
function getTemplateCategories(kategori) {
  const map = {
    FNB_RESTO: ['MAKANAN UTAMA', 'MINUMAN', 'SNACK & DESSERT'],
    FNB_COFFEE_ROASTERY: ['KOPI', 'NON-KOPI', 'PASTRY'],
    FNB_CATERING: ['MENU PRASMANAN', 'MENU BOX', 'SNACK'],
    FNB_PRODUKSI: ['BAHAN BAKU', 'BARANG SETENGAH JADI', 'PRODUK JADI'],
    RETAIL_FASHION: ['ATASAN', 'BAWAHAN', 'AKSESORIS', 'OUTERWEAR'],
    RETAIL_MINIMARKET: ['SEMBAKO', 'MINUMAN', 'SNACK', 'KEBERSIHAN', 'ROKOK'],
    RETAIL_BEAUTY: ['SKINCARE', 'MAKEUP', 'HAIRCARE', 'BODYCARE'],
    RETAIL_ELECTRONIC: ['SMARTPHONE', 'LAPTOP', 'AKSESORIS', 'SPAREPART'],
    JASA_BARBER: ['GUNTING', 'TREATMENT', 'PRODUK', 'CUCI'],
    JASA_LAUNDRY: ['KILOAN', 'SATUAN', 'EXPRESS'],
    JASA_TEKNIK: ['SERVICE', 'SPAREPART', 'INSTALASI'],
    HEALTH_CLINIC: ['KONSULTASI', 'TINDAKAN', 'LABORATORIUM', 'OBAT'],
    TECH_SOFTWARE: ['WEBSITE', 'MOBILE APP', 'SISTEM', 'MAINTENANCE', 'HOSTING'],
    AGRIBISNIS: ['KOMODITAS', 'BIBIT', 'PUPUK', 'SAYURAN', 'BUAH'],
    DEFAULT: ['PRODUK', 'JASA', 'LAINNYA'],
  };
  return map[kategori] || map['DEFAULT'];
}
