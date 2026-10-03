package com.upstyle.bizgrow.ui.state

import com.upstyle.bizgrow.data.*

/**
 * Separate loading/error states per feature domain.
 * This prevents one feature's loading state from blocking the entire UI.
 */

// â”€â”€â”€ Auth State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class AuthState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val isLoggedIn: Boolean = false,
    val currentUser: UserInfo? = null
)

// â”€â”€â”€ Units State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class UnitsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val units: List<BusinessUnit> = emptyList(),
    val activeUnitId: Int = 0,
    val activeUnit: BusinessUnit? = null
)

// â”€â”€â”€ Dashboard/Finance State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class DashboardState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val financeData: FinanceData? = null
)

// â”€â”€â”€ Products State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class ProductsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val products: List<Product> = emptyList(),
    val stockLogs: List<StockLog> = emptyList(),
    val kategoriProduk: List<KategoriProduk> = emptyList()
)

// â”€â”€â”€ POS State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class PosState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
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

// â”€â”€â”€ HR State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class HrState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val hrData: HrData? = null
)

// â”€â”€â”€ CRM State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class CrmState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val deals: List<CrmDeal> = emptyList(),
    val contacts: List<CrmContact> = emptyList(),
    val activities: List<CrmActivity> = emptyList()
)

// â”€â”€â”€ SCM State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class ScmState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val scmData: ScmData? = null
)

// â”€â”€â”€ Finance AR/AP State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class FinanceArApState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val receivables: List<Receivable> = emptyList(),
    val payables: List<Payable> = emptyList(),
    val accountingContacts: List<AccountingContact> = emptyList()
)

// â”€â”€â”€ CS State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class CsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val tickets: List<SupportTicket> = emptyList(),
    val ticketDetail: SupportTicket? = null
)

// â”€â”€â”€ Orders State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class OrdersState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val orders: List<EcommerceOrder> = emptyList(),
    val orderDetail: EcommerceOrder? = null
)

// â”€â”€â”€ Marketing State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class MarketingState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val marketingData: MarketingData? = null,
    val campaigns: List<MarketingCampaign> = emptyList()
)

// â”€â”€â”€ Sales Targets State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class SalesTargetsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val targets: List<SalesTarget> = emptyList()
)

// â”€â”€â”€ Approvals State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class ApprovalsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val requests: List<ApprovalRequest> = emptyList()
)

// â”€â”€â”€ Katalog State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class KatalogState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val products: List<KatalogProduct> = emptyList()
)

// â”€â”€â”€ Departments State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class DepartmentsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val departments: List<Department> = emptyList()
)

// â”€â”€â”€ COA State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class CoaState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val accounts: List<ChartOfAccount> = emptyList()
)

// â”€â”€â”€ Payroll State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class PayrollState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val payrolls: List<Payroll> = emptyList()
)

// â”€â”€â”€ Business Plan State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class BusinessPlansState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val plans: List<BusinessPlan> = emptyList()
)

// â”€â”€â”€ Sosmed State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class SosmedState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val posts: List<SocialPost> = emptyList()
)

// â”€â”€â”€ Website Builder State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class WebsiteBuilderState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val settings: WebsiteSetting? = null
)

// â”€â”€â”€ Help Center State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class HelpCenterState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val articles: List<com.upstyle.bizgrow.data.HelpArticle> = emptyList(),
    val faqs: List<com.upstyle.bizgrow.data.HelpFaqItem> = emptyList(),
    val searchResults: List<com.upstyle.bizgrow.data.HelpArticle> = emptyList(),
    val contextualArticles: Map<String, List<com.upstyle.bizgrow.data.HelpArticle>> = emptyMap(),
    val diagnosticResult: com.upstyle.bizgrow.data.DiagnosticResult? = null,
    val isOffline: Boolean = false
)
// â”€â”€â”€ Landing Page State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class LandingPageState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val pages: List<LandingPage> = emptyList(),
    val templates: List<LandingPageTemplate> = emptyList()
)

// â”€â”€â”€ Shopee Integration State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class ShopeeState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val integration: ShopeeIntegration? = null
)

// â”€â”€â”€ Advanced Settings State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class AdvancedSettingsState(
    val isLoading: Boolean = false,
    val isSaving: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val username: String = "",
    val email: String = "",
    val phone: String = "",
    val darkMode: Boolean = false,
    val notifEnabled: Boolean = true
)

// ─── Subscription State ───────────────────────────────────────────────────────
data class SubscriptionState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val plans: List<com.upstyle.bizgrow.data.SubscriptionPlan> = emptyList(),
    val currentSubscription: com.upstyle.bizgrow.data.CurrentSubscription? = null,
    val usageMetrics: com.upstyle.bizgrow.data.UsageMetrics? = null,
    val invoices: List<com.upstyle.bizgrow.data.Invoice> = emptyList()
)

// ─── Billing State ────────────────────────────────────────────────────────────
data class BillingState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val invoices: List<com.upstyle.bizgrow.data.Invoice> = emptyList(),
    val activeSession: com.upstyle.bizgrow.data.PaymentSession? = null,
    val activePaymentSession: com.upstyle.bizgrow.data.PaymentSession? = null,
    val lastPaymentResult: com.upstyle.bizgrow.data.PaymentResult? = null
)

// ─── Product Variants State ───────────────────────────────────────────────────
data class ProductVariantsState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val variants: List<com.upstyle.bizgrow.data.ProductVariant> = emptyList(),
    val variantsByProduct: Map<String, List<com.upstyle.bizgrow.data.ProductVariant>> = emptyMap(),
    val stockMovements: List<com.upstyle.bizgrow.data.StockMovement> = emptyList(),
    val pricingStrategies: List<com.upstyle.bizgrow.data.PricingStrategy> = emptyList()
)

// ─── Bulk Operation State ─────────────────────────────────────────────────────
data class BulkOperationState(
    val isLoading: Boolean = false,
    val isRunning: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val progress: Float = 0f, // 0.0 - 1.0
    val currentOperationId: String? = null,
    val lastResult: com.upstyle.bizgrow.data.BulkOperationResult? = null,
    val currentResult: com.upstyle.bizgrow.data.BulkOperationResult? = null
)

// ─── Export / Import State ────────────────────────────────────────────────────
data class ExportImportState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val exportProgress: Float = 0f, // 0.0 - 1.0
    val lastExportResult: com.upstyle.bizgrow.data.ExportResult? = null,
    val lastImportResult: com.upstyle.bizgrow.data.ImportResult? = null,
    val importValidation: com.upstyle.bizgrow.data.ImportValidationResult? = null,
    val validationResult: com.upstyle.bizgrow.data.ImportValidationResult? = null,
    val exportHistory: List<com.upstyle.bizgrow.data.ExportHistoryItem> = emptyList()
)

// ─── Sync State ───────────────────────────────────────────────────────────────
data class SyncState(
    val isOnline: Boolean = true,
    val isSyncing: Boolean = false,
    val error: String? = null,
    val queueSize: Int = 0,
    val pendingCount: Int = 0,
    val lastSyncedAt: String? = null,
    val lastSyncAt: Long = 0L,
    val pendingConflicts: List<com.upstyle.bizgrow.data.SyncConflict> = emptyList()
)
