# Implementation Plan: BizGrow Mobile-Web Feature Parity

## Overview

This plan implements 100% feature parity between the BizGrow web and KMP mobile apps across 12 requirement areas. Implementation follows a bottom-up approach: foundational infrastructure first, then feature modules, then cross-cutting concerns. All code lives under `shared/src/commonMain/kotlin/com/upstyle/bizgrow/` and integrates into the existing `AppViewModel` / `NavigationManager` / `FeatureStates` architecture.

## Tasks

---

### Phase 1: Foundational Infrastructure

- [x] 1. Extend NavigationManager with workflow and context support
  - Add `BusinessWorkflow` and `NavigationContext` data classes to `ui/navigation/`
  - Extend `NavigationManager` with `navigateWithContext()`, `clearWorkflowStack()`, `getNavigationHistory()`, and a breadcrumb `StateFlow<List<String>>`
  - Add new `Screen` subclasses needed by all new feature modules: `Screen.SubscriptionPlans`, `Screen.PlanUpgrade`, `Screen.InvoiceHistory`, `Screen.UsageMetrics`, `Screen.ProductVariants`, `Screen.BulkOperations`, `Screen.StockMovement`, `Screen.PricingStrategy`, `Screen.ExportImport`, `Screen.SupportTicketDetail`, `Screen.Diagnostics`, `Screen.SyncStatus`
  - Wire workflow auth-guard in `NavigationManager.navigateToWorkflow()` to emit to `AppViewModel.authEvent` if unauthenticated
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 1.1 Write unit tests for NavigationManager workflow extensions
    - Test `navigateWithContext()` preserves context map across steps
    - Test `clearWorkflowStack()` removes only workflow entries, leaving root intact
    - Test back navigation returns `false` at root, `true` otherwise
    - Test auth-guard redirect fires correctly when session token is absent
    - _Requirements: 1.3, 1.4, 1.6_

  - [ ]* 1.2 Write property test for NavigationManager breadcrumb invariant
    - **Property 1.2: Navigation state preservation** — for any sequence of `navigate()` calls, breadcrumb length equals screen stack depth
    - **Validates: Requirements 1.1, 1.2**

- [x] 2. Add subscription, billing, and product-variant data models
  - Add to `data/Models.kt`: `SubscriptionPlan`, `CurrentSubscription`, `UsageLimits`, `PlanPricing`, `BillingInfo`, `Invoice`, `UsageMetrics`, `PaymentRequest`, `PaymentSession`, `PaymentResult`, `ProductVariant`, `PricingStrategy`, `BulkOperation`, `BulkOperationResult`, `StockMovement`, `SyncQueueItem`, `ExportResult`, `ImportResult`, `DiagnosticResult`
  - Add `@Serializable` annotations to all new models; ensure they round-trip through `kotlinx.serialization`
  - Add `SubscriptionState`, `BillingState`, `ProductVariantsState`, `BulkOperationState`, `ExportImportState`, `SyncState` data classes to `ui/state/FeatureStates.kt`
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.4, 3.5, 5.1, 7.1, 7.2_

  - [ ]* 2.1 Write property test for model serialization round-trip
    - **Property 2.1: Serialization round-trip fidelity** — for any valid `SubscriptionPlan`, `ProductVariant`, or `SyncQueueItem`, serializing then deserializing produces an equivalent object
    - **Validates: Requirements 2.3, 3.1, 7.2, Property 8 (Export-Import Round Trip Fidelity)**

- [x] 3. Extend UpstyleApi with subscription, billing, variants, bulk ops, and export endpoints
  - Add to `api/UpstyleApi.kt`: `getSubscriptionPlans()`, `getCurrentSubscription()`, `upgradePlan()`, `downgradePlan()`, `getInvoices()`, `getUsageMetrics()`, `initPaymentSession()`, `confirmPayment()`
  - Add product-variant endpoints: `getProductVariants()`, `createProductWithVariants()`, `updateVariant()`, `getStockMovements()`, `bulkUpdateProducts()`, `applyPricingStrategy()`
  - Add export/import endpoints: `exportData()`, `importData()`, `validateImportFile()`, `getExportHistory()`
  - Add help/diagnostics endpoints: `getContextualHelp()`, `searchHelp()`, `submitSupportTicket()`, `runDiagnostics()`
  - Add sync queue endpoints: `flushSyncQueue()`, `resolveConflict()`
  - _Requirements: 2.1–2.8, 3.1–3.8, 4.1–4.8, 5.1–5.8, 7.1–7.8_

- [x] 4. Implement SyncQueue and offline support in CacheManager
  - Add `SyncQueue` class in `cache/` with `enqueue()`, `dequeue()`, `getAll()`, `remove()`, and `size()` backed by `SessionRepository.settings`
  - Extend `CacheManager` to cache products, customers, recent transactions, subscription plan, and help articles with TTL tracking
  - Add `ConnectivityMonitor` expect/actual in `ui/Expect.kt` (Android: `ConnectivityManager`, iOS: `NWPathMonitor`) that emits `Boolean` via `StateFlow`
  - Add `SyncManager` class in `cache/` that observes `ConnectivityMonitor`, drains `SyncQueue` when online, and handles conflict resolution by timestamp
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7, 7.8_

  - [ ]* 4.1 Write property test for SyncQueue enqueue/dequeue invariant
    - **Property 4.1: Offline action queue integrity** — for any sequence of user actions performed while offline, every action appears in the SyncQueue and is drained in-order when online
    - **Validates: Requirements 7.2, 7.3, Property 4 (Offline-Online Consistency)**

  - [ ]* 4.2 Write property test for offline cache round-trip
    - **Property 4.2: Offline data availability** — for any list of products/customers fetched while online, the same list is returned by `CacheManager.loadList()` after simulating offline
    - **Validates: Requirements 7.1, 7.7**

- [x] 5. Checkpoint — Ensure all infrastructure tests pass
  - Run `./gradlew :shared:testDebugUnitTest` and confirm Tasks 1–4 sub-tests pass; fix any failures before continuing.

---

### Phase 2: Subscription & Billing Module

- [x] 6. Add subscription state and AppViewModel billing functions
  - Add `subscriptionState: StateFlow<SubscriptionState>` and `billingState: StateFlow<BillingState>` to `AppViewModel`
  - Implement `loadSubscriptionPlans()`, `loadCurrentSubscription()`, `loadUsageMetrics()`, `loadInvoices()` in `AppViewModel`
  - Implement `upgradePlan(planId, paymentMethod)` and `downgradePlan(planId)` with atomicity guard: update local state only after API confirms success
  - Implement `initiatePayment(planId)` and `confirmPayment(sessionId)` with error recovery flow
  - Notify via `_uiState` when usage crosses 80% of any limit (Requirement 2.5)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 6.1 Write property test for subscription state atomicity
    - **Property 6.1: Payment processing atomicity** — for any generated successful payment result, `subscriptionState.status` and all feature flags update together; for any generated failed payment result, neither changes
    - **Validates: Requirements 2.3, 2.7, Property 5 (Payment Processing Atomicity)**

- [x] 7. Implement SubscriptionPlansScreen and PlanUpgradeScreen
  - Rewrite `BusinessPlanScreen.kt` as a tabbed screen: "Plans" tab (all plans with feature comparison), "Usage" tab (usage progress bars against limits), "Invoices" tab (invoice list with download)
  - Create `PlanUpgradeScreen.kt` as a multi-step workflow: plan selection → payment method selection → confirmation → result
  - Wire new `Screen.SubscriptionPlans`, `Screen.PlanUpgrade`, `Screen.InvoiceHistory` in `App.kt`
  - Implement platform-specific payment sheet expect/actual: `showPaymentSheet(session: PaymentSession)` in `Expect.kt`
  - Show inline usage warning badge in `BottomNavBar` when any metric is ≥ 80%
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 2.6, 2.8_

  - [ ]* 7.1 Write unit tests for usage threshold notification logic
    - Test that `usageThresholdExceeded(usage, limit)` returns true iff usage ≥ 80% of limit for various generated value pairs
    - _Requirements: 2.5_

---

### Phase 3: Advanced Product Management

- [x] 8. Add product variant state and AppViewModel product functions
  - Add `productVariantsState: StateFlow<ProductVariantsState>` to `AppViewModel`
  - Implement `loadProductVariants(productId)`, `createProductWithVariants(product, variants)`, `updateVariant(variant)`, `deleteVariant(variantId)`
  - Implement `getStockMovements(productId, variantId)` and `adjustVariantStock(variantId, delta, reason)`
  - Implement `validatePricingStrategy(strategy, existingStrategies): ValidationResult` (checks for date range overlaps)
  - Implement `applyPricingStrategy(productId, strategy)` which calls validatePricingStrategy first
  - Implement `bulkUpdateProducts(updates, operation)` with progress `StateFlow<BulkOperationState>` and `rollbackBulkOperation(operationId)`
  - _Requirements: 3.1, 3.4, 3.5, 3.7, 3.8_

  - [ ]* 8.1 Write property test for pricing strategy overlap validation
    - **Property 8.1: Pricing strategy non-overlap invariant** — for any set of pricing strategies with non-overlapping date ranges, validation passes; for any two strategies with overlapping ranges, validation rejects
    - **Validates: Requirements 3.5, Property 6 (Bulk Operation Integrity)**

  - [ ]* 8.2 Write property test for stock movement audit trail
    - **Property 8.2: Stock movement round-trip** — for any stock adjustment on a variant, the adjustment amount and reason appear in `getStockMovements()` history immediately after the call
    - **Validates: Requirements 3.4, Property 2 (Data Synchronization Integrity)**

- [ ] 9. Extend ProductsScreen with variants, bulk ops, and advanced filtering
  - Extend `ProductsScreen.kt` to show a "Variants" expandable section per product (calls `loadProductVariants()`)
  - Add multi-select mode with a floating action bar for bulk operations: price update, category change, archive, delete
  - Add `BulkOperationProgressSheet` bottom sheet showing per-item status and a Rollback button wired to `rollbackBulkOperation()`
  - Add advanced filter sheet: price range, stock range, category hierarchy, variant attributes (extends existing `filterType` state)
  - Create `StockMovementScreen.kt` showing movement history for a variant with date range filter; wire `Screen.StockMovement`
  - Create `PricingStrategyScreen.kt` for managing date-bound pricing rules; wire `Screen.PricingStrategy`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 9.1 Write property test for advanced product filter correctness
    - **Property 9.1: Filter predicate consistency** — for any generated product list and any combination of active filter criteria, every product in the result satisfies all criteria simultaneously; no product outside the criteria appears
    - **Validates: Requirements 3.2, 3.6**

- [ ] 10. Checkpoint — Ensure all Phase 2 and 3 tests pass
  - Run `./gradlew :shared:testDebugUnitTest`; fix any regressions before continuing.

---

### Phase 4: Help Center & Support

- [x] 11. Extend HelpCenterState and AppViewModel help functions
  - Extend `HelpCenterState` in `FeatureStates.kt` to include: `faqList`, `searchResults`, `supportTickets`, `diagnosticResult`, `contextualArticles: Map<String, List<HelpArticle>>`, `isOffline`
  - Add `loadContextualHelp(screenName: String)` in `AppViewModel` that loads articles tagged for the current screen and stores them in `contextualArticles` map
  - Implement `searchHelp(query)`, `getFaqByCategory(category)`, `submitSupportTicket(title, description, priority, attachments)`, `runDiagnostics()`
  - Persist help articles to `CacheManager` after every successful fetch for offline access (Requirement 4.6)
  - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 11.1 Write property test for contextual help relevance
    - **Property 11.1: Contextual help accuracy** — for any screen name, every `HelpArticle` returned by `loadContextualHelp(screenName)` contains a tag matching that screen name; no unrelated articles are returned
    - **Validates: Requirements 4.1, Property 7 (Help System Contextual Accuracy)**

  - [ ]* 11.2 Write property test for help offline cache
    - **Property 11.2: Help content offline availability** — for any set of articles loaded while online, the identical article set is returned via `CacheManager` after the connectivity flag is set to offline
    - **Validates: Requirements 4.6**

- [x] 12. Rebuild HelpCenterScreen and add ticket/diagnostic screens
  - Rebuild `HelpCenterScreen.kt` with three tabs: "Bantuan" (contextual articles for current screen), "FAQ" (category filter + accordion), "Tiket" (ticket list with status badges)
  - Add a help FAB to all main Scaffold screens that calls `navigateToHelp(currentScreen)` while preserving workflow state via `NavigationManager.navigateWithContext()`
  - Create `SupportTicketScreen.kt`: form with title, description, priority picker, and file attachment (platform file picker expect/actual); wire `Screen.SupportTicketDetail`
  - Add `DiagnosticsScreen.kt` inside `AdvancedSettingsScreen.kt` as a collapsible panel showing connectivity, config, and system health; wire `Screen.Diagnostics`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_

---

### Phase 5: Export/Import & Data Portability

- [x] 13. Add ExportImportState and AppViewModel export/import functions
  - Add `exportImportState: StateFlow<ExportImportState>` to `AppViewModel`
  - Implement `exportData(dataType, format, filters)` with progress `StateFlow`; stream progress updates via `MutableStateFlow<Float>`
  - Implement `importData(fileBytes, fileName, fieldMapping)` with validation step before commit
  - Implement `validateImportFile(fileBytes, fileName)` returning field suggestions and row count
  - Implement `createBackup(scope)` and `getExportHistory()`
  - Add background processing support via `viewModelScope.launch(Dispatchers.Default)` for large operations with a `CancellationToken`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 13.1 Write property test for export format validity
    - **Property 13.1: Export format correctness** — for any generated dataset of products or transactions, exporting to CSV produces a string with a header row and exactly `dataset.size` data rows; exporting to JSON produces a parseable array of the same length
    - **Validates: Requirements 5.1, Property 8 (Export-Import Round Trip Fidelity)**

  - [ ]* 13.2 Write property test for import validation
    - **Property 13.2: Import file validation** — for any randomly generated malformed file (wrong column count, invalid numeric fields), `validateImportFile()` returns a non-empty error list; for any valid well-formed file, it returns an empty error list
    - **Validates: Requirements 5.3**

- [x] 14. Create ExportImportScreen
  - Create `ExportImportScreen.kt`: tabbed layout with "Export" and "Import" tabs; wire `Screen.ExportImport`
  - Export tab: data type picker (Products, Finance, Customers), format picker (Excel/CSV/PDF), date range filter, Export button with linear progress indicator, share sheet trigger on completion
  - Import tab: file picker (platform expect/actual), field mapping preview table, validation error list, Import button disabled until validation passes
  - Add export/import entry point to the existing `AdvancedSettingsScreen.kt` settings list
  - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.7, 5.8_

- [ ] 15. Checkpoint — Ensure all Phase 4 and 5 tests pass
  - Run `./gradlew :shared:testDebugUnitTest`; address any failures before continuing.

---

### Phase 6: Real-time Notifications & Sync Status

- [x] 16. Enhance NotificationScreen and push notification plumbing
  - Extend `RiwayatAksi` model (or add `Notification` model) with fields: `category` (Product/Finance/HR/System), `deepLinkScreen: String?`, `isRead`, `priority`
  - Add `markAsRead(id)`, `deleteNotification(id)`, `markAllReadByCategory(category)`, `clearAllNotifications()` to `AppViewModel`
  - Add push token registration expect/actual in `Expect.kt` (Android: FCM, iOS: APNS); implement `registerPushToken(token)` API call in `UpstyleApi`
  - Rebuild `NotificationScreen.kt`: category tabs (already partially exists), deep-link navigation on tap using `NavigationManager.navigate()`, swipe-to-dismiss, batch action FAB ("Mark All Read" / "Clear Category")
  - Wire in-app notification banner composable in `App.kt` that shows when a realtime socket event arrives while the app is foregrounded
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_

  - [ ]* 16.1 Write property test for notification deep-link routing
    - **Property 16.1: Notification deep-link integrity** — for any notification with a non-null `deepLinkScreen`, tapping it must navigate to the correct `Screen` object and the navigation stack must contain that screen
    - **Validates: Requirements 10.3**

---

### Phase 7: Advanced Settings & Preferences

- [x] 17. Expand AdvancedSettingsScreen with multi-tab layout and business unit management
  - Restructure `AdvancedSettingsScreen.kt` into three tabs: "Profil" (existing profile/password/avatar), "Workspace" (business unit management), "Preferensi" (theme, notifications, diagnostics)
  - Workspace tab: list of business units from `AppViewModel.units`, inline Create/Edit/Delete with confirmation dialogs, unit switcher that calls `selectUnit()` and clears navigation stack
  - Preferensi tab: theme toggle (dark mode already exists in `AdvancedSettingsState`), per-category notification toggles, "Diagnostik Sistem" entry that navigates to `Screen.Diagnostics`
  - Add avatar management: platform image picker expect/actual → upload endpoint in `UpstyleApi`; display cropped avatar in profile tab header
  - Add password change dialog (separate from the existing inline field) with current-password + new-password + confirm fields and server validation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

---

### Phase 8: UI/UX Enhancements & Performance

- [ ] 18. Implement progressive disclosure, lazy loading, and gesture shortcuts
  - Audit all screens with complex forms (ProductsScreen, TransactionEntryScreen, PricingScreen) and replace unconditional field display with progressive disclosure: secondary fields hidden behind a "More options" expander
  - Replace `LazyColumn` direct-items patterns in ProductsScreen, OrdersScreen, and CrmContactsScreen with paged loading: add `loadMoreProducts(page)`, `loadMoreOrders(page)` to `AppViewModel`; update each screen to trigger load when scrolled to last visible item
  - Add `SwipeToDismiss` wrapper in `NotificationScreen.kt` item rows and `TrashProductsScreen.kt`
  - Add long-press context menu (`DropdownMenu`) to product list items (Edit, Duplicate, Archive, View Stock) and order list items (View, Mark Complete, Contact Customer)
  - _Requirements: 8.1, 8.2, 8.3, 8.7_

  - [ ]* 18.1 Write property test for paginated product loading
    - **Property 18.1: Pagination correctness** — for any page number N > 0, calling `loadMoreProducts(N)` appends exactly the API-returned items to the existing list without duplicates (no product ID appears twice)
    - **Validates: Requirements 8.2, 11.2**

- [ ] 19. Apply accessibility, dark mode, and adaptive layout polish
  - Audit every screen for missing `contentDescription` on `Icon` and `IconButton` elements; add descriptions using the existing string resource pattern
  - Verify all text uses `MaterialTheme.typography` styles (not hardcoded `sp` values) so dynamic text sizing works; fix violations
  - Test dark mode by toggling `AdvancedSettingsState.darkMode`; fix any hardcoded `Color(0xFFFFFFFF)` or `Color.White` usages — replace with `BizgrowColors` tokens
  - Add `WindowSizeClass` handling in `App.kt`: on tablet/large screens, use a two-pane layout for Products (list + detail side-by-side) and Help Center (category list + article side-by-side)
  - _Requirements: 8.4, 8.6, 8.8_

---

### Phase 9: Security & Compliance Hardening

- [ ] 20. Implement secure token storage and session management
  - Add `saveToKeychain(key, value)` / `loadFromKeychain(key)` expect/actual in `Expect.kt` (Android: `EncryptedSharedPreferences`, iOS: Keychain Services); replace plain `settings.putString(KEY_TOKEN, ...)` in `SessionRepository` with keychain variants
  - Implement session timeout: add `lastActivityTimestamp` to `SessionRepository`; add a `SessionTimeoutMonitor` in `AppViewModel` that checks inactivity and emits `authEvent` after 30 min idle
  - Add biometric authentication expect/actual: `authenticateWithBiometrics(prompt): Boolean`; call before showing sensitive screens (Billing, Subscription, BusinessUnit management)
  - Add role-based access guard: `NavigationManager.canAccessScreen(screen, userRole): Boolean` that gates `Screen.SubscriptionPlans`, `Screen.ExportImport`, and `Screen.Diagnostics` to admin/owner roles
  - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 20.1 Write unit tests for role-based access control
    - Test `canAccessScreen()` returns `false` for restricted screens when role is "staff"; returns `true` when role is "owner"
    - Test session timeout fires `authEvent` after idle period
    - _Requirements: 12.6_

- [ ] 21. Add audit logging for sensitive operations
  - Add `AuditLogger` class in `utils/` that writes timestamped entries to a local audit log via `CacheManager` (capped at 1000 entries with FIFO eviction)
  - Instrument `AppViewModel`: call `AuditLogger.log(action, entityType, entityId)` on subscription changes, bulk product operations, business unit CRUD, export/import, and authentication events
  - Add audit log viewer to the Diagnostics panel in `AdvancedSettingsScreen.kt` (last 50 entries, reverse chronological)
  - _Requirements: 12.7_

- [ ] 22. Final checkpoint — Ensure all tests pass and run full build
  - Run `./gradlew :shared:testDebugUnitTest` and confirm all unit and property tests pass
  - Run `./gradlew :androidApp:assembleDebug` and confirm the Android build succeeds without errors
  - Fix any compilation errors or test regressions; ask the user before making any architectural changes.

---

## Notes

- Tasks marked with `*` are optional test sub-tasks; they can be skipped for a faster MVP but strongly recommended for the billing and sync modules which handle financial data
- All new `StateFlow` state in `AppViewModel` must be initialized with safe defaults and follow the existing `isLoading / error / successMessage` pattern from `FeatureStates.kt`
- All new API functions in `UpstyleApi.kt` must handle `ApiResponse<T>` and surface errors through `setError()` — do not throw from ViewModel functions
- Expect/actual declarations for platform features (keychain, file picker, connectivity, biometrics, payment sheet, push tokens) should all go in `shared/src/commonMain/kotlin/com/upstyle/bizgrow/ui/Expect.kt` with implementations in `androidMain` and `iosMain`
- Each task references its requirements by number for traceability back to `requirements.md`
- Correctness properties in tasks reference specific properties from `design.md`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["1.1", "1.2", "2.1", "3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["4.1", "4.2", "6"] },
    { "id": 4, "tasks": ["6.1", "7"] },
    { "id": 5, "tasks": ["7.1", "8"] },
    { "id": 6, "tasks": ["8.1", "8.2", "9"] },
    { "id": 7, "tasks": ["9.1", "11"] },
    { "id": 8, "tasks": ["11.1", "11.2", "13"] },
    { "id": 9, "tasks": ["12", "13.1", "13.2"] },
    { "id": 10, "tasks": ["14", "16"] },
    { "id": 11, "tasks": ["16.1", "17", "18"] },
    { "id": 12, "tasks": ["18.1", "19", "20"] },
    { "id": 13, "tasks": ["20.1", "21"] }
  ]
}
```
