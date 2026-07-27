-- Migration: Fix Foreign Key Constraints and Data Type Mismatches (v2)
-- This migration fixes relation mismatches and adds proper foreign key constraints
-- Version 2: Handles orphaned data and column type changes properly

-- STEP 1: Clean up orphaned data before adding FK constraints
-- Clean up fixed_assets with invalid coa_id
UPDATE fixed_assets SET coa_id = NULL WHERE coa_id IS NOT NULL AND coa_id NOT IN (SELECT id FROM chart_of_accounts);

-- Clean up tax_rates with invalid coa_id
UPDATE tax_rates SET coa_id = NULL WHERE coa_id IS NOT NULL AND coa_id NOT IN (SELECT id FROM chart_of_accounts);

-- Clean up budget_items with invalid coa_id
UPDATE budget_items SET coa_id = NULL WHERE coa_id IS NOT NULL AND coa_id NOT IN (SELECT id FROM chart_of_accounts);

-- Clean up receivables with invalid contact_id
UPDATE receivables SET contact_id = NULL WHERE contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM accounting_contacts);

-- Clean up payables with invalid contact_id
UPDATE payables SET contact_id = NULL WHERE contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM accounting_contacts);

-- Clean up journal_entry_lines with invalid coa_id
UPDATE journal_entry_lines SET coa_id = NULL WHERE coa_id IS NOT NULL AND coa_id NOT IN (SELECT id FROM chart_of_accounts);

-- Clean up journal_entry_lines with invalid contact_id
UPDATE journal_entry_lines SET contact_id = NULL WHERE contact_id IS NOT NULL AND contact_id NOT IN (SELECT id FROM accounting_contacts);

-- STEP 2: Change column types BEFORE adding FK constraints
-- Fix journal_entries table - change userId from varchar to int
ALTER TABLE journal_entries MODIFY COLUMN user_id INT NOT NULL;

-- Fix closing_periods table - change userId from varchar to int  
ALTER TABLE closing_periods MODIFY COLUMN user_id INT NOT NULL;

-- STEP 3: Add foreign key constraints (skip if already exists)
-- 1. journal_entries table
ALTER TABLE journal_entries ADD CONSTRAINT IF NOT EXISTS fk_journal_entries_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE journal_entries ADD CONSTRAINT IF NOT EXISTS fk_journal_entries_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. chart_of_accounts table
ALTER TABLE chart_of_accounts ADD CONSTRAINT IF NOT EXISTS fk_chart_of_accounts_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;

-- 3. receivables table
ALTER TABLE receivables ADD CONSTRAINT IF NOT EXISTS fk_receivables_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE receivables ADD CONSTRAINT IF NOT EXISTS fk_receivables_contact_id FOREIGN KEY (contact_id) REFERENCES accounting_contacts(id) ON DELETE RESTRICT;
ALTER TABLE receivables ADD CONSTRAINT IF NOT EXISTS fk_receivables_journal_id FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE SET NULL;

-- 4. payables table
ALTER TABLE payables ADD CONSTRAINT IF NOT EXISTS fk_payables_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE payables ADD CONSTRAINT IF NOT EXISTS fk_payables_contact_id FOREIGN KEY (contact_id) REFERENCES accounting_contacts(id) ON DELETE RESTRICT;
ALTER TABLE payables ADD CONSTRAINT IF NOT EXISTS fk_payables_journal_id FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE SET NULL;

-- 5. fixed_assets table
ALTER TABLE fixed_assets ADD CONSTRAINT IF NOT EXISTS fk_fixed_assets_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE fixed_assets ADD CONSTRAINT IF NOT EXISTS fk_fixed_assets_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- 6. tax_rates table
ALTER TABLE tax_rates ADD CONSTRAINT IF NOT EXISTS fk_tax_rates_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE tax_rates ADD CONSTRAINT IF NOT EXISTS fk_tax_rates_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- 7. budget_items table
ALTER TABLE budget_items ADD CONSTRAINT IF NOT EXISTS fk_budget_items_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE budget_items ADD CONSTRAINT IF NOT EXISTS fk_budget_items_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE;

-- 8. closing_periods table
ALTER TABLE closing_periods ADD CONSTRAINT IF NOT EXISTS fk_closing_periods_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE closing_periods ADD CONSTRAINT IF NOT EXISTS fk_closing_periods_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 9. warehouses table
ALTER TABLE warehouses ADD CONSTRAINT IF NOT EXISTS fk_warehouses_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;

-- 10. warehouse_stock table
ALTER TABLE warehouse_stock ADD CONSTRAINT IF NOT EXISTS fk_warehouse_stock_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;
ALTER TABLE warehouse_stock ADD CONSTRAINT IF NOT EXISTS fk_warehouse_stock_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- 11. stock_opname table
ALTER TABLE stock_opname ADD CONSTRAINT IF NOT EXISTS fk_stock_opname_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE stock_opname ADD CONSTRAINT IF NOT EXISTS fk_stock_opname_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT;
ALTER TABLE stock_opname ADD CONSTRAINT IF NOT EXISTS fk_stock_opname_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 12. stock_opname_items table
ALTER TABLE stock_opname_items ADD CONSTRAINT IF NOT EXISTS fk_stock_opname_items_opname_id FOREIGN KEY (opname_id) REFERENCES stock_opname(id) ON DELETE CASCADE;
ALTER TABLE stock_opname_items ADD CONSTRAINT IF NOT EXISTS fk_stock_opname_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- 13. product_batches table
ALTER TABLE product_batches ADD CONSTRAINT IF NOT EXISTS fk_product_batches_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
ALTER TABLE product_batches ADD CONSTRAINT IF NOT EXISTS fk_product_batches_warehouse_id FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE;

-- 14. purchase_orders table
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS fk_purchase_orders_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS fk_purchase_orders_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT;
ALTER TABLE purchase_orders ADD CONSTRAINT IF NOT EXISTS fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 15. purchase_order_items table
ALTER TABLE purchase_order_items ADD CONSTRAINT IF NOT EXISTS fk_purchase_order_items_po_id FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE purchase_order_items ADD CONSTRAINT IF NOT EXISTS fk_purchase_order_items_product_id FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- 16. sales_orders table
ALTER TABLE sales_orders ADD CONSTRAINT IF NOT EXISTS fk_sales_orders_receivable_id FOREIGN KEY (receivable_id) REFERENCES receivables(id) ON DELETE SET NULL;

-- 17. sales_commissions table
ALTER TABLE sales_commissions ADD CONSTRAINT IF NOT EXISTS fk_sales_commissions_sales_order_id FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE;

-- 18. journal_entry_lines table
ALTER TABLE journal_entry_lines ADD CONSTRAINT IF NOT EXISTS fk_journal_entry_lines_journal_id FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE;
ALTER TABLE journal_entry_lines ADD CONSTRAINT IF NOT EXISTS fk_journal_entry_lines_coa_id FOREIGN KEY (coa_id) REFERENCES chart_of_accounts(id) ON DELETE CASCADE;
ALTER TABLE journal_entry_lines ADD CONSTRAINT IF NOT EXISTS fk_journal_entry_lines_contact_id FOREIGN KEY (contact_id) REFERENCES accounting_contacts(id) ON DELETE SET NULL;

-- 19. accounting_contacts table
ALTER TABLE accounting_contacts ADD CONSTRAINT IF NOT EXISTS fk_accounting_contacts_unit_id FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE;

-- STEP 4: Add composite indexes (skip if already exists)
CREATE INDEX IF NOT EXISTS idx_journal_entries_unit_tanggal ON journal_entries(unit_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_receivables_unit_status ON receivables(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_payables_unit_status ON payables(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_transaksi_unit_tanggal ON transaksi(unit_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_employees_unit_status ON employees(user_id, status);
CREATE INDEX IF NOT EXISTS idx_products_unit_kategori ON products(unit_id, kategori_id);
CREATE INDEX IF NOT EXISTS idx_pos_orders_unit_tanggal ON pos_orders(unit_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_orders_unit_status ON sales_orders(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_unit_stage ON crm_contacts(unit_id, stage);
