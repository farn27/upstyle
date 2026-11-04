# Implementation Plan - Dashboard Finance Bugfix

## Overview

This task list implements fixes for 20 critical bugs in the finance dashboard (`/finance/[slug]`), organized by priority:
- **Priority 1 (Critical)**: Data integrity bugs (1.1-1.6) - incorrect calculations and data corruption
- **Priority 2 (High)**: Business logic bugs (2.1-2.6) - incorrect business rules and KPIs
- **Priority 3 (Medium)**: Missing features and dead code (3.1-3.7) - incomplete features and cleanup
- **Priority 4 (Low)**: Performance and error handling (4.1-4.2) - optimization and proper error responses

---

## PRIORITY 1: DATA INTEGRITY BUGS (CRITICAL 🔴)

### Bug 1.1: Saldo Kas Ignores Modal Awal

- [x] 1.1.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Saldo Kas Missing Modal Awal
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Confirm that current calculation ignores modal awal component
  - **Scoped PBT Approach**: Test units where modalAwal > 0 and verify saldoKas includes it
  - Test that for unit with modalAwal=10000000, totalMasuk=5000000, totalKeluar=3000000:
    - Current saldoKas calculation returns 2000000 (ignores modalAwal)
    - Expected saldoKas should be 12000000 (modalAwal + totalMasuk - totalKeluar)
  - Run test on UNFIXED code in `+page.server.js`
  - **EXPECTED OUTCOME**: Test FAILS (confirms bug - saldoKas doesn't include modalAwal)
  - Document that saldoKas calculation needs modalAwal component added
  - _Requirements: 1.1_

- [x] 1.1.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Summary Calculations
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - totalMasuk aggregation uses SUM(CASE WHEN kategoriTrx = 'MASUK')
    - totalKeluar aggregation uses SUM(CASE WHEN kategoriTrx = 'KELUAR')
    - totalHPP aggregation uses SUM(COALESCE(hppTotal, 0))
  - Write property-based tests: For all date filters, these aggregations remain unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline aggregation logic to preserve)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.1.3 Fix saldo kas calculation

  - [x] 1.1.3.1 Update server calculation in +page.server.js
    - Add saldoKas calculation after summary query (line ~55)
    - Calculate: `saldoKas = modalAwal + totalMasuk - totalKeluar`
    - Include saldoKas in finalData.summary object
    - _Bug_Condition: unit.modalAwal > 0 AND saldoKas calculated without modalAwal_
    - _Expected_Behavior: saldoKas = modalAwal + totalMasuk - totalKeluar_
    - _Preservation: Existing summary.total_masuk, summary.total_keluar, summary.total_hpp calculations_
    - _Requirements: 1.1_

  - [x] 1.1.3.2 Update frontend to use server-calculated saldoKas
    - Use data.summary.saldoKas from server instead of client calculation
    - Verify displayed cash balance is correct
    - _Requirements: 1.1_

  - [x] 1.1.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Saldo Kas Includes Modal Awal
    - **IMPORTANT**: Re-run the SAME test from task 1.1.1 - do NOT write a new test
    - The test from task 1.1.1 encodes the expected behavior
    - When this test passes, it confirms saldoKas correctly includes modalAwal
    - Run bug condition exploration test from step 1.1.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 1.1_

  - [x] 1.1.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Summary Calculations
    - **IMPORTANT**: Re-run the SAME tests from task 1.1.2 - do NOT write new tests
    - Run preservation property tests from step 1.1.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions in aggregation logic)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

---

### Bug 1.2: Frontend References Wrong Field Name (modal_awal)

- [ ] 1.2.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Field Alias Mismatch for modalAwal
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Confirm frontend references snake_case instead of camelCase
  - **Scoped PBT Approach**: Test unit with modalAwal=10000000 in database
  - Test that frontend code accesses `unit.modal_awal` which returns undefined
  - Expected: Should access `unit.modalAwal` (camelCase Drizzle alias)
  - Run test on UNFIXED code in `+page.svelte` line ~94
  - **EXPECTED OUTCOME**: Test FAILS (confirms wrong field reference)
  - _Requirements: 1.2_

- [ ] 1.2.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Unit Field Access
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - unit.nama displays correctly
    - unit.slug displays correctly
    - Other camelCase fields work properly
  - Write property-based tests: All other unit fields remain accessible
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms other fields work correctly)
  - _Requirements: 1.2_

- [ ] 1.2.3 Fix field reference in frontend

  - [ ] 1.2.3.1 Update modalAwal reference in +page.svelte
    - Change line ~94 from `unit.modal_awal` to `unit.modalAwal`
    - Update any other snake_case field references to camelCase
    - _Bug_Condition: Code references unit.modal_awal (snake_case)_
    - _Expected_Behavior: Code references unit.modalAwal (camelCase Drizzle alias)_
    - _Preservation: All other unit field accesses remain unchanged_
    - _Requirements: 1.2_

  - [ ] 1.2.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Field Alias Used
    - **IMPORTANT**: Re-run the SAME test from task 1.2.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms camelCase field reference)
    - _Requirements: 1.2_

  - [ ] 1.2.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Unit Field Access
    - **IMPORTANT**: Re-run the SAME tests from task 1.2.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 1.2_

---

### Bug 1.3: Transaction Payment Method Always Shows "KAS"

- [ ] 1.3.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Payment Method Field Mismatch
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm frontend references wrong field for payment method
  - **Scoped PBT Approach**: Test transactions with metodeBayar IN ['TRANSFER', 'QRIS', 'DEBIT']
  - Test that frontend code accesses `trx.metode_bayar` which returns undefined
  - Display defaults to 'KAS' instead of actual payment method
  - Run test on UNFIXED code in `+page.svelte` transaction table
  - **EXPECTED OUTCOME**: Test FAILS (confirms wrong field reference)
  - _Requirements: 1.3_

- [ ] 1.3.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Transaction Field Display
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - trx.tanggal displays correctly
    - trx.kategoriTrx displays correctly
    - trx.nominal displays correctly
    - trx.keterangan displays correctly
  - Write property-based tests: All other transaction fields display correctly
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms other fields work)
  - _Requirements: 1.3_

- [ ] 1.3.3 Fix payment method field reference

  - [ ] 1.3.3.1 Update metodeBayar reference in transaction table
    - Find transaction table rendering in `+page.svelte` (around line 200+)
    - Change `trx.metode_bayar` to `trx.metodeBayar`
    - _Bug_Condition: Code references trx.metode_bayar (snake_case)_
    - _Expected_Behavior: Code references trx.metodeBayar (camelCase)_
    - _Preservation: All other transaction field displays unchanged_
    - _Requirements: 1.3_

  - [ ] 1.3.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Payment Method Display
    - **IMPORTANT**: Re-run the SAME test from task 1.3.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms correct payment method shown)
    - _Requirements: 1.3_

  - [ ] 1.3.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Transaction Field Display
    - **IMPORTANT**: Re-run the SAME tests from task 1.3.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 1.3_

---

### Bug 1.4 & 1.5: Stock Reversal Uses Hardcoded Addition

- [ ] 1.4.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Incorrect Stock Reversal for KELUAR
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm stock reversal incorrectly increases when deleting KELUAR transaction
  - **Scoped PBT Approach**: Test deleting transaction with kategoriTrx='KELUAR', productId!=null, qty=50
  - Initial stock: 150 units
  - Delete KELUAR transaction (purchase)
  - Current behavior: stok = 150 + 50 = 200 (WRONG - should be 150 - 50 = 100)
  - Run test on UNFIXED code in `+page.server.js` deleteTransaction action
  - **EXPECTED OUTCOME**: Test FAILS (confirms incorrect stock increase)
  - _Requirements: 1.4, 1.5_

- [ ] 1.4.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Product Transaction Deletion
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Transactions without productId delete successfully
    - Audit logs are created correctly
    - Cache invalidation works properly
    - Transaction rollback works on errors
  - Write property-based tests: For transactions where productId=null, deletion works correctly
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms non-product deletion works)
  - _Requirements: 1.4, 1.5_

- [ ] 1.4.3 Fix stock reversal logic

  - [ ] 1.4.3.1 Implement conditional stock reversal in +page.server.js
    - Locate deleteTransaction action (lines ~120-125)
    - Replace hardcoded addition with conditional logic:
      ```javascript
      if (trxData.kategoriTrx === 'KELUAR') {
        // Purchase deletion: remove the stock increase
        stok = produk.stok - trxData.qty
      } else if (trxData.kategoriTrx === 'MASUK') {
        // Sale deletion: restore the stock decrease
        stok = produk.stok + trxData.qty
      }
      ```
    - _Bug_Condition: Stock reversal uses hardcoded addition for all cases_
    - _Expected_Behavior: Stock adjustment direction based on kategoriTrx_
    - _Preservation: Non-product transactions, audit logs, cache invalidation unchanged_
    - _Requirements: 1.4, 1.5_

  - [ ] 1.4.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Stock Reversal Logic
    - **IMPORTANT**: Re-run the SAME test from task 1.4.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms correct stock decrease)
    - _Requirements: 1.4, 1.5_

  - [ ] 1.4.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Product Transaction Deletion
    - **IMPORTANT**: Re-run the SAME tests from task 1.4.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 1.4, 1.5_

---

### Bug 1.6: Missing Cascade Deletes for Journal Entries

- [ ] 1.6.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Orphaned Journal Entries After Delete
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm journal entries remain in database after transaction deletion
  - **Scoped PBT Approach**: Test deleting transaction that has journal_entry records
  - Create transaction with ID 123 and associated journal_entry ID 456
  - Journal entry 456 has 2 journal_entry_lines (debit and credit)
  - Delete transaction 123
  - Current: journal_entry 456 and lines remain (WRONG - should be deleted)
  - Query database to confirm orphaned records exist
  - Run test on UNFIXED code in `+page.server.js` deleteTransaction action
  - **EXPECTED OUTCOME**: Test FAILS (confirms orphaned journal entries)
  - _Requirements: 1.6_

- [ ] 1.6.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Transaction Deletion Core Logic
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Transaction record is deleted successfully
    - Audit log is created
    - Cache is invalidated
    - Product stock is adjusted (if applicable)
    - Database transaction rollback works on error
  - Write property-based tests: Core deletion logic remains functional
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms core deletion works)
  - _Requirements: 1.6_

- [ ] 1.6.3 Implement cascade delete for journal entries

  - [ ] 1.6.3.1 Add journal entry cascade delete in +page.server.js
    - Locate deleteTransaction action (line ~127)
    - BEFORE deleting transaction, add:
      ```javascript
      // Delete journal entry lines first
      const journalEntries = await tx.query.journalEntries.findMany({
        where: eq(journalEntries.transaksiId, id)
      });
      
      for (const entry of journalEntries) {
        await tx.delete(journalEntryLines)
          .where(eq(journalEntryLines.journalId, entry.id));
      }
      
      // Delete journal entries
      await tx.delete(journalEntries)
        .where(eq(journalEntries.transaksiId, id));
      
      // Then delete transaction
      await tx.delete(transaksi).where(eq(transaksi.id, id));
      ```
    - _Bug_Condition: Transaction deletion doesn't delete related journal entries_
    - _Expected_Behavior: Cascade delete journal_entry_lines → journal_entries → transaksi_
    - _Preservation: Core transaction deletion, audit logs, cache invalidation unchanged_
    - _Requirements: 1.6_

  - [ ] 1.6.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Complete Cascade Delete
    - **IMPORTANT**: Re-run the SAME test from task 1.6.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms no orphaned records)
    - _Requirements: 1.6_

  - [ ] 1.6.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Transaction Deletion Core Logic
    - **IMPORTANT**: Re-run the SAME tests from task 1.6.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 1.6_

- [ ] 1.7 Checkpoint - Priority 1 Complete
  - Verify all Priority 1 bug condition tests pass
  - Verify all Priority 1 preservation tests pass
  - Run full finance dashboard test suite
  - Manually test dashboard with units that have modalAwal > 0
  - Manually test transaction deletion with products and journal entries
  - Ask user if questions arise about data integrity fixes

---

## PRIORITY 2: BUSINESS LOGIC BUGS (HIGH 🟠)

### Bug 2.1: Hardcoded Monthly Target KPI

- [ ] 2.1.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Non-Configurable Monthly Target
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm monthly target uses hardcoded formula instead of database value
  - **Scoped PBT Approach**: Test KPI calculation for unit with modalAwal=20000000
  - Current: targetPendapatan = Math.max(20000000 * 1.5, 10000000) = 30000000
  - Expected: targetPendapatan from database field (user-configurable)
  - Run test on UNFIXED code in `+page.server.js` line ~105
  - **EXPECTED OUTCOME**: Test FAILS (confirms hardcoded formula used)
  - _Requirements: 2.1_

- [ ] 2.1.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - KPI Display Logic
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - KPI widget displays target vs current comparison
    - Progress percentage calculation works correctly
    - KPI colors based on percentage thresholds work
  - Write property-based tests: KPI display and percentage logic unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms KPI display works)
  - _Requirements: 2.1_

- [ ] 2.1.3 Implement database-driven monthly target

  - [ ] 2.1.3.1 Add monthlyTarget field to unitBisnis schema (if not exists)
    - Check `web/drizzle/schema.js` for monthlyTarget field
    - If missing, add: `monthlyTarget: decimal("monthly_target", { precision: 15, scale: 2 })`
    - Create migration if needed
    - _Requirements: 2.1_

  - [ ] 2.1.3.2 Update target calculation in +page.server.js
    - Replace line ~105 with: `const targetPendapatan = Number(unitData.monthlyTarget || 0)`
    - Add fallback to hardcoded formula if target not set: `|| Math.max(unitData.modalAwal * 1.5, 10000000)`
    - _Bug_Condition: Target uses hardcoded formula only_
    - _Expected_Behavior: Target from database field (user-configurable)_
    - _Preservation: KPI display logic, progress calculation unchanged_
    - _Requirements: 2.1_

  - [ ] 2.1.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Configurable Monthly Target
    - **IMPORTANT**: Re-run the SAME test from task 2.1.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms database target used)
    - _Requirements: 2.1_

  - [ ] 2.1.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - KPI Display Logic
    - **IMPORTANT**: Re-run the SAME tests from task 2.1.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 2.1_

---

### Bug 2.2: KPI Current Value Uses Filtered Period

- [ ] 2.2.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - KPI Uses Filtered Period Not Current Month
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm KPI shows filtered period total instead of current month
  - **Scoped PBT Approach**: Test with date filter "Last 7 days" on January 15
  - 7-day revenue: 5000000
  - Current month revenue (Jan 1-15): 12000000
  - Current: KPI shows 5000000 (filtered period)
  - Expected: KPI shows 12000000 (current month regardless of filter)
  - Run test on UNFIXED code in `+page.server.js` line ~106
  - **EXPECTED OUTCOME**: Test FAILS (confirms wrong period used)
  - _Requirements: 2.2_

- [ ] 2.2.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Summary Statistics with Filters
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Total masuk/keluar respect date filter correctly
    - Transaction list respects date filter
    - Chart data respects date filter
    - Summary cards respect date filter
  - Write property-based tests: Other statistics correctly filter by date
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms filtering works elsewhere)
  - _Requirements: 2.2_

- [ ] 2.2.3 Fix KPI to use current month data

  - [ ] 2.2.3.1 Add separate query for current month revenue
    - In `+page.server.js` around line ~106, add new query:
      ```javascript
      // Get current month revenue for KPI (ignore user filter)
      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const kpiRevenue = await db.select({
        total: sql`SUM(CASE WHEN kategori_trx = 'MASUK' THEN nominal ELSE 0 END)`
      })
      .from(transaksi)
      .where(and(
        eq(transaksi.unitId, unitData.id),
        gte(transaksi.tanggal, firstDay)
      ));
      
      const currentPendapatan = Number(kpiRevenue[0]?.total || 0);
      ```
    - _Bug_Condition: KPI uses filtered period summary_
    - _Expected_Behavior: KPI uses current month data regardless of filter_
    - _Preservation: Other summaries and charts continue using date filter_
    - _Requirements: 2.2_

  - [ ] 2.2.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - KPI Shows Current Month
    - **IMPORTANT**: Re-run the SAME test from task 2.2.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms current month used)
    - _Requirements: 2.2_

  - [ ] 2.2.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Summary Statistics with Filters
    - **IMPORTANT**: Re-run the SAME tests from task 2.2.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms filtering still works)
    - _Requirements: 2.2_

---

### Bug 2.3: Default Date Filter Mismatch with UI

- [ ] 2.3.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Server/UI Filter State Mismatch
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm default filter state mismatch between server and UI
  - **Scoped PBT Approach**: Test loading dashboard without query parameters
  - Server defaults to: startDate="all", endDate="all"
  - UI highlights: "Hari Ini" button as active
  - Data shown: All transactions (not today only)
  - Run test on UNFIXED code (server line ~8, frontend line ~68)
  - **EXPECTED OUTCOME**: Test FAILS (confirms state mismatch)
  - _Requirements: 2.3_

- [ ] 2.3.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Date Filter Application
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - When user clicks date preset button, filter applies correctly
    - URL query parameters update properly
    - Data refreshes with new filter
    - depends('app:finance') invalidation works
  - Write property-based tests: Active date filtering remains functional
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms filtering works)
  - _Requirements: 2.3_

- [ ] 2.3.3 Fix default filter state consistency

  - [ ] 2.3.3.1 Update frontend default to match server
    - In `+page.svelte` line ~68, change:
      ```javascript
      let activePreset = "Semua";  // Match server default "all"
      ```
    - OR update server to default to today if UI must default to "Hari Ini"
    - _Bug_Condition: Server defaults to "all", UI highlights "Hari Ini"_
    - _Expected_Behavior: Server and UI default states match_
    - _Preservation: Active date filter application unchanged_
    - _Requirements: 2.3_

  - [ ] 2.3.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Consistent Default State
    - **IMPORTANT**: Re-run the SAME test from task 2.3.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms states match)
    - _Requirements: 2.3_

  - [ ] 2.3.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Date Filter Application
    - **IMPORTANT**: Re-run the SAME tests from task 2.3.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 2.3_

---

### Bug 2.4: Projected Cash Flow Uses Wrong Formula

- [ ] 2.4.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Projection Formula Misapplied to Filtered Periods
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm projection divides filtered data by current day of month
  - **Scoped PBT Approach**: Test with "Last 7 days" filter on January 15
  - 7-day revenue: 7000000
  - Current: (7000000 / 15) * 30 = 14000000 projected (WRONG)
  - Expected: Projection disabled or only works for current month filter
  - Run test on UNFIXED code in `+page.svelte` lines ~82-85
  - **EXPECTED OUTCOME**: Test FAILS (confirms wrong formula)
  - _Requirements: 2.4_

- [ ] 2.4.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Dashboard Calculations
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Saldo kas calculation works correctly
    - Total masuk/keluar display correctly
    - HPP total displays correctly
    - Margin calculations work correctly
  - Write property-based tests: Other financial calculations unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms other calcs work)
  - _Requirements: 2.4_

- [ ] 2.4.3 Fix cash flow projection formula

  - [ ] 2.4.3.1 Update projection logic in +page.svelte
    - Locate projection calculation (lines ~82-85)
    - Add conditional logic:
      ```javascript
      // Only show projection for current month or "all" filter
      $: canProject = activePreset === "Semua" || isCurrentMonthFilter();
      $: if (canProject) {
        const hariBerjalan = new Date().getDate();
        const runRate = omzet / (hariBerjalan || 1);
        forecastLaba = (runRate * 30) - ((totalKeluar / (hariBerjalan || 1)) * 30);
      } else {
        forecastLaba = null;  // Don't show projection for arbitrary periods
      }
      ```
    - Update UI to show "N/A" when forecastLaba is null
    - _Bug_Condition: Projection uses filtered data with current day of month_
    - _Expected_Behavior: Projection only for current month, disabled otherwise_
    - _Preservation: Other dashboard calculations unchanged_
    - _Requirements: 2.4_

  - [ ] 2.4.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Projection Logic
    - **IMPORTANT**: Re-run the SAME test from task 2.4.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms projection disabled or correct)
    - _Requirements: 2.4_

  - [ ] 2.4.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Dashboard Calculations
    - **IMPORTANT**: Re-run the SAME tests from task 2.4.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 2.4_

---

### Bug 2.5: Low Stock Uses Hardcoded Threshold

- [ ] 2.5.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Ignores Product-Specific minStok
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm low stock check uses hardcoded threshold 5
  - **Scoped PBT Approach**: Test products with different minStok values
  - Product A: stok=100, minStok=150 → Should alert (below minimum)
  - Product B: stok=8, minStok=3 → Should NOT alert (above minimum)
  - Current: Only checks stok <= 5 (ignores minStok)
  - Run test on UNFIXED code in `+page.server.js` line ~43
  - **EXPECTED OUTCOME**: Test FAILS (confirms hardcoded threshold)
  - _Requirements: 2.5_

- [ ] 2.5.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Product Data Loading
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Products load correctly with id, nama, harga_jual, stok fields
    - Product ordering works correctly
    - Product filtering by unit works correctly
  - Write property-based tests: Product loading and filtering unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms product loading works)
  - _Requirements: 2.5_

- [ ] 2.5.3 Fix low stock threshold logic

  - [ ] 2.5.3.1 Update low stock filter in +page.server.js
    - Change line ~43 from:
      ```javascript
      const lowStockProducts = productsData.filter(p => p.stok <= 5);
      ```
    - To:
      ```javascript
      const lowStockProducts = productsData.filter(p => 
        p.stok <= (p.minStok || 5)
      );
      ```
    - _Bug_Condition: Uses hardcoded threshold stok <= 5_
    - _Expected_Behavior: Compares against product-specific minStok_
    - _Preservation: Product loading and filtering unchanged_
    - _Requirements: 2.5_

  - [ ] 2.5.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Product-Specific Threshold
    - **IMPORTANT**: Re-run the SAME test from task 2.5.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms minStok used)
    - _Requirements: 2.5_

  - [ ] 2.5.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Product Data Loading
    - **IMPORTANT**: Re-run the SAME tests from task 2.5.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 2.5_

---

### Bug 2.6: Bank Balances Hide Negative Values

- [ ] 2.6.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Overdrawn Accounts Hidden
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm negative bank balances are filtered out
  - **Scoped PBT Approach**: Test bank accounts with various balances
  - Account A: saldo=5000000 → Displayed
  - Account B: saldo=-2000000 → Hidden (should be shown with warning)
  - Account C: saldo=0 → Hidden (edge case)
  - Run test on UNFIXED code in `+page.server.js` line ~86
  - **EXPECTED OUTCOME**: Test FAILS (confirms negative balances hidden)
  - _Requirements: 2.6_

- [ ] 2.6.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Bank Balance Calculation
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Balance calculation uses SUM(debit) - SUM(kredit)
    - Joins between journal tables work correctly
    - Account type filtering (ASET_LANCAR) works correctly
  - Write property-based tests: Balance calculation logic unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms calculation works)
  - _Requirements: 2.6_

- [ ] 2.6.3 Fix bank balance filtering

  - [ ] 2.6.3.1 Remove negative balance filter in +page.server.js
    - Locate line ~86
    - Remove or comment out: `.filter(b => b.saldo > 0)`
    - Allow all balances to be returned to frontend
    - _Bug_Condition: Filters out negative balances_
    - _Expected_Behavior: Shows all balances including negative_
    - _Preservation: Balance calculation logic unchanged_
    - _Requirements: 2.6_

  - [ ] 2.6.3.2 Add visual warning for negative balances in frontend
    - In `+page.svelte` bank balance display section
    - Add conditional styling for negative balances (red color, warning icon)
    - _Requirements: 2.6_

  - [ ] 2.6.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - All Balances Displayed
    - **IMPORTANT**: Re-run the SAME test from task 2.6.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms negatives shown)
    - _Requirements: 2.6_

  - [ ] 2.6.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Bank Balance Calculation
    - **IMPORTANT**: Re-run the SAME tests from task 2.6.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 2.6_

- [ ] 2.7 Checkpoint - Priority 2 Complete
  - Verify all Priority 2 bug condition tests pass
  - Verify all Priority 2 preservation tests pass
  - Run full finance dashboard test suite
  - Manually test KPI display with different date filters
  - Manually test low stock alerts with products having different minStok values
  - Manually test bank balance display with negative balances
  - Ask user if questions arise about business logic fixes

---

## PRIORITY 3: MISSING FEATURES & DEAD CODE (MEDIUM 🟡)

### Bug 3.1: Non-functional Popup Variables

- [ ] 3.1.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Variables Defined Without Components
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm popup variables exist but no components render
  - **Scoped PBT Approach**: Search for showKasDetail and showLabaRugiDetail usage
  - Variables defined: lines ~22-23
  - No popup components in template
  - onclick handlers call these variables but nothing happens
  - Run test on UNFIXED code in `+page.svelte`
  - **EXPECTED OUTCOME**: Test FAILS (confirms dead code exists)
  - _Requirements: 3.1_

- [ ] 3.1.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Card Click Handlers
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Other dashboard cards display correctly
    - Non-popup card functionality works
    - Card hover states work correctly
  - Write property-based tests: Other card interactions unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms other cards work)
  - _Requirements: 3.1_

- [ ] 3.1.3 Remove dead popup variables

  - [ ] 3.1.3.1 Decision: Implement popups or remove variables
    - Consult with user on whether detail popups are needed
    - If not needed: remove variables and onclick handlers
    - If needed: create popup components (separate feature task)
    - _Requirements: 3.1_

  - [ ] 3.1.3.2 Remove unused variables in +page.svelte
    - Remove lines ~22-23: `showKasDetail` and `showLabaRugiDetail` variables
    - Remove any onclick handlers that reference these variables
    - _Bug_Condition: Variables defined without component implementation_
    - _Expected_Behavior: Dead code removed_
    - _Preservation: Other card interactions unchanged_
    - _Requirements: 3.1_

  - [ ] 3.1.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No Unused Variables
    - **IMPORTANT**: Re-run the SAME test from task 3.1.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms variables removed)
    - _Requirements: 3.1_

  - [ ] 3.1.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Card Click Handlers
    - **IMPORTANT**: Re-run the SAME tests from task 3.1.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1_

---

### Bug 3.2: Missing Chart Filter Buttons

- [ ] 3.2.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Filter Logic Without UI Controls
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm selectedKategori variable exists but no UI buttons
  - **Scoped PBT Approach**: Search for selectedKategori usage and UI buttons
  - Variable defined: line ~69
  - Chart logic uses it: lines ~140-155
  - No toggle buttons in template
  - Run test on UNFIXED code in `+page.svelte`
  - **EXPECTED OUTCOME**: Test FAILS (confirms missing UI)
  - _Requirements: 3.2_

- [ ] 3.2.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Chart Display Logic
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Chart renders correctly with all data
    - Chart mode switching works (produkTerlaris, etc.)
    - Chart data aggregation works correctly
  - Write property-based tests: Chart core functionality unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms chart works)
  - _Requirements: 3.2_

- [ ] 3.2.3 Implement chart filter buttons

  - [ ] 3.2.3.1 Add toggle buttons to chart section in +page.svelte
    - Add button group above chart:
      ```svelte
      <div class="filter-buttons">
        <button 
          class:active={selectedKategori === ""} 
          on:click={() => selectedKategori = ""}>
          Semua
        </button>
        <button 
          class:active={selectedKategori === "MASUK"} 
          on:click={() => selectedKategori = "MASUK"}>
          Pemasukan
        </button>
        <button 
          class:active={selectedKategori === "KELUAR"} 
          on:click={() => selectedKategori = "KELUAR"}>
          Pengeluaran
        </button>
      </div>
      ```
    - _Bug_Condition: Filter logic exists without UI controls_
    - _Expected_Behavior: UI buttons to control selectedKategori_
    - _Preservation: Chart core functionality unchanged_
    - _Requirements: 3.2_

  - [ ] 3.2.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Filter Buttons Visible
    - **IMPORTANT**: Re-run the SAME test from task 3.2.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms buttons exist)
    - _Requirements: 3.2_

  - [ ] 3.2.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Chart Display Logic
    - **IMPORTANT**: Re-run the SAME tests from task 3.2.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.2_

---

### Bug 3.3: Empty Chart Without Message

- [ ] 3.3.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Silent Empty Chart Render
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm chart exits silently when no product transactions
  - **Scoped PBT Approach**: Test produkTerlaris mode with transactions but all productId=null
  - transactions.length > 0 (has transactions)
  - productTransactions.length = 0 (no product-linked transactions)
  - Current: Chart renders nothing, no explanation
  - Expected: Display message "Tidak ada transaksi yang terhubung ke produk"
  - Run test on UNFIXED code in `+page.svelte` lines ~185-200
  - **EXPECTED OUTCOME**: Test FAILS (confirms no message shown)
  - _Requirements: 3.3_

- [ ] 3.3.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Chart With Product Data
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Chart displays correctly when product transactions exist
    - Chart aggregation by product works correctly
    - Chart colors and labels display correctly
  - Write property-based tests: Chart with data renders correctly
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms chart works with data)
  - _Requirements: 3.3_

- [ ] 3.3.3 Add empty state message to chart

  - [ ] 3.3.3.1 Update chart rendering logic in +page.svelte
    - Locate produkTerlaris chart mode (lines ~185-200)
    - Replace silent return with message display:
      ```svelte
      {#if topProducts.length === 0}
        <div class="empty-state">
          <p>Tidak ada transaksi yang terhubung ke produk</p>
          <p class="hint">Tambahkan produk pada transaksi untuk melihat analisis produk</p>
        </div>
      {:else}
        <!-- Chart rendering -->
      {/if}
      ```
    - _Bug_Condition: Chart exits silently when no product data_
    - _Expected_Behavior: Display helpful empty state message_
    - _Preservation: Chart with product data renders correctly_
    - _Requirements: 3.3_

  - [ ] 3.3.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Empty State Message Shown
    - **IMPORTANT**: Re-run the SAME test from task 3.3.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms message displays)
    - _Requirements: 3.3_

  - [ ] 3.3.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Chart With Product Data
    - **IMPORTANT**: Re-run the SAME tests from task 3.3.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.3_

---

### Bug 3.4: Audit Log Colors Mismatch Database Values

- [ ] 3.4.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Color Mapping Uses Wrong Values
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm color logic checks DELETE/UPDATE but DB has success/info/warning/error
  - **Scoped PBT Approach**: Test audit logs with different tipe values
  - Database has: tipe IN ['success', 'info', 'warning', 'error']
  - Frontend checks: tipe IN ['DELETE', 'UPDATE', 'CREATE']
  - All logs show default blue color
  - Run test on UNFIXED code in `+page.svelte` audit log section
  - **EXPECTED OUTCOME**: Test FAILS (confirms wrong mapping)
  - _Requirements: 3.4_

- [ ] 3.4.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Audit Log Display
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Audit log messages display correctly
    - Audit log timestamps display correctly
    - Audit log user information displays correctly
    - Audit log ordering works correctly
  - Write property-based tests: Audit log content display unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms content displays)
  - _Requirements: 3.4_

- [ ] 3.4.3 Fix audit log color mapping

  - [ ] 3.4.3.1 Update color mapping logic in +page.svelte
    - Locate audit log rendering section
    - Update color mapping to match database values:
      ```svelte
      {#each auditLogs as log}
        <div class="log-item">
          <span class="dot" class:green={log.tipe === 'success'}
                            class:blue={log.tipe === 'info'}
                            class:yellow={log.tipe === 'warning'}
                            class:red={log.tipe === 'error'}></span>
          <!-- rest of log display -->
        </div>
      {/each}
      ```
    - _Bug_Condition: Color mapping checks DELETE/UPDATE/CREATE_
    - _Expected_Behavior: Color mapping checks success/info/warning/error_
    - _Preservation: Audit log content display unchanged_
    - _Requirements: 3.4_

  - [ ] 3.4.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Color Mapping
    - **IMPORTANT**: Re-run the SAME test from task 3.4.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms correct colors)
    - _Requirements: 3.4_

  - [ ] 3.4.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Audit Log Display
    - **IMPORTANT**: Re-run the SAME tests from task 3.4.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.4_

---

### Bug 3.5: "AI INSIGHT" Misleading Label

- [ ] 3.5.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - AI Label Without ML Implementation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm panel labeled "AI" uses simple if-else logic
  - **Scoped PBT Approach**: Review strategicBI.js implementation
  - Panel label contains "AI INSIGHT" or "STRATEGIC BI"
  - Implementation uses threshold checks and simple formulas
  - No ML model calls, no AI service integration
  - Run test on UNFIXED code in `$lib/server/strategicBI.js` and `+page.svelte`
  - **EXPECTED OUTCOME**: Test FAILS (confirms misleading label)
  - _Requirements: 3.5_

- [ ] 3.5.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - BI Recommendations Logic
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - BI recommendations based on margin thresholds
    - BI recommendations based on efficiency metrics
    - BI recommendations display correctly
    - buildStrategicBI function parameters work correctly
  - Write property-based tests: BI recommendation logic unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms recommendations work)
  - _Requirements: 3.5_

- [ ] 3.5.3 Fix misleading AI label

  - [ ] 3.5.3.1 Decision: Rename or integrate ML
    - Consult with user on thesis requirements
    - If ML required: separate feature task for ML integration
    - If not required: rename to avoid misleading claims
    - _Requirements: 3.5_

  - [ ] 3.5.3.2 Rename panel to "Business Insights" in +page.svelte
    - Change panel title from "AI INSIGHT" to "Business Insights"
    - Update any references to AI in this section
    - _Bug_Condition: Panel labeled "AI" without ML implementation_
    - _Expected_Behavior: Accurate labeling as "Business Insights"_
    - _Preservation: BI recommendation logic unchanged_
    - _Requirements: 3.5_

  - [ ] 3.5.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Accurate Labeling
    - **IMPORTANT**: Re-run the SAME test from task 3.5.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms no AI claims)
    - _Requirements: 3.5_

  - [ ] 3.5.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - BI Recommendations Logic
    - **IMPORTANT**: Re-run the SAME tests from task 3.5.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.5_

---

### Bug 3.6: Unused Polling Code

- [ ] 3.6.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Defined Function Never Called
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm checkUpdates() function exists but is never invoked
  - **Scoped PBT Approach**: Search for checkUpdates function definition and calls
  - Function defined: lines ~210-230
  - No calls in onMount, no setInterval setup
  - Function body has implementation but is dead code
  - Run test on UNFIXED code in `+page.svelte`
  - **EXPECTED OUTCOME**: Test FAILS (confirms dead code)
  - _Requirements: 3.6_

- [ ] 3.6.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Realtime Updates via WebSocket
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Realtime subscription works correctly
    - WebSocket connection handles events properly
    - Data updates on realtime events
    - invalidate() calls work correctly
  - Write property-based tests: WebSocket realtime updates work
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms realtime works)
  - _Requirements: 3.6_

- [ ] 3.6.3 Remove unused polling code

  - [ ] 3.6.3.1 Delete checkUpdates function in +page.svelte
    - Remove function definition (lines ~210-230)
    - Remove any commented-out setInterval code
    - Remove any related variables
    - _Bug_Condition: Function defined but never called_
    - _Expected_Behavior: Dead code removed_
    - _Preservation: Realtime WebSocket updates unchanged_
    - _Requirements: 3.6_

  - [ ] 3.6.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - No Unused Functions
    - **IMPORTANT**: Re-run the SAME test from task 3.6.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms function removed)
    - _Requirements: 3.6_

  - [ ] 3.6.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Realtime Updates via WebSocket
    - **IMPORTANT**: Re-run the SAME tests from task 3.6.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.6_

---

### Bug 3.7: Duplicate Realtime Subscription Handler

- [ ] 3.7.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Handler Attached Multiple Times
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm subscription handler in reactive block causes duplicate reloads
  - **Scoped PBT Approach**: Test realtime event triggers data reload count
  - Handler in reactive block: `$: if ($financeUpdate)`
  - Each event triggers reload 2x or more times
  - Logs show duplicate database queries
  - Run test on UNFIXED code in `+page.svelte` lines ~235-250
  - **EXPECTED OUTCOME**: Test FAILS (confirms duplicates occur)
  - _Requirements: 3.7_

- [ ] 3.7.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Realtime Event Handling
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Realtime events are received correctly
    - Data does update after events (even if duplicate)
    - Event payload is processed correctly
    - invalidate() function works correctly
  - Write property-based tests: Event reception and processing works
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms events received)
  - _Requirements: 3.7_

- [ ] 3.7.3 Fix duplicate subscription handler

  - [ ] 3.7.3.1 Move handler out of reactive block in +page.svelte
    - Locate realtime subscription setup (lines ~235-250)
    - Move handler attachment to onMount:
      ```javascript
      onMount(() => {
        const channel = supabase
          .channel('finance-updates')
          .on('postgres_changes', { ... }, () => {
            invalidate('app:finance');
          })
          .subscribe();
        
        return () => {
          channel.unsubscribe();
        };
      });
      ```
    - Remove reactive block that attached handler multiple times
    - _Bug_Condition: Handler in reactive block attaches multiple times_
    - _Expected_Behavior: Handler attached once in onMount_
    - _Preservation: Event reception and processing unchanged_
    - _Requirements: 3.7_

  - [ ] 3.7.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Single Handler Attachment
    - **IMPORTANT**: Re-run the SAME test from task 3.7.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms no duplicates)
    - _Requirements: 3.7_

  - [ ] 3.7.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Realtime Event Handling
    - **IMPORTANT**: Re-run the SAME tests from task 3.7.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.7_

- [ ] 3.8 Checkpoint - Priority 3 Complete
  - Verify all Priority 3 bug condition tests pass
  - Verify all Priority 3 preservation tests pass
  - Run full finance dashboard test suite
  - Manually test chart filters and empty states
  - Manually test audit log colors with different severity levels
  - Manually test realtime updates (no duplicate reloads)
  - Ask user if questions arise about feature completion and code cleanup

---

## PRIORITY 4: PERFORMANCE & ERROR HANDLING (LOW 🔵)

### Bug 4.1: Transaction List Fetches Unlimited Records

- [ ] 4.1.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Query Without Limit Clause
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm transaction query has no limit with large datasets
  - **Scoped PBT Approach**: Test with unit having >1000 transactions
  - Query fetches all records without limit
  - UI only displays 8-10 transactions
  - Performance degrades with large record count
  - Run test on UNFIXED code in `+page.server.js` line ~55
  - **EXPECTED OUTCOME**: Test FAILS (confirms no limit exists)
  - _Requirements: 4.1_

- [ ] 4.1.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Transaction Query Logic
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Transaction filtering by date works correctly
    - Transaction ordering by date DESC works correctly
    - Transaction joins work correctly
    - Transaction field selection works correctly
  - Write property-based tests: Query filtering and ordering unchanged
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms query logic works)
  - _Requirements: 4.1_

- [ ] 4.1.3 Add pagination or reasonable limit

  - [ ] 4.1.3.1 Add limit clause to transaction query in +page.server.js
    - Locate transaction query (line ~55)
    - Add limit: `.limit(100)` after orderBy
    - Consider pagination parameters in future enhancement
    - _Bug_Condition: Query fetches unlimited records_
    - _Expected_Behavior: Query limited to 100 records (or paginated)_
    - _Preservation: Query filtering and ordering unchanged_
    - _Requirements: 4.1_

  - [ ] 4.1.3.2 Add "load more" UI hint in frontend
    - In `+page.svelte` transaction list section
    - Add note: "Showing up to 100 most recent transactions"
    - Or implement "Load More" button (future enhancement)
    - _Requirements: 4.1_

  - [ ] 4.1.3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Query Limited
    - **IMPORTANT**: Re-run the SAME test from task 4.1.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms limit applied)
    - _Requirements: 4.1_

  - [ ] 4.1.3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Transaction Query Logic
    - **IMPORTANT**: Re-run the SAME tests from task 4.1.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 4.1_

---

### Bug 4.2: 404 Errors Caught and Returned as 500

- [ ] 4.2.1 Write bug condition exploration test
  - **Property 1: Bug Condition** - Try-Catch Overwrites 404 Status
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **GOAL**: Confirm 404 errors are caught and returned as 500
  - **Scoped PBT Approach**: Test accessing non-existent unit slug
  - Code throws: error(404, 'Unit tidak ditemukan')
  - Try-catch catches it and returns: error(500, 'Gagal memuat data')
  - Client receives 500 instead of 404
  - Run test on UNFIXED code in `+page.server.js` lines ~5-110
  - **EXPECTED OUTCOME**: Test FAILS (confirms 404 becomes 500)
  - _Requirements: 4.2_

- [ ] 4.2.2 Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Actual Exception Handling
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code:
    - Real database errors are caught and logged
    - Network errors are caught and logged
    - Query failures are caught and logged
    - Error logging includes stack trace
  - Write property-based tests: Actual exception handling works
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms exception handling works)
  - _Requirements: 4.2_

- [ ] 4.2.3 Fix error handling to preserve SvelteKit errors

  - [ ] 4.2.3.1 Update try-catch to re-throw SvelteKit errors in +page.server.js
    - Locate load function try-catch block (lines ~5-110)
    - Update catch block:
      ```javascript
      } catch (err) {
        // Re-throw SvelteKit errors (404, 403, etc.) without catching
        if (err?.status) {
          throw err;
        }
        
        // Only catch actual exceptions
        log.finance.error({ err }, '[Dashboard Error]');
        throw error(500, 'Gagal memuat data');
      }
      ```
    - _Bug_Condition: Try-catch overwrites all errors as 500_
    - _Expected_Behavior: SvelteKit errors re-thrown with correct status_
    - _Preservation: Actual exception handling unchanged_
    - _Requirements: 4.2_

  - [ ] 4.2.3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - 404 Status Preserved
    - **IMPORTANT**: Re-run the SAME test from task 4.2.1
    - **EXPECTED OUTCOME**: Test PASSES (confirms 404 returned)
    - _Requirements: 4.2_

  - [ ] 4.2.3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Actual Exception Handling
    - **IMPORTANT**: Re-run the SAME tests from task 4.2.2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 4.2_

- [ ] 4.3 Checkpoint - Priority 4 Complete
  - Verify all Priority 4 bug condition tests pass
  - Verify all Priority 4 preservation tests pass
  - Run full finance dashboard test suite
  - Manually test with large transaction datasets (performance)
  - Manually test accessing non-existent unit (404 response)
  - Ask user if questions arise about performance and error handling fixes

---

## FINAL CHECKPOINT

- [ ] 5.1 Run complete test suite for all 20 bugfixes
  - All bug condition tests pass (bugs are fixed)
  - All preservation tests pass (no regressions)
  - Integration tests pass
  - Manual testing complete

- [ ] 5.2 Documentation and verification
  - Update CHANGELOG with all 20 fixes
  - Document any new configuration needed (monthlyTarget field)
  - Verify database migrations applied (if any)
  - Update user documentation for new features (chart filters)

- [ ] 5.3 Final user acceptance
  - Demo all 20 fixes to user
  - Verify fixes meet requirements
  - Address any final concerns
  - Mark spec as complete
