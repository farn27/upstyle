# Architecture Improvements Plan

## Current Status
- **AppViewModel: 1323 lines** - God Class anti-pattern
- **Violations**: Single Responsibility Principle, separation of concerns
- **Impact**: Difficult to maintain, test, and scale

## Problems Identified

### 1. God Class AppViewModel (CRITICAL)
**Current**: Single ViewModel handling:
- Navigation (Screen stack management)
- Auth (Login, Register, Logout, Google Auth)
- Business Units management
- Dashboard/Finance data
- Products & Inventory
- POS (Cart, Checkout)
- HR (Employees, Attendance, Payroll)
- CRM (Deals, Contacts, Activities)
- CS (Tickets)
- SCM (Suppliers, Purchase Orders)
- Finance AR/AP (Receivables, Payables)
- Orders (E-commerce)
- Marketing (Leads, Campaigns)
- Sales Targets
- Approvals
- Katalog
- Departments
- COA, Payroll, and 10+ more features

**Issues**:
- Violates Single Responsibility Principle
- Difficult to test individual features
- High cognitive load
- Hard to find bugs
- Memory inefficient (loads all features even when not used)
- Navigation logic mixed with business logic

### 2. Global Loading State
**Current**: Single `isLoading` boolean blocks entire UI

**Issues**:
- One feature loading blocks unrelated features
- Poor UX - can't use other features while one is loading
- No granular control

### 3. Navigation in ViewModel
**Current**: Screen stack managed in ViewModel

**Issues**:
- Navigation is UI concern, not business logic
- Makes testing harder
- Tight coupling between navigation and data

### 4. POS Cart in AppViewModel
**Current**: Cart logic in main ViewModel

**Issues**:
- POS-specific logic pollutes main ViewModel
- Cart state persists even when not in POS screen
- No separation of concerns

### 5. No Offline-First Strategy
**Current**: Only products have offline caching

**Issues**:
- Poor offline experience
- Data loss risk
- Inconsistent caching strategy

## Recommended Solutions

### Phase 1: Low-Risk Improvements (IMPLEMENTED ✅)
1. **Created FeatureStates.kt** - Per-feature state holders
   - `AuthState`, `UnitsState`, `DashboardState`, etc.
   - Enables granular loading states
   - Better error handling per feature

2. **Created NavigationManager.kt** - Dedicated navigation component
   - Separates navigation from business logic
   - Cleaner API
   - Easier to test

### Phase 2: Medium-Risk Refactoring (RECOMMENDED)
1. **Extract POS Logic to PosViewModel**
   ```kotlin
   class PosViewModel(api: UpstyleApi, session: SessionRepository) {
       // Cart management
       // Checkout logic
       // POS-specific data
   }
   ```

2. **Integrate NavigationManager into AppViewModel**
   - Replace direct navigation code
   - Delegate to NavigationManager
   - Keeps backward compatibility

3. **Migrate to Per-Feature Loading States**
   - Replace global `isLoading` with feature-specific states
   - Better UX - features load independently
   - Maintain backward compatibility with `uiState` for auth screens

### Phase 3: High-Risk Refactoring (FUTURE)
Split AppViewModel into feature-specific ViewModels:

```kotlin
// Auth + Session
class AuthViewModel(api, session)

// Products + Inventory
class ProductsViewModel(api, activeUnitId)

// HR Management
class HrViewModel(api, activeUnitId)

// CRM
class CrmViewModel(api, activeUnitId)

// Finance
class FinanceViewModel(api, activeUnitId)

// Coordinator
class AppViewModel(
    val auth: AuthViewModel,
    val products: ProductsViewModel,
    val hr: HrViewModel,
    val crm: CrmViewModel,
    val finance: FinanceViewModel,
    val navigation: NavigationManager
)
```

**Risks**:
- Breaks ALL screen code
- Requires massive refactoring
- High regression risk
- Testing overhead

**Mitigation**:
- Do incrementally
- Feature-by-feature migration
- Extensive testing at each step
- Keep old code working during migration

## Implementation Priority

### Immediate (This Session)
- [x] Create FeatureStates.kt
- [x] Create NavigationManager.kt
- [ ] Document architecture issues (this file)
- [ ] Update task list with safer approach

### Short Term (Next Sprint)
- [ ] Extract POS to PosViewModel
- [ ] Implement per-feature loading states
- [ ] Add form validation framework
- [ ] Extend offline caching to critical features

### Medium Term
- [ ] Implement proper error boundary per feature
- [ ] Add retry mechanisms
- [ ] Implement optimistic updates
- [ ] Add data synchronization strategy

### Long Term  
- [ ] Consider full ViewModel split (requires stakeholder buy-in)
- [ ] Implement proper dependency injection
- [ ] Add comprehensive testing
- [ ] Performance optimization

## Benefits of This Approach

✅ **Safer**: Incremental changes, no big bang refactor
✅ **Backward Compatible**: Existing screens keep working
✅ **Testable**: Can test new components in isolation
✅ **Flexible**: Can pause/resume at any point
✅ **Measurable**: Clear before/after metrics

## Metrics

### Current
- **Lines of Code**: 1323 lines in AppViewModel.kt
- **Cyclomatic Complexity**: Very High
- **Test Coverage**: Unknown (likely low due to complexity)
- **Feature Coupling**: Very High

### Target (After Phase 2)
- **Lines of Code**: <800 lines in AppViewModel.kt
- **Cyclomatic Complexity**: Medium
- **Test Coverage**: >60% for extracted components
- **Feature Coupling**: Medium

### Target (After Phase 3)
- **Lines of Code**: <300 lines in AppViewModel.kt (coordinator only)
- **Cyclomatic Complexity**: Low
- **Test Coverage**: >80%
- **Feature Coupling**: Low

## Conclusion

The God Class problem is REAL but requires **careful, incremental refactoring** rather than a big bang rewrite. 

**Current Strategy**: 
1. ✅ Create infrastructure (FeatureStates, NavigationManager)
2. ⏭️ Extract high-value, low-risk features first (POS)
3. ⏭️ Gradually migrate other features
4. ⏭️ Keep AppViewModel as coordinator during transition

This balances **architectural improvement** with **delivery velocity** and **risk management**.
