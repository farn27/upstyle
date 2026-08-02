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
        client.get("api/app/products") {
            parameter("unitId", unitId)
            parameter("action", "categories")
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
        client.get("api/slip-gaji") {
            parameter("employeeId", employeeId)
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

    // ─── QR Code ─────────────────────────────────────────────────────────────

    suspend fun generateQrCode(data: String): ApiResponse<Map<String, String>> =
        client.get("api/qr") {
            parameter("data", data)
        }.body()

    // ─── POS Shifts ───────────────────────────────────────────────────────────

    suspend fun getPosShifts(unitId: Int): ApiResponse<List<PosShift>> =
        client.get("api/app/pos") {
            parameter("unitId", unitId)
            parameter("action", "shifts")
        }.body()

    suspend fun openShift(req: OpenShiftRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    suspend fun closeShift(req: CloseShiftRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    // ─── POS Returns ──────────────────────────────────────────────────────────

    suspend fun getPosReturns(unitId: Int): ApiResponse<List<PosReturn>> =
        client.get("api/app/pos") {
            parameter("unitId", unitId)
            parameter("action", "returns")
        }.body()

    suspend fun createReturn(req: CreateReturnRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()
}
