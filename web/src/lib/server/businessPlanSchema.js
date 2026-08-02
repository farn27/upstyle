/**
 * Business Plan Schema
 * Tambahan tabel ke schema utama untuk fitur Business Planning Wizard.
 * Append ke schema.js sudah tidak perlu — ini file terpisah yang
 * di-import di drizzle.config.js dan migrations.
 */
import {
  mysqlTable, int, varchar, text, json, timestamp,
  mysqlEnum, primaryKey, index, tinyint, decimal
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';
import { users } from './schema.js';
import { unitBisnis } from './schema.js';

// ─── Business Plans ────────────────────────────────────────────────────────
export const businessPlans = mysqlTable('business_plans', {
  id: int().autoincrement().notNull(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: int('unit_id').references(() => unitBisnis.id, { onDelete: 'set null' }),

  // Step 1: Identitas Bisnis
  namaBisnis: varchar('nama_bisnis', { length: 255 }).notNull(),
  kategori: varchar('kategori', { length: 100 }).notNull(),
  deskripsi: text('deskripsi'),
  visi: text('visi'),
  misi: text('misi'),

  // Step 2: Target Pasar
  targetPasar: text('target_pasar'),
  problemSolving: text('problem_solving'),
  targetUsia: varchar('target_usia', { length: 100 }),
  targetLokasi: varchar('target_lokasi', { length: 255 }),

  // Step 3: Proposisi Nilai
  nilaiUtama: text('nilai_utama'),
  keunggulan: text('keunggulan'),
  kompetitorUtama: text('kompetitor_utama'),

  // Step 4: Model Pendapatan
  modelPendapatan: varchar('model_pendapatan', { length: 50 }),  // JUAL_PRODUK | JUAL_JASA | LANGGANAN | KOMISI | IKLAN
  estimasiHarga: decimal('estimasi_harga', { precision: 15, scale: 2 }),
  estimasiVolumePerBulan: int('estimasi_volume_per_bulan'),
  proyeksiRevenuePerBulan: decimal('proyeksi_revenue_per_bulan', { precision: 15, scale: 2 }),

  // Step 5: Modal & Biaya
  modalAwal: decimal('modal_awal', { precision: 15, scale: 2 }),
  biayaOperasionalPerBulan: decimal('biaya_operasional_per_bulan', { precision: 15, scale: 2 }),
  breakEvenPoint: int('break_even_point'),  // dalam bulan
  roiEstimasi: decimal('roi_estimasi', { precision: 5, scale: 2 }),

  // Step 6: Channel
  channelPenjualan: json('channel_penjualan'),  // ['offline', 'online', 'marketplace']
  platformOnline: json('platform_online'),       // ['tokopedia', 'shopee', 'instagram']

  // Step 7: Output & Status
  canvasJson: json('canvas_json'),              // Generated Business Model Canvas
  aiSummary: text('ai_summary'),               // AI-generated executive summary
  status: mysqlEnum('status', ['DRAFT', 'COMPLETE', 'APPLIED']).default('DRAFT'),
  currentStep: int('current_step').default(1), // Step wizard saat ini (1-7)
  isSeeded: tinyint('is_seeded').default(0),   // Apakah sudah di-seed ke modul

  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().onUpdateNow(),
}, (table) => [
  primaryKey({ columns: [table.id], name: 'business_plans_id' }),
  index('idx_bp_user').on(table.userId),
  index('idx_bp_unit').on(table.unitId),
]);

// ─── Business Plan Seed Log ────────────────────────────────────────────────
// Track apa saja yang sudah di-generate ke modul saat Apply Plan
export const businessPlanSeedLogs = mysqlTable('business_plan_seed_logs', {
  id: int().autoincrement().notNull(),
  planId: int('plan_id').notNull().references(() => businessPlans.id, { onDelete: 'cascade' }),
  unitId: int('unit_id').notNull(),
  module: varchar('module', { length: 50 }).notNull(), // 'products', 'coa', 'employees', dll
  recordsCreated: int('records_created').default(0),
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.id], name: 'bp_seed_logs_id' }),
  index('idx_bp_seed_plan').on(table.planId),
]);
