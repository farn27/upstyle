package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.navigation.NavigationManager
import com.upstyle.bizgrow.ui.state.*
import com.upstyle.bizgrow.cache.CacheManager
import com.upstyle.bizgrow.cache.CacheKeys
import io.github.aakira.napier.Napier
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import com.upstyle.bizgrow.socket.SocketManager
import com.upstyle.bizgrow.socket.RealtimeEvent
import kotlinx.serialization.builtins.ListSerializer

// ─── Navigation ───────────────────────────────────────────────────────────────

sealed class Screen {
    // Main
    object Home : Screen()

    // Auth
    object Login : Screen()
    object Register : Screen()

    // Main Hub
    object Units : Screen()
    object Dashboard : Screen()

    // Finance
    object Finance : Screen()
    object Piutang : Screen()
    object Hutang : Screen()
    object JurnalUmum : Screen()
    object BukuBesar : Screen()
    object Laporan : Screen()

    // Products & Inventory
    object Products : Screen()
    object StockLogs : Screen()
    data class ProdukDetail(val productId: String) : Screen()
    object BarcodeScanner : Screen()

    // POS
    object Pos : Screen()

    // HR
    object Hr : Screen()
    object Absensi : Screen()
    object Payroll : Screen()

    // CRM
    object Crm : Screen()
    object CrmPipeline : Screen()
    object CrmContacts : Screen()
    object CrmActivities : Screen()

    // CS
    object CsInbox : Screen()
    data class TicketDetail(val ticketId: Int) : Screen()

    // Ecommerce
    object Orders : Screen()
    data class OrderDetail(val orderId: Int) : Screen()

    // SCM
    object Scm : Screen()

    // AI & Reports
    object AiChat : Screen()
    object LaporanWa : Screen()

    // System
    object Notifications : Screen()
    object Settings : Screen()
    object Profile : Screen()

    // POS Extended
    object PosShift : Screen()
    object PosReturn : Screen()

    // Advanced Screens
    object Coa : Screen()
    object FixedAssets : Screen()
    object StockOpname : Screen()
    object TrashProducts : Screen()
    object Quotations : Screen()
    object SalesOrders : Screen()
    object LeaveRequests : Screen()
    object PosVouchers : Screen()
    object CrmTasks : Screen()

    // Missing UI Gaps
    object Neraca : Screen()
    object Budget : Screen()
    object TaxRates : Screen()
    object ClosingPeriod : Screen()
    object MarketingCampaigns : Screen()
    object Pricing : Screen()

    // New Features
    object SalesTargets : Screen()
    object Approvals : Screen()
    object Katalog : Screen()
    object Marketing : Screen()
    object Departments : Screen()

    // Feature Gap Closure
    object BusinessPlan : Screen()
    object Sosmed : Screen()
    object WebsiteBuilder : Screen()
    object HelpCenter : Screen()
    object AdvancedSettings : Screen()
    object LandingPageScreen : Screen()
    object ShopeeIntegrationScreen : Screen()
}
// ─── UI State ─────────────────────────────────────────────────────────────────

data class UiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

// ─── AppViewModel ─────────────────────────────────────────────────────────────

class AppViewModel(
    private val api: UpstyleApi,
    private val session: SessionRepository
) : ViewModel() {

    // ─── Navigation (Task 6: delegated to NavigationManager) ─────────────────
    private val navigationManager = NavigationManager()

    val screen: StateFlow<Screen> = navigationManager.screen
    val screenStack: List<Screen> get() = navigationManager.screenStack.value
    val canNavigateBack: Boolean get() = navigationManager.canNavigateBack

    fun navigate(s: Screen) = navigationManager.navigate(s)
    fun navigateBack() { navigationManager.navigateBack() }
    fun navigateToRoot(s: Screen) = navigationManager.navigateToRoot(s)

    // ─── Cache Manager (Task 10: offline-first) ───────────────────────────────
    private val cacheManager = CacheManager(session)

    // ─── Global UI State (legacy — used for auth screens only) ───────────────
    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private fun setLoading(v: Boolean) { _uiState.update { it.copy(isLoading = v, error = null) } }
    private fun setError(msg: String) { _uiState.update { it.copy(isLoading = false, error = msg) } }
    private fun setSuccess(msg: String) { _uiState.update { it.copy(isLoading = false, successMessage = msg, error = null) } }
    fun clearMessages() { _uiState.update { it.copy(error = null, successMessage = null) } }

    // ─── Per-Feature States (Task 7: granular loading/error per feature) ──────
    private val _unitsState = MutableStateFlow(UnitsState())
    val unitsState: StateFlow<UnitsState> = _unitsState.asStateFlow()

    private val _dashboardState = MutableStateFlow(DashboardState())
    val dashboardState: StateFlow<DashboardState> = _dashboardState.asStateFlow()

    private val _productsState = MutableStateFlow(ProductsState())
    val productsState: StateFlow<ProductsState> = _productsState.asStateFlow()

    private val _hrState = MutableStateFlow(HrState())
    val hrState: StateFlow<HrState> = _hrState.asStateFlow()

    private val _crmState = MutableStateFlow(CrmState())
    val crmState: StateFlow<CrmState> = _crmState.asStateFlow()

    private val _scmState = MutableStateFlow(ScmState())
    val scmState: StateFlow<ScmState> = _scmState.asStateFlow()

    private val _financeArApState = MutableStateFlow(FinanceArApState())
    val financeArApState: StateFlow<FinanceArApState> = _financeArApState.asStateFlow()

    private val _csState = MutableStateFlow(CsState())
    val csState: StateFlow<CsState> = _csState.asStateFlow()

    private val _ordersState = MutableStateFlow(OrdersState())
    val ordersState: StateFlow<OrdersState> = _ordersState.asStateFlow()

    private val _marketingState = MutableStateFlow(MarketingState())
    val marketingState: StateFlow<MarketingState> = _marketingState.asStateFlow()

    // ─── Feature Gap States ───────────────────────────────────────────────────
    private val _businessPlansState = MutableStateFlow(BusinessPlansState())
    val businessPlansState: StateFlow<BusinessPlansState> = _businessPlansState.asStateFlow()

    private val _sosmedState = MutableStateFlow(SosmedState())
    val sosmedState: StateFlow<SosmedState> = _sosmedState.asStateFlow()

    private val _websiteState = MutableStateFlow(WebsiteBuilderState())
    val websiteState: StateFlow<WebsiteBuilderState> = _websiteState.asStateFlow()

    private val _helpState = MutableStateFlow(HelpCenterState())
    val helpState: StateFlow<HelpCenterState> = _helpState.asStateFlow()

    private val _landingPageState = MutableStateFlow(LandingPageState())
    val landingPageState: StateFlow<LandingPageState> = _landingPageState.asStateFlow()

    private val _shopeeState = MutableStateFlow(ShopeeState())
    val shopeeState: StateFlow<ShopeeState> = _shopeeState.asStateFlow()

    private val _advancedSettingsState = MutableStateFlow(AdvancedSettingsState())
    val advancedSettingsState: StateFlow<AdvancedSettingsState> = _advancedSettingsState.asStateFlow()

    // ─── Auth ─────────────────────────────────────────────────────────────────
    private val _isLoggedIn = MutableStateFlow(session.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    val currentUser: UserInfo? get() = if (session.isLoggedIn()) UserInfo(session.getUserId(), session.getUsername(), session.getEmail(), session.getRole()) else null

    /** Expose session for Settings screen */
    fun getSession() = session

    fun login(email: String, password: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.login(LoginRequest(email.trim(), password))
            if (res.success && res.data != null) {
                session.saveSession(res.data.token, res.data.user.role, res.data.user.email, res.data.user.username, res.data.user.id)
                _isLoggedIn.value = true
                setupSocket()
                loadUnits()
                setLoading(false)
                callback?.invoke(true, null)
                navigateToRoot(Screen.Home)
            } else {
                setError(res.message ?: "Login gagal")
                callback?.invoke(false, res.message)
            }
        } catch (e: Exception) {
            Napier.e("Login error", e)
            setError("Koneksi gagal: ${e.message}")
            callback?.invoke(false, e.message)
        }
    }

    fun register(username: String, email: String, password: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.register(RegisterRequest(username.trim(), email.trim(), password))
            if (res.success) {
                setSuccess("Registrasi berhasil! Silakan login.")
                callback?.invoke(true, null)
            } else {
                setError(res.message ?: "Registrasi gagal")
                callback?.invoke(false, res.message)
            }
        } catch (e: Exception) {
            Napier.e("Register error", e)
            setError("Koneksi gagal: ${e.message}")
            callback?.invoke(false, e.message)
        }
    }

    fun logout() = viewModelScope.launch {
        try { api.logout() } catch (_: Exception) {}
        session.clearSession()
        SocketManager.disconnect()
        _isLoggedIn.value = false
        _units.value = emptyList()
        _activeUnitId.value = 0
        navigateToRoot(Screen.Login)
    }

    fun loginWithGoogle(googleToken: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.loginWithGoogle(GoogleAuthRequest(googleToken))
            if (res.success && res.data != null) {
                session.saveSession(res.data.token, res.data.user.role, res.data.user.email, res.data.user.username, res.data.user.id)
                _isLoggedIn.value = true
                setupSocket()
                loadUnits()
                setLoading(false)
                callback?.invoke(true, null)
                navigateToRoot(Screen.Home)
            } else {
                setError(res.message ?: "Login Google gagal")
                callback?.invoke(false, res.message)
            }
        } catch (e: Exception) {
            Napier.e("loginWithGoogle error", e)
            setError("Koneksi gagal: ${e.message}")
            callback?.invoke(false, e.message)
        }
    }

    // ─── Business Units ───────────────────────────────────────────────────────
    private val _units = MutableStateFlow<List<BusinessUnit>>(emptyList())
    val units: StateFlow<List<BusinessUnit>> = _units.asStateFlow()

    private val _activeUnitId = MutableStateFlow(session.getActiveUnitId())
    val activeUnitId: StateFlow<Int> = _activeUnitId.asStateFlow()

    val activeUnit: StateFlow<BusinessUnit?> = combine(_units, _activeUnitId) { u, id ->
        u.find { it.id == id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun loadUnits() = viewModelScope.launch {
        // Task 7: feature-specific loading state
        _unitsState.update { it.copy(isLoading = true, error = null) }

        // Task 10: load from cache first (offline-first)
        val cached = cacheManager.loadList(CacheKeys.UNITS, BusinessUnit.serializer())
        if (cached != null) {
            _units.value = cached
            _unitsState.update { it.copy(units = cached) }
        }

        try {
            val res = api.getBusinessUnits()
            if (res.success) {
                _units.value = res.data
                _unitsState.update { it.copy(isLoading = false, units = res.data) }
                cacheManager.saveList(CacheKeys.UNITS, res.data, BusinessUnit.serializer())
            } else {
                _unitsState.update { it.copy(isLoading = false, error = "Gagal memuat unit") }
            }
        } catch (e: Exception) {
            Napier.e("loadUnits error", e)
            val errMsg = if (cached != null) null else "Gagal memuat unit: ${e.message}"
            _unitsState.update { it.copy(isLoading = false, error = errMsg) }
        }
    }

    fun selectUnit(unit: BusinessUnit) {
        session.setActiveUnit(unit.id, unit.name, unit.type)
        _activeUnitId.value = unit.id
        SocketManager.joinUnit(unit.id)
        loadDashboard()
        navigateToRoot(Screen.Dashboard)
    }

    fun createUnit(name: String, type: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.createBusinessUnit(CreateBusinessRequest(name, type))
            if (res.success) {
                // Fetch the updated units list
                val unitsRes = api.getBusinessUnits()
                if (unitsRes.success) {
                    val updatedUnits = unitsRes.data ?: emptyList()
                    _units.value = updatedUnits
                    
                    setSuccess("Unit bisnis berhasil dibuat!")
                    
                    // The API returns them ordered by desc(id), so the first one is the newly created unit.
                    val newlyCreated = updatedUnits.firstOrNull { it.name.equals(name, ignoreCase = true) } 
                                        ?: updatedUnits.firstOrNull()
                    
                    if (newlyCreated != null) {
                        selectUnit(newlyCreated)
                    }
                } else {
                    loadUnits()
                    setSuccess("Unit bisnis berhasil dibuat!")
                }
            } else {
                setError(res.message ?: "Gagal membuat unit")
            }
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    fun deleteUnit(unitId: Int) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.deleteBusinessUnit(unitId)
            if (res.success) {
                loadUnits()
                setSuccess("Unit berhasil dihapus")
            } else setError(res.message ?: "Gagal hapus unit")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────
    private val _financeData = MutableStateFlow<FinanceData?>(null)
    val financeData: StateFlow<FinanceData?> = _financeData.asStateFlow()

    fun loadDashboard(startDate: String? = null, endDate: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch

        // Task 7: feature-specific loading
        _dashboardState.update { it.copy(isLoading = true, error = null) }

        // Task 10: cache-first
        val cacheKey = CacheKeys.dashboardKey(unitId)
        val cached = cacheManager.load(cacheKey, FinanceData.serializer())
        if (cached != null) {
            _financeData.value = cached
            _dashboardState.update { it.copy(financeData = cached) }
        }

        try {
            val res = api.getFinanceData(unitId, startDate, endDate)
            if (res.success) {
                _financeData.value = res.data
                _dashboardState.update { it.copy(isLoading = false, financeData = res.data) }
                res.data?.let { cacheManager.save(cacheKey, it, FinanceData.serializer()) }
            } else {
                _dashboardState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat dashboard") }
            }
        } catch (e: Exception) {
            Napier.e("loadDashboard error", e)
            val errMsg = if (cached != null) null else "Gagal memuat dashboard: ${e.message}"
            _dashboardState.update { it.copy(isLoading = false, error = errMsg) }
        }
    }

    fun createTransaction(
        kategoriTrx: String, nominal: Double, keterangan: String,
        metodeBayar: String = "KAS", productId: String? = null, qty: Int = 1
    ) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createTransaction(
                CreateTransactionRequest(TransactionBody(unitId, kategoriTrx, nominal, keterangan, metodeBayar, null, productId, qty))
            )
            if (res.success) {
                loadDashboard()
                setSuccess("Transaksi berhasil disimpan!")
            } else setError(res.message ?: "Gagal simpan transaksi")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    fun deleteTransaction(transactionId: Int) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteTransaction(transactionId, unitId)
            if (res.success) {
                loadDashboard()
                setSuccess("Transaksi berhasil dihapus")
            } else setError(res.message ?: "Gagal hapus transaksi")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    // ─── Products ─────────────────────────────────────────────────────────────
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    private val _stockLogs = MutableStateFlow<List<StockLog>>(emptyList())
    val stockLogs: StateFlow<List<StockLog>> = _stockLogs.asStateFlow()

    private val _kategoriProduk = MutableStateFlow<List<KategoriProduk>>(emptyList())
    val kategoriProduk: StateFlow<List<KategoriProduk>> = _kategoriProduk.asStateFlow()

    fun loadProducts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch

        // Task 7: feature-specific loading
        _productsState.update { it.copy(isLoading = true, error = null) }

        // Task 10: cache-first (extends original offline logic via CacheManager)
        val cacheKey = CacheKeys.productsKey(unitId)
        val cached = cacheManager.loadList(cacheKey, Product.serializer())
        if (cached != null) {
            _products.value = cached
            _productsState.update { it.copy(products = cached) }
        }

        try {
            val res = api.getProducts(unitId)
            if (res.success) {
                _products.value = res.data
                _productsState.update { it.copy(isLoading = false, products = res.data) }
                cacheManager.saveList(cacheKey, res.data, Product.serializer())
                // Legacy offline cache compat
                try {
                    val json = kotlinx.serialization.json.Json.encodeToString(ListSerializer(Product.serializer()), res.data)
                    session.saveOfflineProducts(json)
                } catch (e: Exception) { Napier.e("Failed to write legacy offline cache", e) }
            } else {
                _productsState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat produk") }
            }
        } catch (e: Exception) {
            Napier.e("loadProducts error (network), trying offline cache", e)
            if (cached == null) {
                // fallback: legacy offline cache
                val cachedJson = session.getOfflineProducts()
                if (cachedJson != null) {
                    try {
                        val legacy = kotlinx.serialization.json.Json.decodeFromString<List<Product>>(cachedJson)
                        _products.value = legacy
                        _productsState.update { it.copy(products = legacy) }
                    } catch (e2: Exception) { Napier.e("Failed to parse cached products", e2) }
                }
            }
            val errMsg = if (cached != null || session.getOfflineProducts() != null) null else "Gagal memuat produk: ${e.message}"
            _productsState.update { it.copy(isLoading = false, error = errMsg) }
        }
    }

    fun loadStockLogs(productId: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getStockLogs(unitId, productId)
            if (res.success) _stockLogs.value = res.data ?: emptyList()
        } catch (e: Exception) {
            Napier.e("loadStockLogs error", e)
        }
    }

    private fun <T> ApiResponse<T>.messageOr(fallback: String) = message ?: fallback

    fun adjustStock(productId: String, perubahan: Int, alasan: String, keterangan: String? = null) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.adjustStock(productId, unitId, perubahan, alasan, keterangan)
            if (res.success) {
                loadProducts()
                loadStockLogs(productId)
                setSuccess("Stok berhasil diperbarui")
            } else setError(res.message ?: "Gagal update stok")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    // ─── Task 8: POS (bridged to PosViewModel during screen migration) ────────
    // POS screens still receive AppViewModel from App.kt. Keep this bridge so the
    // extracted PosViewModel works without breaking existing screen contracts.
    private val posViewModel = PosViewModel(api) { _activeUnitId.value }

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.state"))
    val posState: StateFlow<PosState> = posViewModel.state

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.cart"))
    val cart: StateFlow<Map<Product, Int>> = posViewModel.cart

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.cartTotal"))
    val cartTotal: StateFlow<Double> = posViewModel.cartTotal

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.cartItemCount"))
    val cartItemCount: StateFlow<Int> = posViewModel.cartItemCount

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.posData"))
    val posData: StateFlow<PosData?> = posViewModel.posData

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.selectedCustomerId"))
    val selectedCustomerId: StateFlow<Int?> = posViewModel.selectedCustomerId

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.diskon"))
    val posDiskon: StateFlow<Double> = posViewModel.diskon

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.posShifts"))
    val posShifts: StateFlow<List<PosShift>> = posViewModel.posShifts

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.activeShift"))
    val activeShift: StateFlow<PosShift?> = posViewModel.activeShift

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.posReturns"))
    val posReturns: StateFlow<List<PosReturn>> = posViewModel.posReturns

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.posCashTransactions"))
    val posCashTransactions: StateFlow<List<PosCashTransaction>> = posViewModel.posCashTransactions

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.posVouchers"))
    val posVouchers: StateFlow<List<PosVoucher>> = posViewModel.posVouchers

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.loadPosData()"))
    fun loadPosData() = posViewModel.loadPosData()

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.addToCart(product, qty)"))
    fun addToCart(product: Product, qty: Int = 1) = posViewModel.addToCart(product, qty)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.removeFromCart(product)"))
    fun removeFromCart(product: Product) = posViewModel.removeFromCart(product)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.clearCart()"))
    fun clearCart() = posViewModel.clearCart()

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.setCustomer(customerId)"))
    fun setCustomer(customerId: Int?) = posViewModel.setCustomer(customerId)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.setDiskon(diskon)"))
    fun setDiskon(diskon: Double) = posViewModel.setDiskon(diskon)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.checkout(paymentMethod)"))
    fun checkout(paymentMethod: String, onSuccess: ((Boolean) -> Unit)? = null, onSuccessUnit: () -> Unit = {}) =
        posViewModel.checkout(
            paymentMethod = paymentMethod,
            onSuccess = { ok ->
                if (ok) onSuccessUnit()
                onSuccess?.invoke(ok)
            },
            onProductsUpdated = { loadProducts() },
            onDashboardUpdated = { loadDashboard() }
        )

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.loadPosShifts()"))
    fun loadPosShifts() = posViewModel.loadPosShifts()

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.openShift(modalAwal)"))
    fun openShift(modalAwal: Double) = posViewModel.openShift(modalAwal)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.closeShift(shiftId, kasAkhirAktual, catatan)"))
    fun closeShift(shiftId: Int, kasAkhirAktual: Double, catatan: String = "") =
        posViewModel.closeShift(shiftId, kasAkhirAktual, catatan)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.loadPosReturns()"))
    fun loadPosReturns() = posViewModel.loadPosReturns()

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.createReturn(orderId, items, reason)"))
    fun createReturn(orderId: String, items: List<ReturnItem>, reason: String) =
        posViewModel.createReturn(orderId, items, reason)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.loadPosCashTransactions(shiftId)"))
    fun loadPosCashTransactions(shiftId: Int) = posViewModel.loadPosCashTransactions(shiftId)

    @Deprecated("Use PosViewModel directly once POS screens are migrated", ReplaceWith("posViewModel.loadPosVouchers()"))
    fun loadPosVouchers() = posViewModel.loadPosVouchers()

    // ─── HR ───────────────────────────────────────────────────────────────────
    private val _hrData = MutableStateFlow<HrData?>(null)
    val hrData: StateFlow<HrData?> = _hrData.asStateFlow()

    fun loadHrData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch

        _hrState.update { it.copy(isLoading = true, error = null) }

        // Task 10: cache-first
        val cacheKey = CacheKeys.hrKey(unitId)
        val cached = cacheManager.load(cacheKey, HrData.serializer())
        if (cached != null) {
            _hrData.value = cached
            _hrState.update { it.copy(hrData = cached) }
        }

        try {
            val res = api.getHrData(unitId)
            if (res.success) {
                _hrData.value = res.data
                _hrState.update { it.copy(isLoading = false, hrData = res.data) }
                res.data?.let { cacheManager.save(cacheKey, it, HrData.serializer()) }
            } else {
                _hrState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat data HR") }
            }
        } catch (e: Exception) {
            Napier.e("loadHrData error", e)
            val errMsg = if (cached != null) null else "Gagal memuat data HR: ${e.message}"
            _hrState.update { it.copy(isLoading = false, error = errMsg) }
        }
    }

    fun createEmployee(fullName: String, position: String, salary: Double, pin: String, role: String,
                       email: String = "", phone: String = "", division: String = "") = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createEmployee(CreateEmployeeRequest(
                employee = CreateEmployeeBody(fullName, position, salary, pin, role, unitId, email, phone, division)
            ))
            if (res.success) { loadHrData(); setSuccess("Karyawan berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah karyawan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteEmployee(employeeId: Int) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteEmployee(employeeId, unitId)
            if (res.success) { loadHrData(); setSuccess("Karyawan berhasil dihapus") }
            else setError(res.message ?: "Gagal hapus karyawan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun checkIn(employeeId: Int, date: String, time: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.checkIn(CheckInRequest(employeeId = employeeId, unitId = unitId, date = date, time = time))
            loadHrData()
            setSuccess("Check-in berhasil!")
        } catch (e: Exception) { setError("Check-in gagal: ${e.message}") }
    }

    fun checkOut(employeeId: Int, date: String, time: String) = viewModelScope.launch {
        try {
            api.checkOut(CheckOutRequest(employeeId = employeeId, date = date, time = time))
            loadHrData()
            setSuccess("Check-out berhasil!")
        } catch (e: Exception) { setError("Check-out gagal: ${e.message}") }
    }

    fun processPayroll(employeeId: Int, monthYear: String, salary: Double, allowance: Double,
                       deduction: Double, netSalary: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.processPayroll(ProcessPayrollRequest(
                payroll = ProcessPayrollBody(employeeId, monthYear, salary, allowance, deduction, netSalary, unitId)
            ))
            if (res.success) { loadHrData(); setSuccess("Payroll berhasil diproses!") }
            else setError(res.message ?: "Gagal proses payroll")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── CRM ──────────────────────────────────────────────────────────────────
    private val _crmDeals = MutableStateFlow<List<CrmDeal>>(emptyList())
    val crmDeals: StateFlow<List<CrmDeal>> = _crmDeals.asStateFlow()

    private val _crmContacts = MutableStateFlow<List<CrmContact>>(emptyList())
    val crmContacts: StateFlow<List<CrmContact>> = _crmContacts.asStateFlow()

    private val _crmActivities = MutableStateFlow<List<CrmActivity>>(emptyList())
    val crmActivities: StateFlow<List<CrmActivity>> = _crmActivities.asStateFlow()

    fun loadCrmData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch

        _crmState.update { it.copy(isLoading = true, error = null) }

        // Task 10: cache-first
        val dealsKey = CacheKeys.crmDealsKey(unitId)
        val contactsKey = CacheKeys.crmContactsKey(unitId)
        val cachedDeals = cacheManager.loadList(dealsKey, CrmDeal.serializer())
        val cachedContacts = cacheManager.loadList(contactsKey, CrmContact.serializer())
        if (cachedDeals != null) { _crmDeals.value = cachedDeals }
        if (cachedContacts != null) { _crmContacts.value = cachedContacts }
        if (cachedDeals != null || cachedContacts != null) {
            _crmState.update { it.copy(deals = cachedDeals ?: emptyList(), contacts = cachedContacts ?: emptyList()) }
        }

        try {
            val dealsRes = api.getCrmDeals(unitId)
            if (dealsRes.success) {
                _crmDeals.value = dealsRes.data
                cacheManager.saveList(dealsKey, dealsRes.data, CrmDeal.serializer())
            }
            val contactsRes = api.getCrmContacts(unitId)
            if (contactsRes.success) {
                _crmContacts.value = contactsRes.data
                cacheManager.saveList(contactsKey, contactsRes.data, CrmContact.serializer())
            }
            _crmState.update { it.copy(isLoading = false, deals = _crmDeals.value, contacts = _crmContacts.value) }
        } catch (e: Exception) {
            Napier.e("loadCrmData error", e)
            val errMsg = if (cachedDeals != null || cachedContacts != null) null else "Gagal memuat data CRM: ${e.message}"
            _crmState.update { it.copy(isLoading = false, error = errMsg) }
        }
    }

    fun loadCrmActivities() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getCrmActivities(unitId)
            if (res.success) _crmActivities.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadCrmActivities error", e) }
    }

    fun createDeal(contactName: String, companyName: String, dealValue: Double, stage: String, phone: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createDeal(CreateDealRequest(CreateDealBody(contactName, companyName, dealValue, stage, phone, unitId)))
            if (res.success) { loadCrmData(); setSuccess("Deal berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah deal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateDealStage(dealId: Int, stage: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.updateDealStage(UpdateDealStageRequest(dealId, stage, unitId))
            loadCrmData()
        } catch (e: Exception) { Napier.e("updateDealStage error", e) }
    }

    fun deleteDeal(dealId: Int) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteDeal(dealId, unitId)
            if (res.success) { loadCrmData(); setSuccess("Deal dihapus") }
            else setError(res.message ?: "Gagal hapus deal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createContact(nama: String, telepon: String, email: String, perusahaan: String, stage: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createContact(CreateContactRequest(contact = CreateContactBody(nama, telepon, email, perusahaan, stage, unitId = unitId)))
            if (res.success) { loadCrmData(); setSuccess("Kontak berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah kontak")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── SCM ──────────────────────────────────────────────────────────────────
    private val _scmData = MutableStateFlow<ScmData?>(null)
    val scmData: StateFlow<ScmData?> = _scmData.asStateFlow()

    fun loadScmData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch

        _scmState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getScmData(unitId)
            if (res.success) {
                _scmData.value = res.data
                _scmState.update { it.copy(isLoading = false, scmData = res.data) }
            } else {
                _scmState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat data SCM") }
            }
        } catch (e: Exception) {
            Napier.e("loadScmData error", e)
            _scmState.update { it.copy(isLoading = false, error = "Gagal memuat data SCM: ${e.message}") }
        }
    }

    fun createSupplier(name: String, contactName: String, phone: String, email: String, category: String, address: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createSupplier(CreateSupplierRequest(supplier = CreateSupplierBody(name, contactName, phone, email, category, address, unitId)))
            if (res.success) { loadScmData(); setSuccess("Supplier berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah supplier")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updatePoStatus(poId: String, status: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.updatePoStatus(UpdatePoStatusRequest(poId, status, unitId))
            loadScmData()
        } catch (e: Exception) { Napier.e("updatePoStatus error", e) }
    }

    // ─── Finance AR/AP ────────────────────────────────────────────────────────
    private val _receivables = MutableStateFlow<List<Receivable>>(emptyList())
    val receivables: StateFlow<List<Receivable>> = _receivables.asStateFlow()

    private val _payables = MutableStateFlow<List<Payable>>(emptyList())
    val payables: StateFlow<List<Payable>> = _payables.asStateFlow()

    private val _accountingContacts = MutableStateFlow<List<AccountingContact>>(emptyList())
    val accountingContacts: StateFlow<List<AccountingContact>> = _accountingContacts.asStateFlow()

    fun loadReceivables() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _financeArApState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getReceivables(unitId)
            if (res.success) {
                _receivables.value = res.data ?: emptyList()
                _financeArApState.update { it.copy(isLoading = false, receivables = res.data ?: emptyList()) }
            } else {
                _financeArApState.update { it.copy(isLoading = false, error = "Gagal memuat piutang") }
            }
        } catch (e: Exception) {
            Napier.e("loadReceivables error", e)
            _financeArApState.update { it.copy(isLoading = false, error = "Gagal memuat piutang: ${e.message}") }
        }

        fun loadPayables() = viewModelScope.launch {
            val unitId = _activeUnitId.value
            if (unitId == 0) return@launch
            _financeArApState.update { it.copy(isLoading = true, error = null) }
            try {
                val res = api.getPayables(unitId)
                if (res.success) {
                    _payables.value = res.data ?: emptyList()
                    _financeArApState.update { it.copy(isLoading = false, payables = res.data ?: emptyList()) }
                } else {
                    _financeArApState.update { it.copy(isLoading = false, error = "Gagal memuat hutang") }
                }
            } catch (e: Exception) {
                Napier.e("loadPayables error", e)
                _financeArApState.update { it.copy(isLoading = false, error = "Gagal memuat hutang: ${e.message}") }
            }
        }

    fun loadAccountingContacts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getAccountingContacts(unitId)
            if (res.success) _accountingContacts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadAccountingContacts error", e) }
    }

    fun payReceivable(invoiceId: Int, nominalBayar: Double) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.payReceivable(PayInvoiceRequest(invoiceId, nominalBayar))
            if (res.success) { loadReceivables(); setSuccess("Pembayaran piutang berhasil!") }
            else setError(res.message ?: "Gagal bayar piutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun payPayable(invoiceId: Int, nominalBayar: Double) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.payPayable(PayInvoiceRequest(invoiceId, nominalBayar))
            if (res.success) { loadPayables(); setSuccess("Pembayaran hutang berhasil!") }
            else setError(res.message ?: "Gagal bayar hutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Journal / Jurnal Umum ────────────────────────────────────────────────
    private val _journalEntries = MutableStateFlow<List<JournalEntry>>(emptyList())
    val journalEntries: StateFlow<List<JournalEntry>> = _journalEntries.asStateFlow()

    private val _chartOfAccounts = MutableStateFlow<List<ChartOfAccount>>(emptyList())
    val chartOfAccounts: StateFlow<List<ChartOfAccount>> = _chartOfAccounts.asStateFlow()

    fun loadJournalEntries(tahun: Int? = null, bulan: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getJournalEntries(unitId, tahun, bulan)
            if (res.success) _journalEntries.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadJournalEntries error", e) }
    }

    fun loadChartOfAccounts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getChartOfAccounts(unitId)
            if (res.success) _chartOfAccounts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadCOA error", e) }
    }

    fun loadCoa() = loadChartOfAccounts()

    // ─── Ecommerce Orders ─────────────────────────────────────────────────────
    private val _orders = MutableStateFlow<List<EcommerceOrder>>(emptyList())
    val orders: StateFlow<List<EcommerceOrder>> = _orders.asStateFlow()

    private val _selectedOrder = MutableStateFlow<EcommerceOrder?>(null)
    val selectedOrder: StateFlow<EcommerceOrder?> = _selectedOrder.asStateFlow()

    fun loadOrders() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _ordersState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getOrders(unitId)
            if (res.success) {
                _orders.value = res.data
                _ordersState.update { it.copy(isLoading = false, orders = res.data) }
            } else {
                _ordersState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat pesanan") }
            }
        } catch (e: Exception) {
            Napier.e("loadOrders error", e)
            _ordersState.update { it.copy(isLoading = false, error = "Gagal memuat pesanan: ${e.message}") }
        }
    }

    fun loadOrderDetail(orderId: Int) = viewModelScope.launch {
        try {
            val res = api.getOrderDetail(orderId)
            if (res.success) _selectedOrder.value = res.data
        } catch (e: Exception) { Napier.e("loadOrderDetail error", e) }
    }

    // ─── CS / Tickets ─────────────────────────────────────────────────────────
    private val _tickets = MutableStateFlow<List<SupportTicket>>(emptyList())
    val tickets: StateFlow<List<SupportTicket>> = _tickets.asStateFlow()

    private val _ticketMessages = MutableStateFlow<List<TicketMessage>>(emptyList())
    val ticketMessages: StateFlow<List<TicketMessage>> = _ticketMessages.asStateFlow()

    fun loadTickets() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _csState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getTickets(unitId)
            if (res.success) {
                _tickets.value = res.data ?: emptyList()
                _csState.update { it.copy(isLoading = false, tickets = res.data ?: emptyList()) }
            } else {
                _csState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat tiket") }
            }
        } catch (e: Exception) {
            Napier.e("loadTickets error", e)
            _csState.update { it.copy(isLoading = false, error = "Gagal memuat tiket: ${e.message}") }
        }
    }

    fun loadTicketMessages(ticketId: Int) = viewModelScope.launch {
        try {
            val res = api.getTicketMessages(ticketId)
            if (res.success) _ticketMessages.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTicketMessages error", e) }
    }

    fun replyTicket(ticketId: Int, message: String) = viewModelScope.launch {
        try {
            api.replyTicket(ticketId, message)
            loadTicketMessages(ticketId)
        } catch (e: Exception) { setError("Gagal kirim balasan") }
    }

    // ─── Notifications ────────────────────────────────────────────────────────
    private val _notifications = MutableStateFlow<List<RiwayatAksi>>(emptyList())
    val notifications: StateFlow<List<RiwayatAksi>> = _notifications.asStateFlow()

    val unreadCount: StateFlow<Int> = _notifications.map { list -> list.count { it.isRead == 0 } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    fun loadNotifications() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getNotifications(unitId)
            if (res.success) _notifications.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadNotifications error", e) }
    }

    fun markAllRead() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.markAllNotificationsRead(unitId)
            loadNotifications()
        } catch (e: Exception) { Napier.e("markAllRead error", e) }
    }

    // ─── AI Chat ──────────────────────────────────────────────────────────────
    private val _chatHistory = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chatHistory: StateFlow<List<ChatMessage>> = _chatHistory.asStateFlow()

    private val _isChatLoading = MutableStateFlow(false)
    val isChatLoading: StateFlow<Boolean> = _isChatLoading.asStateFlow()

    fun sendChat(message: String) = viewModelScope.launch {
        _isChatLoading.value = true
        val history = _chatHistory.value.toMutableList()
        history.add(ChatMessage("user", message))
        _chatHistory.value = history

        try {
            val res = api.chat(ChatRequest(message, activeUnit.value?.slug, history.takeLast(10)))
            history.add(ChatMessage("assistant", res.reply))
            _chatHistory.value = history
        } catch (e: Exception) {
            history.add(ChatMessage("assistant", "Maaf, terjadi kesalahan: ${e.message}"))
            _chatHistory.value = history
        } finally {
            _isChatLoading.value = false
        }
    }

    fun clearChat() { _chatHistory.value = emptyList() }

    // ─── Laporan WA ───────────────────────────────────────────────────────────
    private val _laporanWa = MutableStateFlow<LaporanWaData?>(null)
    val laporanWa: StateFlow<LaporanWaData?> = _laporanWa.asStateFlow()

    fun loadLaporanWa(periode: String = "hari_ini") = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.getLaporanWa(LaporanWaRequest(unitId, periode))
            if (res.success) { _laporanWa.value = res.data; _uiState.update { it.copy(isLoading = false) } }
            else setError(res.message ?: "Gagal load laporan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Low Stock ────────────────────────────────────────────────────────────
    private val _lowStockProducts = MutableStateFlow<List<LowStockProduct>>(emptyList())
    val lowStockProducts: StateFlow<List<LowStockProduct>> = _lowStockProducts.asStateFlow()

    fun loadLowStock() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLowStock(unitId)
            if (res.success) _lowStockProducts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadLowStock error", e) }
    }

    /** Alias for FinanceScreen compat */
    fun loadFinanceData(startDate: String? = null, endDate: String? = null) = loadDashboard(startDate, endDate)

    /** Reload all modules needed by Dashboard */
    fun refreshAll() {
        val unitId = _activeUnitId.value
        if (unitId == 0) return
        loadDashboard()
        loadLowStock()
        loadNotifications()
        loadProducts()
    }

    // ─── Laporan Keuangan ─────────────────────────────────────────────────────
    private val _labaRugiData = MutableStateFlow<LabaRugiData?>(null)
    val labaRugiData: StateFlow<LabaRugiData?> = _labaRugiData.asStateFlow()

    private val _arusKasData = MutableStateFlow<ArusKasData?>(null)
    val arusKasData: StateFlow<ArusKasData?> = _arusKasData.asStateFlow()

    fun loadLabaRugi(startDate: String, endDate: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLabaRugi(unitId, startDate, endDate)
            if (res.success) _labaRugiData.value = res.data
        } catch (e: Exception) { Napier.e("loadLabaRugi error", e) }
    }

    fun loadArusKas(startDate: String, endDate: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getArusKas(unitId, startDate, endDate)
            if (res.success) _arusKasData.value = res.data
        } catch (e: Exception) { Napier.e("loadArusKas error", e) }
    }

    // ─── Buku Besar ───────────────────────────────────────────────────────────
    private val _bukuBesarData = MutableStateFlow<BukuBesarData?>(null)
    val bukuBesarData: StateFlow<BukuBesarData?> = _bukuBesarData.asStateFlow()

    fun loadBukuBesar(coaId: Int, tahun: Int? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getBukuBesar(unitId, coaId, tahun)
            if (res.success) _bukuBesarData.value = res.data
        } catch (e: Exception) { Napier.e("loadBukuBesar error", e) }
    }

    fun createJournalEntry(tanggal: String, memo: String?, lines: List<CreateJournalLineBody>) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createJournalEntry(unitId, CreateJournalRequest(tanggal, null, memo, lines))
            if (res.success) { loadJournalEntries(); setSuccess("Jurnal berhasil disimpan!") }
            else setError(res.message ?: "Gagal simpan jurnal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createReceivable(contactId: Int, tanggal: String, jatuhTempo: String, nominal: Double, keterangan: String?) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createReceivable(unitId, CreateReceivableRequest(contactId, tanggal, jatuhTempo, nominal, keterangan))
            if (res.success) { loadReceivables(); loadAccountingContacts(); setSuccess("Piutang berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah piutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createPayable(contactId: Int, nomorFaktur: String?, tanggal: String, jatuhTempo: String, nominal: Double, keterangan: String?) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createPayable(unitId, CreatePayableRequest(contactId, nomorFaktur, tanggal, jatuhTempo, nominal, keterangan))
            if (res.success) { loadPayables(); loadAccountingContacts(); setSuccess("Hutang berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah hutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateOrderStatus(orderId: Int, status: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateOrderStatus(orderId, status)
            if (res.success) { loadOrders(); loadOrderDetail(orderId); setSuccess("Status pesanan diperbarui") }
            else setError(res.message ?: "Gagal update status")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    private fun setupSocket() {
        val userId = session.getUserId()
        val token = session.getToken()
        if (userId > 0 && !token.isNullOrEmpty()) {
            val url = session.getServerUrl()
            SocketManager.connect(url, _activeUnitId.value, userId, token)
        }
    }

    // ─── Init on startup ─────────────────────────────────────────────────────
    init {
        viewModelScope.launch {
            SocketManager.events.collect { event ->
                when (event) {
                    is RealtimeEvent.PosTransaction -> refreshAll()
                    is RealtimeEvent.StockUpdated -> { loadProducts(); loadLowStock() }
                    is RealtimeEvent.StockAlert -> loadLowStock()
                    is RealtimeEvent.Notification -> loadNotifications()
                    is RealtimeEvent.OrderStatusChanged -> loadOrders()
                    is RealtimeEvent.PosCashAlert -> refreshAll()
                    is RealtimeEvent.TicketMessage -> {} // Handled elsewhere or refresh tickets
                    is RealtimeEvent.Connected -> {
                        val active = _activeUnitId.value
                        if (active > 0) SocketManager.joinUnit(active)
                    }
                    RealtimeEvent.Disconnected -> {}
                }
            }
        }

        if (session.isLoggedIn()) {
            setupSocket()
            loadUnits()
            val savedUnitId = session.getActiveUnitId()
            if (savedUnitId > 0) {
                _activeUnitId.value = savedUnitId
                navigateToRoot(Screen.Dashboard)
                loadDashboard()
            } else {
                navigateToRoot(Screen.Home)
            }
        }
    }

    fun addProduct(
        nama: String, hargaBeli: Double, hargaJual: Double, stok: Int,
        minStok: Int = 5, sku: String = "", barcode: String? = null, kategoriId: Int? = null,
        fotoUri: String? = null,
        callback: (Boolean) -> Unit
    ) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val req = com.upstyle.bizgrow.data.Product(
                id = "", nama = nama, hargaBeli = hargaBeli, hargaJual = hargaJual,
                stok = stok, minStok = minStok, sku = sku, barcode = barcode,
                foto = fotoUri, kategoriId = kategoriId, unitId = unitId
            )
            val res = api.createProduct(req)
            if (res.success) {
                loadProducts()
                setSuccess("Produk berhasil ditambahkan")
                callback(true)
            } else {
                setError(res.message ?: "Gagal menambahkan produk")
                callback(false)
            }
        } catch (e: Exception) {
            setError("Gagal menambah produk: ${e.message}")
            callback(false)
        }
    }

    fun updateProduct(product: com.upstyle.bizgrow.data.Product) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateProduct(product)
            if (res.success) { loadProducts(); setSuccess("Produk berhasil diperbarui") }
            else setError(res.message ?: "Gagal update produk")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun loadKategoriProduk() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKategoriProduk(unitId)
            if (res.success) _kategoriProduk.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadKategoriProduk error", e) }
    }

    fun createTicket(subject: String, customerName: String, priority: String, message: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createTicket(CreateTicketRequest(
                subject = subject, customerName = customerName,
                priority = priority, message = message, unitId = unitId
            ))
            if (res.success) { loadTickets(); setSuccess("Tiket berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat tiket")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateTicketStatus(ticketId: Int, status: String) = viewModelScope.launch {
        try {
            api.updateTicketStatus(ticketId, status)
            loadTickets()
            setSuccess("Status tiket diperbarui")
        } catch (e: Exception) { Napier.e("updateTicketStatus error", e) }
    }

    // ─── Fixed Assets & Tax Rates & Budget & Closing Periods ─────────────────
    private val _fixedAssets = MutableStateFlow<List<FixedAsset>>(emptyList())
    val fixedAssets: StateFlow<List<FixedAsset>> = _fixedAssets.asStateFlow()

    private val _taxRates = MutableStateFlow<List<TaxRate>>(emptyList())
    val taxRates: StateFlow<List<TaxRate>> = _taxRates.asStateFlow()

    private val _budgetItems = MutableStateFlow<List<BudgetItem>>(emptyList())
    val budgetItems: StateFlow<List<BudgetItem>> = _budgetItems.asStateFlow()

    private val _closingPeriods = MutableStateFlow<List<ClosingPeriod>>(emptyList())
    val closingPeriods: StateFlow<List<ClosingPeriod>> = _closingPeriods.asStateFlow()

    fun loadFixedAssets() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getFixedAssets(unitId)
            if (res.success) _fixedAssets.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadFixedAssets error", e) }
    }

    fun loadTaxRates() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getTaxRates(unitId)
            if (res.success) _taxRates.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTaxRates error", e) }
    }

    fun loadBudgetItems(tahun: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getBudgetItems(unitId, tahun)
            if (res.success) _budgetItems.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadBudgetItems error", e) }
    }

    fun loadClosingPeriods() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getClosingPeriods(unitId)
            if (res.success) _closingPeriods.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadClosingPeriods error", e) }
    }

    // ─── HR Leave & Departments & Employee Detail ────────────────────────────
    private val _leaveRequests = MutableStateFlow<List<LeaveRequest>>(emptyList())
    val leaveRequests: StateFlow<List<LeaveRequest>> = _leaveRequests.asStateFlow()

    private val _departments = MutableStateFlow<List<Department>>(emptyList())
    val departments: StateFlow<List<Department>> = _departments.asStateFlow()

    private val _selectedEmployeeDetail = MutableStateFlow<EmployeeDetail?>(null)
    val selectedEmployeeDetail: StateFlow<EmployeeDetail?> = _selectedEmployeeDetail.asStateFlow()

    fun loadLeaveRequests() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLeaveRequests(unitId)
            if (res.success) _leaveRequests.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadLeaveRequests error", e) }
    }

    fun loadDepartments() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getDepartments(unitId)
            if (res.success) _departments.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadDepartments error", e) }
    }

    fun loadEmployeeDetail(employeeId: Int) = viewModelScope.launch {
        try {
            val res = api.getEmployeeDetail(employeeId)
            if (res.success) _selectedEmployeeDetail.value = res.data
        } catch (e: Exception) { Napier.e("loadEmployeeDetail error", e) }
    }

    // ─── CRM Tasks, Quotations, Sales Orders, Campaigns ─────────────────────
    private val _crmTasks = MutableStateFlow<List<CrmTask>>(emptyList())
    val crmTasks: StateFlow<List<CrmTask>> = _crmTasks.asStateFlow()

    private val _quotations = MutableStateFlow<List<Quotation>>(emptyList())
    val quotations: StateFlow<List<Quotation>> = _quotations.asStateFlow()

    private val _salesOrders = MutableStateFlow<List<SalesOrder>>(emptyList())
    val salesOrders: StateFlow<List<SalesOrder>> = _salesOrders.asStateFlow()

    private val _marketingCampaigns = MutableStateFlow<List<MarketingCampaign>>(emptyList())
    val marketingCampaigns: StateFlow<List<MarketingCampaign>> = _marketingCampaigns.asStateFlow()

    fun loadCrmTasks() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getCrmTasks(unitId)
            if (res.success) _crmTasks.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadCrmTasks error", e) }
    }

    fun loadQuotations() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getQuotations(unitId)
            if (res.success) _quotations.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadQuotations error", e) }
    }

    fun loadSalesOrders() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getSalesOrders(unitId)
            if (res.success) _salesOrders.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadSalesOrders error", e) }
    }

    fun loadMarketingCampaigns() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getMarketingCampaigns(unitId)
            if (res.success) _marketingCampaigns.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadMarketingCampaigns error", e) }
    }

    fun createMarketingCampaign(name: String, type: String = "EMAIL", budget: Double = 0.0, scheduledAt: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val camp = MarketingCampaign(
                unitId = unitId,
                name = name,
                type = type,
                budget = budget,
                scheduledAt = scheduledAt
            )
            val res = api.createMarketingCampaign(camp)
            if (res.success) {
                loadMarketingCampaigns()
            } else {
                setError(res.message ?: "Gagal membuat kampanye")
            }
        } catch (e: Exception) {
            Napier.e("createMarketingCampaign error", e)
            setError("Koneksi gagal: ${e.message}")
        }
    }


    // ─── Products Advanced (Stock Opname, Trash) ─────────────────────────────
    private val _stockOpnameSessions = MutableStateFlow<List<StockOpnameSession>>(emptyList())
    val stockOpnameSessions: StateFlow<List<StockOpnameSession>> = _stockOpnameSessions.asStateFlow()

    private val _trashProducts = MutableStateFlow<List<Product>>(emptyList())
    val trashProducts: StateFlow<List<Product>> = _trashProducts.asStateFlow()

    fun loadStockOpnameList() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getStockOpnameList(unitId)
            if (res.success) _stockOpnameSessions.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadStockOpnameList error", e) }
    }

    fun loadTrashProducts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getTrashProducts(unitId)
            if (res.success) _trashProducts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTrashProducts error", e) }
    }

    fun restoreProduct(productId: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.restoreProduct(productId)
            if (res.success) { loadTrashProducts(); loadProducts(); setSuccess("Produk dipulihkan") }
            else setError(res.message ?: "Gagal pulihkan produk")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Sales Targets ────────────────────────────────────────────────────────
    private val _salesTargetData = MutableStateFlow<SalesTargetData?>(null)
    val salesTargetData: StateFlow<SalesTargetData?> = _salesTargetData.asStateFlow()

    fun loadSalesTargets(periode: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getSalesTargets(unitId, periode)
            if (res.success) _salesTargetData.value = res.data
        } catch (e: Exception) { Napier.e("loadSalesTargets error", e) }
    }

    fun createSalesTarget(employeeId: Int?, employeeName: String, periode: String, targetAmount: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createSalesTarget(SalesTarget(
                unitId = unitId, employeeId = employeeId, employeeName = employeeName,
                periode = periode, targetAmount = targetAmount
            ))
            if (res.success) { loadSalesTargets(); setSuccess("Target berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat target")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteSalesTarget(targetId: Int) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.deleteSalesTarget(targetId)
            if (res.success) { loadSalesTargets(); setSuccess("Target dihapus") }
            else setError(res.message ?: "Gagal hapus target")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Approvals ────────────────────────────────────────────────────────────
    private val _approvalsData = MutableStateFlow<ApprovalsData?>(null)
    val approvalsData: StateFlow<ApprovalsData?> = _approvalsData.asStateFlow()

    fun loadApprovals() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getApprovals(unitId)
            if (res.success) _approvalsData.value = res.data
        } catch (e: Exception) { Napier.e("loadApprovals error", e) }
    }

    fun approveRequest(requestId: Int, action: String, notes: String? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.approveRequest(requestId, action, notes)
            if (res.success) {
                loadApprovals()
                setSuccess(if (action == "approve") "Permintaan disetujui!" else "Permintaan ditolak")
            } else setError(res.message ?: "Gagal proses approval")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createApprovalRequest(type: String, amount: Double, description: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        val userId = session.getUserId()
        try {
            val res = api.createApprovalRequest(ApprovalRequest(
                unitId = unitId, employeeId = userId, type = type,
                amount = amount, description = description
            ))
            if (res.success) { loadApprovals(); setSuccess("Pengajuan berhasil dikirim!") }
            else setError(res.message ?: "Gagal kirim pengajuan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Katalog ──────────────────────────────────────────────────────────────
    private val _katalogData = MutableStateFlow<KatalogData?>(null)
    val katalogData: StateFlow<KatalogData?> = _katalogData.asStateFlow()

    fun loadKatalog() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKatalog(unitId)
            if (res.success) _katalogData.value = res.data
        } catch (e: Exception) { Napier.e("loadKatalog error", e) }
    }

    fun toggleKatalogPublish(productId: String, isPublished: Boolean) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.toggleKatalogPublish(productId, isPublished)
            if (res.success) {
                loadKatalog()
                setSuccess(if (isPublished) "Produk dipublikasi ke katalog" else "Produk disembunyikan dari katalog")
            } else setError(res.message ?: "Gagal update katalog")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Marketing (full data) ────────────────────────────────────────────────
    private val _marketingData = MutableStateFlow<MarketingData?>(null)
    val marketingData: StateFlow<MarketingData?> = _marketingData.asStateFlow()

    fun loadMarketingData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getMarketingData(unitId)
            if (res.success) _marketingData.value = res.data
        } catch (e: Exception) { Napier.e("loadMarketingData error", e) }
    }

    fun createMarketingLead(nama: String, email: String, telepon: String, source: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createMarketingLead(MarketingLead(
                unitId = unitId, nama = nama, email = email, telepon = telepon, source = source
            ))
            if (res.success) { loadMarketingData(); setSuccess("Lead berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah lead")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateLeadStatus(leadId: Int, status: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.updateLeadStatus(leadId, status)
            loadMarketingData()
        } catch (e: Exception) { Napier.e("updateLeadStatus error", e) }
    }

    // ─── Departments CRUD ─────────────────────────────────────────────────────
    fun createDepartment(name: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createDepartment(Department(unitId = unitId, name = name))
            if (res.success) { loadDepartments(); setSuccess("Departemen berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat departemen")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Navigation helper untuk fitur baru ──────────────────────────────────
    // Navigation screens baru sudah ada di sealed class Screen
    // SalesTargets, Approvals, Katalog, Marketing sudah bisa diakses

    // ─── Business Plan ────────────────────────────────────────────────────────
    fun loadBusinessPlans() = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _businessPlansState.update { it.copy(isLoading = false, error = "Pilih unit bisnis terlebih dahulu") }; return@launch }
        try {
            val res = api.getBusinessPlans(unitId)
            if (res.success) _businessPlansState.update { it.copy(isLoading = false, plans = res.data ?: emptyList()) }
            else _businessPlansState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun createBusinessPlan(title: String, description: String, status: String) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createBusinessPlan(BusinessPlan(unitId = unitId, title = title, description = description, status = status))
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil dibuat!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateBusinessPlan(id: Int, title: String, description: String, status: String) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.updateBusinessPlan(BusinessPlan(id = id, unitId = unitId, title = title, description = description, status = status))
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil diperbarui!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteBusinessPlan(id: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteBusinessPlan(id, unitId)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun applyBusinessPlan(id: Int) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.applyBusinessPlan(id, unitId)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil diterapkan!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Sosmed ───────────────────────────────────────────────────────────────
    fun loadSosmedPosts() = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _sosmedState.update { it.copy(isLoading = false, error = "Pilih unit bisnis") }; return@launch }
        try {
            val res = api.getSocialPosts(unitId)
            if (res.success) _sosmedState.update { it.copy(isLoading = false, posts = res.data ?: emptyList()) }
            else _sosmedState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun createSosmedPost(platform: String, caption: String, imageUrl: String, scheduledAt: String, status: String) = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createSocialPost(SocialPost(unitId = unitId, platform = platform, caption = caption, imageUrl = imageUrl, scheduledAt = scheduledAt.ifBlank { null }, status = status))
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan berhasil dibuat!") }
            else { _sosmedState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateSosmedPost(id: Int, platform: String, caption: String, imageUrl: String, scheduledAt: String, status: String) = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.updateSocialPost(SocialPost(id = id, unitId = unitId, platform = platform, caption = caption, imageUrl = imageUrl, scheduledAt = scheduledAt.ifBlank { null }, status = status))
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan berhasil diperbarui!") }
            else { _sosmedState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteSosmedPost(id: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteSocialPost(id, unitId)
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun generateAiCaption(platform: String, productName: String, callback: (String) -> Unit) = viewModelScope.launch {
        try {
            val res = api.generateAiCaption(platform, productName)
            if (res.success) callback(res.data?.get("caption") ?: "Caption AI tidak tersedia")
            else callback("Gagal generate caption")
        } catch (e: Exception) { callback("Error: ${e.message}") }
    }

    // ─── Website Builder ──────────────────────────────────────────────────────
    fun loadWebsiteSettings() = viewModelScope.launch {
        _websiteState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _websiteState.update { it.copy(isLoading = false, error = "Pilih unit bisnis") }; return@launch }
        try {
            val res = api.getWebsiteSettings(unitId)
            if (res.success) _websiteState.update { it.copy(isLoading = false, settings = res.data) }
            else _websiteState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _websiteState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun saveWebsiteSettings(settings: WebsiteSetting) = viewModelScope.launch {
        _websiteState.update { it.copy(isSaving = true, error = null) }
        try {
            val res = api.updateWebsiteSettings(settings)
            if (res.success) { _websiteState.update { it.copy(isSaving = false, settings = res.data) }; setSuccess("Pengaturan website berhasil disimpan!") }
            else { _websiteState.update { it.copy(isSaving = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _websiteState.update { it.copy(isSaving = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Help Center ──────────────────────────────────────────────────────────
    fun loadHelpArticles(category: String? = null, query: String? = null) = viewModelScope.launch {
        _helpState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getHelpArticles(category, query)
            if (res.success) _helpState.update { it.copy(isLoading = false, articles = res.data ?: emptyList()) }
            else _helpState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _helpState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun sendHelpFeedback(articleId: String, helpful: Boolean) = viewModelScope.launch {
        try {
            api.sendHelpFeedback(articleId, helpful)
            setSuccess("Terima kasih atas feedback Anda!")
        } catch (e: Exception) { Napier.e("sendHelpFeedback error", e) }
    }

    // ─── Landing Page ─────────────────────────────────────────────────────────
    fun loadLandingPages() = viewModelScope.launch {
        _landingPageState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _landingPageState.update { it.copy(isLoading = false, error = "Pilih unit bisnis") }; return@launch }
        try {
            val res = api.getLandingPages(unitId)
            if (res.success) _landingPageState.update { it.copy(isLoading = false, pages = res.data ?: emptyList()) }
            else _landingPageState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _landingPageState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun loadLandingPageTemplates() = viewModelScope.launch {
        try {
            val res = api.getLandingPageTemplates()
            if (res.success) _landingPageState.update { it.copy(templates = res.data ?: emptyList()) }
        } catch (e: Exception) { Napier.e("loadLandingPageTemplates error", e) }
    }

    fun createLandingPage(page: LandingPage) = viewModelScope.launch {
        _landingPageState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createLandingPage(page.copy(unitId = unitId))
            if (res.success) { loadLandingPages(); setSuccess("Landing page berhasil dibuat!") }
            else { _landingPageState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _landingPageState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateLandingPage(page: LandingPage) = viewModelScope.launch {
        _landingPageState.update { it.copy(isLoading = true) }
        try {
            val res = api.updateLandingPage(page)
            if (res.success) { loadLandingPages(); setSuccess("Landing page berhasil diperbarui!") }
            else { _landingPageState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _landingPageState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteLandingPage(pageId: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteLandingPage(pageId, unitId)
            if (res.success) { loadLandingPages(); setSuccess("Landing page berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun toggleLandingPageActive(pageId: Int, isActive: Boolean) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.toggleLandingPage(pageId, unitId, isActive)
            if (res.success) loadLandingPages()
        } catch (e: Exception) { Napier.e("toggleLandingPageActive error", e) }
    }

    // ─── Shopee Integration ───────────────────────────────────────────────────
    fun loadShopeeStatus() = viewModelScope.launch {
        _shopeeState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _shopeeState.update { it.copy(isLoading = false, error = "Pilih unit bisnis") }; return@launch }
        try {
            val res = api.getShopeeStatus(unitId)
            if (res.success) _shopeeState.update { it.copy(isLoading = false, integration = res.data) }
            else _shopeeState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) { _shopeeState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun connectShopee(shopId: String, shopName: String, token: String) = viewModelScope.launch {
        _shopeeState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.connectShopee(ShopeeIntegration(unitId = unitId, shopId = shopId, shopName = shopName, accessToken = token, isActive = true))
            if (res.success) { _shopeeState.update { it.copy(isLoading = false, integration = res.data) }; setSuccess("Shopee berhasil terhubung!") }
            else { _shopeeState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _shopeeState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun disconnectShopee() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.disconnectShopee(unitId)
            if (res.success) { loadShopeeStatus(); setSuccess("Shopee berhasil diputus!") }
            else setError(res.message ?: "Gagal putus koneksi")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Advanced Settings ────────────────────────────────────────────────────
    fun loadProfileSettings() = viewModelScope.launch {
        _advancedSettingsState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            // For now just load from session
            _advancedSettingsState.update { it.copy(
                isLoading = false,
                username = session.getUsername(),
                email = session.getEmail(),
                phone = ""
            ) }
        } catch (e: Exception) { _advancedSettingsState.update { it.copy(isLoading = false, error = e.message) } }
    }

    fun saveProfile(name: String, email: String, phone: String) = viewModelScope.launch {
        _advancedSettingsState.update { it.copy(isSaving = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.updateProfile(unitId, mapOf("name" to name, "email" to email, "phone" to phone))
            if (res.success) { _advancedSettingsState.update { it.copy(isSaving = false, successMessage = "Profil berhasil disimpan!") }; setSuccess("Profil berhasil disimpan!") }
            else { _advancedSettingsState.update { it.copy(isSaving = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _advancedSettingsState.update { it.copy(isSaving = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun changePassword(currentPassword: String, newPassword: String) = viewModelScope.launch {
        _advancedSettingsState.update { it.copy(isSaving = true, error = null) }
        try {
            val res = api.changePassword(mapOf("currentPassword" to currentPassword, "newPassword" to newPassword))
            if (res.success) { _advancedSettingsState.update { it.copy(isSaving = false, successMessage = "Password berhasil diubah!") }; setSuccess("Password berhasil diubah!") }
            else { _advancedSettingsState.update { it.copy(isSaving = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _advancedSettingsState.update { it.copy(isSaving = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updatePreferences(darkMode: Boolean, notifEnabled: Boolean) = viewModelScope.launch {
        try {
            val res = api.updatePreferences(mapOf("darkMode" to darkMode, "notifPref" to notifEnabled))
            if (res.success) { _advancedSettingsState.update { it.copy(darkMode = darkMode, notifEnabled = notifEnabled) }; setSuccess("Preferensi berhasil disimpan!") }
            else setError(res.message ?: "Gagal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
}
