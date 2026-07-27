# Migration Instructions

## Database Schema Fixes Applied

The following fixes have been applied to resolve relation mismatches and add proper foreign key constraints:

### 1. Schema.js Updates (19 fixes applied)
- Changed `journal_entries.userId` from varchar(50) to int
- Added foreign key references to:
  - `journal_entries.unitId` → `unit_bisnis.id` (CASCADE)
  - `journal_entries.userId` → `users.id` (SET NULL)
  - `chart_of_accounts.unitId` → `unit_bisnis.id` (CASCADE)
  - `receivables.unitId` → `unit_bisnis.id` (CASCADE)
  - `receivables.contactId` → `accounting_contacts.id` (RESTRICT)
  - `receivables.journalId` → `journal_entries.id` (SET NULL)
  - `payables.unitId` → `unit_bisnis.id` (CASCADE)
  - `payables.contactId` → `accounting_contacts.id` (RESTRICT)
  - `payables.journalId` → `journal_entries.id` (SET NULL)
  - `fixed_assets.unitId` → `unit_bisnis.id` (CASCADE)
  - `fixed_assets.coaId` → `chart_of_accounts.id` (SET NULL)
  - `tax_rates.unitId` → `unit_bisnis.id` (CASCADE)
  - `tax_rates.coaId` → `chart_of_accounts.id` (SET NULL)
  - `budget_items.unitId` → `unit_bisnis.id` (CASCADE)
  - `budget_items.coaId` → `chart_of_accounts.id` (CASCADE)
  - `closing_periods.userId` from varchar(50) to int
  - `closing_periods.unitId` → `unit_bisnis.id` (CASCADE)
  - `closing_periods.userId` → `users.id` (SET NULL)
  - All warehouse-related tables with proper FK constraints
  - All purchase order tables with proper FK constraints
  - `sales_orders.receivableId` → `receivables.id` (SET NULL)
  - `sales_commissions.salesOrderId` → `sales_orders.id` (CASCADE)

### 2. Relations.ts Updates
- Added missing relations for:
  - `chartOfAccounts`: fixedAssets, taxRates, budgetItems
  - `journalEntries`: receivables, payables
  - `journalEntryLines`: contact
  - `receivables`: journal
  - `payables`: journal
  - `fixedAssets`: coa
  - `taxRates`: coa
  - `budgetItems`: coa
  - `closingPeriods`: user
  - `accountingContacts`: journalLines
  - `employees`: kpi
  - `unitBisnis`: riwayatAksi
  - `employeeKpi`: employee
  - `riwayatAksi`: unitBisnis, user

### 3. Composite Indexes Added
- `idx_journal_entries_unit_tanggal` on (unit_id, tanggal)
- `idx_receivables_unit_status` on (unit_id, status)
- `idx_payables_unit_status` on (unit_id, status)
- `idx_transaksi_unit_tanggal` on (unit_id, tanggal)
- `idx_employees_unit_status` on (user_id, status)
- `idx_products_unit_kategori` on (unit_id, kategori_id)
- `idx_pos_orders_unit_tanggal` on (unit_id, created_at)
- `idx_sales_orders_unit_status` on (unit_id, status)
- `idx_crm_contacts_unit_stage` on (unit_id, stage)

## How to Apply Migration

### Option 1: Using Drizzle Kit (Recommended)
```bash
# Enable PowerShell execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run migration
npx drizzle-kit push
```

### Option 2: Manual SQL Execution
If drizzle-kit fails, manually execute the migration file:

```bash
# Connect to your MySQL database
mysql -u your_user -p your_database < drizzle/migrations/0003_fix_foreign_key_constraints.sql
```

### Option 3: Using MySQL Client
1. Open your MySQL client (phpMyAdmin, MySQL Workbench, etc.)
2. Select your database
3. Execute the SQL from `drizzle/migrations/0003_fix_foreign_key_constraints.sql`

## Important Notes

⚠️ **Backup your database before running migration!**

```bash
# Backup command
mysqldump -u your_user -p your_database > backup_before_migration.sql
```

⚠️ **Data Migration Required for userId Changes**

Since we changed `journal_entries.userId` and `closing_periods.userId` from varchar to int, you may need to migrate existing data:

```sql
-- Check if there are any non-integer user_id values
SELECT * FROM journal_entries WHERE user_id REGEXP '[^0-9]';
SELECT * FROM closing_periods WHERE user_id REGEXP '[^0-9]';

-- If all are valid integers, the ALTER TABLE will work
-- If there are invalid values, update them first
UPDATE journal_entries SET user_id = NULL WHERE user_id REGEXP '[^0-9]';
UPDATE closing_periods SET user_id = NULL WHERE user_id REGEXP '[^0-9]';
```

## Verification After Migration

Run these queries to verify the migration was successful:

```sql
-- Check foreign key constraints
SELECT 
    TABLE_NAME, 
    CONSTRAINT_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME
FROM 
    information_schema.KEY_COLUMN_USAGE
WHERE 
    TABLE_SCHEMA = 'your_database_name'
    AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check indexes
SHOW INDEX FROM journal_entries;
SHOW INDEX FROM receivables;
SHOW INDEX FROM payables;
SHOW INDEX FROM transaksi;
```

## Rollback Plan

If you need to rollback:

```sql
-- Drop foreign key constraints (run in reverse order)
ALTER TABLE journal_entries DROP FOREIGN KEY fk_journal_entries_unit_id;
ALTER TABLE journal_entries DROP FOREIGN KEY fk_journal_entries_user_id;
-- ... repeat for all FK constraints

-- Drop indexes
DROP INDEX idx_journal_entries_unit_tanggal ON journal_entries;
-- ... repeat for all indexes

-- Restore from backup
mysql -u your_user -p your_database < backup_before_migration.sql
```

## Next Steps

After successful migration:
1. Test the application thoroughly
2. Check all endpoints that use the updated relations
3. Verify data integrity
4. Monitor for any performance improvements from the new indexes
