import { relations } from "drizzle-orm/relations";
import {  approvalRequests, approvalLogs, employees, attendance, unitBisnis, departments, employeeDocuments, users, leaveRequests, payrolls, products, productVariants, kategoriProduk, suppliers, salaryComponents, companies, shifts, stockLogs, abcCategories, transaksi, posCustomers, posOrders, posOrderItems, crmCompanies, crmContacts, crmDeals, crmActivities, crmTasks, warehouses, warehouseStock, stockOpname, stockOpnameItems, productBatches, purchaseOrders, purchaseOrderItems , chartOfAccounts, journalEntries, journalEntryLines, accountingContacts, receivables, payables, fixedAssets, taxRates, budgetItems, closingPeriods, supportTickets, supportTicketMessages, salesTargets, salesOrders, salesOrderItems, quotations, quotationItems, salesCommissions, marketingCampaigns, adTrackers, landingPages, marketingLeads, vouchers, supportInboxChannels, knowledgeBase, ecommerceSettings, ecommerceOrders, ecommerceOrderItems, riwayatAksi, roles, employeeKpi, employeeHistory, websiteSettings, socialPosts, posShifts, posPayments, posCashTransactions, posReturns, posReturnItems } from "./schema";

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
	kpi: many(employeeKpi),
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
	crmCompanies: many(crmCompanies),
	crmContacts: many(crmContacts),
	crmDeals: many(crmDeals),
	crmActivities: many(crmActivities),
	crmTasks: many(crmTasks),
	transaksis: many(transaksi),
	riwayatAksi: many(riwayatAksi),
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

export const posCustomersRelations = relations(posCustomers, ({one, many}) => ({
	unit: one(unitBisnis, {
		fields: [posCustomers.unitId],
		references: [unitBisnis.id]
	}),
	orders: many(posOrders),
}));

export const posOrdersRelations = relations(posOrders, ({one, many}) => ({
	customer: one(posCustomers, {
		fields: [posOrders.customerId],
		references: [posCustomers.id]
	}),
	unit: one(unitBisnis, {
		fields: [posOrders.unitId],
		references: [unitBisnis.id]
	}),
	items: many(posOrderItems),
	payments: many(posPayments),
}));

export const posPaymentsRelations = relations(posPayments, ({one}) => ({
	posOrder: one(posOrders, {
		fields: [posPayments.orderId],
		references: [posOrders.id]
	}),
}));

export const posOrderItemsRelations = relations(posOrderItems, ({one}) => ({
	posOrder: one(posOrders, {
		fields: [posOrderItems.orderId],
		references: [posOrders.id]
	}),
	product: one(products, {
		fields: [posOrderItems.productId],
		references: [products.id]
	}),
}));

export const posShiftsRelations = relations(posShifts, ({one}) => ({
	unitBisnis: one(unitBisnis, {
		fields: [posShifts.unitId],
		references: [unitBisnis.id]
	}),
	user: one(users, {
		fields: [posShifts.userId],
		references: [users.id]
	}),
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

export const crmCompaniesRelations = relations(crmCompanies, ({one, many}) => ({
	owner: one(users, {
		fields: [crmCompanies.ownerId],
		references: [users.id]
	}),
	unit: one(unitBisnis, {
		fields: [crmCompanies.unitId],
		references: [unitBisnis.id]
	}),
	contacts: many(crmContacts),
	deals: many(crmDeals),
}));

export const crmContactsRelations = relations(crmContacts, ({one, many}) => ({
	owner: one(users, {
		fields: [crmContacts.ownerId],
		references: [users.id]
	}),
	unit: one(unitBisnis, {
		fields: [crmContacts.unitId],
		references: [unitBisnis.id]
	}),
	company: one(crmCompanies, {
		fields: [crmContacts.companyId],
		references: [crmCompanies.id]
	}),
	activities: many(crmActivities),
	deals: many(crmDeals),
}));

export const crmDealsRelations = relations(crmDeals, ({one, many}) => ({
	owner: one(users, {
		fields: [crmDeals.ownerId],
		references: [users.id]
	}),
	unit: one(unitBisnis, {
		fields: [crmDeals.unitId],
		references: [unitBisnis.id]
	}),
	contact: one(crmContacts, {
		fields: [crmDeals.kontakId],
		references: [crmContacts.id]
	}),
	company: one(crmCompanies, {
		fields: [crmDeals.companyId],
		references: [crmCompanies.id]
	}),
	tasks: many(crmTasks),
}));

export const crmActivitiesRelations = relations(crmActivities, ({one}) => ({
	owner: one(users, {
		fields: [crmActivities.ownerId],
		references: [users.id]
	}),
	unit: one(unitBisnis, {
		fields: [crmActivities.unitId],
		references: [unitBisnis.id]
	}),
	contact: one(crmContacts, {
		fields: [crmActivities.kontakId],
		references: [crmContacts.id]
	}),
}));

export const crmTasksRelations = relations(crmTasks, ({one}) => ({
	owner: one(users, {
		fields: [crmTasks.ownerId],
		references: [users.id]
	}),
	unit: one(unitBisnis, {
		fields: [crmTasks.unitId],
		references: [unitBisnis.id]
	}),
	contact: one(crmContacts, {
		fields: [crmTasks.kontakId],
		references: [crmContacts.id]
	}),
	deal: one(crmDeals, {
		fields: [crmTasks.dealId],
		references: [crmDeals.id]
	}),
}));

export const salaryComponentsRelations = relations(salaryComponents, ({one}) => ({
	employee: one(employees, {
		fields: [salaryComponents.employeeId],
		references: [employees.id]
	}),
}));

export const employeeKpiRelations = relations(employeeKpi, ({ one }) => ({
	employee: one(employees, {
		fields: [employeeKpi.employeeId],
		references: [employees.id],
	}),
}));

export const riwayatAksiRelations = relations(riwayatAksi, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [riwayatAksi.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [riwayatAksi.userId],
		references: [users.id],
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
}));// ======== SPRINT 1 RELATIONS ========

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [warehouses.unitId],
		references: [unitBisnis.id],
	}),
	stocks: many(warehouseStock),
	opnames: many(stockOpname),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
	warehouse: one(warehouses, {
		fields: [warehouseStock.warehouseId],
		references: [warehouses.id],
	}),
	product: one(products, {
		fields: [warehouseStock.productId],
		references: [products.id],
	}),
}));

export const stockOpnameRelations = relations(stockOpname, ({ one, many }) => ({
	warehouse: one(warehouses, {
		fields: [stockOpname.warehouseId],
		references: [warehouses.id],
	}),
	unitBisnis: one(unitBisnis, {
		fields: [stockOpname.unitId],
		references: [unitBisnis.id],
	}),
	items: many(stockOpnameItems),
}));

export const stockOpnameItemsRelations = relations(stockOpnameItems, ({ one }) => ({
	opname: one(stockOpname, {
		fields: [stockOpnameItems.opnameId],
		references: [stockOpname.id],
	}),
	product: one(products, {
		fields: [stockOpnameItems.productId],
		references: [products.id],
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [purchaseOrders.unitId],
		references: [unitBisnis.id],
	}),
	supplier: one(suppliers, {
		fields: [purchaseOrders.supplierId],
		references: [suppliers.id],
	}),
	items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
	po: one(purchaseOrders, {
		fields: [purchaseOrderItems.poId],
		references: [purchaseOrders.id],
	}),
	product: one(products, {
		fields: [purchaseOrderItems.productId],
		references: [products.id],
	}),
}));

// ═══════════════════════════════════════════════════
// ACCOUNTING / AKUNTANSI RELATIONS
// ═══════════════════════════════════════════════════

export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [chartOfAccounts.unitId],
		references: [unitBisnis.id],
	}),
	journalLines: many(journalEntryLines),
	fixedAssets: many(fixedAssets),
	taxRates: many(taxRates),
	budgetItems: many(budgetItems),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [journalEntries.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [journalEntries.userId],
		references: [users.id],
	}),
	lines: many(journalEntryLines),
	receivables: many(receivables),
	payables: many(payables),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
	journal: one(journalEntries, {
		fields: [journalEntryLines.journalId],
		references: [journalEntries.id],
	}),
	account: one(chartOfAccounts, {
		fields: [journalEntryLines.coaId],
		references: [chartOfAccounts.id],
	}),
	contact: one(accountingContacts, {
		fields: [journalEntryLines.contactId],
		references: [accountingContacts.id],
	}),
}));

export const receivablesRelations = relations(receivables, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [receivables.unitId],
		references: [unitBisnis.id],
	}),
	contact: one(accountingContacts, {
		fields: [receivables.contactId],
		references: [accountingContacts.id],
	}),
	journal: one(journalEntries, {
		fields: [receivables.journalId],
		references: [journalEntries.id],
	}),
}));

export const payablesRelations = relations(payables, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [payables.unitId],
		references: [unitBisnis.id],
	}),
	contact: one(accountingContacts, {
		fields: [payables.contactId],
		references: [accountingContacts.id],
	}),
	journal: one(journalEntries, {
		fields: [payables.journalId],
		references: [journalEntries.id],
	}),
}));

export const fixedAssetsRelations = relations(fixedAssets, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [fixedAssets.unitId],
		references: [unitBisnis.id],
	}),
	coa: one(chartOfAccounts, {
		fields: [fixedAssets.coaId],
		references: [chartOfAccounts.id],
	}),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [taxRates.unitId],
		references: [unitBisnis.id],
	}),
	coa: one(chartOfAccounts, {
		fields: [taxRates.coaId],
		references: [chartOfAccounts.id],
	}),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [budgetItems.unitId],
		references: [unitBisnis.id],
	}),
	coa: one(chartOfAccounts, {
		fields: [budgetItems.coaId],
		references: [chartOfAccounts.id],
	}),
}));

export const closingPeriodsRelations = relations(closingPeriods, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [closingPeriods.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [closingPeriods.userId],
		references: [users.id],
	}),
}));

export const accountingContactsRelations = relations(accountingContacts, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [accountingContacts.unitId],
		references: [unitBisnis.id],
	}),
	receivables: many(receivables),
	payables: many(payables),
	journalLines: many(journalEntryLines),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [supportTickets.unitId],
		references: [unitBisnis.id],
	}),
	customer: one(crmContacts, {
		fields: [supportTickets.customerId],
		references: [crmContacts.id],
	}),
	assignee: one(users, {
		fields: [supportTickets.assignedTo],
		references: [users.id],
	}),
	messages: many(supportTicketMessages)
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
	ticket: one(supportTickets, {
		fields: [supportTicketMessages.ticketId],
		references: [supportTickets.id],
	})
}));

// ======== SPRINT 2 RELATIONS ========

export const salesTargetsRelations = relations(salesTargets, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [salesTargets.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [salesTargets.userId],
		references: [users.id],
	}),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [salesOrders.unitId],
		references: [unitBisnis.id],
	}),
	customer: one(crmContacts, {
		fields: [salesOrders.customerId],
		references: [crmContacts.id],
	}),
	items: many(salesOrderItems),
	commissions: many(salesCommissions),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
	salesOrder: one(salesOrders, {
		fields: [salesOrderItems.salesOrderId],
		references: [salesOrders.id],
	}),
	product: one(products, {
		fields: [salesOrderItems.productId],
		references: [products.id],
	}),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [quotations.unitId],
		references: [unitBisnis.id],
	}),
	customer: one(crmContacts, {
		fields: [quotations.customerId],
		references: [crmContacts.id],
	}),
	items: many(quotationItems),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
	quotation: one(quotations, {
		fields: [quotationItems.quotationId],
		references: [quotations.id],
	}),
	product: one(products, {
		fields: [quotationItems.productId],
		references: [products.id],
	}),
}));

export const salesCommissionsRelations = relations(salesCommissions, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [salesCommissions.unitId],
		references: [unitBisnis.id],
	}),
	user: one(users, {
		fields: [salesCommissions.userId],
		references: [users.id],
	}),
}));

export const marketingCampaignsRelations = relations(marketingCampaigns, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [marketingCampaigns.unitId],
		references: [unitBisnis.id],
	}),
}));

export const adTrackersRelations = relations(adTrackers, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [adTrackers.unitId],
		references: [unitBisnis.id],
	}),
}));

export const landingPagesRelations = relations(landingPages, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [landingPages.unitId],
		references: [unitBisnis.id],
	}),
	leads: many(marketingLeads),
}));

export const marketingLeadsRelations = relations(marketingLeads, ({ one }) => ({
	landingPage: one(landingPages, {
		fields: [marketingLeads.landingPageId],
		references: [landingPages.id],
	}),
}));

export const vouchersRelations = relations(vouchers, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [vouchers.unitId],
		references: [unitBisnis.id],
	}),
}));

export const supportInboxChannelsRelations = relations(supportInboxChannels, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [supportInboxChannels.unitId],
		references: [unitBisnis.id],
	}),
}));

export const knowledgeBaseRelations = relations(knowledgeBase, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [knowledgeBase.unitId],
		references: [unitBisnis.id],
	}),
}));

export const ecommerceSettingsRelations = relations(ecommerceSettings, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [ecommerceSettings.unitId],
		references: [unitBisnis.id],
	}),
}));

export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ one, many }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [ecommerceOrders.unitId],
		references: [unitBisnis.id],
	}),
	items: many(ecommerceOrderItems),
}));

export const ecommerceOrderItemsRelations = relations(ecommerceOrderItems, ({ one }) => ({
	order: one(ecommerceOrders, {
		fields: [ecommerceOrderItems.ecommerceOrderId],
		references: [ecommerceOrders.id],
	}),
	product: one(products, {
		fields: [ecommerceOrderItems.productId],
		references: [products.id],
	}),
	variant: one(productVariants, {
		fields: [ecommerceOrderItems.variantId],
		references: [productVariants.id],
	}),
}));

export const employeeHistoryRelations = relations(employeeHistory, ({ one }) => ({
	employee: one(employees, {
		fields: [employeeHistory.employeeId],
		references: [employees.id],
	}),
}));


export const productBatchesRelations = relations(productBatches, ({ one }) => ({
	product: one(products, {
		fields: [productBatches.productId],
		references: [products.id],
	}),
}));

export const websiteSettingsRelations = relations(websiteSettings, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [websiteSettings.unitId],
		references: [unitBisnis.id],
	}),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
	unitBisnis: one(unitBisnis, {
		fields: [socialPosts.unitId],
		references: [unitBisnis.id],
	}),
}));

export const rolesRelations = relations(roles, () => ({}));

export const posReturnsRelations = relations(posReturns, ({ one, many }) => ({
	order: one(posOrders, {
		fields: [posReturns.orderId],
		references: [posOrders.id],
	}),
	unit: one(unitBisnis, {
		fields: [posReturns.unitId],
		references: [unitBisnis.id],
	}),
	items: many(posReturnItems),
}));

export const posReturnItemsRelations = relations(posReturnItems, ({ one }) => ({
	return: one(posReturns, {
		fields: [posReturnItems.returnId],
		references: [posReturns.id],
	}),
	orderItem: one(posOrderItems, {
		fields: [posReturnItems.orderItemId],
		references: [posOrderItems.id],
	}),
}));

export const posCashTransactionsRelations = relations(posCashTransactions, ({ one }) => ({
	shift: one(posShifts, {
		fields: [posCashTransactions.shiftId],
		references: [posShifts.id],
	}),
}));