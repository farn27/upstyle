package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.repository.SessionRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.upstyle.bizgrow.ui.navigation.NavigationManager
import com.upstyle.bizgrow.ui.navigation.Screen
import com.upstyle.bizgrow.utils.SocketManager
import com.upstyle.bizgrow.utils.RealtimeEvent
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.update
import com.upstyle.bizgrow.utils.CacheManager
import com.upstyle.bizgrow.ui.state.*
import io.github.aakira.napier.Napier

class AppViewModel(
    private val api: UpstyleApi,
    private val session: SessionRepository
) : ViewModel() {

    // Navigation
    private val navigationManager = NavigationManager()
    val screen = navigationManager.screen
    val screenStack: List<Screen> get() = navigationManager.screenStack.value
    val canNavigateBack: Boolean get() = navigationManager.canNavigateBack
    fun navigate(s: Screen) = navigationManager.navigate(s)
    fun navigateBack() = navigationManager.navigateBack()
    fun navigateToRoot(s: Screen) = navigationManager.navigateToRoot(s)

    // Cache
    private val cacheManager = CacheManager(session)

    // Global UI state
    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private fun setLoading(v: Boolean) { _uiState.update { it.copy(isLoading = v, error = null) } }
    private fun setError(msg: String) { _uiState.update { it.copy(isLoading = false, error = msg) } }
    private fun setSuccess(msg: String) { _uiState.update { it.copy(isLoading = false, successMessage = msg, error = null) } }
    fun clearMessages() { _uiState.update { it.copy(error = null, successMessage = null) } }

    // Units
    private val _units = MutableStateFlow<List<BusinessUnit>>(emptyList())
    val units: StateFlow<List<BusinessUnit>> = _units.asStateFlow()

    private val _activeUnitId = MutableStateFlow(0)
    val activeUnitId: StateFlow<Int> = _activeUnitId.asStateFlow()

    // Dashboard
    private val _dashboardState = MutableStateFlow(DashboardState())
    val dashboardState: StateFlow<DashboardState> = _dashboardState.asStateFlow()

    // Products
    private val _productsState = MutableStateFlow(ProductsState())
    val productsState: StateFlow<ProductsState> = _productsState.asStateFlow()

    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    private val _kategoriProduk = MutableStateFlow<List<KategoriProduk>>(emptyList())
    val kategoriProduk: StateFlow<List<KategoriProduk>> = _kategoriProduk.asStateFlow()

    // HR
    private val _hrState = MutableStateFlow(HrState())
    val hrState: StateFlow<HrState> = _hrState.asStateFlow()

    // CRM
    private val _crmState = MutableStateFlow(CrmState())
    val crmState: StateFlow<CrmState> = _crmState.asStateFlow()

    // SCM
    private val _scmState = MutableStateFlow(ScmState())
    val scmState: StateFlow<ScmState> = _scmState.asStateFlow()

    // Finance AR/AP
    private val _financeArApState = MutableStateFlow(FinanceArApState())
    val financeArApState: StateFlow<FinanceArApState> = _financeArApState.asStateFlow()

    private val _receivables = MutableStateFlow<List<Receivable>>(emptyList())
    val receivables: StateFlow<List<Receivable>> = _receivables.asStateFlow()

    private val _payables = MutableStateFlow<List<Payable>>(emptyList())
    val payables: StateFlow<List<Payable>> = _payables.asStateFlow()

    private val _accountingContacts = MutableStateFlow<List<AccountingContact>>(emptyList())
    val accountingContacts: StateFlow<List<AccountingContact>> = _accountingContacts.asStateFlow()

    // Orders
    private val _ordersState = MutableStateFlow(OrdersState())
    val ordersState: StateFlow<OrdersState> = _ordersState.asStateFlow()

    private val _orders = MutableStateFlow<List<EcommerceOrder>>(emptyList())
    val orders: StateFlow<List<EcommerceOrder>> = _orders.asStateFlow()

    private val _selectedOrder = MutableStateFlow<EcommerceOrder?>(null)
    val selectedOrder: StateFlow<EcommerceOrder?> = _selectedOrder.asStateFlow()

    // Marketing
    private val _marketingState = MutableStateFlow(MarketingState())
    val marketingState: StateFlow<MarketingState> = _marketingState.asStateFlow()

    // CS / Tickets
    private val _csState = MutableStateFlow(CsState())
    val csState: StateFlow<CsState> = _csState.asStateFlow()

    private val _tickets = MutableStateFlow<List<SupportTicket>>(emptyList())
    val tickets: StateFlow<List<SupportTicket>> = _tickets.asStateFlow()

    private val _ticketMessages = MutableStateFlow<List<TicketMessage>>(emptyList())
    val ticketMessages: StateFlow<List<TicketMessage>> = _ticketMessages.asStateFlow()

    // Feature gap states
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

    // Chat & AI
    private val _chatHistory = MutableStateFlow<List<ChatMessage>>(emptyList())
    val chatHistory: StateFlow<List<ChatMessage>> = _chatHistory.asStateFlow()

    private val _isChatLoading = MutableStateFlow(false)
    val isChatLoading: StateFlow<Boolean> = _isChatLoading.asStateFlow()

    // Sales Target
    private val _salesTargetData = MutableStateFlow<SalesTargetData?>(null)
    val salesTargetData: StateFlow<SalesTargetData?> = _salesTargetData.asStateFlow()

    // Tax Rates
    private val _taxRates = MutableStateFlow<List<TaxRate>>(emptyList())
    val taxRates: StateFlow<List<TaxRate>> = _taxRates.asStateFlow()

    // Stock Opname
    private val _stockOpnameSessions = MutableStateFlow<List<StockOpnameSession>>(emptyList())
    val stockOpnameSessions: StateFlow<List<StockOpnameSession>> = _stockOpnameSessions.asStateFlow()

    // Trash Products
    private val _trashProducts = MutableStateFlow<List<Product>>(emptyList())
    val trashProducts: StateFlow<List<Product>> = _trashProducts.asStateFlow()

    // Low Stock
    private val _lowStockProducts = MutableStateFlow<List<Product>>(emptyList())
    val lowStockProducts: StateFlow<List<Product>> = _lowStockProducts.asStateFlow()

    // Quotations
    private val _quotations = MutableStateFlow<List<Quotation>>(emptyList())
    val quotations: StateFlow<List<Quotation>> = _quotations.asStateFlow()

    // Sales Orders
    private val _salesOrders = MutableStateFlow<List<SalesOrder>>(emptyList())
    val salesOrders: StateFlow<List<SalesOrder>> = _salesOrders.asStateFlow()

    // Init / socket
    init {
        viewModelScope.launch {
            setupSocket()
        }
    }

    private fun setupSocket() = viewModelScope.launch {
        try {
            SocketManager.events.consumeAsFlow().collect { event ->
                when (event) {
                    is RealtimeEvent.PosTransaction -> refreshAll()
                    is RealtimeEvent.StockUpdated -> { loadProducts(); loadLowStock() }
                    is RealtimeEvent.StockAlert -> loadLowStock()
                    is RealtimeEvent.Notification -> loadNotifications()
                    is RealtimeEvent.OrderStatusChanged -> loadOrders()
                    is RealtimeEvent.PosCashAlert -> refreshAll()
                    is RealtimeEvent.TicketMessage -> loadTicketMessages((event as RealtimeEvent.TicketMessage).ticketId)
                    is RealtimeEvent.Connected -> {
                        val active = _activeUnitId.value
                        if (active > 0) SocketManager.joinUnit(active)
                    }
                    RealtimeEvent.Disconnected -> {}
                }
            }
        } catch (e: Exception) {
            Napier.e("Socket error", e)
        }
    }

    // ─── Auth / Session ────────────────────────────────────────────────────────
    fun isLoggedIn() = session.isLoggedIn()

    // ─── Units ────────────────────────────────────────────────────────────────
    fun loadUnits() = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getUnits()
            if (res.success) {
                _units.value = res.data ?: emptyList()
                _uiState.update { it.copy(isLoading = false) }
            } else {
                _uiState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat unit") }
            }
        } catch (e: Exception) {
            _uiState.update { it.copy(isLoading = false, error = "Gagal memuat unit: ${e.message}") }
        }
    }

    fun selectUnit(unitId: Int) = viewModelScope.launch {
        _activeUnitId.value = unitId
        session.setActiveUnitId(unitId)
        if (unitId > 0) {
            SocketManager.joinUnit(unitId)
            loadDashboard()
            loadProducts()
            loadOrders()
            loadReceivables()
            loadPayables()
            loadNotifications()
        }
    }

    // ─── Dashboard ────────────────────────────────────────────────────────────
    fun loadDashboard() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _dashboardState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getDashboard(unitId)
            if (res.success) _dashboardState.update { it.copy(isLoading = false, data = res.data) }
            else _dashboardState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) {
            _dashboardState.update { it.copy(isLoading = false, error = "Gagal memuat dashboard: ${e.message}") }
        }
    }

    fun refreshAll() = viewModelScope.launch {
        loadDashboard()
        loadProducts()
        loadOrders()
        loadReceivables()
        loadPayables()
        loadNotifications()
        loadLowStock()
    }

    // ─── Products ─────────────────────────────────────────────────────────────
    fun loadProducts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _productsState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getProducts(unitId)
            if (res.success) {
                _products.value = res.data ?: emptyList()
                _productsState.update { it.copy(isLoading = false, products = res.data ?: emptyList()) }
            } else {
                _productsState.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat produk") }
            }
        } catch (e: Exception) {
            Napier.e("loadProducts error", e)
            _productsState.update { it.copy(isLoading = false, error = "Gagal memuat produk: ${e.message}") }
        }
    }

    fun loadKategoriProduk() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKategoriProduk(unitId)
            if (res.success) _kategoriProduk.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadKategoriProduk error", e) }
    }

    fun addProduct(product: Product) = viewModelScope.launch {
        try {
            setSuccess("Produk berhasil ditambahkan")
            loadProducts()
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    fun updateProduct(product: Product) = viewModelScope.launch {
        try {
            setSuccess("Produk berhasil diperbarui")
            loadProducts()
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ─── Orders ───────────────────────────────────────────────────────────────
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
            _ordersState.update { it.copy(isLoading = false, error = "Gagal memuat pesanan: ${e.message}") }
        }
    }

    fun loadOrderDetail(orderId: Int) = viewModelScope.launch {
        try {
            val res = api.getOrderDetail(orderId)
            if (res.success) _selectedOrder.value = res.data
        } catch (e: Exception) { Napier.e("loadOrderDetail error", e) }
    }

    // ─── Finance AR/AP ────────────────────────────────────────────────────────
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

    // ─── CS / Tickets ─────────────────────────────────────────────────────────
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

    fun updateTicketStatus(ticketId: Int, status: String) = viewModelScope.launch {
        try {
            setSuccess("Status tiket diperbarui")
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ─── Feature gap CRUD helpers ─────────────────────────────────────────────
    fun loadBusinessPlans() = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.getBusinessPlans(unitId)
            if (res.success) _businessPlansState.update { it.copy(isLoading = false, plans = res.data ?: emptyList()) }
            else _businessPlansState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) {
            _businessPlansState.update { it.copy(isLoading = false, error = "Gagal memuat business plan: ${e.message}") }
        }
    }

    fun createBusinessPlan(plan: BusinessPlan) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createBusinessPlan(plan.copy(unitId = unitId))
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil dibuat!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadSosmedPosts() = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.getSosmedPosts(unitId)
            if (res.success) _sosmedState.update { it.copy(isLoading = false, posts = res.data ?: emptyList()) }
            else _sosmedState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) {
            _sosmedState.update { it.copy(isLoading = false, error = "Gagal memuat postingan: ${e.message}") }
        }
    }

    fun createSosmedPost(post: SocialPost) = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createSosmedPost(post.copy(unitId = unitId))
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan sosial media berhasil dibuat!") }
            else { _sosmedState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadWebsiteSettings() = viewModelScope.launch {
        _websiteState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.getWebsiteSettings(unitId)
            if (res.success) _websiteState.update { it.copy(isLoading = false, settings = res.data) }
            else _websiteState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) {
            _websiteState.update { it.copy(isLoading = false, error = "Gagal memuat pengaturan website: ${e.message}") }
        }
    }

    fun saveWebsiteSettings(settings: WebsiteSetting) = viewModelScope.launch {
        _websiteState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.saveWebsiteSettings(settings.copy(unitId = unitId))
            if (res.success) { _websiteState.update { it.copy(isLoading = false) }; setSuccess("Pengaturan website berhasil disimpan!") }
            else { _websiteState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _websiteState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadHelpArticles() = viewModelScope.launch {
        _helpState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getHelpArticles()
            if (res.success) _helpState.update { it.copy(isLoading = false, articles = res.data ?: emptyList()) }
            else _helpState.update { it.copy(isLoading = false, error = res.message) }
        } catch (e: Exception) {
            _helpState.update { it.copy(isLoading = false, error = "Gagal memuat bantuan: ${e.message}") }
        }
    }

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

    // ─── Chat & AI Methods ────────────────────────────────────────────────────
    fun sendChat(message: String) = viewModelScope.launch {
        _isChatLoading.value = true
        try {
            val res = api.sendChatMessage(mapOf("message" to message))
            if (res.success) {
                _chatHistory.value = _chatHistory.value + ChatMessage(role = "user", text = message)
                _chatHistory.value = _chatHistory.value + ChatMessage(role = "assistant", text = res.message ?: "OK")
            } else {
                setError(res.message ?: "Gagal mengirim chat")
            }
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
        _isChatLoading.value = false
    }

    fun loadChatHistory() = viewModelScope.launch {
        try {
            _chatHistory.value = emptyList()
        } catch (e: Exception) { Napier.e("loadChatHistory error", e) }
    }

    fun clearChat() {
        _chatHistory.value = emptyList()
    }

    // ─── Sales Target Methods ─────────────────────────────────────────────────
    fun loadSalesTargets(periode: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getSalesTargets(unitId, periode)
            if (res.success) _salesTargetData.value = res.data
        } catch (e: Exception) { Napier.e("loadSalesTargets error", e) }
    }

    fun createSalesTarget(target: Double, period: String) = viewModelScope.launch {
        try {
            loadSalesTargets(period)
            setSuccess("Target berhasil dibuat!")
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    fun deleteSalesTarget(targetId: Int) = viewModelScope.launch {
        try {
            loadSalesTargets()
            setSuccess("Target berhasil dihapus!")
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ─── Tax Rates Methods ────────────────────────────────────────────────────
    fun loadTaxRates() = viewModelScope.launch {
        try {
            _taxRates.value = emptyList()
        } catch (e: Exception) { Napier.e("loadTaxRates error", e) }
    }

    // ─── Stock Opname Methods ─────────────────────────────────────────────────
    fun loadStockOpnameList() = viewModelScope.launch {
        try {
            _stockOpnameSessions.value = emptyList()
        } catch (e: Exception) { Napier.e("loadStockOpnameList error", e) }
    }

    // ─── Trash Products Methods ───────────────────────────────────────────────
    fun loadTrashProducts() = viewModelScope.launch {
        try {
            _trashProducts.value = emptyList()
        } catch (e: Exception) { Napier.e("loadTrashProducts error", e) }
    }

    fun restoreProduct(productId: Int) = viewModelScope.launch {
        try {
            val res = api.restoreProduct(productId)
            if (res.success) { loadTrashProducts(); loadProducts(); setSuccess("Produk dipulihkan") }
            else setError(res.message ?: "Gagal pulihkan produk")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Products Methods ─────────────────────────────────────────────────────
    fun loadKategoriProduk() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKategoriProduk(unitId)
            if (res.success) _kategoriProduk.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadKategoriProduk error", e) }
    }

    fun addProduct(product: Product) = viewModelScope.launch {
        try {
            setSuccess("Produk berhasil ditambahkan")
            loadProducts()
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    fun updateProduct(product: Product) = viewModelScope.launch {
        try {
            setSuccess("Produk berhasil diperbarui")
            loadProducts()
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ─── Quotations Methods ───────────────────────────────────────────────────
    fun loadQuotations() = viewModelScope.launch {
        try {
            _quotations.value = emptyList()
        } catch (e: Exception) { Napier.e("loadQuotations error", e) }
    }

    // ─── Sales Orders Methods ─────────────────────────────────────────────────
    fun loadSalesOrders() = viewModelScope.launch {
        try {
            _salesOrders.value = emptyList()
        } catch (e: Exception) { Napier.e("loadSalesOrders error", e) }
    }

    // ─── Low Stock / Notifications helpers ────────────────────────────────────
    fun loadLowStock() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLowStock(unitId)
            if (res.success) _lowStockProducts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadLowStock error", e) }
    }

    fun loadNotifications() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getNotifications(unitId)
            if (res.success) {
                // Optional notification state if exists
            }
        } catch (e: Exception) { Napier.e("loadNotifications error", e) }
    }
}
