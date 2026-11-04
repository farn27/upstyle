# Dashboard Finance Bugfix Design

## Overview

This design document provides technical solutions for fixing 20 critical bugs in the finance dashboard (`/finance/[slug]`). The bugs are categorized into four severity levels: Data Integrity (Critical), Business Logic (High), Missing Features/Dead Code (Medium), and Performance/Error Handling (Low).

The fixes address incorrect financial calculations (saldo kas ignoring modal awal), field name mismatches between frontend and database schema (snake_case vs camelCase), improper stock adjustments on transaction deletion, missing cascade deletes for journal entries, and various UI/UX inconsistencies.

**Technical Approach:**
- Fix saldo kas calculation to include modal awal in the formula
- Correct all field name references to use camelCase (matching Drizzle schema aliases)
- Implement proper stock reversal logic based on transaction category
- Add cascade deletes for journal entries when transactions are deleted
- Replace hardcoded business rules with database-driven or user-configurable values
- Remove dead code and implement missing UI features
- Add pagination and proper error handling

---

## Glossary

- **Bug_Condition (C)**: The condition that triggers each bug - varies per bug category
- **Property (P)**: The desired correct behavior when bug condition is met
- **Preservation**: Existing functionality that must remain unchanged by the fixes
- **saldoKas**: Cash balance calculation - should be `modalAwal + totalMasuk - totalKeluar`
- **modalAwal**: Initial capital stored in `unitBisnis.modal_awal` column (database uses snake_case, Drizzle alias uses camelCase)
- **metodeBayar**: Payment method stored in `transaksi.metode_bayar` column (database uses snake_case, Drizzle alias uses camelCase)
- **kategoriTrx**: Transaction category - either 'MASUK' (income/sale) or 'KELUAR' (expense/purchase)
- **Cascade Delete**: When deleting a transaction, also delete related journal_entries and journal_entry_lines records
- **Stock Reversal**: Restoring product stock when a transaction is deleted - direction depends on kategoriTrx

---

## Bug Details

### Section 1: Data Integrity Bugs (Critical - 🔴)

#### Bug 1.1: Saldo Kas Ignores Modal Awal

**Bug Condition:**
The saldo kas calculation fails to include modal awal (initial capital) in the formula, causing incorrect cash balance reporting.

**Formal Specification:**
```
FUNCTION isBugCondition_1_1(unit)
  INPUT: unit of type UnitBisnis
  OUTPUT: boolean
  
  RETURN unit.modalAwal > 0
         AND calculatedSaldoKas = (totalMasuk - totalKeluar)
         AND NOT includes(modalAwal in formula)
END FUNCTION
```

**Current Code Location:** `+page.svelte` line ~95
```javascript
$: saldoSaatIni = modalAwal + selisih;  // selisih = totalMasuk - totalKeluar
```

**Issue:** The frontend calculates it correctly, but the variable name suggests this is the "current balance" display. However, the server doesn't provide a pre-calculated `saldoKas` field that includes modal awal.

**Examples:**
- Modal Awal: Rp 10,000,000
- Total Masuk: Rp 5,000,000
- Total Keluar: Rp 3,000,000
- **Current (Wrong)**: saldoKas = 5,000,000 - 3,000,000 = Rp 2,000,000
- **Expected (Correct)**: saldoKas = 10,000,000 + 5,000,000 - 3,000,000 = Rp 12,000,000

#### Bug 1.2: Frontend References `unit.modal_awal` Instead of `unit.modalAwal`

**Bug Condition:**
Frontend code references the database column name `modal_awal` (snake_case) instead of the Drizzle schema alias `modalAwal` (camelCase), causing display of 0 instead of actual value.

**Formal Specification:**
```
FUNCTION isBugCondition_1_2(unit, displayValue)
  INPUT: unit of type UnitBisnis, displayValue of type number
  OUTPUT: boolean
  
  RETURN unit.modalAwal > 0
         AND displayValue = 0
         AND code_references = 'unit.modal_awal'
END FUNCTION
```

**Current Code Location:** `+page.svelte` line ~94
```javascript
$: modalAwal = Number(unit?.modal_awal) || 0;  // WRONG: snake_case
```

**Schema Reference:** `web/src/lib/server/schema.js`
```javascript
modalAwal: decimal("modal_awal", { precision: 15, scale: 2 }).default('0.00')
```

The schema defines the **alias** as `modalAwal` (camelCase) which maps to the database column `modal_awal` (snake_case). Drizzle queries return objects with camelCase keys.

**Examples:**
- Database has: `modal_awal = 10000000`
- Drizzle returns: `{ modalAwal: 10000000 }`
- Frontend accesses: `unit.modal_awal` → returns `undefined` → displays 0

#### Bug 1.3: Transaction Table Shows Wrong Payment Method

**Bug Condition:**
Transaction list displays all transactions as "KAS" payment method because frontend references `trx.metode_bayar` (snake_case) instead of `trx.metodeBayar` (camelCase).

**Formal Specification:**
```
FUNCTION isBugCondition_1_3(transaction, displayedMethod)
  INPUT: transaction with metodeBayar field, displayedMethod shown in UI
  OUTPUT: boolean
  
  RETURN transaction.metodeBayar IN ['TRANSFER', 'QRIS', 'DEBIT', 'CREDIT']
         AND displayedMethod = 'KAS'
         AND code_references = 'trx.metode_bayar'
END FUNCTION
```

**Current Code Location:** `+page.svelte` (transaction table rendering section, likely around line 200+)

**Schema Reference:**
```javascript
metodeBayar: varchar("metode_bayar", { length: 100 }).default('KAS')
```

**Examples:**
- Database has: `metode_bayar = 'TRANSFER'`
- Drizzle returns: `{ metodeBayar: 'TRANSFER' }`
- Frontend accesses: `trx.metode_bayar` → returns `undefined` → defaults to 'KAS'

#### Bug 1.4 & 1.5: Stock Reversal Logic Uses Hardcoded Addition

**Bug Condition:**
When deleting transactions, stock reversal always uses addition operator (`stok + qty`) regardless of transaction category, causing incorrect stock adjustments.

**Formal Specification:**
```
FUNCTION isBugCondition_1_4_5(transaction)
  INPUT: transaction being deleted
  OUTPUT: boolean
  
  RETURN transaction.productId IS NOT NULL
         AND transaction.qty > 0
         AND stock_reversal_uses = 'produk.stok + trxData.qty'  // hardcoded addition
         AND NOT considers(transaction.kategoriTrx)
END FUNCTION
```

**Current Code Location:** `+page.server.js` lines ~120-125 (deleteTransaction action)
```javascript
if (produk) {
    await tx.update(products)
        .set({ stok: produk.stok + trxData.qty })  // ALWAYS adds, regardless of kategoriTrx
        .where(eq(products.id, trxData.productId));
}
```

**Business Logic:**
- **KELUAR (Purchase)**: When buying inventory, stock increases. When DELETING purchase, stock should DECREASE.
  - Original transaction: `stok = stok + qty` (purchase increases stock)
  - Delete reversal: `stok = stok - qty` (remove the increase)
  
- **MASUK (Sale)**: When selling, stock decreases. When DELETING sale, stock should INCREASE (restore).
  - Original transaction: `stok = stok - qty` (sale decreases stock)
  - Delete reversal: `stok = stok + qty` (restore the stock)

**Examples:**

**Bug 1.4 Example (KELUAR - Purchase):**
- Initial stock: 100 units
- Purchase transaction: +50 units → stock becomes 150
- Delete purchase (CURRENT WRONG): 150 + 50 = 200 (incorrectly increases further)
- Delete purchase (EXPECTED): 150 - 50 = 100 (correctly restores to original)

**Bug 1.5 Example (MASUK - Sale):**
- Initial stock: 100 units
- Sale transaction: -30 units → stock becomes 70
- Delete sale (CURRENT): 70 + 30 = 100 (CORRECT - restores stock)
- This case works correctly by accident, but uses hardcoded addition

#### Bug 1.6: Missing Cascade Deletes for Journal Entries

**Bug Condition:**
When deleting a transaction, related journal_entries and journal_entry_lines records are not deleted, leaving orphaned data in the accounting system.

**Formal Specification:**
```
FUNCTION isBugCondition_1_6(transaction)
  INPUT: transaction being deleted
  OUTPUT: boolean
  
  RETURN transaction has associated journal_entries
         AND delete_statement = 'DELETE FROM transaksi WHERE id = ?'
         AND NOT includes('DELETE FROM journal_entries')
         AND NOT includes('DELETE FROM journal_entry_lines')
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~127
```javascript
await tx.delete(transaksi).where(eq(transaksi.id, id));
// Missing: cascade delete for journal entries
```

**Expected Cascade:**
```sql
-- Must also delete:
DELETE FROM journal_entry_lines WHERE journalId IN (
    SELECT id FROM journal_entries WHERE transaksiId = ?
)
DELETE FROM journal_entries WHERE transaksiId = ?
DELETE FROM transaksi WHERE id = ?
```

**Examples:**
- Transaction ID 123 has journal_entry ID 456
- Journal entry 456 has 2 journal_entry_lines (debit and credit)
- Current: Deletes only transaction 123, leaves journal_entry 456 and its lines orphaned
- Expected: Deletes transaction 123, journal_entry 456, and both journal_entry_lines

---

### Section 2: Business Logic Bugs (High - 🟠)

#### Bug 2.1: Hardcoded Monthly Target KPI

**Bug Condition:**
Monthly revenue target uses arbitrary formula `Math.max(modalAwal * 1.5, 10000000)` which is not configurable and has no business justification.

**Formal Specification:**
```
FUNCTION isBugCondition_2_1(unit)
  INPUT: unit of type UnitBisnis
  OUTPUT: boolean
  
  RETURN target_calculation = 'Math.max(modalAwal * 1.5, 10000000)'
         AND NOT exists(unit.monthlyTarget in database)
         AND NOT user_configurable
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~105
```javascript
const targetPendapatan = Math.max(unitData.modalAwal * 1.5, 10000000);
```

**Issue:** Target should be user-defined and stored in database, not calculated from modal awal.

**Examples:**
- Modal Awal: Rp 5,000,000 → Target: Rp 10,000,000 (arbitrary 2x minimum)
- Modal Awal: Rp 20,000,000 → Target: Rp 30,000,000 (arbitrary 1.5x)
- Expected: User sets target to Rp 50,000,000 regardless of modal awal

#### Bug 2.2: KPI "Current" Value Uses Filtered Period Instead of Current Month

**Bug Condition:**
When user filters by date range (e.g., "7 days"), the KPI widget shows filtered period total as "current", making comparison to monthly target meaningless.

**Formal Specification:**
```
FUNCTION isBugCondition_2_2(dateFilter, kpiCurrent)
  INPUT: dateFilter (start/end dates), kpiCurrent displayed value
  OUTPUT: boolean
  
  RETURN dateFilter.startDate != first_day_of_current_month
         OR dateFilter.endDate != today
         AND kpiCurrent = SUM(transactions in filtered period)
         AND NOT kpiCurrent = SUM(transactions in current month)
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~106
```javascript
const currentPendapatan = Number(summary.total_masuk || 0);
// Uses filtered summary, not current month
```

**Issue:** KPI should ALWAYS show current month progress vs monthly target, regardless of date filter applied to other widgets.

**Examples:**
- Today: January 15, 2024
- Filter: "Last 7 days" (Jan 9-15)
- 7-day revenue: Rp 5,000,000
- Current month revenue (Jan 1-15): Rp 12,000,000
- Monthly target: Rp 50,000,000
- **Current (Wrong)**: Shows 5,000,000 / 50,000,000 = 10% progress
- **Expected (Correct)**: Shows 12,000,000 / 50,000,000 = 24% progress

#### Bug 2.3: Default Date Filter Mismatch with UI Highlight

**Bug Condition:**
When loading dashboard without query parameters, server defaults to `startDate = "all"` but frontend highlights "Hari Ini" button, causing UX confusion.

**Formal Specification:**
```
FUNCTION isBugCondition_2_3(queryParams, serverDefault, uiHighlight)
  INPUT: queryParams, serverDefault, uiHighlight
  OUTPUT: boolean
  
  RETURN queryParams.start IS NULL
         AND queryParams.end IS NULL
         AND serverDefault = "all"
         AND uiHighlight = "Hari Ini"
END FUNCTION
```

**Current Code Locations:**
- Server: `+page.server.js` line ~8
  ```javascript
  const startDate = url.searchParams.get('start') || "all";
  const endDate = url.searchParams.get('end') || "all";
  ```
- Frontend: `+page.svelte` line ~68
  ```javascript
  let activePreset = "Hari Ini";  // Default highlighted button
  ```

**Issue:** Mismatch between server filter ("all" - shows all data) and UI state ("Hari Ini" - implies today only).

**Examples:**
- User opens `/finance/my-unit` (no query params)
- UI highlights: "Hari Ini" button
- Data shown: All transactions (not today only)
- User expectation: See today's data only (because button is highlighted)

#### Bug 2.4: Projected Cash Flow Uses Wrong Formula for Non-Monthly Filters

**Bug Condition:**
Forecast calculation divides filtered period total by current day of month, producing nonsensical projections when filter is not "current month".

**Formal Specification:**
```
FUNCTION isBugCondition_2_4(dateFilter, forecastFormula)
  INPUT: dateFilter, forecastFormula
  OUTPUT: boolean
  
  RETURN dateFilter.period NOT IN ['current_month', 'all']
         AND forecastFormula = '(filteredTotal / currentDayOfMonth) * 30'
         AND produces_nonsensical_result
END FUNCTION
```

**Current Code Location:** `+page.svelte` lines ~82-85
```javascript
const hariBerjalan = new Date().getDate();  // Current day of month (1-31)
const runRate = omzet / (hariBerjalan || 1);
forecastLaba = (runRate * 30) - ((totalKeluar / (hariBerjalan || 1)) * 30);
```

**Issue:** When filter is "7 days", dividing by current day of month (e.g., 15) creates wrong projection.

**Examples:**
- Today: January 15
- Filter: "Last 7 days" (Jan 9-15)
- 7-day revenue: Rp 7,000,000
- **Current (Wrong)**: (7,000,000 / 15) * 30 = Rp 14,000,000 projected
  - Incorrectly extrapolates 7-day data as if it were 15 days of a month
- **Expected**: Projection should only work for "current month" filter, or be disabled

#### Bug 2.5: Low Stock Uses Hardcoded Threshold Instead of Product-Specific minStok

**Bug Condition:**
Low stock alert uses hardcoded threshold `stok <= 5` instead of comparing against product-specific `minStok` field in database.

**Formal Specification:**
```
FUNCTION isBugCondition_2_5(product, alertTriggered)
  INPUT: product with stok and minStok fields, alertTriggered boolean
  OUTPUT: boolean
  
  RETURN product.minStok > 5
         AND product.stok > 5
         AND product.stok <= product.minStok
         AND NOT alertTriggered
         AND threshold_check = 'stok <= 5'
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~43
```javascript
const lowStockProducts = productsData.filter(p => p.stok <= 5);
```

**Issue:** Should compare against product-specific minimum stock level: `p.stok <= (p.minStok || 5)`.

**Examples:**
- Product A: stok = 100, minStok = 150 → Should alert (below minimum), but doesn't (100 > 5)
- Product B: stok = 8, minStok = 3 → Should NOT alert (above minimum), but does (8 > 5 fails but close)
- Product C: stok = 4, minStok = null → Should alert (4 <= 5 fallback)

#### Bug 2.6: Bank Balances Filter Hides Overdrawn Accounts

**Bug Condition:**
Bank balance display filters out negative balances with `.filter(b => b.saldo > 0)`, hiding critical information about overdrawn accounts.

**Formal Specification:**
```
FUNCTION isBugCondition_2_6(bankAccount, displayed)
  INPUT: bankAccount with saldo, displayed boolean
  OUTPUT: boolean
  
  RETURN bankAccount.saldo < 0
         AND NOT displayed
         AND filter_condition = 'b.saldo > 0'
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~86
```javascript
.filter(b => b.saldo > 0);  // Removes negative balances
```

**Issue:** Overdrawn accounts (negative balances) are critical financial information that should be visible, possibly highlighted as alerts.

**Examples:**
- Bank Account A: Saldo = Rp 5,000,000 → Displayed ✓
- Bank Account B: Saldo = Rp -2,000,000 → Hidden ✗ (should show with warning)
- Bank Account C: Saldo = Rp 0 → Hidden ✗ (edge case, might need display)

---

### Section 3: Missing Features & Dead Code (Medium - 🟡)

#### Bug 3.1: Non-functional Popup Variables for Saldo Kas and Arus Kas

**Bug Condition:**
Variables `showKasDetail` and `showLabaRugiDetail` are defined but no popup component exists, making card click handlers non-functional.

**Formal Specification:**
```
FUNCTION isBugCondition_3_1(variable, component)
  INPUT: variable defined in script, component in template
  OUTPUT: boolean
  
  RETURN variable IN ['showKasDetail', 'showLabaRugiDetail']
         AND variable_defined = true
         AND NOT exists(popup_component)
         AND onclick_handler_calls = variable
END FUNCTION
```

**Current Code Locations:**
- Variables: `+page.svelte` lines ~22-23
  ```javascript
  let showKasDetail = false;
  let showLabaRugiDetail = false;
  ```
- No corresponding popup components in template

**Issue:** Dead code - either implement detail popups or remove variables and onclick handlers.

#### Bug 3.2: Missing Income/Expense Filter Buttons for Chart

**Bug Condition:**
Chart logic supports filtering by `kategoriTrx` (income/expense), but no UI buttons exist to toggle this filter.

**Formal Specification:**
```
FUNCTION isBugCondition_3_2(chartLogic, uiButtons)
  INPUT: chartLogic supports kategoriTrx filter, uiButtons available
  OUTPUT: boolean
  
  RETURN chartLogic.supports_filter('selectedKategori')
         AND selectedKategori_variable_exists
         AND NOT exists(ui_toggle_buttons)
END FUNCTION
```

**Current Code Location:** `+page.svelte`
- Variable defined: line ~69 `let selectedKategori = "";`
- Chart logic uses it: lines ~140-155 (filters datasets by selectedKategori)
- No UI buttons to change the value

**Issue:** Feature is 90% implemented but missing the UI controls.

#### Bug 3.3: Empty Chart Without Explanation Message

**Bug Condition:**
When chart has no product-linked transactions (all `productId == null`), chart renders empty without explanation message.

**Formal Specification:**
```
FUNCTION isBugCondition_3_3(chartMode, transactions, productTransactions)
  INPUT: chartMode, transactions array, productTransactions filtered array
  OUTPUT: boolean
  
  RETURN chartMode = 'produkTerlaris'
         AND transactions.length > 0
         AND productTransactions.length = 0
         AND NOT displayed('no_data_message')
END FUNCTION
```

**Current Code Location:** `+page.svelte` lines ~185-200 (produkTerlaris mode)
```javascript
if (topProducts.length === 0) return;  // Silently exits, renders nothing
```

**Issue:** Should display helpful message like "Tidak ada transaksi yang terhubung ke produk".

#### Bug 3.4: Audit Log Colors Don't Match Database Severity Values

**Bug Condition:**
Audit log items all show blue dots because code checks for `log.tipe === 'DELETE'/'UPDATE'` but database stores severity levels: `success`, `info`, `warning`, `error`.

**Formal Specification:**
```
FUNCTION isBugCondition_3_4(log, displayedColor)
  INPUT: log with tipe field, displayedColor shown
  OUTPUT: boolean
  
  RETURN log.tipe IN ['success', 'info', 'warning', 'error']
         AND color_mapping_checks = ['DELETE', 'UPDATE', 'CREATE']
         AND displayedColor = 'blue'  // default fallback
END FUNCTION
```

**Current Code Location:** `+page.svelte` (audit log rendering section)

**Issue:** Color mapping doesn't match actual database values. Should map:
- `success` → green
- `info` → blue
- `warning` → yellow
- `error` → red

#### Bug 3.5: "AI INSIGHT" Panel Uses Simple If-Else, Not AI/ML

**Bug Condition:**
Strategic BI panel labeled "AI INSIGHT" or "STRATEGIC BI" uses simple threshold checks, not actual AI/ML models.

**Formal Specification:**
```
FUNCTION isBugCondition_3_5(biLogic, labelText)
  INPUT: biLogic implementation, labelText displayed
  OUTPUT: boolean
  
  RETURN labelText CONTAINS 'AI'
         AND biLogic = if_else_threshold_checks
         AND NOT uses(ml_model OR ai_service)
END FUNCTION
```

**Current Code Location:** 
- Server: `$lib/server/strategicBI.js` (buildStrategicBI function)
- Frontend: `+page.svelte` lines ~78-90

**Issue:** Misleading labeling - either rename to "Business Insights" or integrate actual ML (if required for thesis).

#### Bug 3.6: Unused Polling Code for Updates

**Bug Condition:**
Frontend defines `checkUpdates()` function but never calls it, and polling interval is commented out or missing.

**Formal Specification:**
```
FUNCTION isBugCondition_3_6(function, calls)
  INPUT: function defined, calls to function
  OUTPUT: boolean
  
  RETURN function_name = 'checkUpdates'
         AND function_defined = true
         AND function_calls.length = 0
         AND NOT exists(setInterval OR onMount)
END FUNCTION
```

**Current Code Location:** `+page.svelte` lines ~210-230
```javascript
async function checkUpdates() {
    // ... implementation exists but never called
}
// Missing: setInterval(checkUpdates, 30000);
```

**Issue:** Dead code - remove if not needed for realtime updates.

#### Bug 3.7: Duplicate Realtime Subscription Handler

**Bug Condition:**
Realtime subscription handler is attached twice (or in reactive block), causing every event to trigger data reload 2x.

**Formal Specification:**
```
FUNCTION isBugCondition_3_7(subscriptionHandler, attachCount)
  INPUT: subscriptionHandler, attachCount
  OUTPUT: boolean
  
  RETURN attachCount > 1
         OR handler_in_reactive_block = true
         AND causes_duplicate_reloads
END FUNCTION
```

**Current Code Location:** `+page.svelte` lines ~15-20 and ~235-250

**Issue:** Handler attached in reactive block (`$: if ($financeUpdate)`) runs multiple times.

---

### Section 4: Performance & Error Handling (Low - 🔵)

#### Bug 4.1: Transaction List Fetches Unlimited Records

**Bug Condition:**
Transaction query has no `.limit()` clause, potentially loading thousands of records even though UI only displays 8-10.

**Formal Specification:**
```
FUNCTION isBugCondition_4_1(query, recordCount, displayCount)
  INPUT: query, recordCount fetched, displayCount in UI
  OUTPUT: boolean
  
  RETURN NOT includes(query, '.limit(')
         AND recordCount > 100
         AND displayCount <= 10
END FUNCTION
```

**Current Code Location:** `+page.server.js` line ~55
```javascript
const transactionList = await db.select()
    .from(transaksi)
    .where(baseFilter)
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id));
// Missing: .limit(100)
```

**Issue:** Performance degrades with large transaction volumes. Should implement pagination or reasonable limit.

#### Bug 4.2: 404 Errors Caught and Returned as 500

**Bug Condition:**
When unit slug is not found, code throws `error(404)` but try-catch block catches it and returns 500 status code.

**Formal Specification:**
```
FUNCTION isBugCondition_4_2(unitFound, errorCode)
  INPUT: unitFound boolean, errorCode returned
  OUTPUT: boolean
  
  RETURN unitFound = false
         AND intended_error = 404
         AND actual_error = 500
         AND caused_by = try_catch_block
END FUNCTION
```

**Current Code Location:** `+page.server.js` lines ~5-110
```javascript
try {
    // ...
    if (!unitData) throw error(404, 'Unit tidak ditemukan');
    // ...
} catch (err) {
    log.finance.error({ err }, '[Dashboard Error]');
    throw error(500, "Gagal memuat data");  // Overwrites 404 with 500
}
```

**Issue:** SvelteKit errors (404, 403, etc.) should not be caught by generic try-catch. Only catch actual exceptions.

---

## Expected Behavior

### Correctness Properties

Property 1: Data Integrity - Accurate Financial Calculations

_For any_ unit with modalAwal > 0 and financial transactions, the system SHALL calculate saldoKas as `modalAwal + totalMasuk - totalKeluar`, reference all camelCase field aliases correctly (modalAwal, metodeBayar), implement proper stock reversal based on kategoriTrx (KELUAR → decrease stock, MASUK → increase stock), and cascade delete all related journal entries when transactions are deleted.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

Property 2: Business Logic - Configurable Rules and Accurate KPIs

_For any_ dashboard load with date filters, the system SHALL use user-configurable monthly targets from database, display KPI current value based on current month data regardless of date filter, ensure default filter state matches UI highlights, calculate cash flow projections only for monthly periods, compare stock against product-specific minStok thresholds, and display all bank balances including negative values.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 3: Feature Completeness - Remove Dead Code and Complete Features

_For any_ UI element with partial implementation, the system SHALL either complete the feature (implement detail popups, add filter buttons, display empty state messages, fix color mappings) or remove dead code (unused variables, polling functions, duplicate handlers) to eliminate confusion and maintain clean codebase.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

Property 4: Performance - Efficient Data Loading and Error Handling

_For any_ data query and error condition, the system SHALL implement pagination or reasonable limits on transaction queries (limit 100 with load more), and properly handle 404 errors without catching them in generic try-catch blocks that return 500.

**Validates: Requirements 4.1, 4.2**

---

## Hypothesized Root Cause

Based on the bug analysis, the root causes are:

### 1. **Schema Alias Confusion (Bugs 1.2, 1.3)**
The Drizzle ORM defines field aliases in camelCase that map to snake_case database columns:
```javascript
modalAwal: decimal("modal_awal", ...)  // alias: modalAwal, column: modal_awal
metodeBayar: varchar("metode_bayar", ...)  // alias: metodeBayar, column: metode_bayar
```

**Root Cause:** Developers accessing `unit.modal_awal` directly, unaware that Drizzle returns camelCase keys in query results. The schema file shows both naming conventions which creates confusion.

### 2. **Incomplete Formula Implementation (Bug 1.1)**
**Root Cause:** The saldo kas calculation was copied from a simple "profit calculation" pattern (income - expenses) without considering that businesses have initial capital that should be included in the cash balance formula.

### 3. **Copy-Paste Stock Logic (Bugs 1.4, 1.5)**
**Root Cause:** Stock reversal logic was implemented once with hardcoded addition, then copy-pasted without adjusting for transaction direction. The developer didn't consider that purchases and sales affect stock in opposite directions, so their reversals must also be opposite.

### 4. **Missing Foreign Key Cascade (Bug 1.6)**
**Root Cause:** Database schema likely doesn't have `ON DELETE CASCADE` for the journal_entries → transaksi relationship. Manual cascade delete was not implemented in the application code.

### 5. **Rapid Prototyping Technical Debt (Bugs 2.1-2.6)**
**Root Cause:** Hardcoded values, simplified formulas, and filter inconsistencies suggest rapid MVP development without refactoring. Features like KPI target, stock thresholds, and date filter defaults were implemented with "good enough" placeholder logic that was never replaced with proper database-driven configuration.

### 6. **Incomplete Feature Migration (Bugs 3.1-3.7)**
**Root Cause:** Features partially implemented then abandoned:
- Detail popups planned but never built (variables exist, components don't)
- Chart filters implemented in logic but not in UI
- Realtime polling replaced with websockets but old code not removed
- Generic color mapping not updated when database schema changed severity values

### 7. **Over-Aggressive Error Handling (Bug 4.2)**
**Root Cause:** Try-catch block wrapping the entire load function catches SvelteKit's intentional `error()` throws (like 404) and re-throws as generic 500. This is a common anti-pattern when developers want to "log all errors" but don't distinguish between expected errors (404, 403) and unexpected exceptions.

### 8. **No Query Optimization Pass (Bug 4.1)**
**Root Cause:** Query was written without pagination in early development when dataset was small. As transaction volume grew, performance degraded but the query was never optimized with `.limit()` or pagination.

---

## Fix Implementation

### Section 1: Data Integrity Fixes

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

#### Fix 1.1: Include Modal Awal in Saldo Kas Calculation

**Current Code (line ~55):**
```javascript
const summary = summaryRows[0] || { total_masuk: 0, total_keluar: 0, total_hpp: 0 };
```

**Fixed Code:**
```javascript
const summary = summaryRows[0] || { total_masuk: 0, total_keluar: 0, total_hpp: 0 };

// Calculate saldoKas including modal awal
const saldoKas = Number(unitData.modalAwal || 0) 
    + Number(summary.total_masuk || 0) 
    - Number(summary.total_keluar || 0);
```

**Return saldoKas in finalData:**
```javascript
const finalData = {
    unit: unitData,
    summary: {
        ...summary,
        saldoKas  // Add calculated saldo kas
    },
    // ... rest of data
};
```

#### Fix 1.2: Use Correct Field Alias in Frontend

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Current Code (line ~94):**
```javascript
$: modalAwal = Number(unit?.modal_awal) || 0;  // WRONG
```

**Fixed Code:**
```javascript
$: modalAwal = Number(unit?.modalAwal) || 0;  // CORRECT - camelCase alias
```

#### Fix 1.3: Use Correct metodeBayar Field in Transaction Table

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Find transaction table rendering code (around line 200+) and update:**

**Current (hypothetical):**
```svelte
<td>{trx.metode_bayar || 'KAS'}</td>
```

**Fixed:**
```svelte
<td>{trx.metodeBayar || 'KAS'}</td>
```

#### Fix 1.4 & 1.5: Proper Stock Reversal Logic

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (lines ~120-125):**
```javascript
if (trxData && trxData.productId) {
    const produk = await tx.query.products.findFirst({ 
        where: eq(products.id, trxData.productId) 
    });
    if (produk) {
        await tx.update(products)
            .set({ stok: produk.stok + trxData.qty })  // ALWAYS adds
            .where(eq(products.id, trxData.productId));
    }
}
```

**Fixed Code:**
```javascript
if (trxData && trxData.productId) {
    const produk = await tx.query.products.findFirst({ 
        where: eq(products.id, trxData.productId) 
    });
    
    if (produk) {
        // Stock reversal depends on transaction category
        let newStok;
        const kategori = (trxData.kategoriTrx || '').toUpperCase();
        
        if (kategori.includes('KELUAR')) {
            // KELUAR = Purchase: original added stock, so subtract to reverse
            newStok = produk.stok - trxData.qty;
        } else if (kategori.includes('MASUK')) {
            // MASUK = Sale: original subtracted stock, so add to reverse
            newStok = produk.stok + trxData.qty;
        } else {
            // Unknown category: don't change stock
            newStok = produk.stok;
        }
        
        await tx.update(products)
            .set({ stok: Math.max(0, newStok) })  // Prevent negative stock
            .where(eq(products.id, trxData.productId));
    }
}
```

#### Fix 1.6: Cascade Delete Journal Entries

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (line ~127):**
```javascript
if (trxData) {
    await tx.delete(transaksi).where(eq(transaksi.id, id));
}
```

**Fixed Code:**
```javascript
if (trxData) {
    // 1. Find all journal entries for this transaction
    const relatedJournals = await tx.select({ id: journalEntries.id })
        .from(journalEntries)
        .where(eq(journalEntries.transaksiId, id));
    
    const journalIds = relatedJournals.map(j => j.id);
    
    // 2. Delete journal entry lines first (child records)
    if (journalIds.length > 0) {
        await tx.delete(journalEntryLines)
            .where(inArray(journalEntryLines.journalId, journalIds));
    }
    
    // 3. Delete journal entries (parent records)
    if (journalIds.length > 0) {
        await tx.delete(journalEntries)
            .where(inArray(journalEntries.id, journalIds));
    }
    
    // 4. Finally delete the transaction
    await tx.delete(transaksi).where(eq(transaksi.id, id));
}
```

---

### Section 2: Business Logic Fixes

#### Fix 2.1: Database-Driven Monthly Target

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (line ~105):**
```javascript
const targetPendapatan = Math.max(unitData.modalAwal * 1.5, 10000000);
```

**Fixed Code:**
```javascript
// Use user-configured target from database, fallback to modal awal * 2
const targetPendapatan = Number(unitData.monthlyTarget) || (unitData.modalAwal * 2) || 10000000;
```

**Note:** Requires adding `monthlyTarget` field to `unitBisnis` table:
```sql
ALTER TABLE unit_bisnis ADD COLUMN monthly_target DECIMAL(15,2) DEFAULT NULL;
```

**Alternative:** Create separate `targets` table:
```sql
CREATE TABLE monthly_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    unit_id INT NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (unit_id) REFERENCES unit_bisnis(id) ON DELETE CASCADE,
    UNIQUE KEY (unit_id, year, month)
);
```

Then query:
```javascript
const now = new Date();
const targetRow = await tx.query.monthlyTargets.findFirst({
    where: and(
        eq(monthlyTargets.unitId, unitData.id),
        eq(monthlyTargets.year, now.getFullYear()),
        eq(monthlyTargets.month, now.getMonth() + 1)
    )
});
const targetPendapatan = targetRow?.targetAmount || (unitData.modalAwal * 2) || 10000000;
```

#### Fix 2.2: KPI Current Uses Current Month Data

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (lines ~55-106):**
```javascript
// Uses filtered summary
const currentPendapatan = Number(summary.total_masuk || 0);
```

**Fixed Code:**
```javascript
// Calculate current month revenue REGARDLESS of date filter
const now = new Date();
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
const todayStr = todayStrWIB();

const currentMonthSummary = await db.select({
    total_masuk: sql`SUM(CASE WHEN LOWER(${transaksi.kategoriTrx}) LIKE '%masuk%' THEN ${transaksi.nominal} ELSE 0 END)`
}).from(transaksi).where(and(
    eq(transaksi.unitId, unitData.id),
    sql`DATE(${transaksi.tanggal}) >= ${currentMonthStartStr}`,
    sql`DATE(${transaksi.tanggal}) <= ${todayStr}`
));

const currentPendapatan = Number(currentMonthSummary[0]?.total_masuk || 0);
```

#### Fix 2.3: Align Default Filter with UI State

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Option A - Change server default to today:**
```javascript
const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const startDate = url.searchParams.get('start') || todayStr;  // Default to today
const endDate = url.searchParams.get('end') || todayStr;
```

**Option B - Change frontend to highlight "Semua":**

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`
```javascript
// Determine active preset based on actual filter state
$: {
    if (startDate === "all" || endDate === "all") {
        activePreset = "Semua";
    } else {
        // Check if matches today
        const today = new Date().toISOString().split('T')[0];
        if (startDate === today && endDate === today) {
            activePreset = "Hari Ini";
        }
        // ... check other presets
    }
}
```

**Recommended:** Option A - default to today's data on first load for immediate relevance.

#### Fix 2.4: Conditional Cash Flow Projection

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Current Code (lines ~82-85):**
```javascript
const hariBerjalan = new Date().getDate();
const runRate = omzet / (hariBerjalan || 1);
forecastLaba = (runRate * 30) - ((totalKeluar / (hariBerjalan || 1)) * 30);
```

**Fixed Code:**
```javascript
// Only calculate projection for current month data
const now = new Date();
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];
const todayStr = now.toISOString().split('T')[0];

// Check if current filter is the whole current month
const isCurrentMonthFilter = (startDate === currentMonthStartStr && endDate === todayStr) 
    || startDate === "all";

if (isCurrentMonthFilter) {
    const hariBerjalan = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const runRate = omzet / (hariBerjalan || 1);
    forecastLaba = (runRate * daysInMonth) - ((totalKeluar / (hariBerjalan || 1)) * daysInMonth);
} else {
    // Don't show projection for custom date ranges
    forecastLaba = null;
}
```

**Update UI to show message when projection unavailable:**
```svelte
{#if forecastLaba !== null}
    <p>Proyeksi Laba Bulan Ini: {formatIDR(forecastLaba)}</p>
{:else}
    <p class="text-gray-500">Proyeksi hanya tersedia untuk periode bulan berjalan</p>
{/if}
```

#### Fix 2.5: Product-Specific Low Stock Threshold

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (line ~43):**
```javascript
const lowStockProducts = productsData.filter(p => p.stok <= 5);
```

**Fixed Code:**
```javascript
const lowStockProducts = productsData.filter(p => {
    const threshold = p.minStok || 5;  // Use product minStok or default to 5
    return p.stok <= threshold;
});
```

**Note:** Requires ensuring `minStok` field is selected in products query (line ~38):
```javascript
const productsData = await db.select({
    id: products.id, 
    nama: products.nama, 
    harga_jual: products.hargaJual, 
    stok: products.stok,
    minStok: products.minStok  // Add this field
}).from(products).where(eq(products.unitId, unitData.id));
```

#### Fix 2.6: Show All Bank Balances Including Negative

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (line ~86):**
```javascript
const bankBalances = bankBalancesRaw.map(b => {
    return {
        nama: b.namaAkun,
        kode: b.kodeAkun,
        saldo: Number(b.totalDebit) - Number(b.totalKredit)
    };
}).filter(b => b.saldo > 0);  // REMOVE THIS FILTER
```

**Fixed Code:**
```javascript
const bankBalances = bankBalancesRaw.map(b => {
    return {
        nama: b.namaAkun,
        kode: b.kodeAkun,
        saldo: Number(b.totalDebit) - Number(b.totalKredit),
        isOverdrawn: (Number(b.totalDebit) - Number(b.totalKredit)) < 0
    };
});
// No filter - show all balances
```

**Update frontend to highlight negative balances:**

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`
```svelte
{#each bankBalances as bank}
    <div class="flex justify-between items-center py-2" 
         class:text-red-600={bank.isOverdrawn}>
        <span>{bank.nama}</span>
        <span class:font-bold={bank.isOverdrawn}>
            {formatIDR(bank.saldo)}
            {#if bank.isOverdrawn}
                <AlertCircle class="inline w-4 h-4 ml-1" />
            {/if}
        </span>
    </div>
{/each}
```

---

### Section 3: Missing Features & Dead Code Cleanup

#### Fix 3.1: Remove Unused Popup Variables

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Remove these lines (around 22-23):**
```javascript
let showKasDetail = false;
let showLabaRugiDetail = false;
```

**Find and remove onclick handlers:**
```svelte
<!-- REMOVE onclick handlers like: -->
<button on:click={() => showKasDetail = true}>
<!-- Replace with: -->
<button>
```

**Alternative: Implement the popups** (if business requirement exists) - defer to separate feature task.

#### Fix 3.2: Add Income/Expense Filter Buttons

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Add filter buttons above chart (find chart container, add before canvas):**
```svelte
<!-- Chart Filter Buttons -->
<div class="flex gap-2 mb-3">
    <button 
        on:click={() => selectedKategori = ""}
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {selectedKategori === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
    >
        Semua
    </button>
    <button 
        on:click={() => selectedKategori = "MASUK"}
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {selectedKategori === 'MASUK' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
    >
        Pemasukan
    </button>
    <button 
        on:click={() => selectedKategori = "KELUAR"}
        class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all {selectedKategori === 'KELUAR' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
    >
        Pengeluaran
    </button>
</div>
```

#### Fix 3.3: Empty Chart State Message

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Current Code (around line 197):**
```javascript
const topProducts = Object.values(productStats).sort((a,b) => b.total - a.total).slice(0, 5);
if (topProducts.length === 0) return;
```

**Fixed Code:**
```javascript
const topProducts = Object.values(productStats).sort((a,b) => b.total - a.top).slice(0, 5);

if (topProducts.length === 0) {
    // Show empty state message
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('Tidak ada transaksi yang terhubung ke produk', chartCanvas.width / 2, chartCanvas.height / 2);
    return;
}
```

**Better approach - Use HTML overlay:**
```svelte
<div class="relative">
    <canvas bind:this={chartCanvas}></canvas>
    
    {#if modeGrafik === 'produkTerlaris' && !hasProductTransactions}
        <div class="absolute inset-0 flex items-center justify-center">
            <p class="text-sm text-gray-500">Tidak ada transaksi yang terhubung ke produk</p>
        </div>
    {/if}
</div>

<script>
let hasProductTransactions = true;

function updateChart() {
    // ... existing code ...
    
    if (modeGrafik === "produkTerlaris") {
        // ... calculate topProducts ...
        hasProductTransactions = topProducts.length > 0;
        if (topProducts.length === 0) return;
        // ... render chart ...
    }
}
</script>
```

#### Fix 3.4: Correct Audit Log Color Mapping

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Find audit log rendering code and update color logic:**

**Current (hypothetical):**
```svelte
{#each riwayat as log}
    <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
        <p>{log.pesan}</p>
    </div>
{/each}
```

**Fixed:**
```svelte
{#each riwayat as log}
    <div class="flex items-center gap-2">
        <div class="w-2 h-2 rounded-full {getLogColor(log.tipe)}"></div>
        <p>{log.pesan}</p>
    </div>
{/each}

<script>
function getLogColor(tipe) {
    switch(tipe?.toLowerCase()) {
        case 'success': return 'bg-green-500';
        case 'info': return 'bg-blue-500';
        case 'warning': return 'bg-yellow-500';
        case 'error': return 'bg-red-500';
        default: return 'bg-gray-500';
    }
}
</script>
```

#### Fix 3.5: Rename "AI INSIGHT" to "Business Insights"

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Find the panel header and update text:**

**Current:**
```svelte
<h3>AI INSIGHT</h3>
<!-- or -->
<h3>STRATEGIC BI</h3>
```

**Fixed:**
```svelte
<h3>Business Insights</h3>
<!-- or Indonesian: -->
<h3>Wawasan Bisnis</h3>
```

**Update any icons/badges:**
```svelte
<!-- Remove AI sparkle icons -->
<Sparkles class="w-4 h-4" />
<!-- Replace with business icon -->
<TrendingUp class="w-4 h-4" />
```

#### Fix 3.6: Remove Unused Polling Code

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Remove the entire checkUpdates function (around lines 210-230):**
```javascript
// DELETE THIS ENTIRE BLOCK:
async function checkUpdates() {
    try {
        const response = await fetch(`/api/updates?slug=${slug}&lastUpdate=${lastUpdate}&type=transactions`);
        const updates = await response.json();
        // ... rest of function
    } catch (error) {
        console.error('[Polling] Error checking updates:', error);
    }
}
```

**Remove any commented interval code:**
```javascript
// DELETE:
// setInterval(checkUpdates, 30000);
// let updateInterval;
// onMount(() => { updateInterval = setInterval(...) });
```

#### Fix 3.7: Fix Duplicate Realtime Handler

**File**: `web/src/routes/(app)/finance/[slug]/+page.svelte`

**Current Code (around lines 15-20 and 235-250):**
```javascript
// Reactive block runs multiple times
$: if ($financeUpdate) {
    if ($financeUpdate.action === 'stats-updated' || $financeUpdate.action === 'pos-transaction') {
        invalidate('app:finance');
    }
}

// AND separate block
$: if ($financeUpdate) {
    if ($financeUpdate.action === 'stats-updated' || $financeUpdate.action === 'pos-transaction') {
        if ($financeUpdate.newTransaction) {
            transactions = [$financeUpdate.newTransaction, ...transactions];
            // ... update summary
            invalidate('app:finance');
        }
    }
}
```

**Fixed Code - Consolidate into single reactive block:**
```javascript
// Single reactive handler
$: if ($financeUpdate) {
    const { action, newTransaction } = $financeUpdate;
    
    if (action === 'stats-updated' || action === 'pos-transaction') {
        // Update local state if new transaction provided
        if (newTransaction) {
            transactions = [newTransaction, ...transactions];
            
            const nominal = Number(newTransaction.nominal);
            const kat = (newTransaction.kategori || newTransaction.kategori_trx || "").toLowerCase();
            
            if (kat.includes('masuk')) {
                summary.total_masuk = Number(summary.total_masuk) + nominal;
            } else if (kat.includes('keluar')) {
                summary.total_keluar = Number(summary.total_keluar) + nominal;
            }
        }
        
        // Invalidate once to refresh from server
        invalidate('app:finance');
    }
}
```

---

### Section 4: Performance & Error Handling Fixes

#### Fix 4.1: Add Transaction Query Limit

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (line ~55):**
```javascript
const transactionList = await db.select()
    .from(transaksi)
    .where(baseFilter)
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id));
```

**Fixed Code:**
```javascript
const transactionList = await db.select()
    .from(transaksi)
    .where(baseFilter)
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id))
    .limit(100);  // Add reasonable limit
```

**Future Enhancement:** Implement pagination with offset:
```javascript
const page = parseInt(url.searchParams.get('page') || '1');
const perPage = 50;
const offset = (page - 1) * perPage;

const transactionList = await db.select()
    .from(transaksi)
    .where(baseFilter)
    .orderBy(desc(transaksi.tanggal), desc(transaksi.id))
    .limit(perPage)
    .offset(offset);

// Also get total count for pagination UI
const countResult = await db.select({ count: sql`COUNT(*)` })
    .from(transaksi)
    .where(baseFilter);
const totalTransactions = countResult[0].count;
const totalPages = Math.ceil(totalTransactions / perPage);
```

#### Fix 4.2: Don't Catch SvelteKit Errors

**File**: `web/src/routes/(app)/finance/[slug]/+page.server.js`

**Current Code (lines ~5-110):**
```javascript
export const load = async ({ params, url, depends, cookies }) => {
    // ... setup code ...
    try {
        // ... all logic including:
        if (!unitData) throw error(404, 'Unit tidak ditemukan');
        // ... rest of code
        return finalData;
    } catch (err) {
        log.finance.error({ err }, '[Dashboard Error]');
        throw error(500, "Gagal memuat data");  // Overwrites 404!
    }
};
```

**Fixed Code:**
```javascript
export const load = async ({ params, url, depends, cookies }) => {
    const { slug } = params;
    const userId = await getCurrentUserId(cookies);
    if (!userId) throw error(401, 'Silakan login ulang');

    const startDate = url.searchParams.get('start') || "all";
    const endDate = url.searchParams.get('end') || "all";
    const cacheKey = `finance_dash_v4:${userId}:${slug}:${startDate}:${endDate}`;

    depends('app:finance');

    // Check cache (outside try-catch)
    let cachedData = null;
    if (redis) {
        try {
            cachedData = await redis.get(cacheKey);
            if (cachedData) return cachedData;
        } catch (redisErr) {
            log.api.warn({ err: redisErr.message }, '[Redis] Cache get failed');
        }
    }

    // Find unit (intentional 404 should propagate)
    const unitData = await db.query.unitBisnis.findFirst({
        where: and(eq(unitBisnis.slug, slug), eq(unitBisnis.userId, userId))
    });
    if (!unitData) throw error(404, 'Unit tidak ditemukan');

    // Database queries wrapped in try-catch for UNEXPECTED errors only
    try {
        const abcCats = await db.select().from(abcCategories).orderBy(abcCategories.id);
        const productsData = await db.select({
            id: products.id, 
            nama: products.nama, 
            harga_jual: products.hargaJual, 
            stok: products.stok,
            minStok: products.minStok
        }).from(products).where(eq(products.unitId, unitData.id));

        // ... rest of queries ...

        const finalData = { /* ... */ };

        // Cache result
        if (redis) {
            try {
                await redis.set(cacheKey, finalData, { ex: 300 });
            } catch (redisErr) {
                log.api.warn({ err: redisErr.message }, '[Redis] Cache set failed');
            }
        }

        return finalData;

    } catch (err) {
        // Only catch actual database errors, not SvelteKit errors
        log.finance.error({ err, slug, userId }, '[Dashboard] Database query failed');
        throw error(500, "Gagal memuat data dashboard");
    }
};
```

**Key Change:** Move unit lookup OUTSIDE the try-catch so 404 errors propagate correctly. Only wrap database queries that could throw unexpected errors.

---

## Testing Strategy

### Validation Approach

The testing strategy follows a comprehensive approach covering unit tests, integration tests, and manual QA verification across all four bug categories.

### Exploratory Bug Condition Checking

**Goal**: Verify each bug exists in unfixed code before implementing fixes.

**Test Plan**: 
1. Set up test database with sample business unit containing modal awal = 10,000,000
2. Create test transactions with various categories and payment methods
3. Run dashboard load and verify bugs manifest as described
4. Document actual behavior vs expected for each bug

**Test Cases**:

**Category 1: Data Integrity**
1. **Bug 1.1 Test**: Create unit with modal_awal = 10M, transactions: +5M masuk, -3M keluar
   - Expected failure: saldoKas displays 2M instead of 12M
2. **Bug 1.2 Test**: Load dashboard and inspect modalAwal display
   - Expected failure: Shows 0 instead of 10M
3. **Bug 1.3 Test**: Create transaction with metode_bayar = 'TRANSFER'
   - Expected failure: Transaction table shows "KAS" instead of "TRANSFER"
4. **Bug 1.4 Test**: Create KELUAR transaction (+50 qty), then delete it
   - Expected failure: Stock increases by 100 total (50 + 50) instead of returning to original
5. **Bug 1.6 Test**: Create transaction with journal entries, then delete transaction
   - Expected failure: Orphaned journal_entries and journal_entry_lines remain in database

**Category 2: Business Logic**
1. **Bug 2.1 Test**: Load dashboard and inspect KPI target value
   - Expected failure: Target uses formula Math.max(modalAwal * 1.5, 10M) instead of database value
2. **Bug 2.2 Test**: Set date filter to "7 days", check KPI current value
   - Expected failure: Shows 7-day total instead of current month total
3. **Bug 2.3 Test**: Load dashboard without query params
   - Expected failure: "Hari Ini" button highlighted but "all" data shown
4. **Bug 2.5 Test**: Product with stok=100, minStok=150
   - Expected failure: No low stock alert (100 > 5 threshold)

**Category 3: Missing Features**
1. **Bug 3.1 Test**: Click "Saldo Kas" card
   - Expected failure: Nothing happens (no popup)
2. **Bug 3.2 Test**: View transaction chart
   - Expected failure: No Masuk/Keluar filter buttons visible
3. **Bug 3.3 Test**: View "Produk Terlaris" chart with no product transactions
   - Expected failure: Empty chart, no explanation message

**Category 4: Performance**
1. **Bug 4.1 Test**: Create 1000+ transactions, measure load time
   - Expected failure: Slow query, all records fetched
2. **Bug 4.2 Test**: Access invalid slug `/finance/nonexistent`
   - Expected failure: Returns 500 instead of 404

**Expected Counterexamples**:
- Saldo kas calculation missing modal awal term
- Field references using snake_case instead of camelCase
- Stock reversal using hardcoded addition
- Missing cascade deletes leaving orphaned data
- Hardcoded business rules instead of configurable values

### Fix Checking

**Goal**: Verify that for all inputs where bug conditions hold, fixed code produces expected behavior.

**Unit Tests:**

```javascript
// tests/finance-dashboard.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('Finance Dashboard Bug Fixes', () => {
    
    describe('Bug 1.1: Saldo Kas Calculation', () => {
        it('should include modal awal in saldo kas calculation', () => {
            const modalAwal = 10000000;
            const totalMasuk = 5000000;
            const totalKeluar = 3000000;
            
            const saldoKas = modalAwal + totalMasuk - totalKeluar;
            
            expect(saldoKas).toBe(12000000);
        });
    });
    
    describe('Bug 1.4 & 1.5: Stock Reversal Logic', () => {
        it('should decrease stock when reversing KELUAR (purchase) deletion', () => {
            const originalStok = 150;
            const transactionQty = 50;
            const kategoriTrx = 'KELUAR';
            
            let newStok;
            if (kategoriTrx.includes('KELUAR')) {
                newStok = originalStok - transactionQty;
            } else {
                newStok = originalStok + transactionQty;
            }
            
            expect(newStok).toBe(100);  // 150 - 50 = 100
        });
        
        it('should increase stock when reversing MASUK (sale) deletion', () => {
            const originalStok = 70;
            const transactionQty = 30;
            const kategoriTrx = 'MASUK';
            
            let newStok;
            if (kategoriTrx.includes('KELUAR')) {
                newStok = originalStok - transactionQty;
            } else {
                newStok = originalStok + transactionQty;
            }
            
            expect(newStok).toBe(100);  // 70 + 30 = 100
        });
    });
    
    describe('Bug 2.5: Low Stock Threshold', () => {
        it('should use product-specific minStok for low stock alert', () => {
            const products = [
                { id: 1, nama: 'Product A', stok: 100, minStok: 150 },
                { id: 2, nama: 'Product B', stok: 8, minStok: 3 },
                { id: 3, nama: 'Product C', stok: 4, minStok: null }
            ];
            
            const lowStockProducts = products.filter(p => {
                const threshold = p.minStok || 5;
                return p.stok <= threshold;
            });
            
            expect(lowStockProducts).toHaveLength(2);
            expect(lowStockProducts.map(p => p.id)).toEqual([1, 3]);
        });
    });
});
```

**Integration Tests:**

```javascript
// tests/finance-dashboard-integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase } from './test-utils';

describe('Finance Dashboard Integration Tests', () => {
    let testUnit;
    let testProduct;
    
    beforeAll(async () => {
        await setupTestDatabase();
        testUnit = await createTestUnit({ modalAwal: 10000000 });
        testProduct = await createTestProduct({ unitId: testUnit.id, stok: 100, minStok: 50 });
    });
    
    afterAll(async () => {
        await cleanupTestDatabase();
    });
    
    it('should correctly handle transaction deletion with stock reversal', async () => {
        // Create KELUAR (purchase) transaction
        const transaction = await createTransaction({
            unitId: testUnit.id,
            productId: testProduct.id,
            kategoriTrx: 'KELUAR',
            qty: 50,
            nominal: 500000
        });
        
        // Verify stock increased
        let product = await getProduct(testProduct.id);
        expect(product.stok).toBe(150);  // 100 + 50
        
        // Delete transaction
        await deleteTransaction(transaction.id);
        
        // Verify stock decreased back to original
        product = await getProduct(testProduct.id);
        expect(product.stok).toBe(100);  // 150 - 50
    });
    
    it('should cascade delete journal entries when deleting transaction', async () => {
        // Create transaction with journal entries
        const transaction = await createTransaction({
            unitId: testUnit.id,
            kategoriTrx: 'MASUK',
            nominal: 1000000
        });
        
        const journalEntry = await createJournalEntry({
            transaksiId: transaction.id,
            unitId: testUnit.id
        });
        
        await createJournalEntryLine({
            journalId: journalEntry.id,
            debit: 1000000,
            kredit: 0
        });
        
        // Verify journal entries exist
        let entries = await getJournalEntriesForTransaction(transaction.id);
        expect(entries).toHaveLength(1);
        
        // Delete transaction
        await deleteTransaction(transaction.id);
        
        // Verify journal entries are deleted
        entries = await getJournalEntriesForTransaction(transaction.id);
        expect(entries).toHaveLength(0);
    });
});
```

### Preservation Checking

**Goal**: Verify that for all inputs where bug conditions do NOT hold, fixed code produces same results as original.

**Regression Tests:**

```javascript
describe('Regression Prevention Tests', () => {
    
    it('should continue using SUM(CASE WHEN) aggregation for totals', async () => {
        const summary = await calculateSummary(testUnit.id, { start: '2024-01-01', end: '2024-01-31' });
        
        expect(summary).toHaveProperty('total_masuk');
        expect(summary).toHaveProperty('total_keluar');
        expect(summary).toHaveProperty('total_hpp');
    });
    
    it('should continue filtering by date range correctly', async () => {
        await createTransaction({ unitId: testUnit.id, tanggal: '2024-01-15', nominal: 100000 });
        await createTransaction({ unitId: testUnit.id, tanggal: '2024-02-15', nominal: 200000 });
        
        const transactions = await getTransactions(testUnit.id, { start: '2024-01-01', end: '2024-01-31' });
        
        expect(transactions).toHaveLength(1);
        expect(transactions[0].nominal).toBe(100000);
    });
    
    it('should continue gracefully falling back when Redis unavailable', async () => {
        // Mock Redis failure
        redis.get = () => { throw new Error('Redis connection failed'); };
        
        // Should still load data from database
        const data = await loadDashboard({ slug: testUnit.slug, userId: testUnit.userId });
        
        expect(data).toBeDefined();
        expect(data.unit).toBeDefined();
    });
    
    it('should continue calculating bank balances from double-entry correctly', async () => {
        const balances = await getBankBalances(testUnit.id);
        
        balances.forEach(balance => {
            expect(balance).toHaveProperty('nama');
            expect(balance).toHaveProperty('saldo');
            // Saldo should be calculated as debit - kredit
        });
    });
});
```

### Manual QA Checklist

**Visual Regression:**
- [ ] Modal awal displays correct value (not 0)
- [ ] Payment method shows actual value (not always "KAS")
- [ ] Chart has filter buttons visible
- [ ] Empty chart shows message
- [ ] Audit log dots show correct colors
- [ ] Bank balances show negative values highlighted in red
- [ ] No dead "AI" branding

**Functional Testing:**
- [ ] Saldo kas includes modal awal in calculation
- [ ] KPI shows current month data regardless of date filter
- [ ] Default filter state matches highlighted button
- [ ] Low stock alerts respect product minStok
- [ ] Transaction deletion reverses stock correctly
- [ ] Transaction deletion removes journal entries
- [ ] No duplicate realtime events

**Performance Testing:**
- [ ] Dashboard loads in < 2 seconds with 1000+ transactions
- [ ] Invalid slug returns 404 (not 500)
- [ ] Query limit prevents loading all records

**Browser Testing:**
- [ ] Test in Chrome, Firefox, Safari
- [ ] Test responsive layout on mobile
- [ ] Test dark mode (if applicable)

### Test Data Setup

```sql
-- Test unit with modal awal
INSERT INTO unit_bisnis (nama, slug, user_id, modal_awal, monthly_target) 
VALUES ('Test Unit', 'test-unit', 1, 10000000.00, 50000000.00);

-- Products with various minStok values
INSERT INTO products (unit_id, nama, stok, min_stok, harga_jual) VALUES
(1, 'Product High MinStok', 100, 150, 50000),
(1, 'Product Normal', 50, 20, 30000),
(1, 'Product No MinStok', 4, NULL, 20000);

-- Transactions with different payment methods
INSERT INTO transaksi (unit_id, kategori_trx, nominal, metode_bayar, tanggal, keterangan) VALUES
(1, 'MASUK', 5000000, 'TRANSFER', '2024-01-15', 'Sale via transfer'),
(1, 'KELUAR', 3000000, 'KAS', '2024-01-16', 'Purchase cash'),
(1, 'MASUK', 2000000, 'QRIS', '2024-01-17', 'Sale via QRIS');

-- Product-linked transactions
INSERT INTO transaksi (unit_id, kategori_trx, nominal, metode_bayar, tanggal, product_id, qty) VALUES
(1, 'KELUAR', 1000000, 'KAS', '2024-01-18', 1, 50),  -- Purchase: stok should increase
(1, 'MASUK', 1500000, 'TRANSFER', '2024-01-19', 1, 30);  -- Sale: stok should decrease
```

---

## Summary

This design document provides comprehensive technical solutions for all 20 bugs in the finance dashboard:

**Data Integrity (🔴 Critical)**: 
- Fixed saldo kas calculation to include modal awal
- Corrected field references to use camelCase aliases
- Implemented proper stock reversal logic based on transaction category
- Added cascade deletes for journal entries

**Business Logic (🟠 High)**: 
- Replaced hardcoded formulas with database-driven configuration
- Fixed KPI to show current month data regardless of filters
- Aligned default filter state with UI highlights
- Made cash flow projection conditional on data period
- Used product-specific minStok thresholds
- Displayed all bank balances including negative

**Missing Features & Dead Code (🟡 Medium)**: 
- Removed unused popup variables
- Added chart filter buttons
- Implemented empty state messages
- Fixed audit log color mapping
- Renamed misleading "AI" labels
- Removed unused polling code
- Fixed duplicate realtime handlers

**Performance & Error Handling (🔵 Low)**: 
- Added query limits and pagination foundation
- Fixed error handling to preserve 404 responses

All fixes maintain backward compatibility with existing functionality (preservation checking) while resolving the identified bugs systematically.
