package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import com.upstyle.bizgrow.ui.navigation.NavigationManager
import com.upstyle.bizgrow.ui.Screen
import com.upstyle.bizgrow.socket.SocketManager
import com.upstyle.bizgrow.socket.RealtimeEvent
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.stateIn
import com.upstyle.bizgrow.cache.CacheManager
import com.upstyle.bizgrow.ui.state.*
import kotlinx.coroutines.flow.map
import io.github.aakira.napier.Napier

class AppViewModel(
    private val api: UpstyleApi,
    val session: SessionRepository
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
    val activeUnit: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.BusinessUnit?> = kotlinx.coroutines.flow.combine(
        _units, _activeUnitId
    ) { units, id ->
        units.find { it.id == id }
    }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Lazily, null)

    private val _posShifts = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.PosShift>>(emptyList())
    val posShifts: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.PosShift>> = _posShifts.asStateFlow()
    private val _activeShift = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.PosShift?>(null)
    val activeShift: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.PosShift?> = _activeShift.asStateFlow()
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


    private val _posVouchers = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.PosVoucher>>(emptyList())
    private val _posDiskon = kotlinx.coroutines.flow.MutableStateFlow<Double>(0.0)
    val posDiskon: kotlinx.coroutines.flow.StateFlow<Double> = _posDiskon.asStateFlow()
    fun setDiskon(diskon: Double) { _posDiskon.value = diskon }
    
    private val _selectedCustomerId = kotlinx.coroutines.flow.MutableStateFlow<Int?>(null)
    val selectedCustomerId: kotlinx.coroutines.flow.StateFlow<Int?> = _selectedCustomerId.asStateFlow()
    fun setCustomer(customerId: Int?) { _selectedCustomerId.value = customerId }
    private val _posData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.PosData?>(null)
    val posData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.PosData?> = _posData.asStateFlow()
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
    
    private val _cart = kotlinx.coroutines.flow.MutableStateFlow<Map<com.upstyle.bizgrow.data.Product, Int>>(emptyMap())
    val cart: kotlinx.coroutines.flow.StateFlow<Map<com.upstyle.bizgrow.data.Product, Int>> = _cart.asStateFlow()
    
    val cartTotal: kotlinx.coroutines.flow.StateFlow<Double> = _cart.map { c -> c.entries.sumOf { it.key.hargaJual * it.value } }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Lazily, 0.0)
    val cartItemCount: kotlinx.coroutines.flow.StateFlow<Int> = _cart.map { c -> c.values.sum() }.stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Lazily, 0)
    fun updateLeadStatus(leadId: Int, status: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.updateLeadStatus(leadId, status)
            if (res.success) loadMarketingData()
        } catch (e: Exception) { Napier.e("updateLeadStatus error", e) }
    }
    
    private val _notifications = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.RiwayatAksi>>(emptyList())
    val notifications: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.RiwayatAksi>> = _notifications.asStateFlow()
    fun markAllRead() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.markAllNotificationsRead(unitId)
            loadNotifications()
        } catch (e: Exception) { Napier.e("markAllRead error", e) }
    }
    
    fun updateOrderStatus(orderId: Int, status: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateOrderStatus(orderId, status)
            if (res.success) { loadOrders(); loadOrderDetail(orderId); setSuccess("Status pesanan diperbarui") }
            else setError(res.message ?: "Gagal update status")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    
    private val _hrData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.HrData?>(null)
    val hrData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.HrData?> = _hrData.asStateFlow()
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
    private val _leaveRequests = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.LeaveRequest>>(emptyList())
    val leaveRequests: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.LeaveRequest>> = _leaveRequests.asStateFlow()
    fun loadLeaveRequests() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLeaveRequests(unitId)
            if (res.success) _leaveRequests.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadLeaveRequests error", e) }
    }
    
    fun loginWithGoogle(googleToken: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.loginWithGoogle(GoogleAuthRequest(googleToken))
            if (res.success && res.data != null) {
                session.saveSession(res.data.token, res.data.user.role, res.data.user.email, res.data.user.username, res.data.user.id)
                clearMessages()
                setupSocket()
                loadUnits()
                callback?.invoke(true, null)
                navigationManager.navigateToRoot(Screen.Home)
            } else {
                val err = res.message ?: "Login Google gagal"
                setError(err)
                callback?.invoke(false, err)
            }
        } catch (e: Exception) {
            val err = "Koneksi gagal: ${e.message}"
            setError(err)
            callback?.invoke(false, err)
        }
    }

    fun login(email: String, pass: String, onResult: (Boolean, String?) -> Unit) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.login(com.upstyle.bizgrow.data.LoginRequest(email, pass))
            if (res.success && res.data != null) {
                val data = res.data
                session.saveSession(
                    token = data.token,
                    role = data.user.role,
                    email = data.user.email,
                    username = data.user.username,
                    userId = data.user.id
                )
                clearMessages()
                navigationManager.navigateToRoot(Screen.Home)
                onResult(true, null)
            } else {
                val err = res.message ?: "Login gagal"
                setError(err)
                onResult(false, err)
            }
        } catch (e: Exception) {
            val err = "Koneksi gagal: ${e.message}"
            setError(err)
            onResult(false, err)
        } finally {
            setLoading(false)
        }
    }
    
    private val _marketingCampaigns = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.MarketingCampaign>>(emptyList())
    val marketingCampaigns: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.MarketingCampaign>> = _marketingCampaigns.asStateFlow()
    fun loadMarketingCampaigns() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getMarketingCampaigns(unitId)
            if (res.success) _marketingCampaigns.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadMarketingCampaigns error", e) }
    }
    fun createMarketingCampaign(name: String, type: String, budget: Double, scheduledAt: String?) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val camp = MarketingCampaign(name = name, type = type, budget = budget, scheduledAt = scheduledAt, unitId = unitId)
            val res = api.createMarketingCampaign(camp)
            if (res.success) { loadMarketingCampaigns(); setSuccess("Kampanye berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat kampanye")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    
    private val _labaRugiData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.LabaRugiData?>(null)
    val labaRugiData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.LabaRugiData?> = _labaRugiData.asStateFlow()
    fun loadLabaRugi(startDate: String, endDate: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLabaRugi(unitId, startDate, endDate)
            if (res.success) _labaRugiData.value = res.data
        } catch (e: Exception) { Napier.e("loadLabaRugi error", e) }
    }
    
    private val _katalogData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.KatalogData?>(null)
    val katalogData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.KatalogData?> = _katalogData.asStateFlow()
    fun loadKatalog() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKatalog(unitId)
            if (res.success) _katalogData.value = res.data
        } catch (e: Exception) { Napier.e("loadKatalog error", e) }
    }
    fun toggleKatalogPublish(id: String, isPublished: Boolean) = viewModelScope.launch {
        try {
            val res = api.toggleKatalogPublish(id, isPublished)
            if (res.success) { loadKatalog(); setSuccess(if (isPublished) "Produk dipublikasikan" else "Produk disembunyikan") }
            else setError(res.message ?: "Gagal update katalog")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateKatalogSettings(settings: KatalogSettings) = viewModelScope.launch {
        try {
            val res = api.updateKatalogSettings(settings)
            if (res.success) { loadKatalog(); setSuccess("Pengaturan katalog diperbarui!") }
            else setError(res.message ?: "Gagal update pengaturan katalog")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    
    fun createUnit(nama: String, type: String) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.createUnit(com.upstyle.bizgrow.data.CreateUnitRequest(name = nama, type = type))
            if (res.success) {
                setSuccess("Bisnis berhasil ditambahkan")
                loadUnits()
            } else {
                setError(res.message ?: "Gagal menambah bisnis")
            }
        } catch (e: Exception) {
            setError("Gagal menambah bisnis: ${e.message}")
        }
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
    private val _departments = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.Department>>(emptyList())
    val departments: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.Department>> = _departments.asStateFlow()
    fun loadDepartments() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getDepartments(unitId)
            if (res.success) _departments.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadDepartments error", e) }
    }
    fun deleteDepartment(id: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteDepartment(id)
            if (res.success) { loadDepartments(); setSuccess("Departemen berhasil dihapus") }
            else setError(res.message ?: "Gagal hapus departemen")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun createDepartment(name: String, description: String, manager: String, budget: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val dept = Department(name = name, description = description, manager = manager, budget = budget, unitId = unitId)
            val res = api.createDepartment(dept)
            if (res.success) { loadDepartments(); setSuccess("Departemen berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah departemen")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    private val _unreadCount = kotlinx.coroutines.flow.MutableStateFlow(0)
    val unreadCount: kotlinx.coroutines.flow.StateFlow<Int> = _unreadCount.asStateFlow()
    
    private val _crmDeals = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.CrmDeal>>(emptyList())
    val crmDeals: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.CrmDeal>> = _crmDeals.asStateFlow()
    private val _crmContacts = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.CrmContact>>(emptyList())
    val crmContacts: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.CrmContact>> = _crmContacts.asStateFlow()
    
    private val _crmActivities = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.CrmActivity>>(emptyList())
    val crmActivities: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.CrmActivity>> = _crmActivities.asStateFlow()
    
    private val _crmTasks = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.CrmTask>>(emptyList())
    val crmTasks: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.CrmTask>> = _crmTasks.asStateFlow()
    


    
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
    fun createDeal(contactName: String, companyName: String, dealValue: Double, stage: String, phone: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createDeal(CreateDealRequest(CreateDealBody(contactName, companyName, dealValue, stage, phone, unitId)))
            if (res.success) { loadCrmData(); setSuccess("Deal berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah deal")
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
    fun loadCrmTasks() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getCrmTasks(unitId)
            if (res.success) _crmTasks.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadCrmTasks error", e) }
    }
    fun createTicket(subject: String, customer: String, priority: String, message: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val req = CreateTicketRequest(subject = subject, customerName = customer, priority = priority, message = message, unitId = unitId)
            val res = api.createTicket(req)
            if (res.success) { loadTickets(); setSuccess("Tiket berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat tiket")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun markFaqViewed(id: String) = viewModelScope.launch {
        try { api.sendHelpFeedback(id, true) } catch (_: Exception) {}
    }
    fun submitFaqFeedback(id: String, helpful: Boolean) = viewModelScope.launch {
        try { api.sendHelpFeedback(id, helpful) } catch (_: Exception) {}
    }
    private val _financeData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.FinanceData?>(null)
    val financeData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.FinanceData?> = _financeData.asStateFlow()
    fun loadFinanceData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getFinanceData(unitId)
            if (res.success) _financeData.value = res.data
        } catch (e: Exception) { Napier.e("loadFinanceData error", e) }
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
    private val _fixedAssets = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.FixedAsset>>(emptyList())
    val fixedAssets: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.FixedAsset>> = _fixedAssets.asStateFlow()
    fun loadFixedAssets() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getFixedAssets(unitId)
            if (res.success) _fixedAssets.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadFixedAssets error", e) }
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
    fun createPayable(contactId: Int, nomorFaktur: String?, tanggal: String, jatuhTempo: String, nominal: Double, keterangan: String?) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createPayable(unitId, CreatePayableRequest(contactId, nomorFaktur, tanggal, jatuhTempo, nominal, keterangan))
            if (res.success) { loadPayables(); loadAccountingContacts(); setSuccess("Hutang berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah hutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
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
    private val _arusKasData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.ArusKasData?>(null)
    val arusKasData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.ArusKasData?> = _arusKasData.asStateFlow()
    fun loadArusKas(startDate: String, endDate: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getArusKas(unitId, startDate, endDate)
            if (res.success) _arusKasData.value = res.data
        } catch (e: Exception) { Napier.e("loadArusKas error", e) }
    }
    
    private val _laporanWa = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.LaporanWaData?>(null)
    val laporanWa: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.LaporanWaData?> = _laporanWa.asStateFlow()
    fun loadLaporanWa(periode: String = "hari_ini") = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.getLaporanWa(LaporanWaRequest(unitId, periode))
            if (res.success) { _laporanWa.value = res.data; _uiState.update { it.copy(isLoading = false) } }
            else setError(res.message ?: "Gagal load laporan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    private val _marketingData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.MarketingData?>(null)
    val marketingData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.MarketingData?> = _marketingData.asStateFlow()
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
            val lead = MarketingLead(nama = nama, email = email, telepon = telepon, source = source, unitId = unitId)
            val res = api.createMarketingLead(lead)
            if (res.success) { loadMarketingData(); setSuccess("Lead berhasil ditambahkan!") }
            else setError(res.message ?: "Gagal tambah lead")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun processPayroll(employeeId: Int, monthYear: String, salary: Double, allowance: Double,
                       deduction: Double, netSalary: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.processPayroll(ProcessPayrollRequest(
                payroll = ProcessPayrollBody(
                    employeeId = employeeId,
                    monthYear = monthYear,
                    salary = salary,
                    allowance = allowance,
                    deduction = deduction,
                    netSalary = netSalary,
                    unitId = unitId
                )
            ))
            if (res.success) { loadHrData(); setSuccess("Payroll berhasil diproses!") }
            else setError(res.message ?: "Gagal proses payroll")
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
    
    private val _posReturns = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.PosReturn>>(emptyList())
    val posReturns: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.PosReturn>> = _posReturns.asStateFlow()
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
    
    fun clearCart() {
        _cart.value = emptyMap()
        _posDiskon.value = 0.0
        _selectedCustomerId.value = null
    }

    fun addToCart(product: com.upstyle.bizgrow.data.Product, quantity: Int = 1) {
        val current = _cart.value.toMutableMap()
        current[product] = (current[product] ?: 0) + quantity
        _cart.value = current
    }
    
    fun removeFromCart(product: com.upstyle.bizgrow.data.Product) {
        val current = _cart.value.toMutableMap()
        val qty = current[product] ?: 0
        if (qty > 1) {
            current[product] = qty - 1
        } else {
            current.remove(product)
        }
        _cart.value = current
    }
    
    fun checkout(metode: String, onSuccess: (Boolean) -> Unit) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        val cartItems = _cart.value
        if (cartItems.isEmpty()) { setError("Keranjang kosong"); onSuccess(false); return@launch }

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
                paymentMethod = metode,
                items = items
            ))
            val res = api.checkout(req)
            if (res.success) {
                clearCart()
                loadProducts()
                loadDashboard()
                setSuccess("Transaksi berhasil! Total: Rp ${"%,.0f".format(total)}")
                onSuccess(true)
            } else {
                setError(res.message ?: "Checkout gagal")
                onSuccess(false)
            }
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
            onSuccess(false)
        }
    }
    val posVouchers: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.PosVoucher>> = _posVouchers.asStateFlow()
    fun loadPosVouchers() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosVouchers(unitId)
            if (res.success) _posVouchers.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosVouchers error", e) }
    }
    
    val currentUser: com.upstyle.bizgrow.data.UserInfo? get() = if (session.isLoggedIn()) com.upstyle.bizgrow.data.UserInfo(session.getUserId(), session.getUsername(), session.getEmail(), session.getRole()) else null


    fun addProduct(nama: String, hargaBeli: Double, hargaJual: Double, stok: Int, minStok: Int, sku: String, barcode: String?, kategoriId: Int?, fotoUri: String?, onResult: (Boolean) -> Unit) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val product = Product(
                id = "0",
                nama = nama,
                hargaBeli = hargaBeli,
                hargaJual = hargaJual,
                stok = stok,
                minStok = minStok,
                sku = sku,
                barcode = barcode,
                foto = fotoUri,
                kategoriId = kategoriId,
                unitId = unitId
            )
            val res = api.createProduct(product)
            if (res.success) {
                loadProducts()
                setSuccess("Produk berhasil ditambahkan")
                onResult(true)
            } else {
                setError(res.message ?: "Gagal menambahkan produk")
                onResult(false)
            }
        } catch (e: Exception) {
            setError("Gagal menambah produk: ${e.message}")
            onResult(false)
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
    fun register(name: String, email: String, pass: String, phone: String = "", company: String = "", onResult: (Boolean, String) -> Unit) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.register(RegisterRequest(name.trim(), email.trim(), pass))
            if (res.success) {
                setSuccess("Registrasi berhasil! Silakan login.")
                onResult(true, "Registrasi berhasil!")
            } else {
                val err = res.message ?: "Registrasi gagal"
                setError(err)
                onResult(false, err)
            }
        } catch (e: Exception) {
            val err = "Koneksi gagal: ${e.message}"
            setError(err)
            onResult(false, err)
        } finally {
            setLoading(false)
        }
    }
    
    private val _scmData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.ScmData?>(null)
    val scmData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.ScmData?> = _scmData.asStateFlow()
    fun loadScmData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getScmData(unitId)
            if (res.success) _scmData.value = res.data
        } catch (e: Exception) { Napier.e("loadScmData error", e) }
    }
    fun updatePoStatus(poId: String, status: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            api.updatePoStatus(UpdatePoStatusRequest(poId, status, unitId))
            loadScmData()
        } catch (e: Exception) { Napier.e("updatePoStatus error", e) }
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
    private val _lowStockProducts = MutableStateFlow<List<LowStockProduct>>(emptyList())
    val lowStockProducts: StateFlow<List<LowStockProduct>> = _lowStockProducts.asStateFlow()
    private val _stockLogs = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.StockLog>>(emptyList())
    val stockLogs: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.StockLog>> = _stockLogs.asStateFlow()

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
            SocketManager.events.collect { event ->
                when (event) {
                    is RealtimeEvent.PosTransaction -> refreshAll()
                    is RealtimeEvent.StockUpdated -> { loadProducts(); loadLowStock() }
                    is RealtimeEvent.StockAlert -> loadLowStock()
                    is RealtimeEvent.Notification -> loadNotifications()
                    is RealtimeEvent.OrderStatusChanged -> loadOrders()
                    is RealtimeEvent.PosCashAlert -> refreshAll()
                    is RealtimeEvent.TicketMessage -> loadTicketMessages(event.data.toIntOrNull() ?: 0)
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Auth / Session ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun isLoggedIn() = session.isLoggedIn()

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Units ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
        val unit = _units.value.find { it.id == unitId }
        session.setActiveUnit(unitId, unit?.name ?: "", unit?.slug ?: "")
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Dashboard ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadDashboard() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _dashboardState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getFinanceData(unitId)
            if (res.success) _dashboardState.update { it.copy(isLoading = false, financeData = res.data) }
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Products ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
                _productsState.update { it.copy(isLoading = false, error = "Gagal memuat produk") }
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

    // original addProduct removed
    fun updateProduct(product: Product) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateProduct(product)
            if (res.success) { loadProducts(); setSuccess("Produk berhasil diperbarui") }
            else setError(res.message ?: "Gagal update produk")
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Orders ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
                _ordersState.update { it.copy(isLoading = false, error = "Gagal memuat pesanan") }
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Finance AR/AP ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Journal / Jurnal Umum ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ CS / Tickets ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
            val res = api.updateTicketStatus(ticketId, status)
            if (res.success) { loadTickets(); setSuccess("Status tiket diperbarui") }
            else setError(res.message ?: "Gagal update status tiket")
        } catch (e: Exception) { setError("Gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Feature gap CRUD helpers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

    fun createSosmedPost(platform: String, caption: String, imageUrl: String, scheduledAt: String?, status: String) = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.createSosmedPost(com.upstyle.bizgrow.data.SocialPost(unitId = unitId, platform = platform, caption = caption, imageUrl = imageUrl, scheduledAt = scheduledAt ?: "", status = status))
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Shopee Integration ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Advanced Settings ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadProfileSettings() = viewModelScope.launch {
        _advancedSettingsState.update { it.copy(isLoading = true, error = null) }
        // Pre-populate from session immediately
        _advancedSettingsState.update { it.copy(
            username = session.getUsername(),
            email = session.getEmail()
        ) }
        try {
            // Then fetch latest from server
            val res = api.getProfileSettings()
            if (res.success && res.data != null) {
                _advancedSettingsState.update { it.copy(
                    isLoading = false,
                    username = res.data["username"] ?: session.getUsername(),
                    email = res.data["email"] ?: session.getEmail(),
                    phone = res.data["phone"] ?: ""
                ) }
            } else {
                _advancedSettingsState.update { it.copy(isLoading = false) }
            }
        } catch (e: Exception) {
            // Fallback to session data silently
            _advancedSettingsState.update { it.copy(isLoading = false) }
        }
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Chat & AI Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun sendChat(message: String) = viewModelScope.launch {
        _isChatLoading.value = true
        val userMsg = ChatMessage(role = "user", content = message)
        _chatHistory.value = _chatHistory.value + userMsg
        try {
            val slug = activeUnit.value?.slug ?: ""
            val history = _chatHistory.value.takeLast(10)
            val res = api.chat(ChatRequest(message = message, activeUnitSlug = slug, history = history))
            val reply = ChatMessage(role = "assistant", content = res.reply ?: "OK")
            _chatHistory.value = _chatHistory.value + reply
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

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sales Target Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadSalesTargets(periode: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getSalesTargets(unitId, periode)
            if (res.success) _salesTargetData.value = res.data
        } catch (e: Exception) { Napier.e("loadSalesTargets error", e) }
    }

    fun createSalesTarget(empId: Int?, empName: String, period: String, target: Double) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createSalesTarget(SalesTarget(employeeId = empId, employeeName = empName, periode = period, targetAmount = target, unitId = unitId))
            if (res.success) { loadSalesTargets(period); setSuccess("Target berhasil dibuat!") }
            else setError(res.message ?: "Gagal buat target")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteSalesTarget(targetId: Int) = viewModelScope.launch {
        try {
            val res = api.deleteSalesTarget(targetId)
            if (res.success) { loadSalesTargets(); setSuccess("Target berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus target")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Tax Rates Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadTaxRates() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getTaxRates(unitId)
            if (res.success) _taxRates.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTaxRates error", e) }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Stock Opname Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadStockOpnameList() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getStockOpnameList(unitId)
            if (res.success) _stockOpnameSessions.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadStockOpnameList error", e) }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Trash Products Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadTrashProducts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getTrashProducts(unitId)
            if (res.success) _trashProducts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadTrashProducts error", e) }
    }

    fun restoreProduct(productId: String) = viewModelScope.launch {
        try {
            val res = api.restoreProduct(productId)
            if (res.success) { loadTrashProducts(); loadProducts(); setSuccess("Produk dipulihkan") }
            else setError(res.message ?: "Gagal pulihkan produk")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Quotations Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadQuotations() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getQuotations(unitId)
            if (res.success) _quotations.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadQuotations error", e) }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sales Orders Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    fun loadSalesOrders() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getSalesOrders(unitId)
            if (res.success) _salesOrders.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadSalesOrders error", e) }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Low Stock / Notifications helpers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
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
                _notifications.value = res.data ?: emptyList()
                _unreadCount.value = res.data?.count { it.isRead == 0 } ?: 0
            }
        } catch (e: Exception) { Napier.e("loadNotifications error", e) }
    }
    fun logout() = viewModelScope.launch {
        session.clearSession()
        navigationManager.navigateToRoot(Screen.Login)
    }
    fun generateAiCaption(description: String, platform: String, onResult: (String) -> Unit) = viewModelScope.launch {
        try {
            val res = api.generateAiCaption(platform = platform, productName = description)
            if (res.success) onResult(res.data?.get("caption") ?: "")
            else onResult("")
        } catch (e: Exception) { onResult("") }
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
    fun updateSosmedPost(id: Int, platform: String, caption: String, imageUrl: String, scheduledAt: String?, status: String) = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.updateSocialPost(SocialPost(id = id, unitId = unitId, platform = platform, caption = caption, imageUrl = imageUrl, scheduledAt = scheduledAt ?: "", status = status))
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan berhasil diperbarui!") }
            else { _sosmedState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteSosmedPost(postId: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteSocialPost(postId, unitId)
            if (res.success) { loadSosmedPosts(); setSuccess("Postingan berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus postingan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun applyBusinessPlan(id: Int) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.applyBusinessPlan(id, unitId)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil diterapkan!") }
            else setError(res.message ?: "Gagal menerapkan business plan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createBusinessPlan(title: String, description: String, status: String) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val plan = BusinessPlan(title = title, description = description, status = status, unitId = unitId)
            val res = api.createBusinessPlan(plan)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil dibuat!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateBusinessPlan(id: Int, title: String, description: String, status: String) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val plan = BusinessPlan(id = id, title = title, description = description, status = status, unitId = unitId)
            val res = api.updateBusinessPlan(plan)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil diperbarui!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.message) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteBusinessPlan(id: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteBusinessPlan(id, unitId)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil dihapus!") }
            else setError(res.message ?: "Gagal hapus business plan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    private val _closingPeriods = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.ClosingPeriod>>(emptyList())
    val closingPeriods: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.ClosingPeriod>> = _closingPeriods.asStateFlow()
    fun loadClosingPeriods() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getClosingPeriods(unitId)
            if (res.success) _closingPeriods.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadClosingPeriods error", e) }
    }

    private val _bukuBesarData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.BukuBesarData?>(null)
    val bukuBesarData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.BukuBesarData?> = _bukuBesarData.asStateFlow()
    fun loadBukuBesar(coaId: Int, tahun: Int? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getBukuBesar(unitId, coaId, tahun)
            if (res.success) _bukuBesarData.value = res.data
        } catch (e: Exception) { Napier.e("loadBukuBesar error", e) }
    }

    private val _approvalsData = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.ApprovalsData?>(null)
    val approvalsData: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.ApprovalsData?> = _approvalsData.asStateFlow()
    fun loadApprovals() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getApprovals(unitId)
            if (res.success) _approvalsData.value = res.data
        } catch (e: Exception) { Napier.e("loadApprovals error", e) }
    }

    fun approveRequest(id: Int, status: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.approveRequest(id, status)
            if (res.success) { loadApprovals(); setSuccess("Permintaan berhasil ${if (status == "approve") "disetujui" else "ditolak"}") }
            else setError(res.message ?: "Gagal update persetujuan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createApprovalRequest(type: String, amount: Double, desc: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val empId = session.getUserId()
            val req = ApprovalRequest(type = type, amount = amount, description = desc, unitId = unitId, employeeId = empId)
            val res = api.createApprovalRequest(req)
            if (res.success) { loadApprovals(); setSuccess("Permintaan berhasil diajukan!") }
            else setError(res.message ?: "Gagal buat permintaan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    private val _budgetItems = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.BudgetItem>>(emptyList())
    val budgetItems: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.BudgetItem>> = _budgetItems.asStateFlow()
    fun loadBudgetItems(year: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getBudgetItems(unitId, year)
            if (res.success) _budgetItems.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadBudgetItems error", e) }
    }
}
