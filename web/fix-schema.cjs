/**
 * Schema Fix Script
 * This script fixes the schema.js file to match the migration
 * Run this after reviewing the changes: node fix-schema.js
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'src/lib/server/schema.js');

// Read the current schema
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Define the fixes needed
const fixes = [
  {
    pattern: /export const journalEntries = mysqlTable\("journal_entries", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*userId: varchar\("user_id", \{ length: 50 \}\)\.notNull\(\),/,
    replacement: `export const journalEntries = mysqlTable("journal_entries", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const chartOfAccounts = mysqlTable\("chart_of_accounts", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),/,
    replacement: `export const chartOfAccounts = mysqlTable("chart_of_accounts", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const receivables = mysqlTable\("receivables", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*contactId: int\("contact_id"\)\.notNull\(\),\s*journalId: int\("journal_id"\),/,
    replacement: `export const receivables = mysqlTable("receivables", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	contactId: int("contact_id").notNull().references(() => accountingContacts.id, { onDelete: "restrict" }),
	journalId: int("journal_id").references(() => journalEntries.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const payables = mysqlTable\("payables", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*contactId: int\("contact_id"\)\.notNull\(\),\s*journalId: int\("journal_id"\),/,
    replacement: `export const payables = mysqlTable("payables", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	contactId: int("contact_id").notNull().references(() => accountingContacts.id, { onDelete: "restrict" }),
	journalId: int("journal_id").references(() => journalEntries.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const fixedAssets = mysqlTable\("fixed_assets", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),/,
    replacement: `export const fixedAssets = mysqlTable("fixed_assets", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const taxRates = mysqlTable\("tax_rates", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),/,
    replacement: `export const taxRates = mysqlTable("tax_rates", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const budgetItems = mysqlTable\("budget_items", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*coaId: int\("coa_id"\)\.notNull\(\),/,
    replacement: `export const budgetItems = mysqlTable("budget_items", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	coaId: int("coa_id").notNull().references(() => chartOfAccounts.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const closingPeriods = mysqlTable\("closing_periods", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*userId: varchar\("user_id", \{ length: 50 \}\)\.notNull\(\),/,
    replacement: `export const closingPeriods = mysqlTable("closing_periods", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	userId: int("user_id").notNull().references(() => users.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const warehouses = mysqlTable\("warehouses", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),/,
    replacement: `export const warehouses = mysqlTable("warehouses", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const warehouseStock = mysqlTable\("warehouse_stock", \{[\s\S]*?warehouseId: int\("warehouse_id"\)\.notNull\(\),\s*productId: varchar\("product_id", \{ length: 50 \}\)\.notNull\(\),/,
    replacement: `export const warehouseStock = mysqlTable("warehouse_stock", {
	id: int("id").primaryKey().autoincrement(),
	warehouseId: int("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const stockOpname = mysqlTable\("stock_opname", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*warehouseId: int\("warehouse_id"\)\.notNull\(\),\s*createdBy: int\("created_by"\)\.notNull\(\),/,
    replacement: `export const stockOpname = mysqlTable("stock_opname", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	warehouseId: int("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "restrict" }),
	createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const stockOpnameItems = mysqlTable\("stock_opname_items", \{[\s\S]*?opnameId: int\("opname_id"\)\.notNull\(\),\s*productId: varchar\("product_id", \{ length: 50 \}\)\.notNull\(\),/,
    replacement: `export const stockOpnameItems = mysqlTable("stock_opname_items", {
	id: int("id").primaryKey().autoincrement(),
	opnameId: int("opname_id").notNull().references(() => stockOpname.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "restrict" }),`
  },
  {
    pattern: /export const productBatches = mysqlTable\("product_batches", \{[\s\S]*?productId: varchar\("product_id", \{ length: 50 \}\)\.notNull\(\),\s*warehouseId: int\("warehouse_id"\)\.notNull\(\),/,
    replacement: `export const productBatches = mysqlTable("product_batches", {
	id: int("id").primaryKey().autoincrement(),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "cascade" }),
	warehouseId: int("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const purchaseOrders = mysqlTable\("purchase_orders", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),\s*supplierId: int\("supplier_id"\)\.notNull\(\),\s*createdBy: int\("created_by"\)\.notNull\(\),/,
    replacement: `export const purchaseOrders = mysqlTable("purchase_orders", {
	id: int("id").primaryKey().autoincrement(),
	poNumber: varchar("po_number", { length: 50 }).notNull().unique(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
	supplierId: int("supplier_id").notNull().references(() => suppliers.id, { onDelete: "restrict" }),
	createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "set null" }),`
  },
  {
    pattern: /export const purchaseOrderItems = mysqlTable\("purchase_order_items", \{[\s\S]*?poId: int\("po_id"\)\.notNull\(\),\s*productId: varchar\("product_id", \{ length: 50 \}\)\.notNull\(\),/,
    replacement: `export const purchaseOrderItems = mysqlTable("purchase_order_items", {
	id: int("id").primaryKey().autoincrement(),
	poId: int("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
	productId: varchar("product_id", { length: 50 }).notNull().references(() => products.id, { onDelete: "restrict" }),`
  },
  {
    pattern: /export const salesCommissions = mysqlTable\("sales_commissions", \{[\s\S]*?salesOrderId: int\("sales_order_id"\)\.notNull\(\),/,
    replacement: `export const salesCommissions = mysqlTable("sales_commissions", {
  id: int("id").primaryKey().autoincrement(),
  unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),
  salesOrderId: int("sales_order_id").notNull().references(() => salesOrders.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const salesOrders = mysqlTable\("sales_orders", \{[\s\S]*?receivableId: int\("receivable_id"\), \/\/ Link ke Piutang Usaha/,
    replacement: `  receivableId: int("receivable_id").references(() => receivables.id, { onDelete: "set null" }), // Link ke Piutang Usaha`
  },
  {
    pattern: /export const journalEntryLines = mysqlTable\("journal_entry_lines", \{[\s\S]*?journalId: int\("journal_id"\)\.notNull\(\),\s*coaId: int\("coa_id"\)\.notNull\(\),/,
    replacement: `export const journalEntryLines = mysqlTable("journal_entry_lines", {
	id: int("id").primaryKey().autoincrement(),
	journalId: int("journal_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
	coaId: int("coa_id").notNull().references(() => chartOfAccounts.id, { onDelete: "cascade" }),`
  },
  {
    pattern: /export const accountingContacts = mysqlTable\("accounting_contacts", \{[\s\S]*?unitId: int\("unit_id"\)\.notNull\(\),/,
    replacement: `export const accountingContacts = mysqlTable("accounting_contacts", {
	id: int("id").primaryKey().autoincrement(),
	unitId: int("unit_id").notNull().references(() => unitBisnis.id, { onDelete: "cascade" }),`
  }
];

// Apply fixes
let fixCount = 0;
fixes.forEach((fix, index) => {
  const match = schemaContent.match(fix.pattern);
  if (match) {
    schemaContent = schemaContent.replace(fix.pattern, fix.replacement);
    fixCount++;
    console.log(`✓ Applied fix ${index + 1}: ${fix.pattern.toString().substring(0, 50)}...`);
  } else {
    console.log(`✗ Fix ${index + 1} not found or already applied`);
  }
});

// Write the fixed schema
fs.writeFileSync(schemaPath, schemaContent, 'utf8');

console.log(`\n=== Schema Fix Complete ===`);
console.log(`Total fixes applied: ${fixCount}/${fixes.length}`);
console.log(`Backup created: ${schemaPath}.backup`);
console.log(`\nPlease review the changes and run the migration:`);
console.log(`npx drizzle-kit push`);
