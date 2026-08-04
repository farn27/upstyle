package com.upstyle.bizgrow.ui.state

import com.upstyle.bizgrow.data.*

/**
 * Separate loading/error states per feature domain.
 * This prevents one feature's loading state from blocking the entire UI.
 */

// ─── Auth State ───────────────────────────────────────────────────────────────
data class AuthState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val isLoggedIn: Boolean = false,
    val currentUser: UserInfo? = null
)

// ─── Units State ──────────────────────────────────────────────────────────────
data class UnitsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val units: List<BusinessUnit> = emptyList(),
    val activeUnitId: Int = 0,
    val activeUnit: BusinessUnit? = null
)

// ─── Dashboard/Finance State ─────────────────────────────────────────────────
data class DashboardState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val financeData: FinanceData? = null
)

// ─── Products State ───────────────────────────────────────────────────────────
data class ProductsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val products: List<Product> = emptyList(),
    val stockLogs: List<StockLog> = emptyList(),
    val kategoriProduk: List<KategoriProduk> = emptyList()
)

// ─── POS State ────────────────────────────────────────────────────────────────
data class PosState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val posData: PosData? = null,
    val cart: Map<Product, Int> = emptyMap(),
    val selectedCustomerId: Int? = null,
    val diskon: Double = 0.0
) {
    val cartTotal: Double
        get() = cart.entries.sumOf { (product, qty) -> product.hargaJual * qty }
    
    val cartItemCount: Int
        get() = cart.values.sum()
    
    val finalTotal: Double
        get() = cartTotal - diskon
}

// ─── HR State ─────────────────────────────────────────────────────────────────
data class HrState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val hrData: HrData? = null
)

// ─── CRM State ────────────────────────────────────────────────────────────────
data class CrmState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val deals: List<CrmDeal> = emptyList(),
    val contacts: List<CrmContact> = emptyList(),
    val activities: List<CrmActivity> = emptyList()
)

// ─── SCM State ────────────────────────────────────────────────────────────────
data class ScmState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val scmData: ScmData? = null
)

// ─── Finance AR/AP State ──────────────────────────────────────────────────────
data class FinanceArApState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val receivables: List<Receivable> = emptyList(),
    val payables: List<Payable> = emptyList(),
    val accountingContacts: List<AccountingContact> = emptyList()
)

// ─── CS State ─────────────────────────────────────────────────────────────────
data class CsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val tickets: List<Ticket> = emptyList(),
    val ticketDetail: TicketDetail? = null
)

// ─── Orders State ─────────────────────────────────────────────────────────────
data class OrdersState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val orders: List<Order> = emptyList(),
    val orderDetail: Order? = null
)

// ─── Marketing State ──────────────────────────────────────────────────────────
data class MarketingState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val marketingData: MarketingData? = null,
    val campaigns: List<MarketingCampaign> = emptyList()
)

// ─── Sales Targets State ──────────────────────────────────────────────────────
data class SalesTargetsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val targets: List<SalesTarget> = emptyList()
)

// ─── Approvals State ──────────────────────────────────────────────────────────
data class ApprovalsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val requests: List<ApprovalRequest> = emptyList()
)

// ─── Katalog State ────────────────────────────────────────────────────────────
data class KatalogState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val products: List<KatalogProduct> = emptyList()
)

// ─── Departments State ────────────────────────────────────────────────────────
data class DepartmentsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val departments: List<Department> = emptyList()
)

// ─── COA State ────────────────────────────────────────────────────────────────
data class CoaState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val accounts: List<CoaAccount> = emptyList()
)

// ─── Payroll State ────────────────────────────────────────────────────────────
data class PayrollState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val payrolls: List<Payroll> = emptyList()
)
