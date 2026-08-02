/**
 * Superforms helpers — sveltekit-superforms + zod
 * Centralized form schemas untuk semua modul.
 *
 * Usage di +page.server.js:
 *   import { superValidate } from 'sveltekit-superforms';
 *   import { zod } from 'sveltekit-superforms/adapters';
 *   import { loginSchema } from '$lib/forms.js';
 *   const form = await superValidate(zod(loginSchema));
 *   return { form };
 *
 * Usage di +page.svelte:
 *   import { superForm } from 'sveltekit-superforms';
 *   const { form, errors, enhance } = superForm(data.form);
 */

import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(50),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string(),
  token: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

// ─── Unit Bisnis ──────────────────────────────────────────────────────────────

export const unitBisnisSchema = z.object({
  namaUnit: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  kategori: z.string().min(1, 'Pilih kategori bisnis'),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  modalAwal: z.coerce.number().min(0).default(0),
});

// ─── Produk ───────────────────────────────────────────────────────────────────

export const produkSchema = z.object({
  nama: z.string().min(1, 'Nama produk wajib diisi').max(255),
  sku: z.string().optional(),
  hargaBeli: z.coerce.number().min(0, 'Harga beli tidak boleh negatif'),
  hargaJual: z.coerce.number().min(0, 'Harga jual tidak boleh negatif'),
  stok: z.coerce.number().int().min(0).default(0),
  minStok: z.coerce.number().int().min(0).default(5),
  kategori: z.string().optional(),
  unitId: z.coerce.number().int().positive(),
});

// ─── Transaksi ────────────────────────────────────────────────────────────────

export const transaksiSchema = z.object({
  unitId: z.coerce.number().int().positive(),
  kategoriTrx: z.enum(['MASUK', 'KELUAR']),
  nominal: z.coerce.number().positive('Nominal harus lebih dari 0'),
  keterangan: z.string().min(1, 'Keterangan wajib diisi').max(500),
  metodeBayar: z.string().default('KAS'),
});

// ─── HR ───────────────────────────────────────────────────────────────────────

export const karyawanSchema = z.object({
  fullName: z.string().min(2, 'Nama minimal 2 karakter').max(100),
  position: z.string().min(1, 'Jabatan wajib diisi'),
  salary: z.coerce.number().min(0),
  pin: z.string().length(4, 'PIN harus 4 digit').regex(/^\d+$/, 'PIN harus angka'),
  role: z.enum(['staff', 'cashier', 'manager', 'employee']).default('staff'),
  unitId: z.coerce.number().int().positive(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const payrollSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  monthYear: z.string().min(1),
  salary: z.coerce.number().min(0),
  allowance: z.coerce.number().min(0).default(0),
  deduction: z.coerce.number().min(0).default(0),
  unitId: z.coerce.number().int().positive(),
});

// ─── CRM ──────────────────────────────────────────────────────────────────────

export const crmKontakSchema = z.object({
  nama: z.string().min(1, 'Nama kontak wajib diisi').max(150),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  perusahaan: z.string().optional(),
  stage: z.string().default('lead'),
  unitId: z.coerce.number().int().positive(),
});

export const crmDealSchema = z.object({
  namaDeal: z.string().min(1, 'Nama deal wajib diisi').max(200),
  nilai: z.coerce.number().min(0).default(0),
  stage: z.string().default('prospek'),
  kontakId: z.coerce.number().int().optional(),
  unitId: z.coerce.number().int().positive(),
});

// ─── SCM ──────────────────────────────────────────────────────────────────────

export const supplierSchema = z.object({
  namaSupplier: z.string().min(1).max(150),
  kontak: z.string().optional(),
  unitId: z.coerce.number().int().positive(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.coerce.number().int().positive(),
  unitId: z.coerce.number().int().positive(),
  totalAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    qtyOrdered: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().min(0),
  })).min(1, 'Minimal 1 item'),
});

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsUnitSchema = z.object({
  namaUnit: z.string().min(2).max(255),
  alamat: z.string().optional(),
  telepon: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  loginSlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan strip'),
  posShortageThreshold: z.coerce.number().min(0).default(25000),
});

export const profileSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional().or(z.literal('')),
}).refine(d => {
  if (d.newPassword && !d.currentPassword) return false;
  return true;
}, { message: 'Password lama wajib diisi untuk ganti password', path: ['currentPassword'] });

// ─── Business Planning ────────────────────────────────────────────────────────

export const businessPlanStep1Schema = z.object({
  namaBisnis: z.string().min(2, 'Nama bisnis minimal 2 karakter').max(255),
  kategori: z.string().min(1, 'Pilih kategori bisnis'),
  deskripsi: z.string().optional(),
  visi: z.string().optional(),
  misi: z.string().optional(),
});

export const businessPlanStep5Schema = z.object({
  modalAwal: z.coerce.number().positive('Modal awal harus lebih dari 0'),
  biayaOperasionalPerBulan: z.coerce.number().min(0).optional(),
});
