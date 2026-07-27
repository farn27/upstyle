package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.api.*
import com.example.data.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

sealed class Screen {
    object Dashboard : Screen()
    object Products : Screen()
    object POS : Screen()
    object HR : Screen()
    object CRM : Screen()
    object Portal : Screen()
    object Settings : Screen()
    object AIChat : Screen()
    object Supplier : Screen()
    object Accounting : Screen()
}

data class ChatMessage(
    val sender: String, // "USER" or "AI"
    val message: String,
    val timestamp: Long = System.currentTimeMillis()
)

data class Supplier(
    val id: String,
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String
)

data class PurchaseOrder(
    val id: String,
    val poNumber: String,
    val supplierId: String,
    val supplierName: String,
    val productName: String,
    val productId: String,
    val qty: Int,
    val unitCost: Double,
    val totalAmount: Double,
    val date: Long,
    val status: String // "DRAFT", "SENT", "RECEIVED"
)

data class BiMetrics(
    val totalMasuk: Double = 0.0,
    val totalKeluar: Double = 0.0,
    val netProfit: Double = 0.0,
    val margin: Double = 0.0,
    val efficiency: Double = 0.0,
    val cashRunway: Double = 0.0,
    val integrityScore: Int = 5,
    val outlook: String = "MODERATE",
    val riskAssessment: String = "LOW",
    val aiConfidence: Int = 45
)

class SaaSViewModel(application: Application) : AndroidViewModel(application) {

    private val db = AppDatabase.getDatabase(application)
    private val repository = AppRepository(db.appDao())
    private val api = NusantaraRetrofitClient.apiService

    init {
        startPeriodicSync()
    }

    private fun startPeriodicSync() {
        viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(5000) // Polling every 5 seconds
                if (_isUserLoggedIn.value) {
                    try {
                        repository.syncUnits()
                        syncAllDataForUnit(_selectedUnitId.value)
                    } catch (e: Exception) {
                        // Suppress background sync exceptions
                    }
                }
            }
        }
    }

    // --- Active Screen State ---
    private val _currentScreen = MutableStateFlow<Screen>(Screen.Dashboard)
    val currentScreen: StateFlow<Screen> = _currentScreen.asStateFlow()

    // --- Global Authentication State ---
    private val _isUserLoggedIn = MutableStateFlow<Boolean>(false)
    val isUserLoggedIn: StateFlow<Boolean> = _isUserLoggedIn.asStateFlow()

    private val _loggedInUserRole = MutableStateFlow<String>("") // "OWNER" or "STAFF"
    val loggedInUserRole: StateFlow<String> = _loggedInUserRole.asStateFlow()

    private val _loggedInUserEmail = MutableStateFlow<String>("")
    val loggedInUserEmail: StateFlow<String> = _loggedInUserEmail.asStateFlow()

    // Asynchronous network authentication
    fun loginUser(email: String, pinOrPass: String, role: String, onResult: (Boolean) -> Unit = {}) {
        viewModelScope.launch {
            try {
                val response = api.login(LoginRequest(email, pinOrPass))
                if (response.success && response.data != null) {
                    SessionManager.saveSession(
                        response.data.token,
                        response.data.user.role,
                        response.data.user.email
                    )
                    _isUserLoggedIn.value = true
                    _loggedInUserRole.value = response.data.user.role.uppercase()
                    _loggedInUserEmail.value = response.data.user.email
                    
                    _currentScreen.value = if (_loggedInUserRole.value == "STAFF") Screen.Portal else Screen.Dashboard
                    
                    // Fetch all data for initial load
                    repository.syncUnits()
                    syncAllDataForUnit(_selectedUnitId.value)
                    
                    onResult(true)
                } else {
                    onResult(false)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                // Fallback offline login for testing if no server is running
                val success = loginUserOfflineFallback(email, pinOrPass, role)
                onResult(success)
            }
        }
    }

    fun registerUser(username: String, email: String, pass: String, onResult: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.register(RegisterRequest(username, email, pass))
                if (response.success) {
                    onResult(true, response.message ?: "Registrasi berhasil")
                } else {
                    onResult(false, response.message ?: "Registrasi gagal")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                onResult(false, "Tidak dapat menghubungkan ke server")
            }
        }
    }

    fun loginWithGoogle(googleToken: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                val response = api.loginGoogle(GoogleAuthRequest(googleToken))
                if (response.success && response.data != null) {
                    SessionManager.saveSession(
                        response.data.token,
                        response.data.user.role,
                        response.data.user.email
                    )
                    _isUserLoggedIn.value = true
                    _loggedInUserRole.value = response.data.user.role.uppercase()
                    _loggedInUserEmail.value = response.data.user.email
                    
                    _currentScreen.value = if (_loggedInUserRole.value == "STAFF") Screen.Portal else Screen.Dashboard
                    
                    repository.syncUnits()
                    syncAllDataForUnit(_selectedUnitId.value)
                    
                    onResult(true)
                } else {
                    onResult(false)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                onResult(false)
            }
        }
    }

    private fun loginUserOfflineFallback(email: String, pinOrPass: String, role: String): Boolean {
        // No offline hardcoded credentials - require real server login
        return false
    }

    fun logoutUser() {
        SessionManager.clearSession()
        _isUserLoggedIn.value = false
        _loggedInUserRole.value = ""
        _loggedInUserEmail.value = ""
        logoutStaff()
        _currentScreen.value = Screen.Dashboard
    }

    private val _themeMode = MutableStateFlow<String>("SYSTEM")
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()

    fun setThemeMode(mode: String) {
        _themeMode.value = mode
    }

    fun navigateTo(screen: Screen) {
        _currentScreen.value = screen
    }

    // --- Selected Unit State ---
    private val _selectedUnitId = MutableStateFlow<Int>(1)
    val selectedUnitId: StateFlow<Int> = _selectedUnitId.asStateFlow()

    val allUnits: StateFlow<List<UnitBisnis>> = repository.allUnits
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val activeUnit: StateFlow<UnitBisnis?> = combine(allUnits, _selectedUnitId) { units, selectedId ->
        units.find { it.id == selectedId }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    fun switchUnit(id: Int) {
        _selectedUnitId.value = id
        clearCart()
        logoutStaff()
        syncAllDataForUnit(id)
    }

    // --- Dynamic Data Streams ---
    val products: StateFlow<List<Product>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getProductsByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val transactions: StateFlow<List<Transaction>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getTransactionsByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val employees: StateFlow<List<Employee>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getEmployeesByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val stockLogs: StateFlow<List<StockLog>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getStockLogsByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val posCustomers: StateFlow<List<PosCustomer>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getCustomersByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val posOrders: StateFlow<List<PosOrder>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getOrdersByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val attendance: StateFlow<List<Attendance>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getAttendanceByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val payroll: StateFlow<List<Payroll>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getPayrollByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val crmDeals: StateFlow<List<CrmDeal>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getDealsByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val riwayatAksi: StateFlow<List<RiwayatAksi>> = _selectedUnitId
        .flatMapLatest { unitId -> repository.getRiwayatAksiByUnit(unitId) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // --- Strategic Business Intelligence (BI) Engine ---
    private val _biMetrics = MutableStateFlow<BiMetrics>(BiMetrics())
    val biMetrics: StateFlow<BiMetrics> = _biMetrics.asStateFlow()

    // Sync all backend data
    fun syncAllDataForUnit(unitId: Int) {
        viewModelScope.launch {
            repository.syncProducts(unitId)
            repository.syncEmployees(unitId)
            repository.syncPosData(unitId)
            repository.syncCrmDeals(unitId)
            repository.syncFinanceData(unitId)
            syncScmData(unitId)
            fetchBiMetrics(unitId)
        }
    }

    private fun fetchBiMetrics(unitId: Int) {
        viewModelScope.launch {
            try {
                val response = api.getFinanceData(unitId)
                if (response.success) {
                    val m = response.data.biMetrics
                    _biMetrics.value = BiMetrics(
                        totalMasuk = m.totalMasuk,
                        totalKeluar = m.totalKeluar,
                        netProfit = m.netProfit,
                        margin = m.margin,
                        efficiency = m.efficiency,
                        cashRunway = m.cashRunway,
                        integrityScore = m.integrityScore,
                        outlook = m.outlook,
                        riskAssessment = m.riskAssessment,
                        aiConfidence = m.aiConfidence
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // --- POS Cart Operations ---
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()

    fun addToCart(product: Product) {
        val currentQty = _cart.value[product] ?: 0
        if (currentQty < product.stok) {
            val updated = _cart.value.toMutableMap()
            updated[product] = currentQty + 1
            _cart.value = updated
        }
    }

    fun removeFromCart(product: Product) {
        val currentQty = _cart.value[product] ?: 0
        if (currentQty > 0) {
            val updated = _cart.value.toMutableMap()
            if (currentQty == 1) {
                updated.remove(product)
            } else {
                updated[product] = currentQty - 1
            }
            _cart.value = updated
        }
    }

    fun clearCart() {
        _cart.value = emptyMap()
    }

    fun checkoutCart(paymentMethod: String, customerId: Int?) {
        val cartItems = _cart.value
        if (cartItems.isEmpty()) return

        viewModelScope.launch {
            val orderId = UUID.randomUUID().toString()
            val orderNum = "POS-" + System.currentTimeMillis().toString().takeLast(6)
            val subtotal = cartItems.entries.sumOf { it.key.hargaJual * it.value }
            val total = subtotal

            val order = PosOrder(
                id = orderId,
                orderNumber = orderNum,
                unitId = _selectedUnitId.value,
                customerId = customerId,
                subtotal = subtotal,
                total = total,
                paymentMethod = paymentMethod,
                status = "COMPLETED",
                tanggal = System.currentTimeMillis()
            )

            val orderItemsList = cartItems.map { (prod, qty) ->
                PosOrderItem(
                    id = UUID.randomUUID().toString(),
                    orderId = orderId,
                    productId = prod.id,
                    productName = prod.nama,
                    qty = qty,
                    price = prod.hargaJual
                )
            }

            repository.processPosOrder(order, orderItemsList)
            clearCart()
            fetchBiMetrics(_selectedUnitId.value)
        }
    }

    // --- Staff Portal Dual Auth System ---
    private val _loggedStaffEmployee = MutableStateFlow<Employee?>(null)
    val loggedStaffEmployee: StateFlow<Employee?> = _loggedStaffEmployee.asStateFlow()

    private val _staffAuthError = MutableStateFlow<String?>(null)
    val staffAuthError: StateFlow<String?> = _staffAuthError.asStateFlow()

    fun loginStaff(pin: String) {
        viewModelScope.launch {
            _staffAuthError.value = null
            val employee = repository.getEmployeeByPin(_selectedUnitId.value, pin)
            if (employee != null) {
                _loggedStaffEmployee.value = employee
                repository.logAction(
                    unitId = _selectedUnitId.value,
                    pesan = "Staff ${employee.fullName} login ke Portal Karyawan",
                    tipe = "INFO",
                    kategori = "HR"
                )
            } else {
                _staffAuthError.value = "PIN tidak valid atau salah!"
            }
        }
    }

    fun logoutStaff() {
        _loggedStaffEmployee.value = null
        _staffAuthError.value = null
    }

    // --- AI Assistant Business Advisor ---
    private val _chatMessages = MutableStateFlow<List<ChatMessage>>(
        listOf(
            ChatMessage(
                sender = "AI",
                message = "Halo! Saya Asisten AI Bisnis Anda. Saya dapat membantu menganalisis kinerja keuangan, stok produk, efisiensi karyawan, atau pipeline CRM Anda. Ada yang bisa saya bantu hari ini?"
            )
        )
    )
    val chatMessages: StateFlow<List<ChatMessage>> = _chatMessages.asStateFlow()

    private val _isAiLoading = MutableStateFlow<Boolean>(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading.asStateFlow()

    fun sendMessageToAi(msg: String) {
        if (msg.trim().isEmpty()) return
        val userMsg = ChatMessage(sender = "USER", message = msg)
        _chatMessages.value = _chatMessages.value + userMsg

        viewModelScope.launch {
            _isAiLoading.value = true
            try {
                val response = api.getAiAdvice(
                    AiAdvisorRequest(
                        unitId = _selectedUnitId.value,
                        question = msg
                    )
                )
                if (response.success && response.data != null) {
                    val aiMsg = ChatMessage(sender = "AI", message = response.data.analysis)
                    _chatMessages.value = _chatMessages.value + aiMsg
                } else {
                    _chatMessages.value = _chatMessages.value + ChatMessage(sender = "AI", message = response.message ?: "Gagal mendapatkan analisis.")
                }
            } catch (e: Exception) {
                _chatMessages.value = _chatMessages.value + ChatMessage(sender = "AI", message = "Gagal menghubungi asisten AI: ${e.localizedMessage}")
            }
            _isAiLoading.value = false
        }
    }

    // --- Operations ---
    fun addUnit(name: String, alamat: String, modal: Double, kategori: String) {
        viewModelScope.launch {
            repository.insertUnit(
                UnitBisnis(
                    namaUnit = name,
                    slug = name.lowercase().replace(" ", "-"),
                    alamat = alamat,
                    modalAwal = modal,
                    kategori = kategori
                )
            )
        }
    }

    fun deleteUnit(id: Int) {
        viewModelScope.launch {
            repository.deleteUnit(id)
            if (_selectedUnitId.value == id) {
                val remain = allUnits.value.firstOrNull { it.id != id }
                _selectedUnitId.value = remain?.id ?: 1
            }
        }
    }

    fun deleteTransaction(id: Int, unitId: Int) {
        viewModelScope.launch {
            repository.deleteTransaction(id, unitId)
            fetchBiMetrics(unitId)
        }
    }

    fun addProduct(sku: String, name: String, hargaBeli: Double, hargaJual: Double, stok: Int, kategori: String) {
        viewModelScope.launch {
            repository.insertProduct(
                Product(
                    id = UUID.randomUUID().toString(),
                    sku = sku,
                    nama = name,
                    hargaBeli = hargaBeli,
                    hargaJual = hargaJual,
                    stok = stok,
                    kategori = kategori,
                    unitId = _selectedUnitId.value
                )
            )
        }
    }

    fun addEmployee(name: String, position: String, salary: Double, pin: String, role: String) {
        viewModelScope.launch {
            repository.insertEmployee(
                Employee(
                    fullName = name,
                    position = position,
                    salary = salary,
                    pin = pin,
                    role = role,
                    unitId = _selectedUnitId.value
                )
            )
        }
    }

    fun deleteEmployee(id: Int, name: String) {
        viewModelScope.launch {
            repository.deleteEmployee(id)
        }
    }

    fun deleteProduct(id: String, name: String) {
        viewModelScope.launch {
            repository.deleteProduct(id)
        }
    }

    fun bulkRestockAll() {
        // Bulk restock is simulated locally/remotely by updating all products
        viewModelScope.launch {
            products.value.forEach { prod ->
                repository.updateProductStock(prod.id, 100)
            }
            repository.logAction(
                unitId = _selectedUnitId.value,
                pesan = "Restok massal dilakukan. Semua produk diatur ke 100 unit.",
                tipe = "SUCCESS",
                kategori = "INVENTORY"
            )
        }
    }

    fun logCrmFollowUp(company: String, contact: String) {
        viewModelScope.launch {
            repository.logAction(
                unitId = _selectedUnitId.value,
                pesan = "Simulasi WA Follow-up terkirim ke $contact ($company)",
                tipe = "SUCCESS",
                kategori = "CRM"
            )
        }
    }

    // --- Suppliers & Purchase Orders (SCM) Module ---
    private val _suppliers = MutableStateFlow<List<Supplier>>(emptyList())
    val suppliers: StateFlow<List<Supplier>> = _suppliers.asStateFlow()

    private val _purchaseOrders = MutableStateFlow<List<PurchaseOrder>>(emptyList())
    val purchaseOrders: StateFlow<List<PurchaseOrder>> = _purchaseOrders.asStateFlow()

    fun syncScmData(unitId: Int) {
        viewModelScope.launch {
            try {
                val response = NusantaraRetrofitClient.apiService.getScmData(unitId)
                if (response.success) {
                    _suppliers.value = response.data.suppliers.map {
                        Supplier(it.id, it.name, it.contactName, it.phone, it.email, it.category, it.address)
                    }
                    _purchaseOrders.value = response.data.purchaseOrders.map {
                        PurchaseOrder(it.id, it.poNumber, it.supplierId, it.supplierName, it.productName, it.productId, it.qty, it.unitCost, it.totalAmount, it.date, it.status)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun addSupplier(name: String, contact: String, phone: String, email: String, category: String, address: String) {
        viewModelScope.launch {
            try {
                val response = NusantaraRetrofitClient.apiService.processScmAction(
                    CreateSupplierRequest(
                        supplier = SupplierDto(
                            id = "",
                            name = name,
                            contactName = contact,
                            phone = phone,
                            email = email,
                            category = category,
                            address = address
                        )
                    )
                )
                if (response.success) {
                    syncScmData(_selectedUnitId.value)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteSupplier(id: String, name: String) {
        viewModelScope.launch {
            try {
                val response = NusantaraRetrofitClient.apiService.deleteSupplier(_selectedUnitId.value, id)
                if (response.success) {
                    syncScmData(_selectedUnitId.value)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun createPurchaseOrder(supplierId: String, supplierName: String, productId: String, productName: String, qty: Int, unitCost: Double) {
        val poNum = "PO-" + System.currentTimeMillis().toString().takeLast(6)
        viewModelScope.launch {
            try {
                val response = NusantaraRetrofitClient.apiService.processScmAction(
                    CreatePoRequest(
                        po = PurchaseOrderDto(
                            id = "",
                            poNumber = poNum,
                            supplierId = supplierId,
                            supplierName = supplierName,
                            productName = productName,
                            productId = productId,
                            qty = qty,
                            unitCost = unitCost,
                            totalAmount = qty * unitCost,
                            date = System.currentTimeMillis(),
                            status = "DRAFT"
                        )
                    )
                )
                if (response.success) {
                    syncScmData(_selectedUnitId.value)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updatePoStatus(poId: String, newStatus: String) {
        viewModelScope.launch {
            try {
                val response = NusantaraRetrofitClient.apiService.updatePoStatus(
                    UpdatePoStatusRequest(poId, newStatus, _selectedUnitId.value)
                )
                if (response.success) {
                    syncScmData(_selectedUnitId.value)
                    syncAllDataForUnit(_selectedUnitId.value)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun addTransaction(kategoriTrx: String, nominal: Double, keterangan: String) {
        viewModelScope.launch {
            repository.insertTransaction(
                Transaction(
                    unitId = _selectedUnitId.value,
                    kategoriTrx = kategoriTrx,
                    nominal = nominal,
                    tanggal = System.currentTimeMillis(),
                    keterangan = keterangan
                )
            )
            fetchBiMetrics(_selectedUnitId.value)
        }
    }

    fun checkInStaffPortal() {
        val staff = _loggedStaffEmployee.value ?: return
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        viewModelScope.launch {
            repository.checkInEmployee(staff.id, staff.fullName, _selectedUnitId.value, dateStr, timeStr)
        }
    }

    fun checkOutStaffPortal() {
        val staff = _loggedStaffEmployee.value ?: return
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val timeStr = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
        viewModelScope.launch {
            repository.checkOutEmployee(staff.id, staff.fullName, _selectedUnitId.value, dateStr, timeStr)
        }
    }

    fun addDeal(contact: String, company: String, valDouble: Double, phone: String) {
        viewModelScope.launch {
            repository.insertDeal(
                CrmDeal(
                    contactName = contact,
                    companyName = company,
                    dealValue = valDouble,
                    stage = "PROSPECT",
                    phone = phone,
                    unitId = _selectedUnitId.value
                )
            )
        }
    }

    fun updateDealStage(dealId: Int, contact: String, value: Double, nextStage: String) {
        viewModelScope.launch {
            repository.updateDealStage(dealId, nextStage, contact, value, _selectedUnitId.value)
        }
    }

    fun deleteDeal(dealId: Int) {
        viewModelScope.launch {
            repository.deleteDeal(dealId, _selectedUnitId.value)
        }
    }

    fun processPayroll(employeeId: Int, name: String, salary: Double, allowance: Double, deduction: Double) {
        viewModelScope.launch {
            val net = salary + allowance - deduction
            val monthYear = SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(Date())
            val payroll = Payroll(
                employeeId = employeeId,
                monthYear = monthYear,
                salary = salary,
                allowance = allowance,
                deduction = deduction,
                netSalary = net,
                status = "DIBAYAR"
            )
            repository.processPayroll(payroll, name, _selectedUnitId.value)
        }
    }

    fun addCustomer(name: String, email: String, phone: String) {
        viewModelScope.launch {
            repository.insertCustomer(
                PosCustomer(
                    unitId = _selectedUnitId.value,
                    namaCustomer = name,
                    email = email,
                    telepon = phone
                )
            )
        }
    }

    init {
        viewModelScope.launch {
            repository.seedDatabaseIfEmpty()
        }
    }
}
