# Next Steps - Remaining Work

## 🎯 Current Status: 70% Complete (7/10 tasks)

---

## 📋 Remaining Tasks

### Task 7: Per-Screen Loading States & Error Handling
**Priority:** HIGH  
**Complexity:** Medium  
**Estimated Effort:** 4-6 hours

#### Current State
- ✅ Infrastructure ready: `FeatureStates.kt` with all per-feature states defined
- ❌ Still using global `isLoading` in `AppViewModel.uiState`
- ❌ One feature loading blocks entire UI
- ❌ No granular error boundaries

#### What Needs to be Done

**Step 1: Add Feature States to AppViewModel**
```kotlin
// In AppViewModel.kt
private val _authState = MutableStateFlow(AuthState())
val authState: StateFlow<AuthState> = _authState.asStateFlow()

private val _productsState = MutableStateFlow(ProductsState())
val productsState: StateFlow<ProductsState> = _productsState.asStateFlow()

private val _posState = MutableStateFlow(PosState())
val posState: StateFlow<PosState> = _posState.asStateFlow()

// ... add all other feature states
```

**Step 2: Update Feature Methods**
```kotlin
// Before (global loading)
fun loadProducts() = viewModelScope.launch {
    setLoading(true)  // ❌ Blocks entire UI
    try {
        val res = api.getProducts(unitId)
        if (res.success) _products.value = res.data
        setLoading(false)
    } catch (e: Exception) {
        setError(e.message)
    }
}

// After (feature-specific loading)
fun loadProducts() = viewModelScope.launch {
    _productsState.update { it.copy(isLoading = true, error = null) }  // ✅ Only products loading
    try {
        val res = api.getProducts(unitId)
        if (res.success) {
            _products.value = res.data
            _productsState.update { it.copy(isLoading = false, products = res.data) }
        } else {
            _productsState.update { it.copy(isLoading = false, error = res.message) }
        }
    } catch (e: Exception) {
        _productsState.update { it.copy(isLoading = false, error = e.message) }
    }
}
```

**Step 3: Update Screens**
```kotlin
// In ProductsScreen.kt
@Composable
fun ProductsScreen(viewModel: AppViewModel) {
    val productsState by viewModel.productsState.collectAsStateWithLifecycle()
    
    when {
        productsState.isLoading && productsState.products.isEmpty() -> LoadingShimmer()
        productsState.error != null -> ErrorState(
            message = productsState.error!!,
            onRetry = { viewModel.loadProducts() }
        )
        productsState.products.isEmpty() -> EmptyState(...)
        else -> ProductsList(productsState.products)
    }
}
```

**Step 4: Add Error Retry Components**
```kotlin
// In BizComponents.kt
@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    icon: ImageVector = Icons.Default.ErrorOutline
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(40.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(icon, null, modifier = Modifier.size(64.dp), tint = BizgrowColors.Danger)
        Spacer(Modifier.height(16.dp))
        Text("Terjadi Kesalahan", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Text(message, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
        Spacer(Modifier.height(20.dp))
        Button(onClick = onRetry) {
            Icon(Icons.Default.Refresh, null, Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text("Coba Lagi")
        }
    }
}

@Composable
fun LoadingShimmer() {
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(5) {
            BizCard {
                ShimmerBox(Modifier.fillMaxWidth().height(20.dp))
                Spacer(Modifier.height(8.dp))
                ShimmerBox(Modifier.fillMaxWidth(0.6f).height(14.dp))
            }
        }
    }
}
```

#### Benefits
- Features load independently
- Better UX - can use other features while one is loading
- Clear error boundaries per feature
- Retry mechanism per feature
- Better error messages

---

### Task 8: Extract POS to Separate ViewModel
**Priority:** MEDIUM  
**Complexity:** High  
**Estimated Effort:** 6-8 hours

#### Current State
- ❌ POS logic in AppViewModel (~150 lines)
- ❌ Cart state persists even when not in POS screen
- ❌ Tight coupling with AppViewModel

#### What Needs to be Done

**Step 1: Create PosViewModel**
```kotlin
// New file: PosViewModel.kt
class PosViewModel(
    private val api: UpstyleApi,
    private val getActiveUnitId: () -> Int
) : ViewModel() {
    
    // Cart state
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()
    
    val cartTotal: StateFlow<Double> = _cart.map {
        it.entries.sumOf { e -> e.key.hargaJual * e.value }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)
    
    // POS data
    private val _posData = MutableStateFlow<PosData?>(null)
    val posData: StateFlow<PosData?> = _posData.asStateFlow()
    
    // Selected customer
    private val _selectedCustomerId = MutableStateFlow<Int?>(null)
    val selectedCustomerId: StateFlow<Int?> = _selectedCustomerId.asStateFlow()
    
    // Discount
    private val _diskon = MutableStateFlow(0.0)
    val diskon: StateFlow<Double> = _diskon.asStateFlow()
    
    // Loading/error state
    private val _state = MutableStateFlow(PosState())
    val state: StateFlow<PosState> = _state.asStateFlow()
    
    // Methods
    fun loadPosData() { /* ... */ }
    fun addToCart(product: Product, qty: Int = 1) { /* ... */ }
    fun removeFromCart(product: Product) { /* ... */ }
    fun clearCart() { /* ... */ }
    fun setCustomer(customerId: Int?) { /* ... */ }
    fun setDiskon(diskon: Double) { /* ... */ }
    fun checkout(paymentMethod: String, onSuccess: (Boolean) -> Unit) { /* ... */ }
}
```

**Step 2: Update PosScreen**
```kotlin
// In PosScreen.kt
@Composable
fun PosScreen(
    appViewModel: AppViewModel,
    posViewModel: PosViewModel = remember { PosViewModel(/* deps */) }
) {
    val products by appViewModel.products.collectAsStateWithLifecycle()
    val cart by posViewModel.cart.collectAsStateWithLifecycle()
    val cartTotal by posViewModel.cartTotal.collectAsStateWithLifecycle()
    val posState by posViewModel.state.collectAsStateWithLifecycle()
    
    // Use posViewModel for POS-specific operations
    // Use appViewModel for navigation and shared data
}
```

**Step 3: Remove POS Logic from AppViewModel**
- Delete cart-related properties
- Delete POS-specific methods
- Keep only `loadProducts()` (shared)

#### Benefits
- ~150 lines removed from AppViewModel
- Better separation of concerns
- Cart state scoped to POS feature
- Easier to test POS logic in isolation
- Can add POS-specific features without polluting AppViewModel

---

### Task 10: Offline-First Architecture
**Priority:** MEDIUM  
**Complexity:** High  
**Estimated Effort:** 8-12 hours

#### Current State
- ✅ Products cached offline
- ❌ No caching for: Units, Dashboard, HR, CRM, Finance, Orders

#### What Needs to be Done

**Step 1: Create Cache Manager**
```kotlin
// New file: CacheManager.kt
class CacheManager(private val session: SessionRepository) {
    
    fun <T> saveToCache(key: String, data: T, serializer: KSerializer<T>) {
        try {
            val json = Json.encodeToString(serializer, data)
            session.saveToCache(key, json)
        } catch (e: Exception) {
            Napier.e("Failed to cache $key", e)
        }
    }
    
    fun <T> loadFromCache(key: String, serializer: KSerializer<T>): T? {
        return try {
            val json = session.loadFromCache(key) ?: return null
            Json.decodeFromString(serializer, json)
        } catch (e: Exception) {
            Napier.e("Failed to load cached $key", e)
            null
        }
    }
    
    fun clearCache(key: String) {
        session.clearCache(key)
    }
    
    fun clearAllCache() {
        session.clearAllCache()
    }
}
```

**Step 2: Add Cache Keys**
```kotlin
object CacheKeys {
    const val PRODUCTS = "cache_products"
    const val UNITS = "cache_units"
    const val DASHBOARD = "cache_dashboard"
    const val HR_DATA = "cache_hr_data"
    const val CRM_DEALS = "cache_crm_deals"
    const val FINANCE_DATA = "cache_finance_data"
    
    fun unitSpecific(unitId: Int, key: String) = "${key}_unit_${unitId}"
}
```

**Step 3: Update Data Loading Methods**
```kotlin
fun loadUnits() = viewModelScope.launch {
    // Try cache first
    val cached = cacheManager.loadFromCache(
        CacheKeys.UNITS, 
        ListSerializer(BusinessUnit.serializer())
    )
    if (cached != null) {
        _units.value = cached
    }
    
    // Fetch from network
    try {
        val res = api.getBusinessUnits()
        if (res.success) {
            _units.value = res.data
            // Update cache
            cacheManager.saveToCache(
                CacheKeys.UNITS, 
                res.data,
                ListSerializer(BusinessUnit.serializer())
            )
        }
    } catch (e: Exception) {
        // Network failed, use cached if available
        if (cached != null) {
            Napier.w("Using cached units, network failed")
        } else {
            setError("No cached data available")
        }
    }
}
```

**Step 4: Add Cache Expiration**
```kotlin
data class CachedData<T>(
    val data: T,
    val timestamp: Long,
    val ttl: Long = 3600000 // 1 hour default
) {
    fun isExpired(): Boolean {
        return System.currentTimeMillis() - timestamp > ttl
    }
}

fun <T> loadFromCacheWithExpiry(key: String, serializer: KSerializer<T>): T? {
    val cached = loadFromCache(key, CachedData.serializer(serializer)) ?: return null
    return if (cached.isExpired()) null else cached.data
}
```

**Step 5: Add Sync Indicator**
```kotlin
@Composable
fun SyncIndicator(isSyncing: Boolean) {
    AnimatedVisibility(visible = isSyncing) {
        Surface(
            modifier = Modifier.padding(16.dp),
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp
                )
                Spacer(Modifier.width(8.dp))
                Text("Syncing...", style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
```

#### Benefits
- Better offline experience
- Faster initial load (cache-first)
- Data available even without internet
- Background sync when connection restored
- Reduced API calls

---

## 🎯 Recommended Order of Implementation

### Week 1: Per-Screen Loading States (Task 7)
**Impact:** HIGH  
**Risk:** LOW  
**User Benefit:** Immediate - much better UX

1. Day 1-2: Add feature states to AppViewModel
2. Day 2-3: Update 5 critical screens (Products, Dashboard, POS, HR, CRM)
3. Day 3: Add ErrorState and LoadingShimmer components
4. Day 4: Update remaining screens
5. Day 5: Testing and bug fixes

### Week 2: Extract POS ViewModel (Task 8)
**Impact:** MEDIUM  
**Risk:** MEDIUM  
**Developer Benefit:** Better architecture

1. Day 1: Create PosViewModel with all cart logic
2. Day 2: Update PosScreen to use new ViewModel
3. Day 3: Remove POS logic from AppViewModel
4. Day 4-5: Testing and integration testing

### Week 3: Offline-First Caching (Task 10)
**Impact:** MEDIUM  
**Risk:** MEDIUM  
**User Benefit:** Better offline experience

1. Day 1: Create CacheManager and cache infrastructure
2. Day 2-3: Implement caching for critical features (Units, Products, Dashboard)
3. Day 4: Implement cache expiration and sync
4. Day 5: Add sync indicators and offline mode UI
5. Week 4 Day 1-2: Testing offline scenarios

---

## 📊 Success Metrics

### After Task 7 (Per-Screen Loading)
- [ ] No more global loading blocking entire UI
- [ ] Each feature has independent loading state
- [ ] Error retry mechanisms work
- [ ] Loading shimmers on all screens
- [ ] Better perceived performance

### After Task 8 (POS ViewModel)
- [ ] AppViewModel reduced to ~1100 lines
- [ ] POS logic isolated in separate ViewModel
- [ ] Cart state scoped to POS feature
- [ ] POS screen performance improved
- [ ] Easier to test POS functionality

### After Task 10 (Offline Caching)
- [ ] All critical data cached
- [ ] App usable offline for basic operations
- [ ] Cache expiration working
- [ ] Background sync when online
- [ ] Sync indicators visible

---

## 🚨 Important Notes

### Don't Break Existing Functionality
- All changes should be backward compatible
- Test thoroughly after each change
- Keep existing screens working while migrating

### Gradual Migration
- Don't try to do everything at once
- Migrate one screen at a time for Task 7
- Test each screen before moving to next

### Testing Strategy
- Manual testing on actual devices
- Test offline scenarios (airplane mode)
- Test slow network (throttling)
- Test error scenarios (server errors)

### Code Review Checkpoints
- After each major change, review with team
- Get feedback on architecture decisions
- Ensure code quality maintained

---

## 🎓 Learning Resources

### Kotlin Coroutines & Flow
- StateFlow best practices
- Flow operators (map, combine, stateIn)
- Error handling in flows

### Compose State Management
- collectAsStateWithLifecycle vs collectAsState
- remember vs rememberSaveable
- State hoisting patterns

### Offline-First Architecture
- Cache invalidation strategies
- Sync conflict resolution
- Optimistic updates

---

## ✅ Pre-Implementation Checklist

Before starting each task:
- [ ] Read existing code thoroughly
- [ ] Understand current data flow
- [ ] Plan the changes (write pseudocode)
- [ ] Identify potential breaking points
- [ ] Prepare test scenarios
- [ ] Backup current working state

---

## 📞 Need Help?

If stuck on any task:
1. Check documentation files (ARCHITECTURE_IMPROVEMENTS.md, DESIGN_SYSTEM_GUIDE.md)
2. Review similar implementations in existing screens
3. Test incrementally - don't wait until everything is done
4. Ask for architecture review early if unsure

---

## 🎉 Expected Final State

After all 10 tasks complete:
- ✅ Modern, maintainable architecture
- ✅ All features available on mobile
- ✅ Consistent, professional UI/UX
- ✅ Robust form validation
- ✅ Per-feature loading states
- ✅ Proper error handling
- ✅ Offline-first experience
- ✅ Better code organization
- ✅ Easier to test
- ✅ Easier to maintain and extend

**Total Project Completion: 100%**

Good luck! 🚀
