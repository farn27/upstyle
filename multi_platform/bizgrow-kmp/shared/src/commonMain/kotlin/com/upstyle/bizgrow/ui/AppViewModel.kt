package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.api.createHttpClient
import com.upstyle.bizgrow.data.*
import kotlinx.serialization.json.put

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
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.consumeAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.stateIn
import com.upstyle.bizgrow.cache.CacheManager
import com.upstyle.bizgrow.ui.state.*
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.debounce
import io.github.aakira.napier.Napier
import com.upstyle.bizgrow.utils.AuditLogger
import kotlinx.datetime.toLocalDateTime
import kotlinx.datetime.minus

/**
 * AppViewModel memegang semua state aplikasi.
 *
 * [session] diinjeksi dari DI — AppViewModel membuat dan me-recreate
 * UpstyleApi-nya sendiri agar token terbaru selalu digunakan setelah login.
 */
class AppViewModel(
    val session: SessionRepository,
    private val cacheManagerExternal: CacheManager? = null
) : ViewModel() {

    // ─── Internal API client management ───────────────────────────────────────
    /**
     * Mutable API instance — diganti ulang setelah login berhasil.
     * Akses melalui [api] property agar semua fungsi tetap pakai instance terbaru.
     */
    @Volatile private var _api: UpstyleApi = buildApi()

    private val api: UpstyleApi get() = _api

    // Flag: suppress 401 redirect selama proses login/session-restore
    // Menggunakan counter agar concurrent suppress (login + selectUnit) tidak saling override.
    // 401 hanya di-forward ke authEvent jika counter == 0.
    private val _suppressCount = java.util.concurrent.atomic.AtomicInteger(0)
    private val _suppress401: Boolean get() = _suppressCount.get() > 0

    // Expose suppress state ke UI agar App.kt bisa guard authEvent collection
    private val _isSuppressingAuth = MutableStateFlow(false)
    val isSuppressingAuth: StateFlow<Boolean> = _isSuppressingAuth.asStateFlow()

    private fun suppressAuth() {
        _suppressCount.incrementAndGet()
        _isSuppressingAuth.value = true
    }
    private fun releaseAuth() {
        val remaining = _suppressCount.decrementAndGet()
        if (remaining <= 0) _isSuppressingAuth.value = false
    }

    private fun buildApi(): UpstyleApi {
        val client = createHttpClient(session) {
            // Callback 401: hanya emit jika tidak sedang dalam proses login/restore
            if (!_suppress401) {
                viewModelScope.launch { _authEvent.emit(Unit) }
            } else {
                Napier.w("401 suppressed (login/restore in progress), count=${_suppressCount.get()}", tag = "AppViewModel")
            }
        }
        return UpstyleApi(client)
    }

    /** Dipanggil setelah session.saveSession() agar request berikutnya pakai token baru */
    fun refreshApiClient() {
        _api = buildApi()
        Napier.d("ApiClient refreshed with new token", tag = "AppViewModel")
    }

    // ─── Auth event (401 handler) ─────────────────────────────────────────────
    private val _authEvent = MutableSharedFlow<Unit>()
    val authEvent: SharedFlow<Unit> = _authEvent.asSharedFlow()

    // Navigation
    private val navigationManager = NavigationManager()
    val screen = navigationManager.screen
    val screenStack: List<Screen> get() = navigationManager.screenStack.value
    /** Ukuran back stack (untuk arah animasi transisi maju / mundur). */
    val screenStackFlow: StateFlow<Int> = navigationManager.screenStack
        .map { it.size }
        .stateIn(viewModelScope, SharingStarted.Eagerly, navigationManager.screenStack.value.size)
    val canNavigateBack: Boolean get() = navigationManager.canNavigateBack
    fun navigate(s: Screen) = navigationManager.navigate(s)
    fun navigateBack() = navigationManager.navigateBack()
    fun navigateToRoot(s: Screen) = navigationManager.navigateToRoot(s)

    // Cache
    private val cacheManager = cacheManagerExternal ?: CacheManager(session)

    // Global UI state
    private val _uiState = MutableStateFlow(UiState())
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private fun setLoading(v: Boolean) { _uiState.update { it.copy(isLoading = v, error = null) } }
    private fun setError(msg: String) { _uiState.update { it.copy(isLoading = false, error = msg) } }
    /** Tampilkan pesan error dari UI (mis. printer belum dikonfigurasi). */
    fun showError(msg: String) = setError(msg)
    fun showSuccess(msg: String) = setSuccess(msg)
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
    // ─── Toko online & metode bayar ───────────────────────────────────────────
    private val _storeSettings = kotlinx.coroutines.flow.MutableStateFlow<StoreSettings?>(null)
    val storeSettings: kotlinx.coroutines.flow.StateFlow<StoreSettings?> = _storeSettings.asStateFlow()

    fun loadStoreSettings() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getStoreSettings(unitId)
            if (res.success) _storeSettings.value = res.data
        } catch (e: Exception) { Napier.e("loadStoreSettings error", e) }
    }

    fun updateStoreSettings(settings: StoreSettings) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        setLoading(true)
        try {
            val res = api.updateStoreSettings(settings.copy(unitId = unitId))
            if (res.success) { _storeSettings.value = res.data ?: _storeSettings.value; setSuccess("Pengaturan toko disimpan") }
            else setError(res.message ?: "Gagal menyimpan pengaturan toko")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun saveStorePaymentConfig(clientKey: String, serverKey: String, sandbox: Boolean) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        setLoading(true)
        try {
            val res = api.saveStorePaymentConfig(unitId, clientKey, serverKey, sandbox)
            if (res.success) {
                _storeSettings.value = _storeSettings.value?.copy(payment = res.data ?: StorePaymentConfig())
                setSuccess("Konfigurasi pembayaran disimpan")
            } else setError(res.message ?: "Gagal simpan konfigurasi pembayaran")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Knowledge base layanan pelanggan ─────────────────────────────────────
    private val _knowledgeBase = kotlinx.coroutines.flow.MutableStateFlow<List<KnowledgeArticle>>(emptyList())
    val knowledgeBase: kotlinx.coroutines.flow.StateFlow<List<KnowledgeArticle>> = _knowledgeBase.asStateFlow()

    fun loadKnowledgeBase(query: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getKnowledgeBase(unitId, query)
            if (res.success) _knowledgeBase.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadKnowledgeBase error", e) }
    }

    fun createKnowledgeArticle(title: String, category: String, content: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        setLoading(true)
        try {
            val res = api.createKnowledgeArticle(KnowledgeArticle(unitId = unitId, title = title, category = category.ifBlank { "Umum" }, content = content))
            if (res.success) { loadKnowledgeBase(); setSuccess("Artikel disimpan") } else setError(res.message ?: "Gagal simpan artikel")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteKnowledgeArticle(id: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.deleteKnowledgeArticle(id, unitId)
            if (res.success) { loadKnowledgeBase(); setSuccess("Artikel dihapus") } else setError(res.message ?: "Gagal hapus artikel")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Pengaturan POS: fitur & produk tampil di kasir ──────────────────────
    private val _posFeatures = kotlinx.coroutines.flow.MutableStateFlow<PosFeatureSettings?>(null)
    val posFeatures: kotlinx.coroutines.flow.StateFlow<PosFeatureSettings?> = _posFeatures.asStateFlow()
    private val _posProducts = kotlinx.coroutines.flow.MutableStateFlow<List<PosProductItem>>(emptyList())
    val posProducts: kotlinx.coroutines.flow.StateFlow<List<PosProductItem>> = _posProducts.asStateFlow()

    fun loadPosFeatures() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosFeatures(unitId)
            if (res.success) _posFeatures.value = res.data
        } catch (e: Exception) { Napier.e("loadPosFeatures error", e) }
    }

    fun setPosFeature(key: String, enabled: Boolean) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        val sekarang = _posFeatures.value?.activeFeatures ?: return@launch
        try {
            val res = api.updatePosFeatures(unitId, sekarang + (key to enabled))
            if (res.success) _posFeatures.value = res.data ?: _posFeatures.value
            else setError(res.message ?: "Gagal menyimpan fitur POS")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun resetPosFeatures() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.resetPosFeatures(unitId)
            if (res.success) { _posFeatures.value = res.data; setSuccess("Fitur POS kembali ke default") }
            else setError(res.message ?: "Gagal reset fitur POS")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun loadPosProducts() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosProducts(unitId)
            if (res.success) _posProducts.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosProducts error", e) }
    }

    fun setProductShowInPos(productId: String, show: Boolean) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        // ubah tampilan dulu supaya terasa cepat, kembalikan kalau server menolak
        val sebelum = _posProducts.value
        _posProducts.value = sebelum.map { if (it.id == productId) it.copy(showInPos = show) else it }
        try {
            val res = api.setProductShowInPos(unitId, productId, show)
            if (!res.success) { _posProducts.value = sebelum; setError(res.message ?: "Gagal mengubah produk POS") }
        } catch (e: Exception) { _posProducts.value = sebelum; setError("Koneksi gagal: ${e.message}") }
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
            val res = api.updateLeadStatus(leadId, status, unitId)
            if (res.success) loadMarketingData()
        } catch (e: Exception) { Napier.e("updateLeadStatus error", e) }
    }
    
    private val _notifications = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.RiwayatAksi>>(emptyList())
    val notifications: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.RiwayatAksi>> = _notifications.asStateFlow()
    fun markAllRead() = viewModelScope.launch {
        try {
            api.markAllNotificationsRead()
            loadNotifications()
        } catch (e: Exception) { Napier.e("markAllRead error", e) }
    }

    /** Alias used by NotificationScreen */
    fun markAllNotificationsRead() = markAllRead()

    fun markNotifRead(notifId: Int) = viewModelScope.launch {
        try {
            api.markNotificationRead(notifId)
            _notifications.value = _notifications.value.map {
                if (it.id == notifId) it.copy(isRead = 1) else it
            }
            _unreadCount.value = _notifications.value.count { it.isRead == 0 }
        } catch (e: Exception) { Napier.e("markNotifRead error", e) }
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
    
    fun setGoogleSignInError(msg: String = "Login Google gagal") {
        setError(msg)
        setLoading(false)
    }

    fun loginWithGoogle(googleToken: String, callback: ((Boolean, String?) -> Unit)? = null) = viewModelScope.launch {
        suppressAuth()
        setLoading(true)
        try {
            val res = api.loginWithGoogle(GoogleAuthRequest(googleToken))
            if (res.success && res.data != null) {
                session.saveSession(res.data.token, res.data.user.role, res.data.user.email, res.data.user.username, res.data.user.id)
                refreshApiClient()
                clearMessages()
                setupSocket()
                loadUnits().join()
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
        } finally {
            setLoading(false)
            releaseAuth()
        }
    }

    fun login(email: String, pass: String, onResult: (Boolean, String?) -> Unit) = viewModelScope.launch {
        suppressAuth()
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
                // Recreate HTTP client dengan token baru agar semua request berikutnya terautentikasi
                refreshApiClient()
                clearMessages()
                // Load units dulu sebelum navigate — suppress masih aktif (counter > 0)
                // saat request pertama keluar, mencegah false-positive 401 redirect.
                loadUnits().join()
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
            releaseAuth()
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
    
    private val _laporanLengkap = MutableStateFlow<LaporanLengkap?>(null)
    val laporanLengkap: StateFlow<LaporanLengkap?> = _laporanLengkap.asStateFlow()
    private val _laporanMemuat = MutableStateFlow(false)
    val laporanMemuat: StateFlow<Boolean> = _laporanMemuat.asStateFlow()
    fun loadLaporanLengkap(tahun: Int, bulan: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _laporanMemuat.value = true
        try {
            val res = api.getLaporanLengkap(unitId, tahun, bulan)
            if (res.success) _laporanLengkap.value = res.data else setError(res.message ?: "Gagal memuat laporan")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        } finally { _laporanMemuat.value = false }
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
            val res = api.toggleKatalogPublish(id, isPublished, _activeUnitId.value)
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
    
    fun createUnit(nama: String, type: String) = createUnit(com.upstyle.bizgrow.data.CreateUnitRequest(name = nama, type = type))

    /** Buat pusat atau cabang dengan data lengkap (alamat, kontak, modal, induk). */
    fun createUnit(req: com.upstyle.bizgrow.data.CreateUnitRequest) = viewModelScope.launch {
        _uiState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.createUnit(req)
            if (res.success) {
                setSuccess(if (req.is_cabang) "Cabang berhasil ditambahkan" else "Bisnis berhasil ditambahkan")
                loadUnits()
            } else {
                setError(res.message ?: "Gagal menambah bisnis")
            }
        } catch (e: Exception) {
            setError("Gagal menambah bisnis: ${e.message}")
        }
    }

    fun deleteUnit(unitId: Int) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.deleteBusinessUnit(unitId)
            if (res.success) {
                if (_activeUnitId.value == unitId) {
                    _activeUnitId.value = 0
                    _financeData.value = null; _riwayat.value = null
                }
                loadUnits()
                setSuccess("Bisnis berhasil dihapus")
            } else setError(res.message ?: "Gagal hapus bisnis")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun updateUnitSettings(unitId: Int, req: com.upstyle.bizgrow.data.UpdateUnitSettingsRequest) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateUnitSettings(unitId, req)
            if (res.success) { loadUnits(); setSuccess("Pengaturan bisnis berhasil disimpan!") }
            else setError(res.message ?: "Gagal simpan pengaturan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    /** Buat / buat ulang link login staff; hasilnya (loginSlug) dikirim ke [onSelesai]. */
    fun updatePortal(unitId: Int, buatBaru: Boolean, onSelesai: (String) -> Unit = {}) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updatePortal(unitId, buatBaru)
            if (res.success) {
                loadUnits()
                setSuccess(if (buatBaru) "Link login staff diperbarui" else "Link login staff dibuat")
                onSelesai(res.data?.loginSlug ?: "")
            } else setError(res.message ?: "Gagal memperbarui link login staff")
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
            val res = api.deleteDepartment(id, unitId)
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
    fun updateDepartmentName(id: Int, name: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        try {
            val res = api.updateDepartmentName(id, unitId, name)
            if (res.success) { loadDepartments(); setSuccess("Departemen diperbarui") } else setError(res.message ?: "Gagal ubah departemen")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun tandaiPayrollLunas(ids: List<Int>) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (ids.isEmpty()) return@launch
        setLoading(true)
        try {
            val res = api.markPayrollPaid(unitId, ids)
            if (res.success) { loadHrData(); setSuccess("${ids.size} payroll ditandai lunas") } else setError(res.message ?: "Gagal menandai lunas")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Detail karyawan ───
    private val _hrDetail = MutableStateFlow<HrDetailData?>(null)
    val hrDetail: StateFlow<HrDetailData?> = _hrDetail.asStateFlow()
    private var karyawanDipilih = 0
    fun bukaKaryawan(id: Int) { karyawanDipilih = id; _hrDetail.value = null; navigate(Screen.EmployeeDetail) }
    fun loadHrDetail() = viewModelScope.launch {
        if (karyawanDipilih == 0) return@launch
        try {
            val res = api.getHrDetail(karyawanDipilih)
            if (res.success) _hrDetail.value = res.data else setError(res.message ?: "Gagal memuat karyawan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    /** Tambah komponen gaji (tunjangan/potongan); mengembalikan pesan galat (null = berhasil). */
    suspend fun tambahKomponenGaji(nama: String, nominal: Double, potongan: Boolean): String? = try {
        val res = api.komponenGaji(karyawanDipilih, kotlinx.serialization.json.buildJsonObject {
            put("action", "add-component")
            put("component", kotlinx.serialization.json.buildJsonObject {
                put("name", nama); put("amount", nominal); put("type", if (potongan) "deduction" else "addition")
            })
        })
        if (res.success) { loadHrDetail(); null } else (res.message ?: "Gagal menambah komponen")
    } catch (e: Exception) { "Koneksi gagal: ${e.message}" }

    fun hapusKomponenGaji(id: Int) = viewModelScope.launch {
        try {
            val res = api.komponenGaji(karyawanDipilih, kotlinx.serialization.json.buildJsonObject { put("action", "delete-component"); put("componentId", id) })
            if (res.success) loadHrDetail() else setError(res.message ?: "Gagal menghapus komponen")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun simpanKaryawan(data: kotlinx.serialization.json.JsonObject) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.updateHrKaryawan(karyawanDipilih, data)
            if (res.success) { loadHrDetail(); loadHrData(); setSuccess("Data karyawan diperbarui") } else setError(res.message ?: "Gagal menyimpan")
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
    


    
    private val _crmMemuat = kotlinx.coroutines.flow.MutableStateFlow(false)
    val crmMemuat: kotlinx.coroutines.flow.StateFlow<Boolean> = _crmMemuat.asStateFlow()

    /** Muat semua deal & kontak (halaman 100 baris, maksimal 10 halaman) — dulu hanya 20 baris pertama. */
    fun loadCrmData() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _crmMemuat.value = true
        try {
            val deals = mutableListOf<com.upstyle.bizgrow.data.CrmDeal>()
            var hal = 1
            while (hal <= 10) {
                val r = api.getCrmDeals(unitId, hal)
                if (!r.success) break
                deals += r.data
                if (!r.adaHalamanBerikut) break
                hal++
            }
            _crmDeals.value = deals
            val kontak = mutableListOf<com.upstyle.bizgrow.data.CrmContact>()
            hal = 1
            while (hal <= 10) {
                val r = api.getCrmContacts(unitId, hal)
                if (!r.success) break
                kontak += r.data
                if (!r.adaHalamanBerikut) break
                hal++
            }
            _crmContacts.value = kontak
        } catch (e: Exception) { Napier.e("loadCrmData error", e) }
        _crmMemuat.value = false
    }
    /** Muat ulang semua data CRM (deal, kontak, aktivitas, tugas) — pull-to-refresh / setelah ubah. */
    fun muatSemuaCrm() { loadCrmData(); loadCrmActivities(); loadCrmTasks() }

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
            val res = api.updateDealStage(UpdateDealStageRequest(dealId, stage, unitId))
            if (res.success) { loadCrmData(); setSuccess("Deal dipindah ke ${stage.lowercase().replaceFirstChar { it.uppercase() }}") }
            else setError(res.message ?: "Gagal memindah deal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun ubahDeal(dealId: Int, nama: String, nilai: Double) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.ubahDeal(dealId, nama, nilai)
            if (res.success) { loadCrmData(); setSuccess("Deal diperbarui") } else setError(res.message ?: "Gagal memperbarui deal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
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
    fun createDeal(contactName: String, companyName: String, dealValue: Double, stage: String, phone: String, namaDeal: String? = null, kontakId: Int? = null) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createDeal(CreateDealRequest(CreateDealBody(contactName, companyName, dealValue, stage, phone, unitId, kontakId, namaDeal?.takeIf { it.isNotBlank() })))
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
    fun ubahKontak(id: Int, nama: String, telepon: String, email: String, perusahaan: String, stage: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.ubahKontak(id, nama, telepon, email, perusahaan, stage)
            if (res.success) { loadCrmData(); setSuccess("Kontak diperbarui") } else setError(res.message ?: "Gagal memperbarui kontak")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun hapusKontak(id: Int) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.hapusKontak(id)
            if (res.success) { muatSemuaCrm(); setSuccess("Kontak dihapus") } else setError(res.message ?: "Gagal menghapus kontak")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun catatAktivitas(kontakId: Int, tipe: String, catatan: String) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createActivity(CreateActivityRequest(activity = CreateActivityBody(kontakId, tipe, catatan, unitId)))
            if (res.success) { loadCrmActivities(); setSuccess("Aktivitas dicatat") } else setError(res.message ?: "Gagal mencatat aktivitas")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun buatTugasCrm(deskripsi: String, kontakId: Int?, dealId: Int?, deadline: String?) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.buatTugasCrm(_activeUnitId.value, deskripsi, kontakId, dealId, deadline)
            if (res.success) { loadCrmTasks(); setSuccess("Tugas dibuat") } else setError(res.message ?: "Gagal membuat tugas")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun ubahTugasCrm(id: Int, status: String? = null, deskripsi: String? = null, deadline: String? = null) = viewModelScope.launch {
        try {
            val res = api.ubahTugasCrm(id, status, deskripsi, deadline)
            if (res.success) { loadCrmTasks(); if (status == null) setSuccess("Tugas diperbarui") } else setError(res.message ?: "Gagal memperbarui tugas")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun hapusTugasCrm(id: Int) = viewModelScope.launch {
        try {
            val res = api.hapusTugasCrm(id)
            if (res.success) { loadCrmTasks(); setSuccess("Tugas dihapus") } else setError(res.message ?: "Gagal menghapus tugas")
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
    private val _riwayat = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.FinanceData?>(null)
    /** Data untuk layar Riwayat Transaksi — selalu sepanjang waktu, terpisah dari filter periode dashboard. */
    val riwayat: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.FinanceData?> = _riwayat.asStateFlow()

    private var riwayatFilter = com.upstyle.bizgrow.data.RiwayatFilter()
    private val _riwayatMemuat = kotlinx.coroutines.flow.MutableStateFlow(false)
    val riwayatMemuat: kotlinx.coroutines.flow.StateFlow<Boolean> = _riwayatMemuat.asStateFlow()

    /** Muat halaman pertama riwayat (tanpa filter, atau dengan [filter]). */
    fun loadFinanceData(filter: com.upstyle.bizgrow.data.RiwayatFilter = com.upstyle.bizgrow.data.RiwayatFilter()) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        riwayatFilter = filter
        _riwayatMemuat.value = true
        try {
            val res = api.getRiwayatTransaksi(unitId, filter, offset = 0)
            if (res.success) _riwayat.value = res.data
        } catch (e: Exception) { Napier.e("loadFinanceData error", e) }
        _riwayatMemuat.value = false
    }

    /** Halaman berikutnya dengan filter yang sedang aktif. */
    fun muatRiwayatLagi() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        val sekarang = _riwayat.value ?: return@launch
        if (unitId == 0 || !sekarang.adaLagi || _riwayatMemuat.value) return@launch
        _riwayatMemuat.value = true
        try {
            val res = api.getRiwayatTransaksi(unitId, riwayatFilter, offset = sekarang.transactions.size)
            val baru = res.data
            if (res.success && baru != null) {
                _riwayat.value = sekarang.copy(transactions = (sekarang.transactions + baru.transactions).distinctBy { it.id }, adaLagi = baru.adaLagi)
            }
        } catch (e: Exception) { Napier.e("muatRiwayatLagi error", e) }
        _riwayatMemuat.value = false
    }
    // ─── Sinkron offline (opsi B: antrean dikirim ulang ke API biasa) ─────────
    private val jsonAntrean = kotlinx.serialization.json.Json { ignoreUnknownKeys = true; encodeDefaults = true }
    private val antreanOffline = com.upstyle.bizgrow.cache.SyncQueue(session)
    private val _antreanOfflineCount = kotlinx.coroutines.flow.MutableStateFlow(antreanOffline.size())
    /** Jumlah data yang menunggu dikirim (tampilkan sebagai badge "menunggu sinkron") */
    val antreanOfflineCount: kotlinx.coroutines.flow.StateFlow<Int> = _antreanOfflineCount.asStateFlow()
    private var sedangSinkron = false

    private fun simpanKeAntreanOffline(path: String, method: String, payload: String, entityType: String) {
        antreanOffline.enqueue(
            SyncQueueItem(
                id = "OFF-${currentTimeMillis()}-${kotlin.random.Random.nextInt(1_000_000)}",
                action = "CREATE",
                entityType = entityType,
                payload = payload,
                enqueuedAt = currentTimeMillis().toString(),
                path = path,
                method = method
            )
        )
        _antreanOfflineCount.value = antreanOffline.size()
        setSuccess("Offline: data disimpan di HP dan dikirim otomatis saat online")
    }

    /** Isi antrean offline yang belum terkirim (untuk layar Sinkronisasi). */
    fun daftarAntreanOffline(): List<com.upstyle.bizgrow.data.SyncQueueItem> = antreanOffline.getAll()
    /** Data offline yang ditolak server (tidak akan dikirim ulang). */
    fun daftarAntreanGagal(): List<com.upstyle.bizgrow.data.SyncQueueItem> = antreanOffline.getGagal()
    fun hapusAntreanGagal() { antreanOffline.hapusGagal() }
    /** true kalau sinkronisasi sedang berjalan */
    val sedangSinkronOffline: Boolean get() = sedangSinkron

    /** Kirim antrean offline. Aman dipanggil kapan saja (berulang tidak membuat data dobel). */
    fun sinkronkanOffline() = viewModelScope.launch {
        if (sedangSinkron || antreanOffline.isEmpty()) return@launch
        sedangSinkron = true
        try {
            val hasil = com.upstyle.bizgrow.cache.kirimAntreanOffline(antreanOffline, api)
            _antreanOfflineCount.value = hasil.tersisa
            if (hasil.terkirim > 0) { loadDashboard(); setSuccess("${hasil.terkirim} data offline berhasil dikirim") }
            if (hasil.ditolak > 0) setError("${hasil.ditolak} data offline ditolak server (data tidak valid)")
        } finally {
            sedangSinkron = false
        }
    }

    fun createTransaction(
        kategoriTrx: String, nominal: Double, keterangan: String,
        metodeBayar: String = "KAS", productId: String? = null, qty: Int = 1
    ) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        val req = CreateTransactionRequest(TransactionBody(unitId, kategoriTrx, nominal, keterangan, metodeBayar, null, productId, qty))
        try {
            val res = api.createTransaction(req)
            if (res.success) {
                loadDashboard()
                setSuccess("Transaksi berhasil disimpan!")
                sinkronkanOffline() // online lagi → kirim antrean yang tertunda
            } else setError(res.message ?: "Gagal simpan transaksi")
        } catch (e: Exception) {
            // Offline: simpan ke antrean, dikirim otomatis saat online (tidak tercatat dua kali)
            simpanKeAntreanOffline("api/app/finance", "POST", jsonAntrean.encodeToString(CreateTransactionRequest.serializer(), req), "transaction")
        }
    }

    /**
     * Simpan transaksi dengan data akuntansi double-entry (COA + akun kas).
     * Digunakan oleh TransactionEntryScreen.
     */
    fun createTransactionWithCoa(
        kategoriTrx: String,
        nominal: Double,
        keterangan: String,
        coaId: Int,
        kasCoaId: Int,
        productId: String? = null,
        qty: Int = 1,
        abcCategoryId: Int? = null
    ) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        val req = CreateTransactionRequest(
            TransactionBody(
                unitId = unitId,
                kategoriTrx = kategoriTrx.uppercase(),
                nominal = nominal,
                keterangan = keterangan,
                abcCategoryId = abcCategoryId,
                productId = productId,
                qty = qty,
                coaId = coaId,
                kasCoaId = kasCoaId
            )
        )
        try {
            val res = api.createTransaction(req)
            if (res.success) {
                loadDashboard()
                loadFinanceData(riwayatFilter)
                setSuccess("Transaksi berhasil disimpan!")
                navigateBack()
                sinkronkanOffline()
            } else setError(res.message ?: "Gagal simpan transaksi")
        } catch (e: Exception) {
            simpanKeAntreanOffline("api/app/finance", "POST", jsonAntrean.encodeToString(CreateTransactionRequest.serializer(), req), "transaction")
            navigateBack()
        }
    }
    fun deleteTransaction(transactionId: Int) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.deleteTransaction(transactionId, unitId)
            if (res.success) {
                loadDashboard()
                loadFinanceData(riwayatFilter)
                setSuccess("Transaksi berhasil dihapus")
            } else setError(res.message ?: "Gagal hapus transaksi")
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        }
    }
    private val _fixedAssets = kotlinx.coroutines.flow.MutableStateFlow<List<com.upstyle.bizgrow.data.FixedAsset>>(emptyList())
    val fixedAssets: kotlinx.coroutines.flow.StateFlow<List<com.upstyle.bizgrow.data.FixedAsset>> = _fixedAssets.asStateFlow()
    // ─── Master data: tambah / ubah / hapus ──────────────────────────────────
    private fun jalankanMasterData(
        pesanSukses: String,
        muatUlang: () -> Unit,
        aksi: suspend (unitId: Int) -> ApiResponse<Unit>
    ) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        setLoading(true)
        try {
            val res = aksi(unitId)
            if (res.success) { muatUlang(); setSuccess(pesanSukses) }
            else setError(res.message ?: "Gagal menyimpan")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createFixedAsset(asset: FixedAsset) =
        jalankanMasterData("Aset tetap ditambahkan", { loadFixedAssets() }) { api.createFixedAsset(asset.copy(unitId = it)) }
    fun updateFixedAsset(asset: FixedAsset) =
        jalankanMasterData("Aset tetap diperbarui", { loadFixedAssets() }) { api.updateFixedAsset(asset.copy(unitId = it)) }
    fun deleteFixedAsset(id: Int) =
        jalankanMasterData("Aset tetap dihapus", { loadFixedAssets() }) { api.deleteFixedAsset(id, it) }

    fun createTaxRate(tax: TaxRate) =
        jalankanMasterData("Pajak ditambahkan", { loadTaxRates() }) { api.createTaxRate(tax.copy(unitId = it)) }
    fun updateTaxRate(tax: TaxRate) =
        jalankanMasterData("Pajak diperbarui", { loadTaxRates() }) { api.updateTaxRate(tax.copy(unitId = it)) }
    fun deleteTaxRate(id: Int) =
        jalankanMasterData("Pajak dihapus", { loadTaxRates() }) { api.deleteTaxRate(id, it) }

    fun createBudgetItem(item: BudgetItem) =
        jalankanMasterData("Anggaran disimpan", { loadBudgetItems(item.tahun) }) { api.createBudgetItem(item.copy(unitId = it)) }
    fun updateBudgetItem(id: Int, tahun: Int, nominal: Double, keterangan: String?) =
        jalankanMasterData("Anggaran diperbarui", { loadBudgetItems(tahun) }) { api.updateBudgetItem(id, it, nominal, keterangan) }
    fun deleteBudgetItem(id: Int, tahun: Int) =
        jalankanMasterData("Anggaran dihapus", { loadBudgetItems(tahun) }) { api.deleteBudgetItem(id, it) }

    // ─── Kas masuk/keluar shift & laporan POS ───
    private val _kasShift = MutableStateFlow<List<PosCashTransaction>>(emptyList())
    val kasShift: StateFlow<List<PosCashTransaction>> = _kasShift.asStateFlow()
    fun loadKasShift(shiftId: Int) = viewModelScope.launch {
        try { val res = api.getPosCashTransactions(shiftId); if (res.success) _kasShift.value = res.data.orEmpty() }
        catch (e: Exception) { Napier.e("loadKasShift error", e) }
    }
    fun catatKasShift(shiftId: Int, type: String, amount: Double, ket: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        setLoading(true)
        try {
            val res = api.createPosCash(unitId, shiftId, type, amount, ket)
            if (res.success) { loadKasShift(shiftId); setSuccess(if (type == "CASH_IN") "Kas masuk dicatat" else "Kas keluar dicatat") } else setError(res.message ?: "Gagal mencatat kas")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    private val _posReport = MutableStateFlow<PosReport?>(null)
    val posReport: StateFlow<PosReport?> = _posReport.asStateFlow()
    fun loadPosReport() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try { val res = api.getPosReport(unitId); if (res.success) _posReport.value = res.data } catch (e: Exception) { Napier.e("loadPosReport error", e) }
    }

    // ─── Pesanan ditunda (hold) — disimpan di memori selama aplikasi terbuka ───
    data class PesananDitunda(val id: Long, val label: String, val isi: Map<Product, Int>, val customerId: Int?, val waktu: Long)
    private val _ditunda = MutableStateFlow<List<PesananDitunda>>(emptyList())
    val pesananDitunda: StateFlow<List<PesananDitunda>> = _ditunda.asStateFlow()
    fun tundaPesanan(label: String) {
        val isi = _cart.value
        if (isi.isEmpty()) return
        _ditunda.update { it + PesananDitunda(currentTimeMillis(), label.ifBlank { "Pesanan ${it.size + 1}" }, isi, _selectedCustomerId.value, currentTimeMillis()) }
        clearCart()
        setSuccess("Pesanan ditunda")
    }
    fun lanjutkanPesanan(id: Long) {
        val p = _ditunda.value.firstOrNull { it.id == id } ?: return
        _cart.value = p.isi
        _selectedCustomerId.value = p.customerId
        _ditunda.update { list -> list.filter { it.id != id } }
    }
    fun hapusPesananDitunda(id: Long) { _ditunda.update { list -> list.filter { it.id != id } } }

    private val _rekapPajak = MutableStateFlow<RekapPajak?>(null)
    val rekapPajak: StateFlow<RekapPajak?> = _rekapPajak.asStateFlow()
    fun loadRekapPajak(tahun: Int) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try { val res = api.getRekapPajak(unitId, tahun); if (res.success) _rekapPajak.value = res.data else setError(res.message ?: "Gagal memuat rekap pajak") }
        catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    private val _posQueue = MutableStateFlow<List<PosQueueItem>>(emptyList())
    val posQueue: StateFlow<List<PosQueueItem>> = _posQueue.asStateFlow()
    fun loadPosQueue() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getPosQueue(unitId)
            if (res.success) _posQueue.value = res.data?.queue.orEmpty()
        } catch (e: Exception) { Napier.e("loadPosQueue error", e) }
    }
    fun ubahStatusAntrean(orderId: Int, status: String) = viewModelScope.launch {
        try {
            val res = api.updatePosQueueStatus(orderId, status)
            if (res.success) loadPosQueue() else setError(res.message ?: "Gagal mengubah status")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ─── Detail PO (terima barang, tagihan, retur, bayar) ───
    private val _poDetail = MutableStateFlow<PoDetail?>(null)
    val poDetail: StateFlow<PoDetail?> = _poDetail.asStateFlow()
    private var poDipilih = 0
    fun bukaPo(poId: String) { poDipilih = poId.toIntOrNull() ?: 0; _poDetail.value = null; navigate(Screen.PoDetail) }
    fun loadPoDetail() = viewModelScope.launch {
        if (poDipilih == 0) return@launch
        try {
            val res = api.getPoDetail(poDipilih)
            if (res.success) _poDetail.value = res.data else setError(res.message ?: "Gagal memuat PO")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun aksiPo(aksi: String, pesan: String, tambahan: kotlinx.serialization.json.JsonObject = kotlinx.serialization.json.JsonObject(emptyMap())) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.aksiPo(poDipilih, aksi, tambahan)
            if (res.success) { loadPoDetail(); loadScmData(); setSuccess(pesan) } else setError(res.message ?: "Gagal memproses")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun createPosVoucher(v: PosVoucher) =
        jalankanMasterData("Voucher dibuat", { loadPosVouchers() }) { api.createPosVoucher(v.copy(unitId = it)) }
    fun updatePosVoucher(v: PosVoucher) =
        jalankanMasterData("Voucher diperbarui", { loadPosVouchers() }) { api.updatePosVoucher(v.copy(unitId = it)) }
    fun deletePosVoucher(id: Int) =
        jalankanMasterData("Voucher dinonaktifkan", { loadPosVouchers() }) { api.deletePosVoucher(id) }

    fun simpanKontakAkuntansi(c: AccountingContact) =
        jalankanMasterData(if (c.id == 0) "Kontak ditambahkan" else "Kontak diperbarui", { loadAccountingContacts() }) { api.simpanKontakAkuntansi(it, c) }
    fun hapusKontakAkuntansi(id: Int) =
        jalankanMasterData("Kontak dihapus", { loadAccountingContacts() }) { api.hapusKontakAkuntansi(it, id) }

    // ─── Wizard business plan ───
    var planWizardId: Int = 0
        private set
    fun bukaWizardPlan(id: Int) { planWizardId = id; navigate(Screen.PlanWizard) }
    suspend fun muatPlanLengkap(): kotlinx.serialization.json.JsonObject? =
        if (planWizardId == 0) null else try { api.getPlanLengkap(planWizardId) } catch (e: Exception) { setError("Koneksi gagal: ${e.message}"); null }
    suspend fun simpanPlanLengkap(body: kotlinx.serialization.json.JsonObject): Int? = try {
        val (id, err) = api.simpanPlanLengkap(body)
        if (id != null) { planWizardId = id; loadBusinessPlans() } else if (err != null) setError(err)
        id
    } catch (e: Exception) { setError("Koneksi gagal: ${e.message}"); null }
    suspend fun bantuanAiPlan(step: Int, field: String, kategori: String, konteks: kotlinx.serialization.json.JsonObject, mode: String): String? =
        try { api.aiPlanAssist(step, field, kategori, konteks, mode) } catch (e: Exception) { setError("AI tidak tersedia: ${e.message}"); null }

    fun createClosingPeriod(mulai: String, akhir: String, keterangan: String?) =
        jalankanMasterData("Periode berhasil dikunci", { loadClosingPeriods() }) { api.createClosingPeriod(it, mulai, akhir, keterangan) }

    fun bukaKembaliPeriode(id: Int) =
        jalankanMasterData("Periode dibuka kembali", { loadClosingPeriods() }) { api.bukaKembaliPeriode(it, id) }

    /** Simpan akun COA baru; mengembalikan pesan galat (null = berhasil) supaya form tetap terbuka bila gagal. */
    suspend fun simpanCoaBaru(kode: String, nama: String, tipe: String, normalBalance: String, deskripsi: String?): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.createCoa(unitId, kode, nama, tipe, normalBalance, deskripsi)
            if (res.success) { loadChartOfAccounts(); setSuccess("Akun COA dibuat"); null } else (res.message ?: "Gagal membuat akun")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

    /** Buat COA otomatis dengan AI; null = berhasil. */
    suspend fun buatCoaAi(deskripsi: String, tambahkan: Boolean): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.generateCoaAi(unitId, deskripsi, tambahkan)
            if (res.success) { loadChartOfAccounts(); setSuccess(res.message ?: "COA dibuat oleh AI"); null } else (res.message ?: "AI gagal membuat COA")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

    /** Template standar; null = berhasil. */
    suspend fun buatCoaTemplate(jenis: String): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.seedDefaultCoa(unitId, jenis)
            if (res.success) { loadChartOfAccounts(); setSuccess("COA standar dibuat"); null } else (res.message ?: "Gagal membuat COA")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

    fun createCoa(kode: String, nama: String, tipe: String, normalBalance: String, deskripsi: String?) =
        jalankanMasterData("Akun COA dibuat", { loadChartOfAccounts() }) { api.createCoa(it, kode, nama, tipe, normalBalance, deskripsi) }
    fun updateCoa(id: Int, nama: String, deskripsi: String?, aktif: Boolean) =
        jalankanMasterData("Akun COA diperbarui", { loadChartOfAccounts() }) { api.updateCoa(id, nama, deskripsi, aktif) }
    fun deleteCoa(id: Int) =
        jalankanMasterData("Akun COA dinonaktifkan", { loadChartOfAccounts() }) { api.deleteCoa(id) }

    fun seedDefaultCoa(type: String = "LAINNYA") =
        jalankanMasterData("COA standar dibuat", { loadChartOfAccounts() }) { api.seedDefaultCoa(it, type) }

    fun loadFixedAssets() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getFixedAssets(unitId)
            if (res.success) _fixedAssets.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadFixedAssets error", e) }
    }
    fun createEmployee(body: CreateEmployeeBody) = viewModelScope.launch {
        setLoading(true)
        val unitId = _activeUnitId.value
        try {
            val res = api.createEmployee(CreateEmployeeRequest(employee = body.copy(unitId = unitId)))
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
    /** Simpan jurnal manual; mengembalikan pesan galat (null = berhasil) supaya form tetap terbuka bila gagal. */
    suspend fun simpanJurnalManual(tanggal: String, memo: String?, referensi: String?, lines: List<CreateJournalLineBody>): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.createJournalEntry(unitId, CreateJournalRequest(tanggal, referensi, memo, lines))
            if (res.success) { loadJournalEntries(); setSuccess("Jurnal berhasil disimpan"); null } else (res.message ?: "Gagal menyimpan jurnal")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
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
    
    /** Pilihan tambahan saat bayar di kasir (jenis pesanan, meja, voucher, bayar terpisah, catatan). */
    data class PosCheckoutOpsi(
        val orderType: String = "TAKEAWAY",
        val meja: String? = null,
        val antrean: String? = null,
        val catatan: String? = null,
        val voucherKode: String? = null,
        val diterima: Double? = null,
        val kembalian: Double? = null,
        val split: List<SplitPayment>? = null,
        val kenaiPpn: Boolean = false,
        val ppnInklusif: Boolean = false
    )

    /** Validasi voucher ke server: (pesan, potongan) — potongan null bila tidak valid. */
    suspend fun cekVoucher(kode: String, totalBelanja: Double): Pair<String, Double?> {
        val unitId = _activeUnitId.value
        return try { api.validatePosVoucher(unitId, kode.trim().uppercase(), totalBelanja) }
        catch (e: Exception) { "Koneksi gagal: ${e.message}" to null }
    }

    fun checkout(metode: String, opsi: PosCheckoutOpsi = PosCheckoutOpsi(), onSuccess: (Boolean) -> Unit) = viewModelScope.launch {
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
                paymentMethod = if (!opsi.split.isNullOrEmpty()) "SPLIT" else metode,
                items = items,
                voucherCode = opsi.voucherKode?.takeIf { it.isNotBlank() },
                kenaiPpn = opsi.kenaiPpn,
                ppnInklusif = opsi.ppnInklusif,
                orderType = opsi.orderType,
                tableNumber = opsi.meja?.takeIf { it.isNotBlank() },
                queueNumber = opsi.antrean?.takeIf { it.isNotBlank() },
                notes = opsi.catatan?.takeIf { it.isNotBlank() },
                amountPaid = opsi.diterima,
                changeAmount = opsi.kembalian,
                payments = opsi.split?.takeIf { it.isNotEmpty() }
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


    /** Tambah kategori produk; mengembalikan pesan galat (null = berhasil). */
    suspend fun tambahKategoriProduk(nama: String): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.buatKategoriProduk(unitId, nama)
            if (res.success) { loadKategoriProduk(); null } else (res.message ?: "Gagal menambah kategori")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

    /** Hapus kategori (ditolak server bila masih dipakai produk); null = berhasil. */
    suspend fun hapusKategoriProduk(id: Int): String? = try {
        val res = api.hapusKategoriProduk(id)
        if (res.success) { loadKategoriProduk(); null } else (res.message ?: "Gagal menghapus kategori")
    } catch (e: Exception) { "Koneksi gagal: ${e.message}" }

    /** Unggah foto produk; null bila gagal. */
    suspend fun unggahFotoProduk(bytes: ByteArray): String? = try { api.uploadFotoProduk(bytes) } catch (e: Exception) { Napier.e("unggahFoto", e); null }

    /** Simpan produk dari form lengkap; mengembalikan pesan galat (null = berhasil) supaya form tetap terbuka bila gagal. */
    suspend fun simpanProdukForm(form: com.upstyle.bizgrow.data.ProdukForm, id: String?): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.simpanProdukForm(unitId, form, id)
            if (res.success) {
                loadProducts(); loadKategoriProduk()
                if (id != null) loadProductVariants(id)
                setSuccess(if (id == null) "Produk berhasil ditambahkan" else "Produk berhasil diperbarui"); null
            } else (res.message ?: "Gagal menyimpan produk")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

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
        setLoading(true)
        try {
            val res = api.updatePoStatus(UpdatePoStatusRequest(poId, status, unitId))
            if (res.success) {
                loadScmData()
                if (status == "RECEIVED") loadProducts() // stok bertambah
                setSuccess(res.message ?: "Status PO diperbarui")
            } else setError(res.message ?: "Gagal mengubah status PO")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    /** Buat purchase order satu barang (API mobile /api/app/scm action create-po). */
    fun createPurchaseOrder(supplierId: String, productId: String, qty: Int, unitCost: Double, onDone: (Boolean) -> Unit = {}) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        setLoading(true)
        try {
            val nomor = "PO-M${currentTimeMillis().toString().takeLast(8)}"
            val res = api.createPurchaseOrder(CreatePoRequest(po = CreatePoBody(nomor, supplierId, productId, qty, unitCost, unitCost * qty, unitId)))
            if (res.success) { loadScmData(); setSuccess("Purchase order $nomor dibuat"); onDone(true) }
            else { setError(res.message ?: "Gagal membuat PO"); onDone(false) }
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}"); onDone(false) }
    }
    private val _laporanPembelian = kotlinx.coroutines.flow.MutableStateFlow<com.upstyle.bizgrow.data.LaporanPembelian?>(null)
    val laporanPembelian: kotlinx.coroutines.flow.StateFlow<com.upstyle.bizgrow.data.LaporanPembelian?> = _laporanPembelian.asStateFlow()
    fun loadLaporanPembelian(dari: String, sampai: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getLaporanPembelian(unitId, dari, sampai)
            if (res.success) _laporanPembelian.value = res.data
        } catch (e: Exception) { Napier.e("loadLaporanPembelian error", e) }
    }

    /** Buat PO lengkap; mengembalikan pesan galat (null = berhasil) supaya form tetap terbuka bila gagal. */
    suspend fun buatPoLengkap(supplierId: String, items: List<Triple<String, Int, Double>>, diskon: Double, ongkir: Double, ppnPersen: Double, expectedDate: String?, catatan: String?): String? {
        val unitId = _activeUnitId.value
        if (unitId == 0) return "Pilih unit bisnis terlebih dahulu"
        return try {
            val res = api.buatPoLengkap(unitId, supplierId, items, diskon, ongkir, ppnPersen, expectedDate, catatan)
            if (res.success) { loadScmData(); setSuccess(res.message ?: "Purchase order dibuat"); null } else (res.message ?: "Gagal membuat PO")
        } catch (e: Exception) { "Koneksi gagal: ${e.message}" }
    }

    suspend fun ubahSupplier(s: Supplier, nama: String, kontak: String, telp: String, email: String, alamat: String, termin: Int): String? = try {
        val res = api.ubahSupplier(s.id, nama, kontak, telp, email, alamat, s.category, s.npwp, termin)
        if (res.success) { loadScmData(); setSuccess("Supplier diperbarui"); null } else (res.message ?: "Gagal memperbarui supplier")
    } catch (e: Exception) { "Koneksi gagal: ${e.message}" }

    fun aturSupplierAktif(s: Supplier, aktif: Boolean) = viewModelScope.launch {
        try {
            val res = api.aturSupplierAktif(s.id, aktif)
            if (res.success) { loadScmData(); setSuccess(if (aktif) "Supplier diaktifkan" else "Supplier dinonaktifkan") } else setError(res.message ?: "Gagal mengubah status supplier")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun deleteSupplier(supplierId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        setLoading(true)
        try {
            val res = api.deleteSupplier(supplierId, unitId)
            if (res.success) { loadScmData(); setSuccess("Supplier dihapus") }
            else setError(res.message ?: "Supplier tidak bisa dihapus")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
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
    private val _themeMode = MutableStateFlow(session.getThemeMode())
    /** "system" | "light" | "dark" — disimpan lokal supaya tema langsung berlaku saat aplikasi dibuka. */
    val themeMode: StateFlow<String> = _themeMode.asStateFlow()
    fun setThemeMode(mode: String) {
        session.setThemeMode(mode)
        _themeMode.value = mode
    }
    val advancedSettingsState: StateFlow<AdvancedSettingsState> = _advancedSettingsState.asStateFlow()

    // Chat & AI
    /** Chat Bizgrow AI (sesi, saran, grafik, kartu transaksi) — lihat [AiChatController]. */
    val ai: AiChatController by lazy {
        AiChatController(
            scope = viewModelScope,
            session = session,
            api = { api },
            units = { _units.value },
            activeUnit = { activeUnit.value },
            onError = { setError(it) },
            onTransaksiTersimpan = { loadDashboard(); loadFinanceData(riwayatFilter); setSuccess("Transaksi tersimpan") }
        )
    }

    /** Buka layar AI dan langsung kirim [prompt] (dipakai kartu AI di Beranda). */
    fun tanyaAi(prompt: String? = null) {
        navigate(Screen.AiChat)
        if (!prompt.isNullOrBlank()) { ai.muat(); ai.kirim(prompt) }
    }

    // ─── AI Entry (NLP Transaction) ───────────────────────────────────────────
    private val _isAiEntryLoading = MutableStateFlow(false)
    val isAiEntryLoading: StateFlow<Boolean> = _isAiEntryLoading.asStateFlow()

    private val _aiEntryResult = MutableStateFlow<AiEntryResult?>(null)
    val aiEntryResult: StateFlow<AiEntryResult?> = _aiEntryResult.asStateFlow()

    // ─── AI Kategori Suggestion ───────────────────────────────────────────────
    private val _aiKategoriSuggestion = MutableStateFlow<AiKategoriResult?>(null)
    val aiKategoriSuggestion: StateFlow<AiKategoriResult?> = _aiKategoriSuggestion.asStateFlow()

    // Internal flow untuk debounce AI kategori
    private val _keteranganFlow = MutableSharedFlow<String>(extraBufferCapacity = 1)

    // ─── AI Advisor (Financial) ───────────────────────────────────────────────
    private val _aiAdvisorResult = MutableStateFlow<String?>(null)
    val aiAdvisorResult: StateFlow<String?> = _aiAdvisorResult.asStateFlow()

    private val _isAiAdvisorLoading = MutableStateFlow(false)
    val isAiAdvisorLoading: StateFlow<Boolean> = _isAiAdvisorLoading.asStateFlow()

    // Error khusus AI Advisor — terpisah dari uiState.error global
    // agar error dari modul lain tidak muncul di tab Financial Advisor.
    private val _aiAdvisorError = MutableStateFlow<String?>(null)
    val aiAdvisorError: StateFlow<String?> = _aiAdvisorError.asStateFlow()

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
        sinkronkanOffline() // kirim data yang tertunda sejak app terakhir dibuka
        viewModelScope.launch {
            setupSocket()
        }
        
        // Restore session — jika sudah login sebelumnya, langsung ke Home
        if (session.isLoggedIn()) {
            suppressAuth()  // Increment counter — ditahan sampai loadUnits selesai
            // Restore active unit dari storage SEBELUM navigate
            val savedUnitId = session.getActiveUnitId()
            if (savedUnitId > 0) {
                _activeUnitId.value = savedUnitId
            }
            navigationManager.navigateToRoot(Screen.Home)
            // Load units setelah navigate agar tidak block
            viewModelScope.launch {
                try {
                    loadUnits().join()  // Tunggu sampai loadUnits benar-benar selesai
                } finally {
                    releaseAuth()  // Decrement counter — baru lepas guard setelah selesai
                }
            }
        }
        // Debounce AI Kategori: setiap kali keterangan berubah, tunggu 800ms lalu panggil API
        viewModelScope.launch {
            _keteranganFlow.debounce(800L).collect { teks ->
                // Baca unitId SAAT ini (bukan saat coroutine dibuat) agar tidak pakai unit lama
                val unitId = _activeUnitId.value
                if (teks.length >= 3 && unitId != 0) {
                    try {
                        val res = api.aiKategori(AiKategoriRequest(teks = teks, unitId = unitId))
                        // Validasi ulang unitId setelah response — cegah race saat ganti unit
                        if (_activeUnitId.value == unitId) {
                            if (res.success && res.data != null && (res.data.confidence) >= 60) {
                                _aiKategoriSuggestion.value = res.data
                            } else {
                                _aiKategoriSuggestion.value = null
                            }
                        }
                    } catch (e: Exception) {
                        // Diam — jangan interrupt user jika AI kategori gagal
                        Napier.w("aiKategori error (silent): ${e.message}", tag = "AppViewModel")
                        _aiKategoriSuggestion.value = null
                    }
                } else {
                    _aiKategoriSuggestion.value = null
                }
            }
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
        // Suppress 401-redirect selama proses inisialisasi unit.
        // Guard dipertahankan sampai SEMUA request (dashboard, products, orders, dll.)
        // benar-benar selesai — bukan hanya sampai dashboard selesai.
        suppressAuth()
        try {
            _activeUnitId.value = unitId
            val unit = _units.value.find { it.id == unitId }
            session.setActiveUnit(unitId, unit?.name ?: "", unit?.slug ?: "")
            if (unitId > 0) {
                SocketManager.joinUnit(unitId)
                // Reset all module data so they reload fresh for the new unit
                _financeData.value = null; _riwayat.value = null
                _hrData.value = null
                _scmData.value = null
                _marketingData.value = null
                _katalogData.value = null
                _products.value = emptyList()
                _orders.value = emptyList()
                // Reset AI state untuk unit baru
                _aiAdvisorResult.value = null
                _aiKategoriSuggestion.value = null
                _aiEntryResult.value = null
                // Jalankan semua request SECARA PARALEL dan tunggu semuanya selesai
                // sebelum melepas guard. Ini memastikan tidak ada satu pun request
                // yang masih jalan saat counter di-decrement ke 0.
                kotlinx.coroutines.coroutineScope {
                    val jobs = listOf(
                        loadDashboard(),
                        loadProducts(),
                        loadOrders(),
                        loadReceivables(),
                        loadPayables(),
                        loadNotifications(),
                        loadLowStock(),
                        loadChartOfAccounts()
                    )
                    jobs.forEach { it.join() }
                }
            }
        } finally {
            releaseAuth()  // Decrement counter — SETELAH semua request benar-benar selesai
        }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Dashboard ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    private val _periodeDashboard = MutableStateFlow("Semua")
    /** Preset periode dashboard (Semua / Hari Ini / Kemarin / 7 Hari / Bulan Ini). */
    val periodeDashboard: StateFlow<String> = _periodeDashboard.asStateFlow()

    fun setPeriodeDashboard(p: String) { if (p != _periodeDashboard.value) { _periodeDashboard.value = p; loadDashboard() } }

    /** Rentang tanggal (WIB) untuk sebuah preset; null,null = semua waktu. */
    private fun rentangPeriode(p: String): Pair<String?, String?> {
        val hariIni = kotlinx.datetime.Clock.System.now().toLocalDateTime(kotlinx.datetime.TimeZone.of("Asia/Jakarta")).date
        fun hari(offset: Int) = hariIni.minus(-offset, kotlinx.datetime.DateTimeUnit.DAY).toString()
        return when (p) {
            "Hari Ini" -> hari(0) to hari(0)
            "Kemarin" -> hari(-1) to hari(-1)
            "7 Hari" -> hari(-6) to hari(0)
            "Bulan Ini" -> kotlinx.datetime.LocalDate(hariIni.year, hariIni.monthNumber, 1).toString() to hari(0)
            else -> null to null
        }
    }

    fun loadDashboard() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _dashboardState.update { it.copy(isLoading = true, error = null) }
        try {
            val (mulai, akhir) = rentangPeriode(_periodeDashboard.value)
            val res = api.getFinanceData(unitId, mulai, akhir)
            if (res.success) {
                _dashboardState.update { it.copy(isLoading = false, financeData = res.data) }
                // Also update the separate financeData flow used by DashboardScreen
                _financeData.value = res.data
            } else {
                _dashboardState.update { it.copy(isLoading = false, error = res.error) }
            }
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
    private var _ordersPage = 1
    private var _ordersHasMore = true

    fun loadOrders() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _ordersPage = 1
        _ordersHasMore = true
        _ordersState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getOrders(unitId, page = 1)
            if (res.success) {
                _ordersHasMore = res.data.size >= 20
                _ordersPage = 2
                _orders.value = res.data
                _ordersState.update { it.copy(isLoading = false, orders = res.data) }
            } else {
                _ordersState.update { it.copy(isLoading = false, error = "Gagal memuat pesanan") }
            }
        } catch (e: Exception) {
            _ordersState.update { it.copy(isLoading = false, error = "Gagal memuat pesanan: ${e.message}") }
        }
    }

    fun loadMoreOrders() = viewModelScope.launch {
        if (!_ordersHasMore || _ordersState.value.isLoading) return@launch
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _ordersState.update { it.copy(isLoading = true) }
        try {
            val res = api.getOrders(unitId, page = _ordersPage)
            if (res.success) {
                val newOrders = res.data
                _ordersHasMore = newOrders.size >= 20
                _ordersPage++
                val merged = _ordersState.value.orders + newOrders
                _orders.value = merged
                _ordersState.update { it.copy(isLoading = false, orders = merged) }
            } else {
                _ordersState.update { it.copy(isLoading = false, error = res.error) }
            }
        } catch (e: Exception) {
            _ordersState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun resetOrders() {
        _ordersPage = 1
        _ordersHasMore = true
        _ordersState.update { it.copy(orders = emptyList()) }
        _orders.value = emptyList()
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

    fun payReceivable(invoiceId: Int, nominalBayar: Double, kasCoaId: Int? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.payReceivable(PayInvoiceRequest(invoiceId, nominalBayar, kasCoaId))
            if (res.success) { loadReceivables(); setSuccess("Pembayaran piutang berhasil!") }
            else setError(res.message ?: "Gagal bayar piutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    fun payPayable(invoiceId: Int, nominalBayar: Double, kasCoaId: Int? = null) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.payPayable(PayInvoiceRequest(invoiceId, nominalBayar, kasCoaId))
            if (res.success) { loadPayables(); setSuccess("Pembayaran hutang berhasil!") }
            else setError(res.message ?: "Gagal bayar hutang")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Journal / Jurnal Umum ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    private val _journalEntries = MutableStateFlow<List<JournalEntry>>(emptyList())
    val journalEntries: StateFlow<List<JournalEntry>> = _journalEntries.asStateFlow()

    private val _chartOfAccounts = MutableStateFlow<List<ChartOfAccount>>(emptyList())
    val chartOfAccounts: StateFlow<List<ChartOfAccount>> = _chartOfAccounts.asStateFlow()

    /** true jika COA sudah di-setup untuk unit aktif */
    val hasCoa: StateFlow<Boolean> = _chartOfAccounts
        .map { it.isNotEmpty() }
        .stateIn(viewModelScope, SharingStarted.Lazily, false)

    /** Akun kas/bank — filter dari COA tipe ASET_LANCAR dengan nama kas/bank/transfer */
    val kasAccounts: StateFlow<List<ChartOfAccount>> = _chartOfAccounts
        .map { list ->
            list.filter { coa ->
                coa.tipeAkun.equals("ASET_LANCAR", ignoreCase = true) &&
                    (coa.namaAkun.contains("kas", ignoreCase = true) ||
                     coa.namaAkun.contains("bank", ignoreCase = true) ||
                     coa.namaAkun.contains("transfer", ignoreCase = true))
            }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

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
            else _businessPlansState.update { it.copy(isLoading = false, error = res.error) }
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
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadSosmedPosts() = viewModelScope.launch {
        _sosmedState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.getSosmedPosts(unitId)
            if (res.success) _sosmedState.update { it.copy(isLoading = false, posts = res.data ?: emptyList()) }
            else _sosmedState.update { it.copy(isLoading = false, error = res.error) }
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
            else { _sosmedState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _sosmedState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadWebsiteSettings() = viewModelScope.launch {
        _websiteState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        try {
            val res = api.getWebsiteSettings(unitId)
            if (res.success) _websiteState.update { it.copy(isLoading = false, settings = res.data) }
            else _websiteState.update { it.copy(isLoading = false, error = res.error) }
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
            else { _websiteState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _websiteState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun loadHelpArticles() = viewModelScope.launch {
        _helpState.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getHelpArticles()
            if (res.success) _helpState.update { it.copy(isLoading = false, articles = res.data ?: emptyList()) }
            else _helpState.update { it.copy(isLoading = false, error = res.error) }
        } catch (e: Exception) {
            _helpState.update { it.copy(isLoading = false, error = "Gagal memuat bantuan: ${e.message}") }
        }
    }

    // ─── Help Center & Diagnostics ────────────────────────────────────────────

    fun loadContextualHelp(screenName: String) = viewModelScope.launch {
        _helpState.update { it.copy(isLoading = true) }
        try {
            val result = api.getContextualHelp(screenName)
            if (result.success) {
                val articles = result.data ?: emptyList()
                _helpState.update { state ->
                    val updated = state.contextualArticles.toMutableMap().also { it[screenName] = articles }
                    state.copy(isLoading = false, articles = articles, contextualArticles = updated)
                }
                // Cache for offline use — 24 hours TTL
                cacheManager.putListWithTtl(
                    "help_articles_$screenName", articles,
                    ttlMs = 24 * 60 * 60 * 1000L,
                    serializer = com.upstyle.bizgrow.data.HelpArticle.serializer()
                )
            } else {
                val cached = cacheManager.getListIfFresh(
                    "help_articles_$screenName",
                    com.upstyle.bizgrow.data.HelpArticle.serializer()
                )
                _helpState.update {
                    it.copy(isLoading = false, articles = cached ?: emptyList(), isOffline = cached != null)
                }
            }
        } catch (e: Exception) {
            val cached = cacheManager.getListIfFresh(
                "help_articles_$screenName",
                com.upstyle.bizgrow.data.HelpArticle.serializer()
            )
            _helpState.update {
                it.copy(
                    isLoading = false,
                    articles = cached ?: emptyList(),
                    error = if (cached == null) e.message else null,
                    isOffline = cached != null
                )
            }
        }
    }

    fun searchHelp(query: String) = viewModelScope.launch {
        if (query.isBlank()) {
            _helpState.update { it.copy(searchResults = emptyList()) }
            return@launch
        }
        _helpState.update { it.copy(isLoading = true) }
        try {
            val result = api.searchHelp(query)
            _helpState.update { it.copy(isLoading = false, searchResults = result.data ?: emptyList()) }
        } catch (e: Exception) {
            _helpState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun loadHelpFaqs(category: String? = null) = viewModelScope.launch {
        try {
            val result = api.getHelpFaqs(category)
            if (result.success) {
                _helpState.update { it.copy(faqs = result.data ?: emptyList()) }
            }
        } catch (_: Exception) {}
    }

    fun submitHelpTicket(title: String, description: String, priority: String = "medium") = viewModelScope.launch {
        val unitId = _activeUnitId.value.takeIf { it != 0 } ?: return@launch
        _helpState.update { it.copy(isLoading = true, error = null) }
        try {
            val req = com.upstyle.bizgrow.data.SubmitSupportTicketRequest(
                title = title,
                description = description,
                priority = priority,
                unitId = unitId
            )
            val result = api.submitSupportTicket(req)
            if (result.success) {
                _helpState.update { it.copy(isLoading = false) }
                setSuccess("Tiket dukungan berhasil dikirim!")
            } else {
                _helpState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _helpState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun runDiagnostics() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        _helpState.update { it.copy(isLoading = true) }
        try {
            val result = api.runDiagnostics(unitId)
            _helpState.update { it.copy(isLoading = false, diagnosticResult = result.data) }
        } catch (e: Exception) {
            _helpState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun clearHelpError() {
        _helpState.update { it.copy(error = null) }
    }

    fun loadLandingPages() = viewModelScope.launch {
        _landingPageState.update { it.copy(isLoading = true, error = null) }
        val unitId = _activeUnitId.value
        if (unitId == 0) { _landingPageState.update { it.copy(isLoading = false, error = "Pilih unit bisnis") }; return@launch }
        try {
            val res = api.getLandingPages(unitId)
            if (res.success) _landingPageState.update { it.copy(isLoading = false, pages = res.data ?: emptyList()) }
            else _landingPageState.update { it.copy(isLoading = false, error = res.error) }
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
            else { _landingPageState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _landingPageState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateLandingPage(page: LandingPage) = viewModelScope.launch {
        _landingPageState.update { it.copy(isLoading = true) }
        try {
            val res = api.updateLandingPage(page)
            if (res.success) { loadLandingPages(); setSuccess("Landing page berhasil diperbarui!") }
            else { _landingPageState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
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
            else _shopeeState.update { it.copy(isLoading = false, error = res.error) }
        } catch (e: Exception) { _shopeeState.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") } }
    }

    fun connectShopee(shopId: String, shopName: String, token: String) = viewModelScope.launch {
        _shopeeState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val res = api.connectShopee(ShopeeIntegration(unitId = unitId, shopId = shopId, shopName = shopName, accessToken = token, isActive = true))
            if (res.success) { _shopeeState.update { it.copy(isLoading = false, integration = res.data) }; setSuccess("Shopee berhasil terhubung!") }
            else { _shopeeState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
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
            else { _advancedSettingsState.update { it.copy(isSaving = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _advancedSettingsState.update { it.copy(isSaving = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun changePassword(currentPassword: String, newPassword: String) = viewModelScope.launch {
        _advancedSettingsState.update { it.copy(isSaving = true, error = null) }
        try {
            val res = api.changePassword(mapOf("currentPassword" to currentPassword, "newPassword" to newPassword))
            if (res.success) { _advancedSettingsState.update { it.copy(isSaving = false, successMessage = "Password berhasil diubah!") }; setSuccess("Password berhasil diubah!") }
            else { _advancedSettingsState.update { it.copy(isSaving = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _advancedSettingsState.update { it.copy(isSaving = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updatePreferences(darkMode: Boolean, notifEnabled: Boolean) = viewModelScope.launch {
        try {
            val res = api.updatePreferences(darkMode, notifEnabled)
            if (res.success) { _advancedSettingsState.update { it.copy(darkMode = darkMode, notifEnabled = notifEnabled) }; setThemeMode(if (darkMode) "dark" else "light"); setSuccess("Preferensi berhasil disimpan!") }
            else setError(res.message ?: "Gagal")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

    // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Chat & AI Methods ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
    // ─── AI Entry (NLP Transaction) ───────────────────────────────────────────

    /**
     * Proses teks natural language menjadi field transaksi via AI.
     * Guard: teksInput harus >= 5 karakter.
     */
    fun prosesAI(teksInput: String) = viewModelScope.launch {
        if (teksInput.length < 5) return@launch
        val unitId = _activeUnitId.value
        if (unitId == 0) { setError("Pilih unit bisnis terlebih dahulu"); return@launch }
        try {
            _isAiEntryLoading.value = true
            val res = api.aiEntry(AiEntryRequest(unitId = unitId, teksInput = teksInput))
            if (res.success && res.data != null) {
                val h = res.data.hasil
                _aiEntryResult.value = AiEntryResult(
                    productId = h.product_id,
                    qty = h.qty.takeIf { it > 0 } ?: 1,
                    kategori = h.kategori,
                    coaId = h.coa_id,
                    kasCoaId = h.kas_coa_id,
                    nominal = h.nominal,
                    catatan = h.catatan
                )
            } else {
                setError(res.message ?: "Gagal memproses AI")
                // Jangan ubah _aiEntryResult agar data user sebelumnya tidak hilang
            }
        } catch (e: Exception) {
            setError("Koneksi gagal: ${e.message}")
        } finally {
            _isAiEntryLoading.value = false
        }
    }

    fun clearAiEntryResult() {
        _aiEntryResult.value = null
    }

    /**
     * Dipanggil saat keterangan transaksi berubah.
     * Debounce 800ms di init{} akan memanggil AI kategori otomatis.
     */
    fun onKeteranganChanged(teks: String) = viewModelScope.launch {
        _keteranganFlow.emit(teks)
    }

    // ─── AI Financial Advisor ─────────────────────────────────────────────────

    /**
     * Panggil AI Financial Advisor.
     * Hasil disimpan dalam sesi (sampai ganti unit).
     */
    fun aiAdvisor(question: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) { _aiAdvisorError.value = "Pilih unit bisnis terlebih dahulu"; return@launch }
        try {
            _isAiAdvisorLoading.value = true
            _aiAdvisorError.value = null  // reset error sebelum request baru
            val res = api.aiAdvisor(AiAdvisorRequest(unitId = unitId, question = question))
            if (res.success && res.data != null) {
                _aiAdvisorResult.value = res.data.analysis
            } else {
                _aiAdvisorError.value = res.message ?: "Gagal mendapatkan analisis"
            }
        } catch (e: Exception) {
            _aiAdvisorError.value = "Koneksi gagal: ${e.message}"
        } finally {
            _isAiAdvisorLoading.value = false
        }
    }

    fun clearAiAdvisorResult() {
        _aiAdvisorResult.value = null
        _aiAdvisorError.value = null
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
            val res = api.deleteSalesTarget(targetId, _activeUnitId.value)
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
    fun buatPenawaran(customerId: Int?, validUntil: String?, notes: String?, items: List<ItemJual>) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.buatPenawaran(_activeUnitId.value, customerId, validUntil, notes, items)
            if (res.success) { loadQuotations(); setSuccess("Penawaran dibuat") } else setError(res.message ?: "Gagal membuat penawaran")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun ubahStatusPenawaran(id: Int, status: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.ubahStatusPenawaran(_activeUnitId.value, id, status)
            if (res.success) { loadQuotations(); setSuccess("Status penawaran: $status") } else setError(res.message ?: "Gagal mengubah status")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun jadikanSalesOrder(quotationId: Int) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.jadikanSalesOrder(_activeUnitId.value, quotationId)
            if (res.success) { loadQuotations(); loadSalesOrders(); setSuccess("Sales order dibuat dari penawaran") } else setError(res.message ?: "Gagal membuat sales order")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun buatSalesOrder(customerId: Int?, notes: String?, items: List<ItemJual>) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.buatSalesOrder(_activeUnitId.value, customerId, notes, items)
            if (res.success) { loadSalesOrders(); setSuccess("Sales order dibuat") } else setError(res.message ?: "Gagal membuat sales order")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }
    fun ubahStatusSalesOrder(id: Int, status: String) = viewModelScope.launch {
        setLoading(true)
        try {
            val res = api.ubahStatusSalesOrder(id, status)
            if (res.success) { loadSalesOrders(); setSuccess("Status sales order: $status") } else setError(res.message ?: "Gagal mengubah status")
        } catch (e: Exception) { setError("Koneksi gagal: ${e.message}") }
    }

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

    private val _notifAdaLagi = kotlinx.coroutines.flow.MutableStateFlow(false)
    val notifAdaLagi: kotlinx.coroutines.flow.StateFlow<Boolean> = _notifAdaLagi.asStateFlow()

    /** Muat notifikasi terbaru semua unit (halaman pertama). */
    fun loadNotifications() = viewModelScope.launch {
        try {
            val res = api.getNotifications(limit = 30)
            if (res.success) {
                val data = res.data ?: emptyList()
                _notifications.value = data
                _notifAdaLagi.value = data.size >= 30
                _unreadCount.value = data.count { it.isRead == 0 }
            }
        } catch (e: Exception) { Napier.e("loadNotifications error", e) }
    }

    /** Halaman berikutnya (id lebih kecil dari yang sudah dimuat). */
    fun loadMoreNotifications() = viewModelScope.launch {
        val terakhir = _notifications.value.minOfOrNull { it.id } ?: return@launch
        try {
            val res = api.getNotifications(limit = 30, before = terakhir)
            if (res.success) {
                val tambahan = res.data ?: emptyList()
                _notifications.value = (_notifications.value + tambahan).distinctBy { it.id }
                _notifAdaLagi.value = tambahan.size >= 30
            }
        } catch (e: Exception) { Napier.e("loadMoreNotifications error", e) }
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
            else { _sosmedState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
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
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
        } catch (e: Exception) { _businessPlansState.update { it.copy(isLoading = false, error = e.message) }; setError("Koneksi gagal: ${e.message}") }
    }

    fun updateBusinessPlan(id: Int, title: String, description: String, status: String) = viewModelScope.launch {
        _businessPlansState.update { it.copy(isLoading = true) }
        val unitId = _activeUnitId.value
        try {
            val plan = BusinessPlan(id = id, title = title, description = description, status = status, unitId = unitId)
            val res = api.updateBusinessPlan(plan)
            if (res.success) { loadBusinessPlans(); setSuccess("Business plan berhasil diperbarui!") }
            else { _businessPlansState.update { it.copy(isLoading = false, error = res.error) }; setError(res.message ?: "Gagal") }
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
    fun loadBukuBesar(coaId: Int, tahun: Int? = null, bulan: Int? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val res = api.getBukuBesar(unitId, coaId, tahun, bulan)
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
            val res = api.approveRequest(id, status, _activeUnitId.value)
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

    // ─── Subscription & Billing ───────────────────────────────────────────────

    private val _subscriptionState = MutableStateFlow(SubscriptionState())
    val subscriptionState: StateFlow<SubscriptionState> = _subscriptionState.asStateFlow()

    private val _billingState = MutableStateFlow(BillingState())
    val billingState: StateFlow<BillingState> = _billingState.asStateFlow()

    fun loadSubscriptionPlans() = viewModelScope.launch {
        _subscriptionState.update { it.copy(isLoading = true, error = null) }
        try {
            val result = api.getSubscriptionPlans()
            if (result.success) {
                _subscriptionState.update { it.copy(isLoading = false, plans = result.data ?: emptyList()) }
            } else {
                _subscriptionState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _subscriptionState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun loadCurrentSubscription() = viewModelScope.launch {
        _subscriptionState.update { it.copy(isLoading = true, error = null) }
        try {
            val result = api.getCurrentSubscription()
            if (result.success) {
                _subscriptionState.update { it.copy(isLoading = false, currentSubscription = result.data) }
            } else {
                _subscriptionState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _subscriptionState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun loadUsageMetrics() = viewModelScope.launch {
        try {
            val result = api.getUsageMetrics()
            if (result.success) {
                _subscriptionState.update { it.copy(usageMetrics = result.data) }
                // Notify if any metric is >= 80%
                result.data?.let { metrics ->
                    val productPct = if (metrics.maxProducts > 0) metrics.productCount * 100 / metrics.maxProducts else 0
                    val userPct = if (metrics.maxUsers > 0) metrics.userCount * 100 / metrics.maxUsers else 0
                    if (productPct >= 80 || userPct >= 80) {
                        // Surface warning through subscriptionState successMessage field (non-blocking)
                        _subscriptionState.update { it.copy(successMessage = "Peringatan: penggunaan mendekati batas paket Anda") }
                    }
                }
            }
        } catch (_: Exception) {}
    }

    fun loadInvoices() = viewModelScope.launch {
        try {
            val result = api.getInvoices()
            if (result.success) {
                _subscriptionState.update { it.copy(invoices = result.data ?: emptyList()) }
            }
        } catch (_: Exception) {}
    }

    fun initiatePayment(planId: String, paymentMethod: String = "credit_card") = viewModelScope.launch {
        _billingState.update { it.copy(isLoading = true, error = null) }
        try {
            val req = PaymentRequest(planId = planId, paymentMethod = paymentMethod)
            val result = api.initPaymentSession(_activeUnitId.value, req)
            if (result.success) {
                _billingState.update { it.copy(isLoading = false, activePaymentSession = result.data) }
            } else {
                _billingState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _billingState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun confirmPayment(sessionId: String) = viewModelScope.launch {
        _billingState.update { it.copy(isLoading = true, error = null) }
        try {
            val result = api.confirmPayment(sessionId)
            if (result.success) {
                _billingState.update { it.copy(isLoading = false, lastPaymentResult = result.data, activePaymentSession = null) }
                // Refresh subscription after successful payment
                loadCurrentSubscription()
                loadUsageMetrics()
            } else {
                _billingState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _billingState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun upgradePlan(planId: String, paymentMethod: String = "credit_card", billingCycle: String = "monthly") = viewModelScope.launch {
        auditLogger.log("upgrade_plan", "subscription", planId)
        _billingState.update { it.copy(isLoading = true, error = null) }
        try {
            // Paket baru aktif setelah pembayaran Midtrans lunas — buka halaman bayar dulu
            val result = api.initPaymentSession(_activeUnitId.value, PaymentRequest(planId = planId, paymentMethod = paymentMethod))
            if (result.success) {
                _billingState.update { it.copy(isLoading = false, activePaymentSession = result.data, successMessage = "Lanjutkan pembayaran di halaman Midtrans") }
            } else {
                _billingState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _billingState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    // ─── Product Variants & Bulk Operations ───────────────────────────────────

    private val _productVariantsState = MutableStateFlow(ProductVariantsState())
    val productVariantsState: StateFlow<ProductVariantsState> = _productVariantsState.asStateFlow()

    private val _bulkOperationState = MutableStateFlow(BulkOperationState())
    val bulkOperationState: StateFlow<BulkOperationState> = _bulkOperationState.asStateFlow()

    fun loadProductVariants(productId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _productVariantsState.update { it.copy(isLoading = true, error = null) }
        try {
            val result = api.getProductVariants(unitId, productId)
            if (result.success) {
                val variants = result.data ?: emptyList()
                _productVariantsState.update { state ->
                    val updated = state.variantsByProduct.toMutableMap().also { it[productId] = variants }
                    state.copy(isLoading = false, variantsByProduct = updated)
                }
            } else {
                _productVariantsState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun createVariant(variant: ProductVariant) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.createVariant(unitId, variant)
            if (result.success) loadProductVariants(variant.productId)
            else _productVariantsState.update { it.copy(error = result.error) }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(error = e.message) }
        }
    }

    fun updateVariant(variant: ProductVariant) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.updateVariant(unitId, variant)
            if (result.success) loadProductVariants(variant.productId)
            else _productVariantsState.update { it.copy(error = result.error) }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(error = e.message) }
        }
    }

    fun deleteVariant(variantId: String, productId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.deleteVariant(unitId, variantId)
            if (result.success) loadProductVariants(productId)
            else _productVariantsState.update { it.copy(error = result.error) }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(error = e.message) }
        }
    }

    fun loadStockMovements(productId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _productVariantsState.update { it.copy(isLoading = true) }
        try {
            val result = api.getStockMovements(unitId, productId)
            if (result.success) {
                _productVariantsState.update { it.copy(isLoading = false, stockMovements = result.data ?: emptyList()) }
            } else {
                _productVariantsState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun validatePricingStrategy(strategy: PricingStrategy, existing: List<PricingStrategy>): Boolean {
        return existing.none { other ->
            other.id != strategy.id &&
            other.productId == strategy.productId &&
            strategy.startDate <= other.endDate &&
            strategy.endDate >= other.startDate
        }
    }

    fun loadPricingStrategies(productId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.getPricingStrategies(unitId, productId)
            if (result.success) {
                _productVariantsState.update { it.copy(pricingStrategies = result.data ?: emptyList()) }
            }
        } catch (_: Exception) {}
    }

    fun applyPricingStrategy(strategy: PricingStrategy) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        val existing = _productVariantsState.value.pricingStrategies.filter { it.productId == strategy.productId }
        if (!validatePricingStrategy(strategy, existing)) {
            _productVariantsState.update { it.copy(error = "Tanggal pricing strategy overlap dengan yang sudah ada") }
            return@launch
        }
        try {
            val result = api.applyPricingStrategy(unitId, strategy)
            if (result.success) {
                loadPricingStrategies(strategy.productId)
                loadProducts()
                _uiState.update { it.copy(successMessage = result.message ?: "Harga jual diperbarui") }
            }
            else _productVariantsState.update { it.copy(error = result.error) }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(error = e.message) }
        }
    }

    fun bulkUpdateProducts(productIds: List<String>, type: String, payload: Map<String, String> = emptyMap()) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        auditLogger.log("bulk_update_products", "products", type)
        _bulkOperationState.update { it.copy(isRunning = true, error = null, progress = 0f) }
        try {
            val operation = BulkOperation(type = type, productIds = productIds, payload = payload)
            val result = api.bulkUpdateProducts(unitId, operation)
            if (result.success) {
                _bulkOperationState.update { it.copy(isRunning = false, progress = 1f, currentResult = result.data) }
            } else {
                _bulkOperationState.update { it.copy(isRunning = false, error = result.error) }
            }
        } catch (e: Exception) {
            _bulkOperationState.update { it.copy(isRunning = false, error = e.message) }
        }
    }

    fun clearBulkOperationResult() {
        _bulkOperationState.update { it.copy(currentResult = null, error = null, progress = 0f) }
    }

    fun rollbackBulkOperation(operationId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.rollbackBulkOperation(unitId, operationId)
            if (result.success) {
                clearBulkOperationResult()
                loadProducts()
                _uiState.update { it.copy(successMessage = "Operasi bulk berhasil di-rollback") }
            } else {
                _bulkOperationState.update { it.copy(error = result.error) }
            }
        } catch (e: Exception) {
            _bulkOperationState.update { it.copy(error = e.message) }
        }
    }

    fun deletePricingStrategy(strategyId: String, productId: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.deletePricingStrategy(unitId, strategyId)
            if (result.success) {
                loadPricingStrategies(productId)
                _uiState.update { it.copy(successMessage = "Aturan pricing dihapus") }
            } else {
                _productVariantsState.update { it.copy(error = result.error) }
            }
        } catch (e: Exception) {
            _productVariantsState.update { it.copy(error = e.message) }
        }
    }

    fun clearProductVariantsError() {
        _productVariantsState.update { it.copy(error = null) }
    }

    // ─── Export / Import ──────────────────────────────────────────────────────

    private val _exportImportState = MutableStateFlow(ExportImportState())
    val exportImportState: StateFlow<ExportImportState> = _exportImportState.asStateFlow()

    fun exportData(dataType: String, format: String, startDate: String? = null, endDate: String? = null) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        auditLogger.log("export_data", dataType, "export")
        _exportImportState.update { it.copy(isLoading = true, error = null, exportProgress = 0f) }
        try {
            _exportImportState.update { it.copy(exportProgress = 0.3f) }
            val result = api.exportData(unitId, dataType, format, startDate, endDate)
            if (result.success) {
                _exportImportState.update { it.copy(
                    isLoading = false, exportProgress = 1f,
                    lastExportResult = result.data,
                    successMessage = "Export berhasil: ${result.data?.fileName}"
                ) }
                loadExportHistory()
            } else {
                _exportImportState.update { it.copy(isLoading = false, exportProgress = 0f, error = result.error) }
            }
        } catch (e: Exception) {
            _exportImportState.update { it.copy(isLoading = false, exportProgress = 0f, error = e.message) }
        }
    }

    fun validateImportFile(dataType: String, fileBase64: String, fileName: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        _exportImportState.update { it.copy(isLoading = true, error = null, validationResult = null) }
        try {
            val result = api.validateImportFile(unitId, dataType, fileBase64, fileName)
            _exportImportState.update { it.copy(isLoading = false, validationResult = result.data) }
        } catch (e: Exception) {
            _exportImportState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun importData(dataType: String, fileBase64: String, fileName: String) = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        auditLogger.log("import_data", dataType, "import")
        _exportImportState.update { it.copy(isLoading = true, error = null) }
        try {
            val result = api.importData(unitId, dataType, fileBase64, fileName)
            if (result.success) {
                _exportImportState.update { it.copy(
                    isLoading = false,
                    lastImportResult = result.data,
                    successMessage = "Import berhasil: ${result.data?.importedCount} data diimport"
                ) }
            } else {
                _exportImportState.update { it.copy(isLoading = false, error = result.error) }
            }
        } catch (e: Exception) {
            _exportImportState.update { it.copy(isLoading = false, error = e.message) }
        }
    }

    fun loadExportHistory() = viewModelScope.launch {
        val unitId = _activeUnitId.value
        if (unitId == 0) return@launch
        try {
            val result = api.getExportHistory(unitId)
            if (result.success) {
                _exportImportState.update { it.copy(exportHistory = result.data ?: emptyList()) }
            }
        } catch (_: Exception) {}
    }

    fun clearExportImportMessages() {
        _exportImportState.update { it.copy(error = null, successMessage = null, exportProgress = 0f) }
    }

    // ─── Session Timeout ─────────────────────────────────────────────────────────
    private var _lastActivityMs = currentTimeMillis()
    private val SESSION_TIMEOUT_MS = 30 * 60 * 1000L // 30 minutes

    fun recordActivity() {
        _lastActivityMs = currentTimeMillis()
    }

    fun checkSessionTimeout() {
        if (currentTimeMillis() - _lastActivityMs > SESSION_TIMEOUT_MS) {
            viewModelScope.launch { _authEvent.emit(Unit) }
        }
    }

    // ─── Audit Logger ─────────────────────────────────────────────────────────────
    private val auditLogger = AuditLogger(
        saveToCache = { key, value -> session.saveToCache(key, value) },
        loadFromCache = { key -> session.loadFromCache(key) }
    )

    fun getAuditLog(count: Int = 50): List<com.upstyle.bizgrow.utils.AuditEntry> =
        auditLogger.getRecent(count)
}
