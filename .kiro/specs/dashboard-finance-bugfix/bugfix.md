# Bugfix Requirements Document

## Introduction

This document outlines the requirements for fixing 20 critical bugs in the finance dashboard (`/finance/[slug]`) affecting data integrity, business logic, performance, and user experience. The bugs span incorrect calculations (Saldo Kas ignoring modal awal), field name mismatches between frontend and database schema, improper stock adjustments on transaction deletion, missing cascade deletes for journal entries, and various UI/UX inconsistencies.

**Affected Components:**
- Server logic: `web/src/routes/(app)/finance/[slug]/+page.server.js`
- Frontend UI: `web/src/routes/(app)/finance/[slug]/+page.svelte`
- Database schema: `web/drizzle/schema.js` (reference for correct field names)

**Impact Severity:**
- 🔴 Critical (Data Integrity): Bugs 1-5 cause incorrect financial calculations and ledger imbalances
- 🟠 High (Business Logic): Bugs 6-11 violate business rules and create UX confusion
- 🟡 Medium (Features/Dead Code): Bugs 12-18 involve missing features or unused code
- 🔵 Low (Performance): Bugs 19-20 affect performance and error handling

---

## Bug Analysis

### Current Behavior (Defect)

#### Section 1: Data Integrity Bugs (Critical)

1.1 WHEN calculating saldo kas AND modal awal > 0 THEN the system calculates `saldoKas = totalMasuk - totalKeluar` (ignoring modal awal)

1.2 WHEN rendering unit data in frontend AND unit has modalAwal value THEN the system displays 0 because it references `unit.modal_awal` (snake_case) instead of `unit.modalAwal` (camelCase)

1.3 WHEN displaying transaction payment method in table AND transaction has metodeBayar value THEN the system always shows "KAS" because it references `trx.metode_bayar` (snake_case) instead of `trx.metodeBayar` (camelCase)

1.4 WHEN deleting a transaction with kategoriTrx = 'KELUAR' (purchase) AND transaction has productId THEN the system executes `stok = produk.stok + trxData.qty` which incorrectly increases stock (should decrease)

1.5 WHEN deleting a transaction with kategoriTrx = 'MASUK' (sale) AND transaction has productId THEN the system executes `stok = produk.stok + trxData.qty` which correctly restores stock but uses hardcoded addition operator for all cases

1.6 WHEN deleting a transaction that has associated journal entries THEN the system only deletes the transaksi row, leaving orphaned records in journal_entries and journal_entry_lines tables

#### Section 2: Business Logic Bugs

2.1 WHEN calculating monthly target KPI THEN the system uses arbitrary formula `Math.max(modalAwal * 1.5, 10000000)` which is not user-configurable and has no business basis

2.2 WHEN displaying KPI "current" value with date filter active (e.g., "7 days") THEN the system uses filtered period total instead of current month total, making monthly target comparison meaningless

2.3 WHEN loading dashboard without query parameters THEN the system defaults to `startDate = "all"` but frontend highlights "Hari Ini" button, creating UX confusion

2.4 WHEN calculating projected cash flow with non-monthly filter active THEN the system divides filtered total by current day of month, producing nonsensical projection

2.5 WHEN determining low stock products THEN the system uses hardcoded threshold `stok <= 5`, ignoring product-specific `minStok` field in database

2.6 WHEN displaying bank balances THEN the system filters out negative balances with `.filter(b => b.saldo > 0)`, hiding overdrawn accounts

#### Section 3: Missing Features & Dead Code

3.1 WHEN user clicks "Saldo Kas" or "Arus Kas" cards THEN nothing happens because popup variables `showSaldoKasDetail` and `showArusKasDetail` are defined but no popup component exists

3.2 WHEN viewing transaction chart THEN no income/expense filter buttons are visible, even though chart logic supports filtering by kategoriTrx

3.3 WHEN chart has no product-linked transactions (all `productId == null`) THEN chart renders empty without explanation message

3.4 WHEN rendering audit log items THEN all dots are blue because code checks for `log.tipe === 'DELETE'/'UPDATE'` but database stores `success`/`info`/`warning`/`error`

3.5 WHEN "AI INSIGHT" panel displays strategic BI recommendations THEN it uses simple if-else threshold checks, not actual AI/ML models

3.6 WHEN frontend loads THEN `checkUpdates()` function is defined but never called, and polling interval is commented out or missing

3.7 WHEN realtime subscription receives events THEN handler is attached twice, causing every event to trigger data reload 2x

#### Section 4: Performance & Error Handling

4.1 WHEN loading transaction list THEN the system fetches all transactions without `.limit()` clause, potentially loading thousands of records even though UI only displays 8

4.2 WHEN unit slug is not found THEN the system throws `error(404)` but try-catch block catches it and returns 500 status code instead of 404

---

### Expected Behavior (Correct)

#### Section 1: Data Integrity Fixes

1.1 WHEN calculating saldo kas AND modal awal > 0 THEN the system SHALL calculate `saldoKas = modalAwal + totalMasuk - totalKeluar`

1.2 WHEN rendering unit data in frontend AND unit has modalAwal value THEN the system SHALL reference `unit.modalAwal` (camelCase) to display correct value

1.3 WHEN displaying transaction payment method in table AND transaction has metodeBayar value THEN the system SHALL reference `trx.metodeBayar` (camelCase) to display actual payment method

1.4 WHEN deleting a transaction with kategoriTrx = 'KELUAR' (purchase) AND transaction has productId THEN the system SHALL execute `stok = produk.stok - trxData.qty` to correctly decrease stock

1.5 WHEN deleting a transaction with kategoriTrx = 'MASUK' (sale) AND transaction has productId THEN the system SHALL execute `stok = produk.stok + trxData.qty` to correctly restore stock

1.6 WHEN deleting a transaction that has associated journal entries THEN the system SHALL cascade delete all related records from journal_entries and journal_entry_lines tables

#### Section 2: Business Logic Fixes

2.1 WHEN calculating monthly target KPI THEN the system SHALL retrieve user-configurable target from database (unitBisnis.monthlyTarget or separate targets table)

2.2 WHEN displaying KPI "current" value regardless of date filter THEN the system SHALL calculate current month revenue only for accurate monthly target comparison

2.3 WHEN loading dashboard without query parameters THEN the system SHALL either default to today's date OR ensure frontend highlights "Semua" button to match "all" filter state

2.4 WHEN calculating projected cash flow THEN the system SHALL use only current month data and extrapolate: `(currentMonthTotal / currentDayOfMonth) * daysInMonth`

2.5 WHEN determining low stock products THEN the system SHALL compare against product-specific minStok: `stok <= (minStok || 5)`

2.6 WHEN displaying bank balances THEN the system SHALL show all accounts including negative balances (remove `.filter(b => b.saldo > 0)`)

#### Section 3: Missing Features & Dead Code Cleanup

3.1 WHEN user clicks "Saldo Kas" or "Arus Kas" cards THEN the system SHALL either implement detail popup component OR remove unused variables and onclick handlers

3.2 WHEN viewing transaction chart THEN the system SHALL display "Masuk / Keluar" toggle buttons to enable kategoriTrx filtering

3.3 WHEN chart has no product-linked transactions THEN the system SHALL display message "Tidak ada transaksi yang terhubung ke produk"

3.4 WHEN rendering audit log items THEN the system SHALL map severity colors: `success → green`, `info → blue`, `warning → yellow`, `error → red`

3.5 WHEN "STRATEGIC BI" panel displays recommendations THEN the system SHALL either rename to "Business Insights" OR integrate actual ML model (if required for thesis)

3.6 WHEN frontend contains unused polling code THEN the system SHALL remove `checkUpdates()` function and commented interval code

3.7 WHEN attaching realtime subscription handlers THEN the system SHALL ensure handler is attached only once to prevent duplicate reloads

#### Section 4: Performance & Error Handling Fixes

4.1 WHEN loading transaction list THEN the system SHALL implement pagination OR add `.limit(100)` with "load more" functionality

4.2 WHEN unit slug is not found THEN the system SHALL return 404 status code (not catch 404 errors in try-catch block)

---

### Unchanged Behavior (Regression Prevention)

#### Section 1: Existing Core Functionality

1.1 WHEN calculating summary totals for income and expenses THEN the system SHALL CONTINUE TO use `SUM(CASE WHEN kategoriTrx)` aggregation logic

1.2 WHEN filtering transactions by date range THEN the system SHALL CONTINUE TO apply `DATE(tanggal) >= startDate AND DATE(tanggal) <= endDate` filter

1.3 WHEN fetching ABC categories THEN the system SHALL CONTINUE TO order by `abcCategories.id`

1.4 WHEN fetching products for unit THEN the system SHALL CONTINUE TO select id, nama, harga_jual, stok fields

1.5 WHEN calculating total HPP THEN the system SHALL CONTINUE TO use `SUM(COALESCE(hppTotal, 0))` aggregation

#### Section 2: Cache & Performance (Non-buggy cases)

2.1 WHEN Redis is available AND cache key exists THEN the system SHALL CONTINUE TO return cached data

2.2 WHEN Redis is unavailable THEN the system SHALL CONTINUE TO gracefully fall back to database query without crashing

2.3 WHEN cache is set successfully THEN the system SHALL CONTINUE TO use 300-second expiration time

2.4 WHEN invalidating cache after actions THEN the system SHALL CONTINUE TO delete all matching keys for userId and slug

#### Section 3: AR/AP & Journal Queries

3.1 WHEN fetching overdue receivables THEN the system SHALL CONTINUE TO filter by status in ['BELUM_BAYAR', 'SEBAGIAN'] and jatuhTempo <= today

3.2 WHEN fetching overdue payables THEN the system SHALL CONTINUE TO use same status and due date logic as receivables

3.3 WHEN calculating bank balances from double-entry THEN the system SHALL CONTINUE TO use `SUM(debit) - SUM(kredit)` for ASET_LANCAR accounts

3.4 WHEN joining journal tables THEN the system SHALL CONTINUE TO use inner joins between journalEntryLines, journalEntries, and chartOfAccounts

#### Section 4: Transaction Actions (Non-delete cases)

4.1 WHEN user is not authenticated THEN the system SHALL CONTINUE TO throw 401 error

4.2 WHEN database transaction fails THEN the system SHALL CONTINUE TO rollback all changes

4.3 WHEN audit log is recorded THEN the system SHALL CONTINUE TO store userId, unitId, pesan, tipe, waktu

4.4 WHEN strategic BI is built THEN the system SHALL CONTINUE TO pass totalMasuk, totalKeluar, directCosts, modalAwal as parameters

#### Section 5: Frontend Display (Non-buggy elements)

5.1 WHEN displaying transaction list THEN the system SHALL CONTINUE TO show tanggal, kategoriTrx, keterangan, nominal columns

5.2 WHEN rendering alerts section THEN the system SHALL CONTINUE TO display receivables, payables, and low stock warnings

5.3 WHEN showing KPI widget THEN the system SHALL CONTINUE TO display target vs current comparison

5.4 WHEN displaying strategic BI insights THEN the system SHALL CONTINUE TO show recommendations based on margin and efficiency metrics

5.5 WHEN date filter is changed THEN the system SHALL CONTINUE TO update URL query parameters and trigger `depends('app:finance')` invalidation
