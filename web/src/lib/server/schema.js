import { mysqlTable, primaryKey, int, varchar, mysqlEnum, text, timestamp, index, foreignKey, json, datetime, tinyint, decimal, unique, date, longtext, time, boolean } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm";

export const abcCategories = mysqlTable("abc_categories", {
	id: int().autoincrement().notNull(),
	namaKategori: varchar("nama_kategori", { length: 100 }).notNull(),
	abcLevel: mysqlEnum("abc_level", ['A','B','C']).default('C'),
	deskripsi: text(),
	jenis: varchar('jenis', { length: 50 }).default('keluar'),
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
	employeeId: int("employee_id").references(() => employees.id, { onDelete: "cascade" }),
	oldPosition: varchar("old_position", { length: 50 }),
	newPosition: varchar("new_position", { length: 50 }),
	changeDate: timestamp("change_date", { mode: 'string' }).defaultNow(),
	reason: text(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "employee_history_id"}),
	index("idx_employee_history_emp").on(table.employeeId),
]);

export const employeeKpi = mysqlTable("employee_kpi", {
	id: int().autoincrement().notNull(),
	employeeId: int("employee_id").references(() => employees.id, { onDelete: "cascade" }),
	periodMonth: tinyint("period_month"),
	periodYear: int("period_year"),
	score: decimal({ precision: 5, scale: 2 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "employee_kpi_id"}),
	index("idx_employee_kpi_emp").on(table.employeeId),
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
	contractStart: date("contract_start", { mode: 'string' }),
	contractEnd: date("contract_end", { mode: 'string' }),
	employeeIdCard: varchar("employee_id_card", { length: 50 }),
	emergencyContact: varchar("emergency_contact", { length: 100 }),
	emergencyRelation: varchar("emergency_relation", { length: 100 }),
	bloodType: varchar("blood_type", { length: 5 }),
	role: varchar("role", { length: 100 }).default('employee'),
	password: varchar({ length: 255 }),
	pin: varchar({ length: 255 }),
},
(table) => [
	index("idx_manager").on(table.managerId),
	primaryKey({ columns: [table.id], name: "employees_id"}),
	unique("slug").on(table.slug),
]);

export const kategoriProduk = mysqlTable("kategori_produk", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").references(() => unitBisnis.id, { onDelete: "cascade" }),
	namaKategori: varchar("nama_kategori", { length: 100 }).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "kategori_produk_id"}),
	unique("idx_kategori_unit").on(table.unitId, table.namaKategori),
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
	nama: varchar('nama', { length: 255 }).notNull(),
	barcode: varchar({ length: 100 }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" } ),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" } ),
	kategoriId: int("kategori_id").references(() => kategoriProduk.id, { onDelete: "set null" } ),
	supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: "set null" } ),
	status: mysqlEnum("status", ['active','draft','archived']).default('active'),
	metadata: json(),
	videoUrl: varchar("video_url", { length: 255 }),
	weightGrams: int("weight_grams").default(0),
	lengthCm: int("length_cm").default(0),
	widthCm: int("width_cm").default(0),
	heightCm: int("height_cm").default(0),
	foto: longtext(),
	hargaBeli: decimal("harga_beli", { precision: 15, scale: 2 }).notNull(),
	hargaJual: decimal("harga_jual", { precision: 15, scale: 2 }).notNull(),
	stok: int().default(0),
	minStok: int("min_stok").default(5),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	hasVariant: tinyint("has_variant").default(0),
	showInPos: tinyint("show_in_pos").default(1),
},
(table) => [
	primaryKey({ columns: [table.id], name: "products_id"}),
	unique("sku").on(table.sku),
]);

export const riwayatAksi = mysqlTable("riwayat_aksi", {
	id: int().autoincrement().notNull(),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	pesan: text().notNull(),
	tipe: mysqlEnum(['success','error','info']).default('success'),
	waktu: datetime({ mode: 'string'}).default(sql`(CURRENT_TIMESTAMP)`),
	isRead: tinyint("is_read").default(0),
	link: varchar({ length: 255 }),
	kategori: varchar({ length: 50 }),
},
(table) => [
	index("idx_unit_log").on(table.unitId),
	index("idx_user_waktu").on(table.userId, table.waktu),
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
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
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
	index("idx_product_unit").on(table.productId, table.unitId), // Composite index for queries filtering by both
	index("idx_created_at").on(table.createdAt), // For time-based queries
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
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	nama: varchar({ length: 150 }).notNull(),
	alamat: text(),
	industri: varchar({ length: 100 }),
	tags: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_companies_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "crm_companies_id"}),
]);

export const crmContacts = mysqlTable("crm_contacts", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
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
	index("idx_crm_contacts_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "crm_contacts_id"}),
]);

export const crmDeals = mysqlTable("crm_deals", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "set null" }),
	companyId: int("company_id").references(() => crmCompanies.id, { onDelete: "set null" }),
	namaDeal: varchar("nama_deal", { length: 200 }).notNull(),
	nilai: decimal({ precision: 15, scale: 2 }).default('0.00'),
	stage: varchar({ length: 50 }).default('prospek'),
	salesOwnerId: int("sales_owner_id").references(() => users.id, { onDelete: "set null" }),
	status: mysqlEnum("status", ['open','won','lost','stagnant']).default('open'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_deals_owner").on(table.ownerId),
	index("idx_crm_deals_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "crm_deals_id"}),
]);

export const crmActivities = mysqlTable("crm_activities", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "cascade" }),
	tipe: mysqlEnum("tipe", ['Call','WA','Meeting','Email','Task']).notNull(),
	catatan: text(),
	tanggal: timestamp("tanggal", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_activities_owner").on(table.ownerId),
	index("idx_crm_activities_unit").on(table.unitId),
	index("idx_crm_activities_kontak").on(table.kontakId),
	index("idx_crm_activities_owner_unit").on(table.ownerId, table.unitId), // Composite for user's activities in specific unit
	index("idx_crm_activities_tanggal").on(table.tanggal), // For time-based queries
	primaryKey({ columns: [table.id], name: "crm_activities_id"}),
]);

export const crmTasks = mysqlTable("crm_tasks", {
	id: int().autoincrement().notNull(),
	ownerId: int("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	kontakId: int("kontak_id").references(() => crmContacts.id, { onDelete: "set null" }),
	dealId: int("deal_id").references(() => crmDeals.id, { onDelete: "set null" }),
	deskripsi: text().notNull(),
	deadline: datetime("deadline", { mode: 'string' }),
	status: mysqlEnum("status", ['pending','done']).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_crm_tasks_owner").on(table.ownerId),
	index("idx_crm_tasks_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "crm_tasks_id"}),
]);

export const transaksi = mysqlTable("transaksi", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" } ),
	userId: int("user_id").notNull().references(() => users.id),
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
	index("idx_transaksi_unit").on(table.unitId),
	index("idx_transaksi_user").on(table.userId),
	index("idx_transaksi_kategori").on(table.kategoriTrx),
	index("idx_transaksi_unit_kategori").on(table.unitId, table.kategoriTrx), // Composite for unit-specific transaction history
	index("idx_transaksi_tanggal").on(table.tanggal), // For time-based queries
	index("idx_transaksi_product").on(table.productId), // For product transaction history
	primaryKey({ columns: [table.id], name: "transaksi_id"}),
]);

export const posShifts = mysqlTable("pos_shifts", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	waktuBuka: datetime("waktu_buka", { mode: 'string' }).notNull(),
	waktuTutup: datetime("waktu_tutup", { mode: 'string' }),
	modalAwal: decimal("modal_awal", { precision: 15, scale: 2 }).default('0.00'),
	kasAkhir: decimal("kas_akhir", { precision: 15, scale: 2 }).default('0.00'),
	kasAkhirAktual: decimal("kas_akhir_aktual", { precision: 15, scale: 2 }).default('0.00'),
	selisih: decimal("selisih", { precision: 15, scale: 2 }).default('0.00'),
	status: mysqlEnum("status", ['OPEN','CLOSED']).default('OPEN'),
	catatan: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_pos_shifts_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "pos_shifts_id"})
]);

export const posCashTransactions = mysqlTable("pos_cash_transactions", {
	id: int().autoincrement().notNull(),
	shiftId: int("shift_id").notNull().references(() => posShifts.id, { onDelete: "cascade" }),
	type: mysqlEnum("type", ['CASH_IN', 'CASH_OUT']).notNull(),
	amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_pos_cash_tx_shift").on(table.shiftId),
	primaryKey({ columns: [table.id], name: "pos_cash_tx_id"})
]);

export const posCustomers = mysqlTable("pos_customers", {
	id: int().autoincrement().notNull(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	namaCustomer: varchar("nama_customer", { length: 255 }).notNull(),
	email: varchar({ length: 150 }),
	telepon: varchar({ length: 50 }),
	metadata: json(),
	crmContactId: int("crm_contact_id").references(() => crmContacts.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_pos_customers_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "pos_customers_id"}),
]);

export const posOrders = mysqlTable("pos_orders", {
	id: int().autoincrement().notNull(),
	orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	customerId: int("customer_id").references(() => posCustomers.id, { onDelete: "set null" }),
	createdBy: int("created_by").notNull().references(() => users.id),
	cashierId: int("cashier_id").references(() => users.id),
	subtotal: decimal({ precision: 15, scale: 2 }).notNull(),
	discount: decimal({ precision: 15, scale: 2 }).default('0.00'),
	total: decimal({ precision: 15, scale: 2 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }).default('CASH'), // Menjadi primary payment method (jika hanya 1)
	amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default('0'), // Uang yg dibayarkan pelanggan
	change: decimal("change_amount", { precision: 15, scale: 2 }).default('0'), // Kembalian
	voucherId: int("voucher_id"), // Reference to vouchers if used
	status: mysqlEnum("status", ['PENDING','PAID','CANCELLED','REFUNDED']).default('PAID'),
	orderType: mysqlEnum("order_type", ['DINE_IN', 'TAKEAWAY', 'DELIVERY']).default('TAKEAWAY'),
	tableNumber: varchar("table_number", { length: 20 }),
	queueNumber: varchar("queue_number", { length: 20 }),
	fulfillmentStatus: mysqlEnum("fulfillment_status", ['PENDING', 'PREPARING', 'READY', 'COMPLETED']).default('COMPLETED'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_pos_orders_unit").on(table.unitId),
	index("idx_pos_orders_customer").on(table.customerId),
	primaryKey({ columns: [table.id], name: "pos_orders_id"}),
]);

export const posPayments = mysqlTable("pos_payments", {
	id: int().autoincrement().notNull(),
	orderId: int("order_id").notNull().references(() => posOrders.id, { onDelete: "cascade" }),
	method: varchar("method", { length: 50 }).notNull(), // TUNAI, QRIS, TRANSFER, KARTU
	amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_pos_payments_order").on(table.orderId),
	primaryKey({ columns: [table.id], name: "pos_payments_id"})
]);

export const posOrderItems = mysqlTable("pos_order_items", {
	id: int().autoincrement().notNull(),
	orderId: int("order_id").notNull().references(() => posOrders.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "set null" } ),
	variantId: int("variant_id"),
	productName: varchar("product_name", { length: 255 }).notNull(),
	sku: varchar({ length: 100 }),
	qty: int().notNull(),
	price: decimal({ precision: 15, scale: 2 }).notNull(),
	total: decimal({ precision: 15, scale: 2 }).notNull(),
	costTotal: decimal("cost_total", { precision: 15, scale: 2 }), // To store COGS at the time of sale
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => [
	index("idx_pos_order_items_order").on(table.orderId),
	primaryKey({ columns: [table.id], name: "pos_order_items_id"}),
]);

export const posReturns = mysqlTable("pos_returns", {
	id: int().autoincrement().notNull(),
	returnNumber: varchar("return_number", { length: 50 }).notNull().unique(),
	orderId: int("order_id").notNull().references(() => posOrders.id, { onDelete: "cascade" }),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	handledBy: varchar("handled_by", { length: 50 }),
	totalRefund: decimal("total_refund", { precision: 15, scale: 2 }).notNull(),
	reason: text(),
	status: mysqlEnum("status", ['COMPLETED', 'PENDING']).default('COMPLETED'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_pos_returns_order").on(table.orderId),
	index("idx_pos_returns_unit").on(table.unitId),
	primaryKey({ columns: [table.id], name: "pos_returns_id"})
]);

export const posReturnItems = mysqlTable("pos_return_items", {
	id: int().autoincrement().notNull(),
	returnId: int("return_id").notNull().references(() => posReturns.id, { onDelete: "cascade" }),
	orderItemId: int("order_item_id").notNull().references(() => posOrderItems.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }),
	qtyReturned: int("qty_returned").notNull(),
	refundAmount: decimal("refund_amount", { precision: 15, scale: 2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_pos_return_items_return").on(table.returnId),
	primaryKey({ columns: [table.id], name: "pos_return_items_id"})
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
	posShortageThreshold: decimal("pos_shortage_threshold", { precision: 15, scale: 2 }).default('25000.00'),
	posFeatureOverride: json("pos_feature_override"),
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
	companyId: int("company_id").references(() => unitBisnis.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	emailVerifiedAt: timestamp("email_verified_at", { mode: 'string' }),
},
(table) => [
	primaryKey({ columns: [table.id], name: "users_id"}),
	unique("email").on(table.email),
	unique("google_id").on(table.googleId),
]);// ======== SPRINT 1 ENHANCEMENTS ========

export const warehouses = mysqlTable("warehouses", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull(),
	name: varchar("name", { length: 100 }).notNull(),
	address: text("address"),
	isDefault: boolean("is_default").default(false),
	createdAt: timestamp("created_at").defaultNow(),
},
(table) => [
	index("idx_warehouses_unit").on(table.unitId),
]);

export const warehouseStock = mysqlTable("warehouse_stock", {
	id: int("id").primaryKey().autoincrement(),
	warehouseId: int("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "cascade" }),
	stock: int("stock").default(0),
	lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
},
(table) => [
	index("idx_warehouse_stock_product").on(table.productId),
]);

export const stockOpname = mysqlTable("stock_opname", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	warehouseId: int("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
	createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
	status: varchar("status", { length: 20 }).default('DRAFT'), // DRAFT, COMPLETED, CANCELLED
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow(),
	completedAt: timestamp("completed_at"),
},
(table) => [
	index("idx_stock_opname_unit").on(table.unitId),
	index("idx_stock_opname_created_by").on(table.createdBy),
]);

export const stockOpnameItems = mysqlTable("stock_opname_items", {
	id: int("id").primaryKey().autoincrement(),
	opnameId: int("opname_id").notNull(),
	productId: varchar("product_id", { length: 50 }).notNull(),
	systemStock: int("system_stock").notNull(),
	actualStock: int("actual_stock").notNull(),
	difference: int("difference").notNull(),
	notes: varchar("notes", { length: 255 }),
});

export const productBatches = mysqlTable("product_batches", {
	id: int("id").primaryKey().autoincrement(),
	productId: varchar("product_id", { length: 50 }).notNull(),
	warehouseId: int("warehouse_id").notNull(),
	batchNumber: varchar("batch_number", { length: 100 }),
	expiryDate: timestamp("expiry_date"),
	stock: int("stock").default(0),
	createdAt: timestamp("created_at").defaultNow(),
},
(table) => [
	index("idx_product_batches_product").on(table.productId),
]);

export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int("id").primaryKey().autoincrement(),
	poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "cascade" }),
	createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
	status: varchar("status", { length: 20 }).default('DRAFT'), // DRAFT, SENT, PARTIAL, COMPLETED, CANCELLED
	totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
	expectedDate: timestamp("expected_date"),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow(),
},
(table) => [
	index("idx_purchase_orders_unit").on(table.unitId),
	index("idx_purchase_orders_created_by").on(table.createdBy),
]);

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
	id: int("id").primaryKey().autoincrement(),
	poId: int("po_id").notNull(),
	productId: varchar("product_id", { length: 50 }).notNull(),
	qtyOrdered: int("qty_ordered").notNull(),
	qtyReceived: int("qty_received").default(0),
	unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
	totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
});

// ═══════════════════════════════════════════════════
// ACCOUNTING / AKUNTANSI TABLES
// ═══════════════════════════════════════════════════

// Chart of Accounts (COA) — Daftar Akun
export const chartOfAccounts = mysqlTable("chart_of_accounts", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	kodeAkun: varchar("kode_akun", { length: 20 }).notNull(),  // e.g. "1-1001"
	namaAkun: varchar("nama_akun", { length: 150 }).notNull(),
	tipeAkun: mysqlEnum("tipe_akun", [
		'ASET_LANCAR',       // 1xxx
		'ASET_TETAP',        // 1xxx
		'LIABILITAS_LANCAR', // 2xxx
		'LIABILITAS_JANGKA_PANJANG', // 2xxx
		'EKUITAS',           // 3xxx
		'PENDAPATAN',        // 4xxx
		'HPP',               // 5xxx
		'BEBAN_OPERASIONAL', // 6xxx
		'BEBAN_LAINNYA',     // 7xxx
		'PENDAPATAN_LAINNYA',// 8xxx
	]).notNull(),
	normalBalance: mysqlEnum("normal_balance", ['DEBIT','KREDIT']).notNull(),
	isActive: tinyint("is_active").default(1),
	parentId: int("parent_id"),  // for COA grouping
	deskripsi: text("deskripsi"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Journal Entries — Header Jurnal
export const journalEntries = mysqlTable("journal_entries", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	tanggal: date("tanggal").notNull(),
	nomorJurnal: varchar("nomor_jurnal", { length: 50 }),   // JRN-2024-001
	referensi: varchar("referensi", { length: 100 }),       // no. invoice, etc.
	memo: text("memo"),
	status: mysqlEnum("status", ['DRAFT','POSTED','REVERSED']).default('POSTED'),
	totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).default('0'),
	totalKredit: decimal("total_kredit", { precision: 15, scale: 2 }).default('0'),
	sourceType: varchar("source_type", { length: 30 }),     // MANUAL, POS, TRX
	sourceId: varchar("source_id", { length: 50 }),
	createdAt: timestamp("created_at").defaultNow(),
});

// Journal Entry Lines — Baris Debit/Kredit
export const journalEntryLines = mysqlTable("journal_entry_lines", {
	id: int("id").primaryKey().autoincrement(),
	journalId: int("journal_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
	coaId: int("coa_id").notNull().references(() => chartOfAccounts.id, { onDelete: "cascade" }),
	keterangan: varchar("keterangan", { length: 255 }),
	debit: decimal("debit", { precision: 15, scale: 2 }).default('0'),
	kredit: decimal("kredit", { precision: 15, scale: 2 }).default('0'),
	contactId: int("contact_id").references(() => accountingContacts.id, { onDelete: "set null" }),   // linked contact for AR/AP
});

// Accounting Contacts — Kontak Supplier/Customer untuk AR/AP
export const accountingContacts = mysqlTable("accounting_contacts", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	namaKontak: varchar("nama_kontak", { length: 150 }).notNull(),
	tipeKontak: mysqlEnum("tipe_kontak", ['CUSTOMER','SUPPLIER','BOTH']).default('CUSTOMER'),
	email: varchar("email", { length: 100 }),
	telepon: varchar("telepon", { length: 30 }),
	alamat: text("alamat"),
	npwp: varchar("npwp", { length: 30 }),
	limitKredit: decimal("limit_kredit", { precision: 15, scale: 2 }).default('0'),
	termPembayaran: int("term_pembayaran").default(30),   // days
	isActive: tinyint("is_active").default(1),
	createdAt: timestamp("created_at").defaultNow(),
});

// Receivables — Piutang Usaha
export const receivables = mysqlTable("receivables", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	contactId: int("contact_id").notNull().references(() => accountingContacts.id, { onDelete: "restrict" }),
	journalId: int("journal_id").references(() => journalEntries.id, { onDelete: "set null" }),
	nomorInvoice: varchar("nomor_invoice", { length: 50 }).notNull(),
	tanggal: date("tanggal").notNull(),
	jatuhTempo: date("jatuh_tempo").notNull(),
	nominal: decimal("nominal", { precision: 15, scale: 2 }).notNull(),
	sudahDibayar: decimal("sudah_dibayar", { precision: 15, scale: 2 }).default('0'),
	status: mysqlEnum("status", ['BELUM_BAYAR','SEBAGIAN','LUNAS','MACET']).default('BELUM_BAYAR'),
	keterangan: text("keterangan"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Payables — Hutang Usaha
export const payables = mysqlTable("payables", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	contactId: int("contact_id").notNull().references(() => accountingContacts.id, { onDelete: "restrict" }),
	journalId: int("journal_id").references(() => journalEntries.id, { onDelete: "set null" }),
	nomorFaktur: varchar("nomor_faktur", { length: 50 }).notNull(),
	tanggal: date("tanggal").notNull(),
	jatuhTempo: date("jatuh_tempo").notNull(),
	nominal: decimal("nominal", { precision: 15, scale: 2 }).notNull(),
	sudahDibayar: decimal("sudah_dibayar", { precision: 15, scale: 2 }).default('0'),
	status: mysqlEnum("status", ['BELUM_BAYAR','SEBAGIAN','LUNAS']).default('BELUM_BAYAR'),
	keterangan: text("keterangan"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Fixed Assets — Aset Tetap
export const fixedAssets = mysqlTable("fixed_assets", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	namaAset: varchar("nama_aset", { length: 150 }).notNull(),
	kategori: mysqlEnum("kategori", ['TANAH','BANGUNAN','KENDARAAN','MESIN','INVENTARIS','LAINNYA']).default('LAINNYA'),
	nilaiPerolehan: decimal("nilai_perolehan", { precision: 15, scale: 2 }).notNull(),
	tanggalPerolehan: date("tanggal_perolehan").notNull(),
	umurEkonomis: int("umur_ekonomis").notNull(),  // tahun
	metodePenyusutan: mysqlEnum("metode_penyusutan", ['GARIS_LURUS','SALDO_MENURUN']).default('GARIS_LURUS'),
	nilaiSisa: decimal("nilai_sisa", { precision: 15, scale: 2 }).default('0'),
	akumulasiPenyusutan: decimal("akumulasi_penyusutan", { precision: 15, scale: 2 }).default('0'),
	nilaiBuku: decimal("nilai_buku", { precision: 15, scale: 2 }),
	status: mysqlEnum("status", ['AKTIF','DIJUAL','DINONAKTIFKAN']).default('AKTIF'),
	coaId: int("coa_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),
	keterangan: text("keterangan"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Tax Rates — Konfigurasi Pajak
export const taxRates = mysqlTable("tax_rates", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	namaPajak: varchar("nama_pajak", { length: 100 }).notNull(),  // PPN 11%, PPh 23%
	persentase: decimal("persentase", { precision: 5, scale: 2 }).notNull(),
	tipe: mysqlEnum("tipe", ['PPN','PPH','LAINNYA']).default('PPN'),
	isDefault: tinyint("is_default").default(0),
	isActive: tinyint("is_active").default(1),
	coaId: int("coa_id").references(() => chartOfAccounts.id, { onDelete: "set null" }),  // akun hutang pajak
	createdAt: timestamp("created_at").defaultNow(),
});

// Budget Items — Anggaran
export const budgetItems = mysqlTable("budget_items", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	coaId: int("coa_id").notNull().references(() => chartOfAccounts.id, { onDelete: "cascade" }),
	tahun: int("tahun").notNull(),
	bulan: int("bulan").notNull(),  // 1-12, 0 = annual
	nominal: decimal("nominal", { precision: 15, scale: 2 }).notNull(),
	keterangan: varchar("keterangan", { length: 255 }),
	createdAt: timestamp("created_at").defaultNow(),
},
(table) => [
	index("idx_budget_items_unit").on(table.unitId),
]);

// Closing Periods — Tutup Buku
export const closingPeriods = mysqlTable("closing_periods", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: mysqlEnum("status", ['DRAFT','CLOSED']).default('DRAFT'),
	labaRugiPeriode: decimal("laba_rugi_periode", { precision: 15, scale: 2 }),
	keterangan: text("keterangan"),
	closedAt: timestamp("closed_at"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Website Settings & Social Posts
export const websiteSettings = mysqlTable("website_settings", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	domainSlug: varchar("domain_slug", { length: 100 }).notNull().unique(),
	theme: varchar("theme", { length: 50 }).default('modern'),
	colorPrimary: varchar("color_primary", { length: 10 }).default('#4F46E5'),
	heroTitle: varchar("hero_title", { length: 255 }),
	heroSubtitle: text("hero_subtitle"),
	aboutUs: text("about_us"),
	contactPhone: varchar("contact_phone", { length: 30 }),
	contactEmail: varchar("contact_email", { length: 100 }),
	contactAddress: text("contact_address"),
	facebookUrl: varchar("facebook_url", { length: 255 }),
	instagramUrl: varchar("instagram_url", { length: 255 }),
	isPublished: boolean("is_published").default(true),
	createdAt: timestamp("created_at").defaultNow(),
});

export const socialPosts = mysqlTable("social_posts", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	platform: varchar("platform", { length: 50 }).notNull(),
	caption: text("caption").notNull(),
	imageUrl: varchar("image_url", { length: 255 }),
	scheduledAt: datetime("scheduled_at", { mode: "string" }),
	status: varchar("status", { length: 20 }).default('draft'),
	createdAt: timestamp("created_at").defaultNow(),
});

// ─── SPRINT 2 / FASE 1 TABLES ───

// ─── 1. PENJUALAN (SALES) ───
export const salesTargets = mysqlTable("sales_targets", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetAmount: decimal("target_amount", { precision: 15, scale: 2 }).notNull(),
  periodMonth: tinyint("period_month").notNull(),
  periodYear: int("period_year").notNull(),
  komisiPersen: decimal("komisi_percent", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_sales_targets_unit").on(table.unitId),
	index("idx_sales_targets_user").on(table.userId),
]);

export const salesCommissions = mysqlTable("sales_commissions", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  salesOrderId: int("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ['UNPAID', 'PAID']).default('UNPAID'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const salesOrders = mysqlTable("sales_orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  customerId: int("customer_id").references(() => crmContacts.id, { onDelete: "set null" }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ['DRAFT', 'PENDING', 'PROCESSING', 'SHIPPED', 'CLOSED', 'CANCELLED']).default('PENDING'),
  notes: text("notes"),
  receivableId: int("receivable_id").references(() => receivables.id, { onDelete: "set null" }), // Link ke Piutang Usaha
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const salesOrderItems = mysqlTable("sales_order_items", {
  id: int("id").primaryKey().autoincrement(),
  salesOrderId: int("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "set null" }),
  // productName: varchar("product_name", { length: 255 }).notNull().default(''),
  qty: int("qty").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull()
},
(table) => [
	index("idx_sales_order_items_product").on(table.productId),
]);

export const quotations = mysqlTable("quotations", {
  id: int("id").primaryKey().autoincrement(),
  quotationNumber: varchar("quotation_number", { length: 100 }).notNull().unique(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  customerId: int("customer_id").references(() => crmContacts.id, { onDelete: "set null" }),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  status: mysqlEnum("status", ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  validUntil: date("valid_until", { mode: 'string' }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const quotationItems = mysqlTable("quotation_items", {
  id: int("id").primaryKey().autoincrement(),
  quotationId: int("quotation_id").notNull().references(() => quotations.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "set null" }),
  // productName: varchar("product_name", { length: 255 }).notNull().default(''),
  qty: int("qty").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull()
},
(table) => [
	index("idx_quotation_items_product").on(table.productId),
]);

// ─── 2. PEMASARAN (MARKETING) ───
export const marketingCampaigns = mysqlTable("marketing_campaigns", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  type: mysqlEnum("type", ['EMAIL', 'WA', 'AD_TRACKER']).notNull(),
  status: mysqlEnum("status", ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED']).default('DRAFT'),
  budget: decimal("budget", { precision: 15, scale: 2 }).default("0.00"),
  composeSubject: varchar("compose_subject", { length: 255 }),
  composeText: text("compose_text"),
  scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const adTrackers = mysqlTable("ad_trackers", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  spendAmount: decimal("spend_amount", { precision: 15, scale: 2 }).notNull(),
  impressions: int("impressions").default(0),
  clicks: int("clicks").default(0),
  conversions: int("conversions").default(0),
  trackingDate: date("tracking_date", { mode: 'string' }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const landingPages = mysqlTable("landing_pages", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  pageSlug: varchar("page_slug", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  contentJson: json("content_json"),
  templateId: varchar("template_id", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const marketingLeads = mysqlTable("marketing_leads", {
  id: int("id").primaryKey().autoincrement(),
  landingPageId: int("landing_page_id").references(() => landingPages.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  notes: text("notes"),
  isTransferredToCrm: boolean("is_transferred_to_crm").default(false),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const vouchers = mysqlTable("vouchers", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: mysqlEnum("discount_type", ['PERCENTAGE', 'FIXED']).notNull(),
  discountValue: decimal("discount_value", { precision: 15, scale: 2 }).notNull(),
  maxUsage: int("max_usage").default(0),
  currentUsage: int("current_usage").default(0),
  minPurchase: decimal("min_purchase", { precision: 15, scale: 2 }).default("0.00"),
  validFrom: date("valid_from", { mode: 'string' }).notNull(),
  validUntil: date("valid_until", { mode: 'string' }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_vouchers_unit").on(table.unitId),
]);

// ─── 3. LAYANAN PELANGGAN (CUSTOMER SERVICE) ───
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  customerId: int("customer_id").references(() => crmContacts.id, { onDelete: "set null" }),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  subject: varchar("subject", { length: 200 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: mysqlEnum("status", ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }),
  lastResponseAt: timestamp("last_response_at", { mode: 'string' }),
  resolvedAt: timestamp("resolved_at", { mode: 'string' }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const supportTicketMessages = mysqlTable("support_ticket_messages", {
  id: int("id").primaryKey().autoincrement(),
  ticketId: int("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  senderType: mysqlEnum("sender_type", ['STAFF', 'CUSTOMER']).notNull(),
  senderId: int("sender_id").notNull(),
  message: text("message").notNull(),
  mediaUrl: varchar("media_url", { length: 255 }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const supportInboxChannels = mysqlTable("support_inbox_channels", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", ['WHATSAPP', 'EMAIL', 'INSTAGRAM']).notNull(),
  isActive: boolean("is_active").default(true),
  apiConfigJson: json("api_config_json"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  views: int("views").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
},
(table) => [
	index("idx_knowledge_base_unit").on(table.unitId),
]);

// ─── 4. E-COMMERCE ───
export const ecommerceSettings = mysqlTable("ecommerce_settings", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  storefrontName: varchar("storefront_name", { length: 150 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 255 }),
  domainSlug: varchar("domain_slug", { length: 100 }).notNull().unique(),
  paymentConfigJson: json("payment_config_json"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const ecommerceOrders = mysqlTable("ecommerce_orders", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  orderNumber: varchar("order_number", { length: 100 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerEmail: varchar("customer_email", { length: 150 }),
  customerPhone: varchar("customer_phone", { length: 50 }),
  shippingAddress: text("shipping_address"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 15, scale: 2 }).default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  paymentStatus: mysqlEnum("payment_status", ['PENDING', 'PAID', 'FAILED', 'EXPIRED']).default('PENDING'),
  shippingStatus: mysqlEnum("shipping_status", ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']).default('PENDING'),
  transactionId: varchar("transaction_id", { length: 150 }),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow()
});

export const ecommerceOrderItems = mysqlTable("ecommerce_order_items", {
  id: int("id").primaryKey().autoincrement(),
  ecommerceOrderId: int("ecommerce_order_id").notNull().references(() => ecommerceOrders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 50 }).references(() => products.id, { onDelete: "set null" }),
  variantId: varchar("variant_id", { length: 50 }).references(() => productVariants.id, { onDelete: "set null" }),
  qty: int("qty").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  total: decimal("total", { precision: 15, scale: 2 }).notNull()
});

export const marketplaceIntegrations = mysqlTable("marketplace_integrations", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").references(() => unitBisnis.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  partnerId: varchar("partner_id", { length: 100 }),
  partnerKey: text("partner_key"),
  shopId: varchar("shop_id", { length: 100 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at", { mode: 'string' }),
  isActive: tinyint("is_active").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' })
});

