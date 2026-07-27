import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, mysqlEnum, text, timestamp, index, foreignKey, json, datetime, tinyint, decimal, unique, date, longtext, time } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
export const abcCategories = mysqlTable("abc_categories", {
	id: int().autoincrement().notNull(),
	namaKategori: varchar("nama_kategori", { length: 100 }).notNull(),
	abcLevel: mysqlEnum("abc_level", ['A','B','C']).default('C'),
	deskripsi: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "abc_categories_id"}),
]);

export const approvalLogs = mysqlTable("approval_logs", {
	id: int().autoincrement().notNull(),
	requestId: int("request_id").references(() => approvalRequests.id),
	approverId: varchar("approver_id", { length: 50 }),
	action: mysqlEnum(['APPROVE','REJECT']),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("request_id").on(table.requestId),
	primaryKey({ columns: [table.id], name: "approval_logs_id"}),
]);

export const approvalRequests = mysqlTable("approval_requests", {
	id: int().autoincrement().notNull(),
	module: varchar({ length: 50 }).notNull(),
	referenceId: varchar("reference_id", { length: 50 }),
	requesterId: varchar("requester_id", { length: 50 }),
	unitId: int("unit_id"),
	actionType: mysqlEnum("action_type", ['CREATE','UPDATE','DELETE']).notNull(),
	dataBefore: json("data_before"),
	dataAfter: json("data_after"),
	currentLevel: int("current_level").default(1),
	maxLevel: int("max_level").default(1),
	status: mysqlEnum(['PENDING','APPROVED','REJECTED']).default('PENDING'),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "approval_requests_id"}),
]);

export const attendance = mysqlTable("attendance", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").references(() => employees.id),
	checkIn: datetime("check_in", { mode: 'string'}),
	checkOut: datetime("check_out", { mode: 'string'}),
	status: mysqlEnum(['present','late','absent','on_leave']),
},
(table) => [
	index("employee_id").on(table.employeeId),
	primaryKey({ columns: [table.id], name: "attendance_id"}),
]);

export const companies = mysqlTable("companies", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 100 }).notNull(),
	ownerId: int("owner_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "companies_id"}),
]);

export const departments = mysqlTable("departments", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").references(() => unitBisnis.id, { onDelete: "cascade" } ),
	name: varchar({ length: 100 }),
},
(table) => [
	index("unit_id").on(table.unitId),
	primaryKey({ columns: [table.id], name: "departments_id"}),
]);

export const employeeDocuments = mysqlTable("employee_documents", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" } ),
	documentType: mysqlEnum("document_type", ['KTP','NPWP','Contract','CV','Sertifikat','Lainnya']).notNull(),
	filePath: varchar("file_path", { length: 255 }).notNull(),
	fileName: varchar("file_name", { length: 100 }),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("employee_id").on(table.employeeId),
	primaryKey({ columns: [table.id], name: "employee_documents_id"}),
]);

export const employeeHistory = mysqlTable("employee_history", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id"),
	oldPosition: varchar("old_position", { length: 50 }),
	newPosition: varchar("new_position", { length: 50 }),
	changeDate: timestamp("change_date", { mode: 'string' }).defaultNow(),
	reason: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "employee_history_id"}),
]);

export const employeeKpi = mysqlTable("employee_kpi", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id"),
	periodMonth: tinyint("period_month"),
	periodYear: int("period_year"),
	score: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "employee_kpi_id"}),
]);

export const employees = mysqlTable("employees", {
	id: int().autoincrement().notNull(),
	companyId: int("company_id").references(() => unitBisnis.id, { onDelete: "cascade" } ),
	userId: int("user_id").references(() => users.id, { onDelete: "cascade" } ),
	managerId: int("manager_id"),
	fullName: varchar("full_name", { length: 100 }),
	slug: varchar({ length: 255 }),
	position: varchar({ length: 100 }),
	jobGrade: varchar("job_grade", { length: 20 }),
	salary: decimal({ precision: 15, scale: 2 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	joinedAt: date("joined_at", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	joinDate: date("join_date", { mode: 'string' }),
	status: mysqlEnum(['active','inactive']).default('active'),
	email: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	idNumber: varchar("id_number", { length: 30 }),
	division: varchar({ length: 100 }),
	placementLocation: varchar("placement_location", { length: 100 }),
	employmentStatus: varchar("employment_status", { length: 50 }),
	bankName: varchar("bank_name", { length: 100 }),
	bankAccountNumber: varchar("bank_account_number", { length: 50 }),
	taxId: varchar("tax_id", { length: 50 }),
	address: text(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	contractStart: date("contract_start", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	contractEnd: date("contract_end", { mode: 'string' }),
	employeeIdCard: varchar("employee_id_card", { length: 50 }),
	emergencyContact: varchar("emergency_contact", { length: 100 }),
	emergencyRelation: varchar("emergency_relation", { length: 100 }),
	bloodType: varchar("blood_type", { length: 5 }),
	role: varchar("role", { length: 100 }).default('employee'),
	password: varchar({ length: 255 }),
	pin: varchar({ length: 10 }),
},
(table) => [
	index("idx_manager").on(table.managerId),
	primaryKey({ columns: [table.id], name: "employees_id"}),
	unique("slug").on(table.slug),
	unique("user_id").on(table.userId),
]);

export const kategoriProduk = mysqlTable("kategori_produk", {
	id: int().autoincrement().notNull(),
	namaKategori: varchar("nama_kategori", { length: 100 }).notNull(),
},
(table) => [
	index("idx_kategori_global").on(table.namaKategori),
	primaryKey({ columns: [table.id], name: "kategori_produk_id"}),
	unique("nama_kategori").on(table.namaKategori),
	unique("nama_kategori_2").on(table.namaKategori),
	unique("nama_kategori_3").on(table.namaKategori),
]);

export const leaveRequests = mysqlTable("leave_requests", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").references(() => employees.id),
	type: mysqlEnum(['leave','overtime']),
	startDate: datetime("start_date", { mode: 'string'}),
	endDate: datetime("end_date", { mode: 'string'}),
	reason: text(),
	status: mysqlEnum(['pending','approved','rejected']).default('pending'),
	approvedBy: int("approved_by"),
},
(table) => [
	index("employee_id").on(table.employeeId),
	primaryKey({ columns: [table.id], name: "leave_requests_id"}),
]);

export const payrolls = mysqlTable("payrolls", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").references(() => employees.id),
	periodMonth: tinyint("period_month"),
	periodYear: int("period_year"),
	basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }),
	allowances: decimal({ precision: 15, scale: 2 }).default('0.00'),
	deductions: decimal({ precision: 15, scale: 2 }).default('0.00'),
	netSalary: decimal("net_salary", { precision: 15, scale: 2 }),
	paymentStatus: mysqlEnum("payment_status", ['unpaid','paid']).default('unpaid'),
},
(table) => [
	index("employee_id").on(table.employeeId),
	primaryKey({ columns: [table.id], name: "payrolls_id"}),
]);

export const productVariants = mysqlTable("product_variants", {
	id: varchar({ length: 50 }).notNull(),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "cascade" } ),
	namaVariasi: varchar("nama_variasi", { length: 255 }).notNull(),
	sku: varchar({ length: 100 }),
	hargaBeli: decimal("harga_beli", { precision: 15, scale: 2 }).default('0.00'),
	hargaJual: decimal("harga_jual", { precision: 15, scale: 2 }).default('0.00'),
	stok: int().default(0),
	minStok: int("min_stok").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "product_variants_id"}),
]);

export const products = mysqlTable("products", {
	id: varchar({ length: 50 }).notNull(),
	sku: varchar({ length: 50 }),
	slug: varchar('slug', { length: 255 }).notNull().unique(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" } ),
	kategoriId: int("kategori_id").references(() => kategoriProduk.id, { onDelete: "set null" } ),
	metadata: json(),
	supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: "set null" } ),
	nama: varchar({ length: 255 }).notNull(),
	foto: longtext(),
	hargaBeli: decimal("harga_beli", { precision: 15, scale: 2 }).notNull(),
	hargaJual: decimal("harga_jual", { precision: 15, scale: 2 }).notNull(),
	stok: int().default(0),
	minStok: int("min_stok").default(5),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	hasVariant: tinyint("has_variant").default(0),
},
(table) => [
	primaryKey({ columns: [table.id], name: "products_id"}),
	unique("sku").on(table.sku),
]);

export const riwayatAksi = mysqlTable("riwayat_aksi", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull(),
	unitId: int("unit_id").notNull(),
	pesan: text().notNull(),
	tipe: mysqlEnum(['success','error','info']).default('success'),
	waktu: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`),
	isRead: tinyint("is_read").default(0),
	link: varchar({ length: 255 }),
	kategori: varchar({ length: 50 }),
},
(table) => [
	index("fk_unit_log").on(table.unitId),
	index("idx_user_waktu").on(table.userId, table.waktu),
	index("user_id").on(table.userId),
	index("user_id_2").on(table.userId),
	index("user_id_3").on(table.userId),
	index("user_id_4").on(table.userId),
	primaryKey({ columns: [table.id], name: "riwayat_aksi_id"}),
]);

export const roles = mysqlTable("roles", {
	id: int().autoincrement().notNull(),
	roleName: varchar("role_name", { length: 50 }).notNull(),
	description: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "roles_id"}),
]);

export const salaryComponents = mysqlTable("salary_components", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").references(() => employees.id, { onDelete: "cascade" } ),
	name: varchar({ length: 100 }),
	amount: decimal({ precision: 15, scale: 2 }),
	type: mysqlEnum(['addition','deduction']),
},
(table) => [
	index("employee_id").on(table.employeeId),
	primaryKey({ columns: [table.id], name: "salary_components_id"}),
]);

export const shifts = mysqlTable("shifts", {
	id: int().autoincrement().notNull(),
	companyId: int("company_id").references(() => companies.id),
	shiftName: varchar("shift_name", { length: 50 }),
	startTime: time("start_time"),
	endTime: time("end_time"),
},
(table) => [
	index("company_id").on(table.companyId),
	primaryKey({ columns: [table.id], name: "shifts_id"}),
]);

export const stockLogs = mysqlTable("stock_logs", {
	id: varchar({ length: 50 }).notNull(),
	productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "cascade", onUpdate: "cascade" } ),
	userId: varchar("user_id", { length: 50 }).notNull(),
	unitId: int("unit_id").notNull(),
	stokAwal: int("stok_awal").default(0).notNull(),
	perubahan: int().default(0).notNull(),
	stokAkhir: int("stok_akhir").default(0).notNull(),
	alasan: mysqlEnum(['MASUK','KELUAR','PENJUALAN','OPNAME','RUSAK','RETUR','ADJUSTMENT']).notNull(),
	keterangan: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_product").on(table.productId),
	index("idx_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "stock_logs_id"}),
]);

export const suppliers = mysqlTable("suppliers", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" } ),
	namaSupplier: varchar("nama_supplier", { length: 150 }).notNull(),
	kontak: varchar({ length: 50 }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "suppliers_id"}),
]);

export const crmCompanies = mysqlTable("crm_companies", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	nama: varchar({ length: 150 }).notNull(),
	alamat: text(),
	industri: varchar({ length: 100 }),
	tags: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "crm_companies_id"}),
]);

export const crmContacts = mysqlTable("crm_contacts", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	nama: varchar({ length: 150 }).notNull(),
	telepon: varchar({ length: 30 }),
	email: varchar({ length: 100 }),
	perusahaan: varchar({ length: 150 }),
	companyId: int("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
	stage: varchar({ length: 50 }).default('lead'),
	sumber: varchar({ length: 80 }).default('manual'),
	tags: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_contacts_owner").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "crm_contacts_id"}),
]);

export const crmDeals = mysqlTable("crm_deals", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "set null" }),
	companyId: int("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
	namaDeal: varchar({ length: 200 }).notNull(),
	nilai: decimal({ precision: 15, scale: 2 }).default('0.00'),
	stage: varchar({ length: 50 }).default('prospek'),
	salesOwnerId: int("sales_owner_id").references(() => users.id, { onDelete: "set null" }),
	status: mysqlEnum("status", ['open','won','lost','stagnant']).default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_deals_owner").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "crm_deals_id"}),
]);

export const crmActivities = mysqlTable("crm_activities", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "cascade" }),
	tipe: mysqlEnum("tipe", ['Call','WA','Meeting','Email','Task']).notNull(),
	catatan: text(),
	tanggal: datetime("tanggal", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_activities_owner").on(table.ownerId),
	index("idx_crm_activities_kontak").on(table.kontakId),
	primaryKey({ columns: [table.id], name: "crm_activities_id"}),
]);

export const crmTasks = mysqlTable("crm_tasks", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "set null" }),
	dealId: int("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
	deskripsi: text().notNull(),
	deadline: datetime("deadline", { mode: 'string' }),
	status: mysqlEnum("status", ['pending','done']).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_tasks_owner").on(table.ownerId),
	primaryKey({ columns: [table.id], name: "crm_tasks_id"}),
]);

export const transaksi = mysqlTable("transaksi", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" } ),
	userId: int("user_id").notNull(),
	kategoriTrx: mysqlEnum("kategori_trx", ['MASUK','KELUAR']).notNull(),
	nominal: decimal({ precision: 15, scale: 2 }).notNull(),
	keterangan: text(),
	tanggal: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`),
	productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "set null" } ),
	qty: int().default(1),
	hppTotal: decimal("hpp_total", { precision: 15, scale: 2 }).default('0.00'),
	metodeBayar: varchar("metode_bayar", { length: 100 }).default('KAS'),
	abcCategoryId: int("abc_category_id").references(() => abcCategories.id, { onDelete: "set null" } ),
	totalHarga: decimal("total_harga", { precision: 15, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "transaksi_id"}),
]);

export const unitBisnis = mysqlTable("unit_bisnis", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	namaUnit: varchar("nama_unit", { length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	alamat: text(),
	modalAwal: decimal("modal_awal", { precision: 15, scale: 2 }).default('0.00'),
	kategori: varchar({ length: 50 }),
	isCabang: tinyint("is_cabang").default(0),
	cabangDari: int("cabang_dari"),
	telepon: varchar({ length: 20 }),
	email: varchar({ length: 100 }),
	loginSlug: varchar("login_slug", { length: 50 }),
	isPortalActive: tinyint("is_portal_active").default(1),
},
(table) => [
	foreignKey({
			columns: [table.cabangDari],
			foreignColumns: [table.id],
			name: "fk_cabang_dari"
		}).onDelete("set null"),
	primaryKey({ columns: [table.id], name: "unit_bisnis_id"}),
	unique("login_slug").on(table.loginSlug),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	username: varchar({ length: 50 }).notNull(),
	email: varchar({ length: 100 }).notNull(),
	password: varchar({ length: 255 }),
	googleId: varchar("google_id", { length: 255 }),
	avatarUrl: text("avatar_url"),
	role: varchar({ length: 20 }).default('admin'),
	companyId: int("company_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "users_id"}),
	unique("email").on(table.email),
	unique("google_id").on(table.googleId),
]);


//  VALIDASI!!! //
export const insertEmployeeSchema = createInsertSchema(employees, {
    fullName: z.string().min(3, "Nama terlalu pendek (min 3 karakter)"),
    email: z.string().email("Format email tidak valid"),
    phone: z.string().regex(/^[0-9]+$/, "Nomor HP harus angka"),
});

// 2. Validasi Transaksi
// - Nominal tidak boleh negatif
// - Tanggal wajib diisi
export const insertTransaksiSchema = createInsertSchema(transaksi, {
    nominal: z.number().nonnegative("Nominal tidak boleh minus"), // Pastikan tipe data decimal dihandle sebagai number/string
    keterangan: z.string().optional(),
});

// 3. Validasi Produk
// - Harga Jual tidak boleh lebih kecil dari Harga Beli
export const insertProductSchema = createInsertSchema(products, {
    nama: z.string().min(1, "Nama produk wajib diisi"),
    stok: z.number().int().nonnegative("Stok tidak boleh minus"),
}).refine((data) => parseFloat(data.hargaJual) >= parseFloat(data.hargaBeli), {
    message: "Rugi dong! Harga Jual harus lebih besar dari Harga Beli",
    path: ["hargaJual"],
});

// 4. Validasi Unit Bisnis
export const insertUnitSchema = createInsertSchema(unitBisnis, {
    namaUnit: z.string().min(3, "Nama Unit terlalu pendek"),
    slug: z.string().regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil dan strip"),
});

// Export tipe data TypeScript (Opsional, biar VS Code makin pintar)
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Transaksi = typeof transaksi.$inferSelect;
export type NewTransaksi = typeof transaksi.$inferInsert;