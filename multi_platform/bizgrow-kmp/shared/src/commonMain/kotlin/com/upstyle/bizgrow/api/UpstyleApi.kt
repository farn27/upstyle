package com.upstyle.bizgrow.api

import com.upstyle.bizgrow.data.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*

class UpstyleApi(private val client: HttpClient) {

    // ─── Auth ─────────────────────────────────────────────────────────────────

    suspend fun login(req: LoginRequest): ApiResponse<LoginData> =
        client.post("api/auth/login") { setBody(req) }.body()

    suspend fun register(req: RegisterRequest): ApiResponse<Unit> =
        client.post("api/auth/register") { setBody(req) }.body()

    suspend fun loginWithGoogle(req: GoogleAuthRequest): ApiResponse<LoginData> =
        client.post("api/auth/google") { setBody(req) }.body()

    suspend fun forgotPassword(email: String): ApiResponse<Unit> =
        client.post("api/auth/forgot-password") { setBody(mapOf("email" to email)) }.body()

    suspend fun resetPassword(token: String, password: String): ApiResponse<Unit> =
        client.post("api/auth/reset-password") { setBody(mapOf("token" to token, "password" to password)) }.body()

    suspend fun logout(): ApiResponse<Unit> =
        client.post("api/auth/logout").body()

    // ─── Business Units ───────────────────────────────────────────────────────

    suspend fun getBusinessUnits(): PaginatedResponse<BusinessUnit> =
        client.get("api/app/business") { parameter("limit", 50) }.body()

    suspend fun createBusinessUnit(req: CreateBusinessRequest): ApiResponse<Unit> =
        client.post("api/app/business") { setBody(req) }.body()

    suspend fun deleteBusinessUnit(unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/business") { parameter("unitId", unitId) }.body()

    suspend fun updateUnitSettings(unitId: Int, req: UpdateUnitSettingsRequest): ApiResponse<Unit> =
        client.put("api/app/business") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    // ─── Finance ──────────────────────────────────────────────────────────────

    suspend fun getFinanceData(unitId: Int, startDate: String? = null, endDate: String? = null): ApiResponse<FinanceData> =
        client.get("api/app/finance") {
            parameter("unitId", unitId)
            startDate?.let { parameter("start", it) }
            endDate?.let { parameter("end", it) }
        }.body()

    suspend fun createTransaction(req: CreateTransactionRequest): ApiResponse<Unit> =
        client.post("api/app/finance") { setBody(req) }.body()

    suspend fun deleteTransaction(transactionId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/finance") {
            parameter("transactionId", transactionId)
            parameter("unitId", unitId)
        }.body()

    // ─── Products ─────────────────────────────────────────────────────────────

    suspend fun getProducts(unitId: Int, page: Int = 1): PaginatedResponse<Product> =
        client.get("api/app/products") {
            parameter("unitId", unitId)
            parameter("page", page)
            parameter("limit", 50)
        }.body()

    suspend fun createProduct(product: Product): ApiResponse<Unit> =
        client.post("api/app/products") { setBody(product) }.body()

    suspend fun updateProduct(product: Product): ApiResponse<Unit> =
        client.put("api/app/products") { setBody(product) }.body()

    suspend fun deleteProduct(productId: String): ApiResponse<Unit> =
        client.delete("api/app/products") { parameter("productId", productId) }.body()

    suspend fun getKategoriProduk(unitId: Int): ApiResponse<List<KategoriProduk>> =
        client.get("api/app/products/categories") {
            parameter("unitId", unitId)
        }.body()

    suspend fun getStockLogs(unitId: Int, productId: String? = null): ApiResponse<List<StockLog>> =
        client.get("api/app/products") {
            parameter("unitId", unitId)
            parameter("action", "stock-logs")
            productId?.let { parameter("productId", it) }
        }.body()

    suspend fun adjustStock(
        productId: String,
        unitId: Int,
        perubahan: Int,
        alasan: String,
        keterangan: String? = null
    ): ApiResponse<Unit> =
        client.post("api/app/products") {
            setBody(mapOf(
                "action" to "adjust-stock",
                "productId" to productId,
                "unitId" to unitId,
                "perubahan" to perubahan,
                "alasan" to alasan,
                "keterangan" to (keterangan ?: "")
            ))
        }.body()

    // ─── POS ──────────────────────────────────────────────────────────────────

    suspend fun getPosData(unitId: Int): ApiResponse<PosData> =
        client.get("api/app/pos") { parameter("unitId", unitId) }.body()

    suspend fun checkout(req: CheckoutRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    suspend fun createPosCustomer(req: CreateCustomerRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    // ─── HR ───────────────────────────────────────────────────────────────────

    suspend fun getHrData(unitId: Int): ApiResponse<HrData> =
        client.get("api/app/hr") { parameter("unitId", unitId) }.body()

    suspend fun createEmployee(req: CreateEmployeeRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun updateEmployee(employeeId: Int, data: Map<String, String>): ApiResponse<Unit> =
        client.put("api/app/hr") {
            parameter("employeeId", employeeId)
            setBody(data)
        }.body()

    suspend fun deleteEmployee(employeeId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr") {
            parameter("employeeId", employeeId)
            parameter("unitId", unitId)
        }.body()

    suspend fun checkIn(req: CheckInRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun checkOut(req: CheckOutRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun processPayroll(req: ProcessPayrollRequest): ApiResponse<Unit> =
        client.post("api/app/hr") { setBody(req) }.body()

    suspend fun getSlipGaji(employeeId: Int, periodMonth: Int, periodYear: Int): ApiResponse<Map<String, Any>> =
        client.get("api/slip-gaji/$employeeId") {
            parameter("periodMonth", periodMonth)
            parameter("periodYear", periodYear)
        }.body()

    // ─── CRM ──────────────────────────────────────────────────────────────────

    suspend fun getCrmContacts(unitId: Int): PaginatedResponse<CrmContact> =
        client.get("api/app/crm") {
            parameter("unitId", unitId)
            parameter("type", "contacts")
        }.body()

    suspend fun createContact(req: CreateContactRequest): ApiResponse<Unit> =
        client.post("api/app/crm") { setBody(req) }.body()

    suspend fun getCrmDeals(unitId: Int): PaginatedResponse<CrmDeal> =
        client.get("api/app/crm") { parameter("unitId", unitId) }.body()

    suspend fun createDeal(req: CreateDealRequest): ApiResponse<Unit> =
        client.post("api/app/crm") { setBody(req) }.body()

    suspend fun updateDealStage(req: UpdateDealStageRequest): ApiResponse<Unit> =
        client.put("api/app/crm") { setBody(req) }.body()

    suspend fun deleteDeal(dealId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/crm") {
            parameter("dealId", dealId)
            parameter("unitId", unitId)
        }.body()

    suspend fun getCrmActivities(unitId: Int): ApiResponse<List<CrmActivity>> =
        client.get("api/app/crm") {
            parameter("unitId", unitId)
            parameter("type", "activities")
        }.body()

    suspend fun createActivity(req: CreateActivityRequest): ApiResponse<Unit> =
        client.post("api/app/crm") { setBody(req) }.body()

    // ─── SCM ──────────────────────────────────────────────────────────────────

    suspend fun getScmData(unitId: Int): ApiResponse<ScmData> =
        client.get("api/app/scm") { parameter("unitId", unitId) }.body()

    suspend fun createSupplier(req: CreateSupplierRequest): ApiResponse<Unit> =
        client.post("api/app/scm") { setBody(req) }.body()

    suspend fun createPurchaseOrder(req: CreatePoRequest): ApiResponse<Unit> =
        client.post("api/app/scm") { setBody(req) }.body()

    suspend fun updatePoStatus(req: UpdatePoStatusRequest): ApiResponse<Unit> =
        client.put("api/app/scm") { setBody(req) }.body()

    suspend fun deleteSupplier(supplierId: String, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/scm") {
            parameter("supplierId", supplierId)
            parameter("unitId", unitId)
        }.body()

    // ─── Finance AR (Piutang) ─────────────────────────────────────────────────

    suspend fun getReceivables(unitId: Int): ApiResponse<List<Receivable>> =
        client.get("api/app/finance/receivables") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createReceivable(unitId: Int, req: CreateReceivableRequest): ApiResponse<Unit> =
        client.post("api/app/finance/receivables") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun payReceivable(req: PayInvoiceRequest): ApiResponse<Unit> =
        client.post("api/app/finance/receivables") {
            setBody(mapOf("action" to "pay", "invoiceId" to req.invoiceId, "nominalBayar" to req.nominalBayar))
        }.body()

    // ─── Finance AP (Hutang) ──────────────────────────────────────────────────

    suspend fun getPayables(unitId: Int): ApiResponse<List<Payable>> =
        client.get("api/app/finance/payables") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createPayable(unitId: Int, req: CreatePayableRequest): ApiResponse<Unit> =
        client.post("api/app/finance/payables") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun payPayable(req: PayInvoiceRequest): ApiResponse<Unit> =
        client.post("api/app/finance/payables") {
            setBody(mapOf("action" to "pay", "invoiceId" to req.invoiceId, "nominalBayar" to req.nominalBayar))
        }.body()

    // ─── Accounting Contacts ──────────────────────────────────────────────────

    suspend fun getAccountingContacts(unitId: Int): ApiResponse<List<AccountingContact>> =
        client.get("api/app/finance/contacts") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createAccountingContact(unitId: Int, contact: AccountingContact): ApiResponse<Unit> =
        client.post("api/app/finance/contacts") {
            parameter("unitId", unitId)
            setBody(contact)
        }.body()

    // ─── Journal / Jurnal Umum ────────────────────────────────────────────────

    suspend fun getJournalEntries(unitId: Int, tahun: Int? = null, bulan: String? = null): ApiResponse<List<JournalEntry>> =
        client.get("api/app/finance/journal") {
            parameter("unitId", unitId)
            tahun?.let { parameter("tahun", it) }
            bulan?.let { parameter("bulan", it) }
        }.body()

    suspend fun createJournalEntry(unitId: Int, req: CreateJournalRequest): ApiResponse<Unit> =
        client.post("api/app/finance/journal") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    // ─── Chart of Accounts ────────────────────────────────────────────────────

    suspend fun getChartOfAccounts(unitId: Int): ApiResponse<List<ChartOfAccount>> =
        client.get("api/app/finance/coa") {
            parameter("unitId", unitId)
        }.body()

    // ─── Buku Besar ───────────────────────────────────────────────────────────

    suspend fun getBukuBesar(unitId: Int, coaId: Int, tahun: Int? = null): ApiResponse<BukuBesarData> =
        client.get("api/app/finance/buku-besar") {
            parameter("unitId", unitId)
            parameter("coaId", coaId)
            tahun?.let { parameter("tahun", it) }
        }.body()

    // ─── Laporan ──────────────────────────────────────────────────────────────

    suspend fun getLabaRugi(unitId: Int, startDate: String, endDate: String): ApiResponse<LabaRugiData> =
        client.get("api/app/finance/laporan") {
            parameter("unitId", unitId)
            parameter("type", "laba-rugi")
            parameter("start", startDate)
            parameter("end", endDate)
        }.body()

    suspend fun getArusKas(unitId: Int, startDate: String, endDate: String): ApiResponse<ArusKasData> =
        client.get("api/app/finance/laporan") {
            parameter("unitId", unitId)
            parameter("type", "arus-kas")
            parameter("start", startDate)
            parameter("end", endDate)
        }.body()

    // ─── Ecommerce Orders ─────────────────────────────────────────────────────

    suspend fun getOrders(unitId: Int, page: Int = 1): PaginatedResponse<EcommerceOrder> =
        client.get("api/app/orders") {
            parameter("unitId", unitId)
            parameter("page", page)
            parameter("limit", 20)
        }.body()

    suspend fun getOrderDetail(orderId: Int): ApiResponse<EcommerceOrder> =
        client.get("api/app/orders/$orderId").body()

    suspend fun updateOrderStatus(orderId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/orders/$orderId") {
            setBody(mapOf("status" to status))
        }.body()

    // ─── CS / Support Tickets ─────────────────────────────────────────────────

    suspend fun getTickets(unitId: Int): ApiResponse<List<SupportTicket>> =
        client.get("api/app/cs") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createTicket(req: CreateTicketRequest): ApiResponse<Unit> =
        client.post("api/app/cs") { setBody(req) }.body()

    suspend fun getTicketMessages(ticketId: Int): ApiResponse<List<TicketMessage>> =
        client.get("api/app/cs/$ticketId/messages").body()

    suspend fun replyTicket(ticketId: Int, message: String): ApiResponse<Unit> =
        client.post("api/app/cs/$ticketId/reply") {
            setBody(mapOf("message" to message))
        }.body()

    suspend fun updateTicketStatus(ticketId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/cs/$ticketId") {
            setBody(mapOf("status" to status))
        }.body()

    // ─── Notifications ────────────────────────────────────────────────────────

    suspend fun getNotifications(unitId: Int, limit: Int = 30): ApiResponse<List<RiwayatAksi>> =
        client.get("api/app/notifications") {
            parameter("unitId", unitId)
            parameter("limit", limit)
        }.body()

    suspend fun markNotificationRead(notifId: Int): ApiResponse<Unit> =
        client.put("api/app/notifications/$notifId/read").body()

    suspend fun markAllNotificationsRead(unitId: Int): ApiResponse<Unit> =
        client.put("api/app/notifications/read-all") {
            parameter("unitId", unitId)
        }.body()

    // ─── AI Chat ──────────────────────────────────────────────────────────────

    suspend fun chat(req: ChatRequest): ChatResponse =
        client.post("api/chat") { setBody(req) }.body()

    suspend fun aiAdvisor(req: AiAdvisorRequest): ApiResponse<AiAdvisorData> =
        client.post("api/ai-advisor") { setBody(req) }.body()

    /** NLP transaction entry — POST /api/app/ai-entry */
    suspend fun aiEntry(req: AiEntryRequest): ApiResponse<AiEntryData> =
        client.post("api/app/ai-entry") { setBody(req) }.body()

    /** AI kategori suggestion — POST /api/ai-kategori */
    suspend fun aiKategori(req: AiKategoriRequest): ApiResponse<AiKategoriResult> =
        client.post("api/ai-kategori") { setBody(req) }.body()

    // ─── Reports & Exports ────────────────────────────────────────────────────

    suspend fun getLaporanWa(req: LaporanWaRequest): ApiResponse<LaporanWaData> =
        client.post("api/laporan-wa") { setBody(req) }.body()

    suspend fun getLowStock(unitId: Int): ApiResponse<List<LowStockProduct>> =
        client.get("api/low-stock") { parameter("unitId", unitId) }.body()

    suspend fun getUpdates(slug: String, lastUpdate: Long): Map<String, Any> =
        client.get("api/updates") {
            parameter("slug", slug)
            parameter("lastUpdate", lastUpdate)
        }.body()

    suspend fun resolveConflict(
        entityType: String,
        entityId: String,
        resolution: String // "local" | "remote"
    ): ApiResponse<Unit> =
        client.post("api/app/sync/resolve") {
            setBody(mapOf(
                "entityType" to entityType,
                "entityId" to entityId,
                "resolution" to resolution
            ))
        }.body()

    // ─── Subscription & Billing (unitId-scoped) ───────────────────────────────

    suspend fun getBillingPlans(): ApiResponse<List<SubscriptionPlan>> =
        client.get("api/app/billing/plans").body()

    suspend fun getCurrentSubscription(unitId: Int): ApiResponse<CurrentSubscription> =
        client.get("api/app/billing/subscription") { parameter("unitId", unitId) }.body()

    suspend fun getUsageMetrics(unitId: Int): ApiResponse<UsageMetrics> =
        client.get("api/app/billing/usage") { parameter("unitId", unitId) }.body()

    suspend fun getBillingInvoices(unitId: Int): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices") { parameter("unitId", unitId) }.body()

    suspend fun initBillingPaymentSession(unitId: Int, req: PaymentRequest): ApiResponse<PaymentSession> =
        client.post("api/app/billing/payment/init") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun confirmBillingPayment(sessionId: String): ApiResponse<PaymentResult> =
        client.post("api/app/billing/payment/confirm") {
            setBody(mapOf("sessionId" to sessionId))
        }.body()

    suspend fun upgradePlan(unitId: Int, planId: String, req: PaymentRequest): ApiResponse<PaymentResult> =
        client.post("api/app/billing/upgrade") {
            parameter("unitId", unitId)
            setBody(mapOf("planId" to planId, "paymentMethod" to req.paymentMethod))
        }.body()

    suspend fun downgradePlan(unitId: Int, planId: String): ApiResponse<Unit> =
        client.post("api/app/billing/downgrade") {
            setBody(mapOf("unitId" to unitId, "planId" to planId))
        }.body()

    // ─── Product Variants (unitId-scoped) ─────────────────────────────────────

    suspend fun getProductVariants(unitId: Int, productId: String): ApiResponse<List<ProductVariant>> =
        client.get("api/app/products/variants") {
            parameter("unitId", unitId)
            parameter("productId", productId)
        }.body()

    suspend fun createVariant(unitId: Int, variant: ProductVariant): ApiResponse<Unit> =
        client.post("api/app/products/variants") {
            parameter("unitId", unitId)
            setBody(variant)
        }.body()

    suspend fun updateVariant(unitId: Int, variant: ProductVariant): ApiResponse<Unit> =
        client.put("api/app/products/variants") {
            parameter("unitId", unitId)
            setBody(variant)
        }.body()

    suspend fun deleteVariant(unitId: Int, variantId: String): ApiResponse<Unit> =
        client.delete("api/app/products/variants") {
            parameter("unitId", unitId)
            parameter("variantId", variantId)
        }.body()

    suspend fun getStockMovements(unitId: Int, productId: String): ApiResponse<List<StockMovement>> =
        client.get("api/app/products/stock-movements") {
            parameter("unitId", unitId)
            parameter("productId", productId)
        }.body()

    suspend fun bulkUpdateProducts(unitId: Int, operation: BulkOperation): ApiResponse<BulkOperationResult> =
        client.post("api/app/products/bulk") {
            parameter("unitId", unitId)
            setBody(operation)
        }.body()

    suspend fun getPricingStrategies(unitId: Int, productId: String): ApiResponse<List<PricingStrategy>> =
        client.get("api/app/products/pricing") {
            parameter("unitId", unitId)
            parameter("productId", productId)
        }.body()

    suspend fun applyPricingStrategy(unitId: Int, strategy: PricingStrategy): ApiResponse<Unit> =
        client.post("api/app/products/pricing") {
            parameter("unitId", unitId)
            setBody(strategy)
        }.body()

    suspend fun deletePricingStrategy(unitId: Int, strategyId: String): ApiResponse<Unit> =
        client.delete("api/app/products/pricing") {
            parameter("unitId", unitId)
            parameter("strategyId", strategyId)
        }.body()

    suspend fun rollbackBulkOperation(unitId: Int, operationId: String): ApiResponse<Unit> =
        client.post("api/app/products/bulk/rollback") {
            parameter("unitId", unitId)
            setBody(mapOf("operationId" to operationId))
        }.body()

    // ─── Export / Import (unitId-scoped) ──────────────────────────────────────

    suspend fun exportData(unitId: Int, dataType: String, format: String, startDate: String? = null, endDate: String? = null): ApiResponse<ExportResult> =
        client.post("api/app/export") {
            setBody(buildMap {
                put("unitId", unitId.toString())
                put("dataType", dataType)
                put("format", format)
                startDate?.let { put("startDate", it) }
                endDate?.let { put("endDate", it) }
            })
        }.body()

    suspend fun validateImportFile(unitId: Int, dataType: String, fileBase64: String, fileName: String): ApiResponse<ImportValidationResult> =
        client.post("api/app/import/validate") {
            setBody(mapOf("unitId" to unitId.toString(), "dataType" to dataType, "fileBase64" to fileBase64, "fileName" to fileName))
        }.body()

    suspend fun importData(unitId: Int, dataType: String, fileBase64: String, fileName: String): ApiResponse<ImportResult> =
        client.post("api/app/import") {
            setBody(mapOf("unitId" to unitId.toString(), "dataType" to dataType, "fileBase64" to fileBase64, "fileName" to fileName))
        }.body()

    // ─── Help & Diagnostics (extended) ────────────────────────────────────────

    suspend fun getHelpArticles(screenName: String, lang: String = "id"): ApiResponse<List<HelpArticle>> =
        client.get("api/app/help/articles") {
            parameter("screen", screenName)
            parameter("lang", lang)
        }.body()

    suspend fun getHelpFaqs(category: String? = null, lang: String = "id"): ApiResponse<List<HelpFaqItem>> =
        client.get("api/app/help/faq") {
            category?.let { parameter("category", it) }
            parameter("lang", lang)
        }.body()

    suspend fun submitTicket(unitId: Int, req: SubmitTicketRequest): ApiResponse<Unit> =
        client.post("api/app/help/ticket") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    suspend fun runDiagnostics(unitId: Int): ApiResponse<DiagnosticResult> =
        client.post("api/app/help/diagnostics") {
            setBody(mapOf("unitId" to unitId.toString()))
        }.body()

    // ─── Sync Queue (unitId-scoped) ───────────────────────────────────────────

    suspend fun flushSyncQueue(unitId: Int, items: List<SyncQueueItem>): ApiResponse<Unit> =
        client.post("api/app/sync/flush") {
            setBody(mapOf("unitId" to unitId, "items" to items))
        }.body()

    suspend fun resolveConflict(unitId: Int, entityType: String, entityId: String, resolution: String): ApiResponse<Unit> =
        client.post("api/app/sync/resolve") {
            setBody(mapOf("unitId" to unitId.toString(), "entityType" to entityType, "entityId" to entityId, "resolution" to resolution))
        }.body()

    // ─── Billing overloads (unitId-scoped, canonical names) ───────────────────

    /** Returns invoices scoped to a specific business unit. */
    suspend fun getInvoices(unitId: Int): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices") { parameter("unitId", unitId) }.body()

    /** Initialises a payment session scoped to a specific business unit. */
    suspend fun initPaymentSession(unitId: Int, req: PaymentRequest): ApiResponse<PaymentSession> =
        client.post("api/app/billing/payment/init") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    // ─── Help overloads (HelpFaq return type, unitId-scoped ticket) ───────────

    /**
     * Returns FAQs as [HelpFaq] (UI alias). Use [getHelpFaqs] for the
     * serializable [HelpFaqItem] variant.
     */
    suspend fun getHelpFaqsUi(category: String? = null, lang: String = "id"): ApiResponse<List<HelpFaq>> =
        client.get("api/app/help/faq") {
            category?.let { parameter("category", it) }
            parameter("lang", lang)
        }.body()

    /** Submits a support ticket using the lightweight [SubmitTicketRequest] form. */
    suspend fun submitSupportTicket(unitId: Int, req: SubmitTicketRequest): ApiResponse<Unit> =
        client.post("api/app/help/ticket") {
            parameter("unitId", unitId)
            setBody(req)
        }.body()

    // ─── Alias / overload helpers for AppViewModel call-site compatibility ────

    /** Alias for [getBusinessUnits] — AppViewModel calls `getUnits()`. */
    suspend fun getUnits(): PaginatedResponse<BusinessUnit> = getBusinessUnits()

    /** Alias for [getBillingPlans] — AppViewModel calls `getSubscriptionPlans()`. */
    suspend fun getSubscriptionPlans(): ApiResponse<List<SubscriptionPlan>> = getBillingPlans()

    /** Overload without unitId — reads active unit from state; AppViewModel calls `getCurrentSubscription()`. */
    suspend fun getCurrentSubscription(): ApiResponse<CurrentSubscription> =
        client.get("api/app/billing/subscription").body()

    /** Overload without unitId — AppViewModel calls `getUsageMetrics()`. */
    suspend fun getUsageMetrics(): ApiResponse<UsageMetrics> =
        client.get("api/app/billing/usage").body()

    /** Overload without unitId — AppViewModel calls `getInvoices()`. */
    suspend fun getInvoices(): ApiResponse<List<Invoice>> =
        client.get("api/app/billing/invoices").body()

    /** Alias for [confirmBillingPayment] — AppViewModel calls `confirmPayment(sessionId)`. */
    suspend fun confirmPayment(sessionId: String): ApiResponse<PaymentResult> =
        confirmBillingPayment(sessionId)

    /** Overload matching AppViewModel call `upgradePlan(planId, paymentMethod)`. */
    suspend fun upgradePlan(planId: String, paymentMethod: String = "credit_card"): ApiResponse<PaymentResult> =
        client.post("api/app/billing/upgrade") {
            setBody(mapOf("planId" to planId, "paymentMethod" to paymentMethod))
        }.body()

    /** Overload for [getHelpArticles] with no arguments — AppViewModel calls `getHelpArticles()`. */
    suspend fun getHelpArticles(): ApiResponse<List<HelpArticle>> =
        client.get("api/app/help/articles").body()

    /** Overload accepting [SubmitSupportTicketRequest] directly — AppViewModel calls `submitSupportTicket(req)`. */
    suspend fun submitSupportTicket(req: SubmitSupportTicketRequest): ApiResponse<Unit> =
        client.post("api/app/help/ticket") {
            parameter("unitId", req.unitId)
            setBody(req)
        }.body()

    // ─── Missing feature stubs ────────────────────────────────────────────────

    suspend fun getPosShifts(unitId: Int): ApiResponse<List<PosShift>> =
        client.get("api/app/pos/shifts") { parameter("unitId", unitId) }.body()

    suspend fun openShift(req: OpenShiftRequest): ApiResponse<PosShift> =
        client.post("api/app/pos/shifts/open") { setBody(req) }.body()

    suspend fun closeShift(req: CloseShiftRequest): ApiResponse<PosShift> =
        client.post("api/app/pos/shifts/close") { setBody(req) }.body()

    suspend fun updateLeadStatus(leadId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/marketing/leads/$leadId") { setBody(mapOf("status" to status)) }.body()

    suspend fun getLeaveRequests(unitId: Int): ApiResponse<List<LeaveRequest>> =
        client.get("api/app/hr/leave") { parameter("unitId", unitId) }.body()

    suspend fun getMarketingCampaigns(unitId: Int): ApiResponse<List<MarketingCampaign>> =
        client.get("api/app/marketing/campaigns") { parameter("unitId", unitId) }.body()

    suspend fun createMarketingCampaign(campaign: MarketingCampaign): ApiResponse<Unit> =
        client.post("api/app/marketing/campaigns") { setBody(campaign) }.body()

    suspend fun getKatalog(unitId: Int): ApiResponse<KatalogData> =
        client.get("api/app/catalog") { parameter("unitId", unitId) }.body()

    suspend fun toggleKatalogPublish(productId: String, isPublished: Boolean): ApiResponse<Unit> =
        client.put("api/app/catalog/publish") {
            setBody(mapOf("productId" to productId, "isPublished" to isPublished))
        }.body()

    suspend fun updateKatalogSettings(settings: KatalogSettings): ApiResponse<Unit> =
        client.put("api/app/catalog/settings") { setBody(settings) }.body()

    suspend fun createUnit(req: CreateUnitRequest): ApiResponse<BusinessUnit> =
        client.post("api/app/business") { setBody(req) }.body()

    suspend fun getDepartments(unitId: Int): ApiResponse<List<Department>> =
        client.get("api/app/hr/departments") { parameter("unitId", unitId) }.body()

    suspend fun deleteDepartment(departmentId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr/departments/$departmentId").body()

    suspend fun createDepartment(dept: Department): ApiResponse<Unit> =
        client.post("api/app/hr/departments") { setBody(dept) }.body()

    suspend fun getCrmTasks(unitId: Int): ApiResponse<List<CrmTask>> =
        client.get("api/app/crm/tasks") { parameter("unitId", unitId) }.body()

    suspend fun sendHelpFeedback(articleId: String, helpful: Boolean): ApiResponse<Unit> =
        client.post("api/app/help/feedback") {
            setBody(mapOf("articleId" to articleId, "helpful" to helpful))
        }.body()

    suspend fun getFixedAssets(unitId: Int): ApiResponse<List<FixedAsset>> =
        client.get("api/app/finance/assets") { parameter("unitId", unitId) }.body()

    suspend fun getMarketingData(unitId: Int): ApiResponse<MarketingData> =
        client.get("api/app/marketing") { parameter("unitId", unitId) }.body()

    suspend fun createMarketingLead(lead: MarketingLead): ApiResponse<Unit> =
        client.post("api/app/marketing/leads") { setBody(lead) }.body()

    suspend fun getPosReturns(unitId: Int): ApiResponse<List<PosReturn>> =
        client.get("api/app/pos/returns") { parameter("unitId", unitId) }.body()

    suspend fun createReturn(req: CreateReturnRequest): ApiResponse<Unit> =
        client.post("api/app/pos/returns") { setBody(req) }.body()

    suspend fun getPosVouchers(unitId: Int): ApiResponse<List<PosVoucher>> =
        client.get("api/app/pos/vouchers") { parameter("unitId", unitId) }.body()

    suspend fun getBusinessPlans(unitId: Int): ApiResponse<List<BusinessPlan>> =
        client.get("api/app/business-plans") { parameter("unitId", unitId) }.body()

    suspend fun createBusinessPlan(plan: BusinessPlan): ApiResponse<Unit> =
        client.post("api/app/business-plans") { setBody(plan) }.body()

    suspend fun updateBusinessPlan(plan: BusinessPlan): ApiResponse<Unit> =
        client.put("api/app/business-plans/${plan.id}") { setBody(plan) }.body()

    suspend fun deleteBusinessPlan(id: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/business-plans/$id") { parameter("unitId", unitId) }.body()

    suspend fun applyBusinessPlan(id: Int, unitId: Int): ApiResponse<Unit> =
        client.post("api/app/business-plans/$id/apply") { setBody(mapOf("unitId" to unitId)) }.body()

    suspend fun getSosmedPosts(unitId: Int): ApiResponse<List<SocialPost>> =
        client.get("api/app/sosmed") { parameter("unitId", unitId) }.body()

    suspend fun createSosmedPost(post: SocialPost): ApiResponse<Unit> =
        client.post("api/app/sosmed") { setBody(post) }.body()

    suspend fun updateSocialPost(post: SocialPost): ApiResponse<Unit> =
        client.put("api/app/sosmed/${post.id}") { setBody(post) }.body()

    suspend fun deleteSocialPost(postId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/sosmed/$postId") { parameter("unitId", unitId) }.body()

    suspend fun generateAiCaption(platform: String, productName: String): ApiResponse<Map<String, String>> =
        client.post("api/app/ai/caption") {
            setBody(mapOf("platform" to platform, "productName" to productName))
        }.body()

    suspend fun getWebsiteSettings(unitId: Int): ApiResponse<WebsiteSetting> =
        client.get("api/app/website") { parameter("unitId", unitId) }.body()

    suspend fun saveWebsiteSettings(settings: WebsiteSetting): ApiResponse<Unit> =
        client.put("api/app/website") { setBody(settings) }.body()

    suspend fun getContextualHelp(screenName: String): ApiResponse<List<HelpArticle>> =
        client.get("api/app/help/articles") { parameter("screen", screenName) }.body()

    suspend fun searchHelp(query: String): ApiResponse<List<HelpArticle>> =
        client.get("api/app/help/search") { parameter("q", query) }.body()

    suspend fun getLandingPages(unitId: Int): ApiResponse<List<LandingPage>> =
        client.get("api/app/landing-pages") { parameter("unitId", unitId) }.body()

    suspend fun getLandingPageTemplates(): ApiResponse<List<LandingPage>> =
        client.get("api/app/landing-pages/templates").body()

    suspend fun createLandingPage(page: LandingPage): ApiResponse<Unit> =
        client.post("api/app/landing-pages") { setBody(page) }.body()

    suspend fun updateLandingPage(page: LandingPage): ApiResponse<Unit> =
        client.put("api/app/landing-pages/${page.id}") { setBody(page) }.body()

    suspend fun deleteLandingPage(pageId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/landing-pages/$pageId") { parameter("unitId", unitId) }.body()

    suspend fun toggleLandingPage(pageId: Int, unitId: Int, isActive: Boolean): ApiResponse<Unit> =
        client.put("api/app/landing-pages/$pageId/toggle") {
            parameter("unitId", unitId)
            setBody(mapOf("isActive" to isActive))
        }.body()

    suspend fun getShopeeStatus(unitId: Int): ApiResponse<ShopeeIntegration> =
        client.get("api/app/integrations/shopee") { parameter("unitId", unitId) }.body()

    suspend fun connectShopee(integration: ShopeeIntegration): ApiResponse<ShopeeIntegration> =
        client.post("api/app/integrations/shopee") { setBody(integration) }.body()

    suspend fun disconnectShopee(unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/integrations/shopee") { parameter("unitId", unitId) }.body()

    suspend fun getProfileSettings(): ApiResponse<Map<String, String>> =
        client.get("api/app/profile").body()

    suspend fun updateProfile(unitId: Int, data: Map<String, String>): ApiResponse<Unit> =
        client.put("api/app/profile") { setBody(data) }.body()

    suspend fun changePassword(data: Map<String, String>): ApiResponse<Unit> =
        client.put("api/app/profile/password") { setBody(data) }.body()

    suspend fun updatePreferences(darkMode: Boolean, notifEnabled: Boolean): ApiResponse<Unit> =
        client.put("api/app/profile/preferences") {
            setBody(mapOf("darkMode" to darkMode, "notifPref" to notifEnabled))
        }.body()

    suspend fun getSalesTargets(unitId: Int, periode: String? = null): ApiResponse<SalesTargetData> =
        client.get("api/app/hr/sales-targets") {
            parameter("unitId", unitId)
            periode?.let { parameter("periode", it) }
        }.body()

    suspend fun createSalesTarget(target: SalesTarget): ApiResponse<Unit> =
        client.post("api/app/hr/sales-targets") { setBody(target) }.body()

    suspend fun deleteSalesTarget(targetId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr/sales-targets/$targetId").body()

    suspend fun getTaxRates(unitId: Int): ApiResponse<List<TaxRate>> =
        client.get("api/app/finance/tax-rates") { parameter("unitId", unitId) }.body()

    suspend fun getStockOpnameList(unitId: Int): ApiResponse<List<StockOpnameSession>> =
        client.get("api/app/products/stock-opname") { parameter("unitId", unitId) }.body()

    suspend fun getTrashProducts(unitId: Int): ApiResponse<List<Product>> =
        client.get("api/app/products/trash") { parameter("unitId", unitId) }.body()

    suspend fun restoreProduct(productId: String): ApiResponse<Unit> =
        client.post("api/app/products/restore") { setBody(mapOf("productId" to productId)) }.body()

    suspend fun getQuotations(unitId: Int): ApiResponse<List<Quotation>> =
        client.get("api/app/quotations") { parameter("unitId", unitId) }.body()

    suspend fun getSalesOrders(unitId: Int): ApiResponse<List<SalesOrder>> =
        client.get("api/app/sales-orders") { parameter("unitId", unitId) }.body()

    suspend fun getClosingPeriods(unitId: Int): ApiResponse<List<ClosingPeriod>> =
        client.get("api/app/finance/closing-periods") { parameter("unitId", unitId) }.body()

    suspend fun getApprovals(unitId: Int): ApiResponse<ApprovalsData> =
        client.get("api/app/approvals") { parameter("unitId", unitId) }.body()

    suspend fun approveRequest(approvalId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/approvals/$approvalId") { setBody(mapOf("status" to status)) }.body()

    suspend fun createApprovalRequest(req: ApprovalRequest): ApiResponse<Unit> =
        client.post("api/app/approvals") { setBody(req) }.body()

    suspend fun getBudgetItems(unitId: Int, year: Int): ApiResponse<List<BudgetItem>> =
        client.get("api/app/finance/budget") {
            parameter("unitId", unitId)
            parameter("year", year)
        }.body()

    suspend fun getExportHistory(unitId: Int): ApiResponse<List<ExportHistoryItem>> =
        client.get("api/app/export/history") { parameter("unitId", unitId) }.body()

    suspend fun getPosCashTransactions(shiftId: Int): ApiResponse<List<PosCashTransaction>> =
        client.get("api/app/pos/cash-transactions") { parameter("shiftId", shiftId) }.body()
}
