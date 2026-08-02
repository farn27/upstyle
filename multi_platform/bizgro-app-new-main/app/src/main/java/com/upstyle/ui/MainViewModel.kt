package com.upstyle.ui

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.api.ApiClient
import com.upstyle.data.*
import com.upstyle.socket.SocketManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

sealed class Screen {
    object Login : Screen()
    object Units : Screen()
    object Dashboard : Screen()
    object Finance : Screen()
    object Products : Screen()
    object Pos : Screen()
    object Hr : Screen()
    object Crm : Screen()
    object Scm : Screen()
    object AiChat : Screen()
    object Notifications : Screen()
    object Settings : Screen()
    object LaporanWa : Screen()
}

data class UiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
)

class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val api get() = ApiClient.api
    private val TAG = "MainViewModel"

    // ─── Navigation ───────────────────────────────────────────────────────────
    private val _screen = MutableStateFlow<Screen>(Screen.Login)
    val screen: StateFlow<Screen> = _screen.asStateFlow()

    fun navigate(screen: Screen) { _screen.value = screen }

    // ─── Auth ─────────────────────────────────────────────────────────────────
    private val _isLoggedIn = MutableStateFlow(SessionManager.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    // ─── Units ────────────────────────────────────────────────────────────────
    private val _units = MutableStateFlow<List<BusinessUnit>>(emptyList())
    val units: StateFlow<List<BusinessUnit>> = _units.asStateFlow()

    private val _activeUnitId = MutableStateFlow(SessionManager.getActiveUnitId())
    val activeUnitId: StateFlow<Int> = _activeUnitId.asStateFlow()

    val activeUnit: StateFlow<BusinessUnit?> = combine(_units, _activeUnitId) { units, id ->
        units.find { it.id == id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    // ─── Finance ──────────────────────────────────────────────────────────────
    private val _financeData = MutableStateFlow<FinanceData?>(null)
    val financeData: StateFlow<FinanceData?> = _financeData.asStateFlow()

    // ─── Products ─────────────────────────────────────────────────────────────
    private val _products = MutableStateFlow<List<Product>>(emptyList())
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    // ─── POS Cart ─────────────────────────────────────────────────────────────
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()

    private val _posData = MutableStateFlow<PosData?>(null)
    val posData: StateFlow<PosData?> = _posData.asStateFlow()

    // ─── HR ───────────────────────────────────────────────────────────────────
    private val _hrData = MutableStateFlow<HrData?>(null)
    val hrData: StateFlow<HrData?> = _hrData.asStateFlow()

    // ─── CRM ──────────────────────────────────────────────────────────────────
    private val _crmDeals = MutableStateFlow<List<CrmDeal>>(emptyList())
    val crmDeals: StateFlow<List<CrmDeal>> = _crmDeals.asStateFlow()

    // ─── SCM ──────────────────────────────────────────────────────────────────
    private val _scmData = MutableStateFlow<ScmData?>(null)
    val scmData: StateFlow<ScmData?> = _scmData.asStateFlow()

    // ─── AI Chat ──────────────────────────────────────────────────────────────
    private val _chatMessages = MutableStateFlow<List<ChatMessage>>(
        listOf(ChatMessage("assistant", "Halo! Saya Bizgrow AI. Ada yang bisa saya bantu?"))
    )
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages.asStateFlow()

    private val _isAiLoading = MutableStateFlow(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading.asStateFlow()

    // ─── Notifications ────────────────────────────────────────────────────────
    private val _notifications = MutableStateFlow<List<NotifItem>>(emptyList())
    val notifications: StateFlow<List<NotifItem>> = _notifications.asStateFlow()

    // ─── Laporan WA ───────────────────────────────────────────────────────────
    private val _laporanWa = MutableStateFlow<LaporanWaData?>(null)
    val laporanWa: StateFlow<LaporanWaData?> = _laporanWa.asStateFlow()

    // ─── Polling Job ──────────────────────────────────────────────────────────
    private var pollingJob: Job? = null
    private var lastUpdate = System.currentTimeMillis()

    init {
        if (SessionManager.isLoggedIn()) {
            _screen.value = if (SessionManager.getActiveUnitId() > 0) Screen.Dashboard else Screen.Units
            loadUnits()
            startSocketAndPolling()
        }
    }

    // ─── Auth Methods ─────────────────────────────────────────────────────────

    fun login(email: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _uiState.value = UiState(isLoading = true)
            try {
                val response = api.login(LoginRequest(email, password))
                val body = response.body()
                if (response.isSuccessful && body?.success == true && body.data != null) {
                    val data = body.data
                    SessionManager.saveSession(data.token, data.user.role, data.user.email, data.user.username, data.user.id)
                    _isLoggedIn.value = true
                    _uiState.value = UiState()
                    loadUnits()
                    startSocketAndPolling()
                    _screen.value = Screen.Units
                    onResult(true, null)
                } else {
                    val msg = body?.message ?: "Login gagal"
                    _uiState.value = UiState(error = msg)
                    onResult(false, msg)
                }
            } catch (e: Exception) {
                val msg = "Tidak dapat terhubung ke server: ${e.localizedMessage}"
                _uiState.value = UiState(error = msg)
                onResult(false, msg)
            }
        }
    }

    fun register(username: String, email: String, password: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            _uiState.value = UiState(isLoading = true)
            try {
                val response = api.register(RegisterRequest(username, email, password))
                val body = response.body()
                _uiState.value = UiState()
                onResult(response.isSuccessful && body?.success == true, body?.message)
            } catch (e: Exception) {
                _uiState.value = UiState(error = e.localizedMessage)
                onResult(false, e.localizedMessage)
            }
        }
    }

    fun logout() {
        SocketManager.disconnect()
        pollingJob?.cancel()
        SessionManager.clearSession()
        _isLoggedIn.value = false
        _units.value = emptyList()
        _financeData.value = null
        _products.value = emptyList()
        _cart.value = emptyMap()
        _hrData.value = null
        _crmDeals.value = emptyList()
        _scmData.value = null
        _screen.value = Screen.Login
    }

    // ─── Units ────────────────────────────────────────────────────────────────

    fun loadUnits() {
        viewModelScope.launch {
            try {
                val response = api.getBusinessUnits()
                if (response.isSuccessful) {
                    _units.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadUnits error: ${e.message}")
            }
        }
    }

    fun selectUnit(unit: BusinessUnit) {
        SessionManager.setActiveUnit(unit.id, unit.name, unit.uid)
        _activeUnitId.value = unit.id
        refreshAllData()
        connectSocket()
        _screen.value = Screen.Dashboard
    }

    fun createUnit(name: String, type: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.createBusinessUnit(CreateBusinessRequest(name, type))
                if (response.isSuccessful && response.body()?.success == true) {
                    loadUnits()
                    onResult(true)
                } else {
                    onResult(false)
                }
            } catch (e: Exception) {
                onResult(false)
            }
        }
    }

    // ─── Finance ──────────────────────────────────────────────────────────────

    fun loadFinanceData() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getFinanceData(unitId)
                if (response.isSuccessful) {
                    _financeData.value = response.body()?.data
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadFinanceData error: ${e.message}")
            }
        }
    }

    fun addTransaction(kategori: String, nominal: Double, keterangan: String, onResult: (Boolean) -> Unit = {}) {
        val unitId = SessionManager.getActiveUnitId()
        viewModelScope.launch {
            try {
                val response = api.createTransaction(
                    CreateTransactionRequest(TransactionBody(unitId, kategori, nominal, keterangan))
                )
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadFinanceData()
                onResult(ok)
            } catch (e: Exception) {
                onResult(false)
            }
        }
    }

    fun deleteTransaction(transactionId: Int, onResult: (Boolean) -> Unit = {}) {
        val unitId = SessionManager.getActiveUnitId()
        viewModelScope.launch {
            try {
                val response = api.deleteTransaction(transactionId, unitId)
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadFinanceData()
                onResult(ok)
            } catch (e: Exception) {
                onResult(false)
            }
        }
    }

    // ─── Products ─────────────────────────────────────────────────────────────

    fun loadProducts() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getProducts(unitId)
                if (response.isSuccessful) {
                    _products.value = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "loadProducts error: ${e.message}")
            }
        }
    }

    fun createProduct(product: Product, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.createProduct(product)
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadProducts()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun updateProduct(product: Product, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.updateProduct(product)
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadProducts()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun deleteProduct(productId: String, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.deleteProduct(productId)
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadProducts()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    // ─── POS Cart ─────────────────────────────────────────────────────────────

    fun addToCart(product: Product) {
        val current = _cart.value.toMutableMap()
        val qty = current[product] ?: 0
        if (qty < product.stok) current[product] = qty + 1
        _cart.value = current
    }

    fun removeFromCart(product: Product) {
        val current = _cart.value.toMutableMap()
        val qty = current[product] ?: 0
        if (qty <= 1) current.remove(product) else current[product] = qty - 1
        _cart.value = current
    }

    fun clearCart() { _cart.value = emptyMap() }

    fun checkout(paymentMethod: String, customerId: Int? = null, onResult: (Boolean) -> Unit = {}) {
        val unitId = SessionManager.getActiveUnitId()
        val items = _cart.value
        if (items.isEmpty()) { onResult(false); return }
        val subtotal = items.entries.sumOf { it.key.hargaJual * it.value }
        val orderNum = "POS-${System.currentTimeMillis().toString().takeLast(6)}"
        viewModelScope.launch {
            try {
                val response = api.checkout(CheckoutRequest(
                    order = CheckoutBody(
                        orderNumber = orderNum,
                        unitId = unitId,
                        customerId = customerId,
                        subtotal = subtotal,
                        total = subtotal,
                        paymentMethod = paymentMethod,
                        items = items.map { (prod, qty) ->
                            PosOrderItem(productId = prod.id, productName = prod.nama, qty = qty, price = prod.hargaJual)
                        }
                    )
                ))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) {
                    clearCart()
                    loadProducts()
                    loadFinanceData()
                }
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun loadPosData() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getPosData(unitId)
                if (response.isSuccessful) _posData.value = response.body()?.data
            } catch (e: Exception) { Log.e(TAG, "loadPosData: ${e.message}") }
        }
    }

    // ─── HR ───────────────────────────────────────────────────────────────────

    fun loadHrData() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getHrData(unitId)
                if (response.isSuccessful) _hrData.value = response.body()?.data
            } catch (e: Exception) { Log.e(TAG, "loadHrData: ${e.message}") }
        }
    }

    fun createEmployee(body: CreateEmployeeBody, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.createEmployee(CreateEmployeeRequest(employee = body))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadHrData()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun checkIn(employeeId: Int, date: String, time: String) {
        viewModelScope.launch {
            try {
                api.checkIn(CheckInRequest(employeeId = employeeId, unitId = SessionManager.getActiveUnitId(), date = date, time = time))
                loadHrData()
            } catch (e: Exception) { Log.e(TAG, "checkIn: ${e.message}") }
        }
    }

    fun checkOut(employeeId: Int, date: String, time: String) {
        viewModelScope.launch {
            try {
                api.checkOut(CheckOutRequest(employeeId = employeeId, date = date, time = time))
                loadHrData()
            } catch (e: Exception) { Log.e(TAG, "checkOut: ${e.message}") }
        }
    }

    fun processPayroll(body: ProcessPayrollBody, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.processPayroll(ProcessPayrollRequest(payroll = body))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadHrData()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    // ─── CRM ──────────────────────────────────────────────────────────────────

    fun loadCrmDeals() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getCrmDeals(unitId)
                if (response.isSuccessful) _crmDeals.value = response.body()?.data ?: emptyList()
            } catch (e: Exception) { Log.e(TAG, "loadCrmDeals: ${e.message}") }
        }
    }

    fun createDeal(body: CreateDealBody, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.createDeal(CreateDealRequest(deal = body))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadCrmDeals()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun updateDealStage(dealId: Int, stage: String, onResult: (Boolean) -> Unit = {}) {
        val unitId = SessionManager.getActiveUnitId()
        viewModelScope.launch {
            try {
                val response = api.updateDealStage(UpdateDealStageRequest(dealId, stage, unitId))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadCrmDeals()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    // ─── SCM ──────────────────────────────────────────────────────────────────

    fun loadScmData() {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getScmData(unitId)
                if (response.isSuccessful) _scmData.value = response.body()?.data
            } catch (e: Exception) { Log.e(TAG, "loadScmData: ${e.message}") }
        }
    }

    fun createSupplier(body: CreateSupplierBody, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.createSupplier(CreateSupplierRequest(supplier = body))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadScmData()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun createPo(body: CreatePoBody, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.createPurchaseOrder(CreatePoRequest(po = body))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadScmData()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    fun updatePoStatus(poId: String, status: String, onResult: (Boolean) -> Unit = {}) {
        val unitId = SessionManager.getActiveUnitId()
        viewModelScope.launch {
            try {
                val response = api.updatePoStatus(UpdatePoStatusRequest(poId, status, unitId))
                val ok = response.isSuccessful && response.body()?.success == true
                if (ok) loadScmData()
                onResult(ok)
            } catch (e: Exception) { onResult(false) }
        }
    }

    // ─── AI Chat ──────────────────────────────────────────────────────────────

    fun sendChatMessage(message: String) {
        val unitSlug = SessionManager.getActiveUnitSlug().ifEmpty { null }
        val history = _chatMessages.value.takeLast(16)
        _chatMessages.value = _chatMessages.value + ChatMessage("user", message)
        viewModelScope.launch {
            _isAiLoading.value = true
            try {
                val response = api.chat(ChatRequest(message = message, activeUnitSlug = unitSlug, history = history))
                val reply = response.body()?.reply ?: "Maaf, AI tidak merespons."
                _chatMessages.value = _chatMessages.value + ChatMessage("assistant", reply)
            } catch (e: Exception) {
                _chatMessages.value = _chatMessages.value + ChatMessage("assistant", "Gagal terhubung ke AI: ${e.localizedMessage}")
            }
            _isAiLoading.value = false
        }
    }

    fun clearChat() {
        _chatMessages.value = listOf(ChatMessage("assistant", "Halo! Saya Bizgrow AI. Ada yang bisa saya bantu?"))
    }

    // ─── Laporan WA ───────────────────────────────────────────────────────────

    fun loadLaporanWa(periode: String = "hari_ini") {
        val unitId = SessionManager.getActiveUnitId()
        if (unitId <= 0) return
        viewModelScope.launch {
            try {
                val response = api.getLaporanWa(LaporanWaRequest(unitId, periode))
                if (response.isSuccessful) _laporanWa.value = response.body()?.data
            } catch (e: Exception) { Log.e(TAG, "laporanWa: ${e.message}") }
        }
    }

    // ─── Notifications ────────────────────────────────────────────────────────

    fun addNotification(pesan: String, tipe: String = "info") {
        _notifications.value = listOf(NotifItem(pesan = pesan, tipe = tipe)) + _notifications.value
    }

    fun clearNotifications() { _notifications.value = emptyList() }

    // ─── Realtime (Socket.io + Polling) ───────────────────────────────────────

    private fun startSocketAndPolling() {
        connectSocket()
        startPolling()
        observeSocketEvents()
    }

    private fun connectSocket() {
        val token = SessionManager.getToken() ?: return
        val unitId = SessionManager.getActiveUnitId()
        val userId = SessionManager.getUserId()
        if (unitId > 0 && userId > 0) {
            SocketManager.connect(unitId, userId, token)
        }
    }

    private fun observeSocketEvents() {
        viewModelScope.launch {
            SocketManager.events.collect { event ->
                when (event) {
                    is SocketManager.RealtimeEvent.PosTransaction -> {
                        val msg = event.data.optString("orderNumber", "")
                        addNotification("🛒 Transaksi POS baru #$msg", "success")
                        loadFinanceData()
                        loadPosData()
                    }
                    is SocketManager.RealtimeEvent.StockUpdated -> {
                        addNotification("📦 Stok diperbarui", "info")
                        loadProducts()
                    }
                    is SocketManager.RealtimeEvent.StockAlert -> {
                        val msg = event.data.optString("message", "Stok menipis")
                        addNotification("⚠️ $msg", "warning")
                    }
                    is SocketManager.RealtimeEvent.Notification -> {
                        val pesan = event.data.optString("pesan", event.data.optString("message", "Notifikasi baru"))
                        addNotification(pesan)
                    }
                    is SocketManager.RealtimeEvent.OrderStatusChanged -> {
                        val orderId = event.data.optString("orderId", "")
                        val status = event.data.optString("status", "")
                        addNotification("📋 Order #$orderId → $status", "info")
                    }
                    is SocketManager.RealtimeEvent.PosCashAlert -> {
                        addNotification("💰 Peringatan selisih kas POS", "warning")
                    }
                    else -> {}
                }
            }
        }
    }

    private fun startPolling() {
        pollingJob?.cancel()
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(30_000) // Poll every 30 seconds
                val slug = SessionManager.getActiveUnitSlug()
                if (slug.isNotEmpty() && !SocketManager.isConnected()) {
                    try {
                        api.getUpdates(slug, lastUpdate)
                        lastUpdate = System.currentTimeMillis()
                    } catch (e: Exception) {
                        // Silently fail polling
                    }
                }
            }
        }
    }

    fun refreshAllData() {
        loadFinanceData()
        loadProducts()
        loadPosData()
        loadHrData()
        loadCrmDeals()
        loadScmData()
    }

    override fun onCleared() {
        super.onCleared()
        SocketManager.disconnect()
        pollingJob?.cancel()
    }
}
