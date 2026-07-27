import { relations } from "drizzle-orm/relations";
import { approvalRequests, approvalLogs, employees, attendance, unitBisnis, departments, employeeDocuments, users, leaveRequests, payrolls, products, productVariants, kategoriProduk, suppliers, salaryComponents, companies, shifts, stockLogs, abcCategories, transaksi } from "./schema";

export const approvalLogsRelations = relations(approvalLogs, ({one}) => ({
	approvalRequest: one(approvalRequests, {
		fields: [approvalLogs.requestId],
		references: [approvalRequests.id]
	}),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({many}) => ({
	approvalLogs: many(approvalLogs),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	employee: one(employees, {
		fields: [attendance.employeeId],
		references: [employees.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	attendances: many(attendance),
	employeeDocuments: many(employeeDocuments),
	user: one(users, {
		fields: [employees.userId],
		references: [users.id]
	}),
	unitBisni: one(unitBisnis, {
		fields: [employees.companyId],
		references: [unitBisnis.id]
	}),
	leaveRequests: many(leaveRequests),
	payrolls: many(payrolls),
	salaryComponents: many(salaryComponents),
}));

export const departmentsRelations = relations(departments, ({one}) => ({
	unitBisni: one(unitBisnis, {
		fields: [departments.unitId],
		references: [unitBisnis.id]
	}),
}));

export const unitBisnisRelations = relations(unitBisnis, ({one, many}) => ({
	departments: many(departments),
	employees: many(employees),
	products: many(products),
	suppliers: many(suppliers),
	transaksis: many(transaksi),
	unitBisni: one(unitBisnis, {
		fields: [unitBisnis.cabangDari],
		references: [unitBisnis.id],
		relationName: "unitBisnis_cabangDari_unitBisnis_id"
	}),
	unitBisnis: many(unitBisnis, {
		relationName: "unitBisnis_cabangDari_unitBisnis_id"
	}),
	user: one(users, {
		fields: [unitBisnis.userId],
		references: [users.id]
	}),
}));

export const employeeDocumentsRelations = relations(employeeDocuments, ({one}) => ({
	employee: one(employees, {
		fields: [employeeDocuments.employeeId],
		references: [employees.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	employees: many(employees),
	products: many(products),
	unitBisnis: many(unitBisnis),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({one}) => ({
	employee: one(employees, {
		fields: [leaveRequests.employeeId],
		references: [employees.id]
	}),
}));

export const payrollsRelations = relations(payrolls, ({one}) => ({
	employee: one(employees, {
		fields: [payrolls.employeeId],
		references: [employees.id]
	}),
}));

export const productVariantsRelations = relations(productVariants, ({one}) => ({
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	productVariants: many(productVariants),
	kategoriProduk: one(kategoriProduk, {
		fields: [products.kategoriId],
		references: [kategoriProduk.id]
	}),
	supplier: one(suppliers, {
		fields: [products.supplierId],
		references: [suppliers.id]
	}),
	unitBisni: one(unitBisnis, {
		fields: [products.unitId],
		references: [unitBisnis.id]
	}),
	user: one(users, {
		fields: [products.userId],
		references: [users.id]
	}),
	stockLogs: many(stockLogs),
	transaksis: many(transaksi),
}));

export const kategoriProdukRelations = relations(kategoriProduk, ({many}) => ({
	products: many(products),
}));

export const suppliersRelations = relations(suppliers, ({one, many}) => ({
	products: many(products),
	unitBisni: one(unitBisnis, {
		fields: [suppliers.unitId],
		references: [unitBisnis.id]
	}),
}));

export const salaryComponentsRelations = relations(salaryComponents, ({one}) => ({
	employee: one(employees, {
		fields: [salaryComponents.employeeId],
		references: [employees.id]
	}),
}));

export const shiftsRelations = relations(shifts, ({one}) => ({
	company: one(companies, {
		fields: [shifts.companyId],
		references: [companies.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	shifts: many(shifts),
}));

export const stockLogsRelations = relations(stockLogs, ({one}) => ({
	product: one(products, {
		fields: [stockLogs.productId],
		references: [products.id]
	}),
}));

export const transaksiRelations = relations(transaksi, ({one}) => ({
	abcCategory: one(abcCategories, {
		fields: [transaksi.abcCategoryId],
		references: [abcCategories.id]
	}),
	product: one(products, {
		fields: [transaksi.productId],
		references: [products.id]
	}),
	unitBisni: one(unitBisnis, {
		fields: [transaksi.unitId],
		references: [unitBisnis.id]
	}),
}));

export const abcCategoriesRelations = relations(abcCategories, ({many}) => ({
	transaksis: many(transaksi),
}));