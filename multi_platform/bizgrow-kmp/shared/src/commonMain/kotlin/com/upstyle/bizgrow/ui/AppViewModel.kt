package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*
import io.github.aakira.napier.Napier
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import com.upstyle.bizgrow.socket.SocketManager
import com.upstyle.bizgrow.socket.RealtimeEvent

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

    // ─── Navigation ───────────────────────────────────────────────────────────
    private val _screen = MutableStateFlow<Screen>(Screen.Login)
    val screen: StateFlow<Screen> = _screen.asStateFlow()

    private val _screenStack = MutableStateFlow<List<Screen>>(listOf(Screen.Login))

    fun navigate(s: Screen) {
        _screenStack.value = _screenStack.value + s
        _screen.value = s
    }

    fun navigateBack() {
        val stack = _screenStack.value
        if (stack.size > 1) {
            val newStack = stack.dropLast(1)
            _screenStack.value = newStack
            _screen.value = newStack.last()
        }
    }

    fun navigateToRoot(s: Screen) {
        _screenStack.value = listOf(s)
        _screen.value = s
    }

    // ─── Global UI State ──────────────────────────────────────────────────────
    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private fun setLoading(v: Boolean) { _uiState.update { it.copy(isLoading = v, error = null) } }
    private fun setError(msg: String) { _uiState.update { it.copy(isLoading = false, error = msg) } }
    private fun setSuccess(msg: String) { _uiState.update { it.copy(isLoading = false, successMessage = msg, error = null) } }
    fun clearMessages() { _uiState.update { it.copy(error = null, successMessage = null) } }

    // ─── Auth ─────────────────────────────────────────────────────────────────
    private val _isLoggedIn = MutableStateFlow(session.isLoggedIn())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    val currentUser: UserInfo? get() = if (session.isLoggedIn()) UserInfo(session.getUserId(), session.getUsername(), session.getEmail(), session.getRole()) else null

    fun login(email: String, password: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.login(LoginRequest(email.trim(), password))
            if (res.success && res.data != null) {
                session.saveSession(res.data.token, res.data.user.role, res.data.user.email, res.data.user.username, res.data.user.id)
                _isLoggedIn.value = true
                setupSocket()
                loadUnits()
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
        try {
            val res = api.getBusinessUnits()
            if (res.success) _units.value = res.data
        } catch (e: Exception) {
            Napier.e("loadUnits error", e)
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
        try {
            val res = api.getFinanceData(unitId, startDate, endDate)
            if (res.success) _financeData.value = res.data
        } catch (e: Exception) {
            Napier.e("loadDashboard error", e)
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
        try {
            val res = api.getProducts(unitId)
            if (res.success) _products.value = res.data
        } catch (e: Exception) {
            Napier.e("loadProducts error", e)
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

    // ─── POS ──────────────────────────────────────────────────────────────────
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()

    val cartTotal: StateFlow<Double> = _cart.map { it.entries.sumOf { e -> e.key.hargaJual * e.value } }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    val cartItemCount: StateFlow<Int> = _cart.map { it.values.sum() }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    private val _posData = MutableStateFlow<PosData?>(null)
    val posData: StateFlow<PosData?> = _posData.asStateFlow()

    private val _selectedCustomerId = MutableStateFlow<Int?>(null)
    val selectedCustomerId: StateFlow<Int?> = _selectedCustomerId.asStateFlow()

    private val _posDiskon = MutableStateFlow(0.0)
    val posDiskon: StateFlow<Double> = _posDiskon.asStateFlow()

    fun loadPosData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosData(unitId)
            if (res.success) _posData.value = res.data
        } catch (e: Exception) {
            Napier.e("loadPosData error", e)
        }
    }

    fun addToCart(product: Product, qty: Int = 1) {
        val current = _cart.value.toMutableMap()
        current[product] = (current[product] ?: 0) + qty
        _cart.value = current
    }

    fun removeFromCart(product: Product) {
        val current = _cart.value.toMutableMap()
        val cur = current[product] ?: 0
        if (cur <= 1) current.remove(product) else current[product] = cur - 1
        _cart.value = current
    }

    fun clearCart() {
        _cart.value = emptyMap()
        _selectedCustomerId.value = null
        _posDiskon.value = 0.0
    }

    fun setCustomer(customerId: Int?) { _selectedCustomerId.value = customerId }
    fun setDiskon(diskon: Double) { _posDiskon.value = diskon }

    fun checkout(paymentMethod: String, onSuccess: ((Boolean) -> Unit)? = null, onSuccessUnit: () -> Unit = {}) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        val cartItems = _cart.value
        if (cartItems.isEmpty()) { setError("Keranjang kosong"); return@launch }

        val subtotal = cartItems.entries.sumOf { e -> e.key.hargaJual * e.value }
        val diskon = _posDiskon.value
        val total = subtotal - diskon
        val items = cartItems.entries.map { (p, qty) ->
            PosOrderItem(productId = p.id, productName = p.nama, qty = qty, price = p.hargaJual)
        }

        try {
            val req = CheckoutRequest(order = CheckoutBody(
                orderNumber = "ORD-${currentTimeMillis()}",
                unitId = unitId,
                customerId = _selectedCustomerId.value,
                subtotal = subtotal,
                diskon = diskon,
                total = total,
                paymentMethod = paymentMethod,
                items = items
            ))
            val res = api.checkout(req)
            if (res.success) {
                clearCart()
                loadProducts()
                loadDashboard()
                setSuccess("Transaksi berhasil! Total: Rp ${"%,.0f".format(total)}")
                onSuccess?.invoke(true)
                onSuccessUnit()
            } else {
                setError(res.message ?: "Checkout gagal")
                onSuccess?.invoke(false)
            }
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }

    // ─── HR ───────────────────────────────────────────────────────────────────
    private val _hrData = MutableStateFlow<HrData?>(null)
    val hrData: StateFlow<HrData?> = _hrData.asStateFlow()

    fun loadHrData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getHrData(unitId)
            if (res.success) _hrData.value = res.data
        } catch (e: Exception) {
            Napier.e("loadHrData error", e)
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
        try {
            val dealsRes = api.getCrmDeals(unitId)
            if (dealsRes.success) _crmDeals.value = dealsRes.data
            val contactsRes = api.getCrmContacts(unitId)
            if (contactsRes.success) _crmContacts.value = contactsRes.data
        } catch (e: Exception) { Napier.e("loadCrmData error", e) }
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
        try {
            val res = api.getScmData(unitId)
            if (res.success) _scmData.value = res.data
        } catch (e: Exception) { Napier.e("loadScmData error", e) }
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
        try {
            val res = api.getReceivables(unitId)
            if (res.success) _receivables.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadReceivables error", e) }
    }

    fun loadPayables() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPayables(unitId)
            if (res.success) _payables.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPayables error", e) }
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

    // ─── Ecommerce Orders ─────────────────────────────────────────────────────
    private val _orders = MutableStateFlow<List<EcommerceOrder>>(emptyList())
    val orders: StateFlow<List<EcommerceOrder>> = _orders.asStateFlow()

    private val _selectedOrder = MutableStateFlow<EcommerceOrder?>(null)
    val selectedOrder: StateFlow<EcommerceOrder?> = _selectedOrder.asStateFlow()

    fun loadOrders() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getOrders(unitId)
            if (res.success) _orders.value = res.data
        } catch (e: Exception) { Napier.e("loadOrders error", e) }
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
        try {
            val res = api.getTickets(unitId)
            if (res.success) _tickets.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTickets error", e) }
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

    // ─── POS Shift ────────────────────────────────────────────────────────────
    private val _posShifts = MutableStateFlow<List<PosShift>>(emptyList())
    val posShifts: StateFlow<List<PosShift>> = _posShifts.asStateFlow()

    private val _activeShift = MutableStateFlow<PosShift?>(null)
    val activeShift: StateFlow<PosShift?> = _activeShift.asStateFlow()

    fun loadPosShifts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosShifts(unitId)
            if (res.success) {
                _posShifts.value = res.data ?: emptyList()
                _activeShift.value = res.data?.firstOrNull { it.status == "OPEN" }
            }
        } catch (e: Exception) { Napier.e("loadPosShifts error", e) }
    }

    fun openShift(modalAwal: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.openShift(OpenShiftRequest(unitId = unitId, modalAwal = modalAwal))
            if (res.success) { loadPosShifts(); setSuccess("Shift berhasil dibuka!") }
            else setError(res.message ?: "Gagal buka shift")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun closeShift(shiftId: Int, kasAkhirAktual: Double, catatan: String = "") = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.closeShift(CloseShiftRequest(shiftId = shiftId, kasAkhirAktual = kasAkhirAktual, catatan = catatan, unitId = unitId))
            if (res.success) { loadPosShifts(); _activeShift.value = null; setSuccess("Shift berhasil ditutup!") }
            else setError(res.message ?: "Gagal tutup shift")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── POS Return ───────────────────────────────────────────────────────────
    private val _posReturns = MutableStateFlow<List<PosReturn>>(emptyList())
    val posReturns: StateFlow<List<PosReturn>> = _posReturns.asStateFlow()

    fun loadPosReturns() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosReturns(unitId)
            if (res.success) _posReturns.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosReturns error", e) }
    }

    fun createReturn(orderId: String, items: List<ReturnItem>, reason: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createReturn(CreateReturnRequest(orderId = orderId, items = items, reason = reason, unitId = unitId))
            if (res.success) { loadPosReturns(); loadPosData(); setSuccess("Retur berhasil diproses!") }
            else setError(res.message ?: "Gagal proses retur")
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

    fun addProduct(nama: String, hargaBeli: Double, hargaJual: Double, stok: Int, callback: (Boolean) -> Unit) = viewModelScope.launch {
        setLoading(true)
        try {
            val req = com.upstyle.bizgrow.data.Product(id = 0, name = nama, costPrice = hargaBeli, sellingPrice = hargaJual, stock = stok, sku = "", barcode = null, image = null, categoryId = null, unitId = _activeUnitId.value)
            val res = api.createProduct(req)
            if (res.success) {
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
}
