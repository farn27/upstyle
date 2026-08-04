package com.upstyle.bizgrow.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.upstyle.bizgrow.api.UpstyleApi
import com.upstyle.bizgrow.data.*
import com.upstyle.bizgrow.ui.state.PosState
import io.github.aakira.napier.Napier
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

/**
 * Task 8: Dedicated ViewModel for POS functionality
 * Extracted from AppViewModel to improve separation of concerns
 */
class PosViewModel(
    private val api: UpstyleApi,
    private val getActiveUnitId: () -> Int
) : ViewModel() {
    
    // ─── POS State ────────────────────────────────────────────────────────────
    private val _state = MutableStateFlow(PosState())
    val state: StateFlow<PosState> = _state.asStateFlow()
    
    // ─── Cart Management ──────────────────────────────────────────────────────
    private val _cart = MutableStateFlow<Map<Product, Int>>(emptyMap())
    val cart: StateFlow<Map<Product, Int>> = _cart.asStateFlow()
    
    val cartTotal: StateFlow<Double> = _cart.map { 
        it.entries.sumOf { e -> e.key.hargaJual * e.value } 
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)
    
    val cartItemCount: StateFlow<Int> = _cart.map { 
        it.values.sum() 
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)
    
    // ─── POS Data ─────────────────────────────────────────────────────────────
    private val _posData = MutableStateFlow<PosData?>(null)
    val posData: StateFlow<PosData?> = _posData.asStateFlow()
    
    // ─── Customer & Discount ──────────────────────────────────────────────────
    private val _selectedCustomerId = MutableStateFlow<Int?>(null)
    val selectedCustomerId: StateFlow<Int?> = _selectedCustomerId.asStateFlow()
    
    private val _diskon = MutableStateFlow(0.0)
    val diskon: StateFlow<Double> = _diskon.asStateFlow()
    
    val finalTotal: StateFlow<Double> = combine(cartTotal, diskon) { total, discount ->
        total - discount
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)
    
    // ─── POS Shifts ───────────────────────────────────────────────────────────
    private val _posShifts = MutableStateFlow<List<PosShift>>(emptyList())
    val posShifts: StateFlow<List<PosShift>> = _posShifts.asStateFlow()
    
    private val _activeShift = MutableStateFlow<PosShift?>(null)
    val activeShift: StateFlow<PosShift?> = _activeShift.asStateFlow()
    
    // ─── POS Returns ──────────────────────────────────────────────────────────
    private val _posReturns = MutableStateFlow<List<PosReturn>>(emptyList())
    val posReturns: StateFlow<List<PosReturn>> = _posReturns.asStateFlow()
    
    // ─── POS Cash & Vouchers ──────────────────────────────────────────────────
    private val _posCashTransactions = MutableStateFlow<List<PosCashTransaction>>(emptyList())
    val posCashTransactions: StateFlow<List<PosCashTransaction>> = _posCashTransactions.asStateFlow()
    
    private val _posVouchers = MutableStateFlow<List<PosVoucher>>(emptyList())
    val posVouchers: StateFlow<List<PosVoucher>> = _posVouchers.asStateFlow()
    
    // ─── Methods ──────────────────────────────────────────────────────────────
    
    fun loadPosData() = viewModelScope.launch {
        val unitId = getActiveUnitId()
        if (unitId == 0) return@launch
        _state.update { it.copy(isLoading = true, error = null) }
        try {
            val res = api.getPosData(unitId)
            if (res.success) {
                _posData.value = res.data
                _state.update { it.copy(isLoading = false, posData = res.data) }
            } else {
                _state.update { it.copy(isLoading = false, error = res.message ?: "Gagal memuat data POS") }
            }
        } catch (e: Exception) {
            Napier.e("loadPosData error", e)
            _state.update { it.copy(isLoading = false, error = "Gagal memuat data POS: ${e.message}") }
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
    
    fun updateCartQuantity(product: Product, qty: Int) {
        val current = _cart.value.toMutableMap()
        if (qty <= 0) {
            current.remove(product)
        } else {
            current[product] = qty
        }
        _cart.value = current
    }
    
    fun clearCart() {
        _cart.value = emptyMap()
        _selectedCustomerId.value = null
        _diskon.value = 0.0
    }
    
    fun setCustomer(customerId: Int?) { 
        _selectedCustomerId.value = customerId 
    }
    
    fun setDiskon(diskon: Double) { 
        _diskon.value = diskon 
    }
    
    fun checkout(
        paymentMethod: String, 
        onSuccess: ((Boolean) -> Unit)? = null, 
        onProductsUpdated: () -> Unit = {},
        onDashboardUpdated: () -> Unit = {}
    ) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        val unitId = getActiveUnitId()
        val cartItems = _cart.value
        if (cartItems.isEmpty()) { 
            _state.update { it.copy(isLoading = false, error = "Keranjang kosong") }
            return@launch 
        }
        
        val subtotal = cartItems.entries.sumOf { e -> e.key.hargaJual * e.value }
        val diskon = _diskon.value
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
                onProductsUpdated()
                onDashboardUpdated()
                _state.update { it.copy(isLoading = false, successMessage = "Transaksi berhasil! Total: Rp ${"%,.0f".format(total)}") }
                onSuccess?.invoke(true)
            } else {
                _state.update { it.copy(isLoading = false, error = res.message ?: "Checkout gagal") }
                onSuccess?.invoke(false)
            }
        } catch (e: Exception) {
            _state.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") }
            onSuccess?.invoke(false)
        }
    }
    
    // ─── POS Shifts Management ────────────────────────────────────────────────
    fun loadPosShifts() = viewModelScope.launch {
        val unitId = getActiveUnitId()
        if (unitId == 0) return@launch
        try {
            val res = api.getPosShifts(unitId)
            if (res.success) {
                _posShifts.value = res.data ?: emptyList()
                _activeShift.value = res.data?.firstOrNull { it.status == "OPEN" }
            }
        } catch (e: Exception) { Napier.e("loadPosShifts error", e) }
    }
    
    fun openShift(modalAwal: Double, onSuccess: (Boolean) -> Unit = {}) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        val unitId = getActiveUnitId()
        try {
            val res = api.openShift(OpenShiftRequest(unitId = unitId, modalAwal = modalAwal))
            if (res.success) { 
                loadPosShifts()
                _state.update { it.copy(isLoading = false, successMessage = "Shift berhasil dibuka!") }
                onSuccess(true)
            } else {
                _state.update { it.copy(isLoading = false, error = res.message ?: "Gagal buka shift") }
                onSuccess(false)
            }
        } catch (e: Exception) { 
            _state.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") }
            onSuccess(false)
        }
    }
    
    fun closeShift(shiftId: Int, kasAkhirAktual: Double, catatan: String = "", onSuccess: (Boolean) -> Unit = {}) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        val unitId = getActiveUnitId()
        try {
            val res = api.closeShift(CloseShiftRequest(shiftId = shiftId, kasAkhirAktual = kasAkhirAktual, catatan = catatan, unitId = unitId))
            if (res.success) { 
                loadPosShifts()
                _activeShift.value = null
                _state.update { it.copy(isLoading = false, successMessage = "Shift berhasil ditutup!") }
                onSuccess(true)
            } else {
                _state.update { it.copy(isLoading = false, error = res.message ?: "Gagal tutup shift") }
                onSuccess(false)
            }
        } catch (e: Exception) { 
            _state.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") }
            onSuccess(false)
        }
    }
    
    // ─── POS Returns ──────────────────────────────────────────────────────────
    fun loadPosReturns() = viewModelScope.launch {
        val unitId = getActiveUnitId()
        if (unitId == 0) return@launch
        try {
            val res = api.getPosReturns(unitId)
            if (res.success) _posReturns.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosReturns error", e) }
    }
    
    fun createReturn(orderId: String, items: List<ReturnItem>, reason: String, onSuccess: (Boolean) -> Unit = {}) = viewModelScope.launch {
        _state.update { it.copy(isLoading = true, error = null) }
        val unitId = getActiveUnitId()
        try {
            val res = api.createReturn(CreateReturnRequest(orderId = orderId, items = items, reason = reason, unitId = unitId))
            if (res.success) { 
                loadPosReturns()
                loadPosData()
                _state.update { it.copy(isLoading = false, successMessage = "Retur berhasil diproses!") }
                onSuccess(true)
            } else {
                _state.update { it.copy(isLoading = false, error = res.message ?: "Gagal proses retur") }
                onSuccess(false)
            }
        } catch (e: Exception) { 
            _state.update { it.copy(isLoading = false, error = "Koneksi gagal: ${e.message}") }
            onSuccess(false)
        }
    }
    
    // ─── POS Cash & Vouchers ──────────────────────────────────────────────────
    fun loadPosCashTransactions(shiftId: Int) = viewModelScope.launch {
        try {
            val res = api.getPosCashTransactions(shiftId)
            if (res.success) _posCashTransactions.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosCashTransactions error", e) }
    }
    
    fun loadPosVouchers() = viewModelScope.launch {
        val unitId = getActiveUnitId()
        if (unitId == 0) return@launch
        try {
            val res = api.getPosVouchers(unitId)
            if (res.success) _posVouchers.value = res.data ?: emptyList()
        } catch (e: Exception) { Napier.e("loadPosVouchers error", e) }
    }
    
    fun clearMessages() {
        _state.update { it.copy(error = null, successMessage = null) }
    }
}
