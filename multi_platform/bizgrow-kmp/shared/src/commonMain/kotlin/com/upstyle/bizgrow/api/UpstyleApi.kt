package com.upstyle.bizgrow.api

import com.upstyle.bizgrow.data.*
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.http.*

class UpstyleApi(private val client: HttpClient) {

    // â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Business Units â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getPosData(unitId: Int): ApiResponse<PosData> =
        client.get("api/app/pos") { parameter("unitId", unitId) }.body()

    suspend fun checkout(req: CheckoutRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    suspend fun createPosCustomer(req: CreateCustomerRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    // â”€â”€â”€ HR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ CRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ SCM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Finance AR (Piutang) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Finance AP (Hutang) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Accounting Contacts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getAccountingContacts(unitId: Int): ApiResponse<List<AccountingContact>> =
        client.get("api/app/finance/contacts") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createAccountingContact(unitId: Int, contact: AccountingContact): ApiResponse<Unit> =
        client.post("api/app/finance/contacts") {
            parameter("unitId", unitId)
            setBody(contact)
        }.body()

    // â”€â”€â”€ Journal / Jurnal Umum â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Chart of Accounts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getChartOfAccounts(unitId: Int): ApiResponse<List<ChartOfAccount>> =
        client.get("api/app/finance/coa") {
            parameter("unitId", unitId)
        }.body()

    // â”€â”€â”€ Buku Besar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getBukuBesar(unitId: Int, coaId: Int, tahun: Int? = null): ApiResponse<BukuBesarData> =
        client.get("api/app/finance/buku-besar") {
            parameter("unitId", unitId)
            parameter("coaId", coaId)
            tahun?.let { parameter("tahun", it) }
        }.body()

    // â”€â”€â”€ Laporan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Ecommerce Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ CS / Support Tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€â”€ AI Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun chat(req: ChatRequest): ChatResponse =
        client.post("api/chat") { setBody(req) }.body()

    suspend fun aiAdvisor(req: AiAdvisorRequest): ApiResponse<AiAdvisorData> =
        client.post("api/ai-advisor") { setBody(req) }.body()

    // â”€â”€â”€ Reports & Exports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getLaporanWa(req: LaporanWaRequest): ApiResponse<LaporanWaData> =
        client.post("api/laporan-wa") { setBody(req) }.body()

    suspend fun getLowStock(unitId: Int): ApiResponse<List<LowStockProduct>> =
        client.get("api/low-stock") { parameter("unitId", unitId) }.body()

    suspend fun getUpdates(slug: String, lastUpdate: Long): Map<String, Any> =
        client.get("api/updates") {
            parameter("slug", slug)
            parameter("lastUpdate", lastUpdate)
        }.body()

    // â”€â”€â”€ QR Code â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun generateQrCode(data: String): ApiResponse<Map<String, String>> =
        client.get("api/qr") {
            parameter("data", data)
        }.body()

    // â”€â”€â”€ POS Shifts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getPosShifts(unitId: Int): ApiResponse<List<PosShift>> =
        client.get("api/app/pos") {
            parameter("unitId", unitId)
            parameter("action", "shifts")
        }.body()

    suspend fun openShift(req: OpenShiftRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    suspend fun closeShift(req: CloseShiftRequest): ApiResponse<Unit> =
        client.post("api/app/pos") { setBody(req) }.body()

    // â”€â”€â”€ POS Returns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getPosReturns(unitId: Int): ApiResponse<List<PosReturn>> =
        client.get("api/app/pos/returns") {
            parameter("unitId", unitId)
        }.body()

    suspend fun createReturn(req: CreateReturnRequest): ApiResponse<Unit> =
        client.post("api/app/pos/returns") { setBody(req) }.body()

    // â”€â”€â”€ Fixed Assets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getFixedAssets(unitId: Int): ApiResponse<List<FixedAsset>> =
        client.get("api/app/finance/fixed-assets") { parameter("unitId", unitId) }.body()

    suspend fun createFixedAsset(asset: FixedAsset): ApiResponse<Unit> =
        client.post("api/app/finance/fixed-assets") { setBody(asset) }.body()

    suspend fun updateFixedAsset(asset: FixedAsset): ApiResponse<Unit> =
        client.put("api/app/finance/fixed-assets") { setBody(asset) }.body()

    suspend fun deleteFixedAsset(assetId: Int): ApiResponse<Unit> =
        client.delete("api/app/finance/fixed-assets") { parameter("assetId", assetId) }.body()

    // â”€â”€â”€ Tax Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getTaxRates(unitId: Int): ApiResponse<List<TaxRate>> =
        client.get("api/app/finance/tax-rates") { parameter("unitId", unitId) }.body()

    suspend fun createTaxRate(rate: TaxRate): ApiResponse<Unit> =
        client.post("api/app/finance/tax-rates") { setBody(rate) }.body()

    suspend fun updateTaxRate(rate: TaxRate): ApiResponse<Unit> =
        client.put("api/app/finance/tax-rates") { setBody(rate) }.body()

    suspend fun deleteTaxRate(taxId: Int): ApiResponse<Unit> =
        client.delete("api/app/finance/tax-rates") { parameter("taxId", taxId) }.body()

    // â”€â”€â”€ Budgeting â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getBudgetItems(unitId: Int, tahun: Int): ApiResponse<List<BudgetItem>> =
        client.get("api/app/finance/budget") {
            parameter("unitId", unitId)
            parameter("tahun", tahun)
        }.body()

    suspend fun saveBudgetItem(item: BudgetItem): ApiResponse<Unit> =
        client.post("api/app/finance/budget") { setBody(item) }.body()

    suspend fun deleteBudgetItem(budgetId: Int): ApiResponse<Unit> =
        client.delete("api/app/finance/budget") { parameter("budgetId", budgetId) }.body()

    // â”€â”€â”€ Closing Periods â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getClosingPeriods(unitId: Int): ApiResponse<List<ClosingPeriod>> =
        client.get("api/app/finance/close-period") { parameter("unitId", unitId) }.body()

    suspend fun closePeriod(req: ClosingPeriod): ApiResponse<Unit> =
        client.post("api/app/finance/close-period") { setBody(req) }.body()

    // â”€â”€â”€ POS Cash Transactions & Vouchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getPosReports(unitId: Int, shiftId: Int? = null): ApiResponse<Map<String, Any>> =
        client.get("api/app/pos/reports") {
            parameter("unitId", unitId)
            shiftId?.let { parameter("shiftId", it) }
        }.body()

    suspend fun getPosCashTransactions(shiftId: Int): ApiResponse<List<PosCashTransaction>> =
        client.get("api/app/pos/cash") { parameter("shiftId", shiftId) }.body()

    suspend fun createPosCashTransaction(trx: PosCashTransaction): ApiResponse<Unit> =
        client.post("api/app/pos/cash") { setBody(trx) }.body()

    suspend fun getPosVouchers(unitId: Int): ApiResponse<List<PosVoucher>> =
        client.get("api/app/pos/vouchers") { parameter("unitId", unitId) }.body()

    suspend fun createPosVoucher(voucher: PosVoucher): ApiResponse<Unit> =
        client.post("api/app/pos/vouchers") { setBody(voucher) }.body()

    suspend fun updatePosVoucher(voucher: PosVoucher): ApiResponse<Unit> =
        client.put("api/app/pos/vouchers") { setBody(voucher) }.body()

    suspend fun deletePosVoucher(voucherId: Int): ApiResponse<Unit> =
        client.delete("api/app/pos/vouchers") { parameter("voucherId", voucherId) }.body()

    // â”€â”€â”€ HR Leave & Departments & Employee Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getLeaveRequests(unitId: Int, employeeId: Int? = null): ApiResponse<List<LeaveRequest>> =
        client.get("api/app/hr/leave") {
            parameter("unitId", unitId)
            employeeId?.let { parameter("employeeId", it) }
        }.body()

    suspend fun createLeaveRequest(req: LeaveRequest): ApiResponse<Unit> =
        client.post("api/app/hr/leave") { setBody(req) }.body()

    suspend fun updateLeaveStatus(leaveRequestId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/hr/leave") {
            setBody(mapOf("leaveRequestId" to leaveRequestId, "status" to status))
        }.body()

    suspend fun getDepartments(unitId: Int): ApiResponse<List<Department>> =
        client.get("api/app/hr/departments") { parameter("unitId", unitId) }.body()

    suspend fun createDepartment(dept: Department): ApiResponse<Unit> =
        client.post("api/app/hr/departments") { setBody(dept) }.body()

    suspend fun deleteDepartment(departmentId: Int): ApiResponse<Unit> =
        client.delete("api/app/hr/departments") { parameter("departmentId", departmentId) }.body()

    suspend fun getEmployeeDetail(employeeId: Int): ApiResponse<EmployeeDetail> =
        client.get("api/app/hr/$employeeId").body()

    // â”€â”€â”€ CRM Tasks, Quotations, Sales Orders, Campaigns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getCrmTasks(unitId: Int, contactId: Int? = null, dealId: Int? = null): ApiResponse<List<CrmTask>> =
        client.get("api/app/crm/tasks") {
            parameter("unitId", unitId)
            contactId?.let { parameter("contactId", it) }
            dealId?.let { parameter("dealId", it) }
        }.body()

    suspend fun createCrmTask(task: CrmTask): ApiResponse<Unit> =
        client.post("api/app/crm/tasks") { setBody(task) }.body()

    suspend fun updateCrmTask(task: CrmTask): ApiResponse<Unit> =
        client.put("api/app/crm/tasks") { setBody(task) }.body()

    suspend fun deleteCrmTask(taskId: Int): ApiResponse<Unit> =
        client.delete("api/app/crm/tasks") { parameter("taskId", taskId) }.body()

    suspend fun getCrmContactDetail(contactId: Int): ApiResponse<CrmContact> =
        client.get("api/app/crm/contacts/$contactId").body()

    suspend fun getQuotations(unitId: Int): ApiResponse<List<Quotation>> =
        client.get("api/app/crm/quotations") { parameter("unitId", unitId) }.body()

    suspend fun createQuotation(quo: Quotation): ApiResponse<Unit> =
        client.post("api/app/crm/quotations") { setBody(quo) }.body()

    suspend fun updateQuotationStatus(quotationId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/crm/quotations") {
            setBody(mapOf("id" to quotationId, "status" to status))
        }.body()

    suspend fun getSalesOrders(unitId: Int): ApiResponse<List<SalesOrder>> =
        client.get("api/app/crm/sales-orders") { parameter("unitId", unitId) }.body()

    suspend fun createSalesOrder(so: SalesOrder): ApiResponse<Unit> =
        client.post("api/app/crm/sales-orders") { setBody(so) }.body()

    suspend fun updateSalesOrderStatus(orderId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/crm/sales-orders") {
            setBody(mapOf("id" to orderId, "status" to status))
        }.body()

    suspend fun getMarketingCampaigns(unitId: Int): ApiResponse<List<MarketingCampaign>> =
        client.get("api/app/crm/campaigns") { parameter("unitId", unitId) }.body()

    suspend fun createMarketingCampaign(camp: MarketingCampaign): ApiResponse<Unit> =
        client.post("api/app/crm/campaigns") { setBody(camp) }.body()

    suspend fun updateMarketingCampaign(camp: MarketingCampaign): ApiResponse<Unit> =
        client.put("api/app/crm/campaigns") { setBody(camp) }.body()

    // â”€â”€â”€ Products Advanced (Stock Opname, Trash, Pricing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getStockOpnameList(unitId: Int): ApiResponse<List<StockOpnameSession>> =
        client.get("api/app/products/stock-opname") { parameter("unitId", unitId) }.body()

    suspend fun createStockOpname(session: StockOpnameSession): ApiResponse<Unit> =
        client.post("api/app/products/stock-opname") { setBody(session) }.body()

    suspend fun completeStockOpname(opnameId: Int): ApiResponse<Unit> =
        client.put("api/app/products/stock-opname") {
            setBody(mapOf("opnameId" to opnameId))
        }.body()

    suspend fun getTrashProducts(unitId: Int): ApiResponse<List<Product>> =
        client.get("api/app/products/trash") { parameter("unitId", unitId) }.body()

    suspend fun restoreProduct(productId: String): ApiResponse<Unit> =
        client.put("api/app/products/trash") {
            setBody(mapOf("productId" to productId))
        }.body()

    suspend fun permanentDeleteProduct(productId: String): ApiResponse<Unit> =
        client.delete("api/app/products/trash") { parameter("productId", productId) }.body()

    suspend fun getPricingProducts(unitId: Int): ApiResponse<List<Product>> =
        client.get("api/app/products/pricing") { parameter("unitId", unitId) }.body()

    suspend fun updatePricing(items: List<Map<String, Any>>): ApiResponse<Unit> =
        client.put("api/app/products/pricing") {
            setBody(mapOf("items" to items))
        }.body()

    // â”€â”€â”€ Sales Targets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getSalesTargets(unitId: Int, periode: String? = null): ApiResponse<SalesTargetData> =
        client.get("api/app/sales/targets") {
            parameter("unitId", unitId)
            periode?.let { parameter("periode", it) }
        }.body()

    suspend fun createSalesTarget(target: SalesTarget): ApiResponse<Unit> =
        client.post("api/app/sales/targets") { setBody(target) }.body()

    suspend fun updateSalesTarget(target: SalesTarget): ApiResponse<Unit> =
        client.put("api/app/sales/targets") { setBody(target) }.body()

    suspend fun deleteSalesTarget(targetId: Int): ApiResponse<Unit> =
        client.delete("api/app/sales/targets") { parameter("targetId", targetId) }.body()

    // â”€â”€â”€ Approvals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getApprovals(unitId: Int): ApiResponse<ApprovalsData> =
        client.get("api/app/hr/approvals") { parameter("unitId", unitId) }.body()

    suspend fun approveRequest(requestId: Int, action: String, notes: String? = null): ApiResponse<Unit> =
        client.put("api/app/hr/approvals") {
            setBody(mapOf(
                "requestId" to requestId,
                "action" to action, // "approve" | "reject"
                "notes" to (notes ?: "")
            ))
        }.body()

    suspend fun createApprovalRequest(request: ApprovalRequest): ApiResponse<Unit> =
        client.post("api/app/hr/approvals") { setBody(request) }.body()

    // â”€â”€â”€ Katalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getKatalog(unitId: Int): ApiResponse<KatalogData> =
        client.get("api/app/katalog") { parameter("unitId", unitId) }.body()

    suspend fun toggleKatalogPublish(productId: String, isPublished: Boolean): ApiResponse<Unit> =
        client.put("api/app/katalog") {
            setBody(mapOf(
                "action" to "toggle-publish",
                "productId" to productId,
                "isPublished" to isPublished
            ))
        }.body()

    suspend fun bulkTogglePublish(productIds: List<String>, isPublished: Boolean): ApiResponse<Unit> =
        client.put("api/app/katalog") {
            setBody(mapOf(
                "action" to "bulk-toggle",
                "productIds" to productIds,
                "isPublished" to isPublished
            ))
        }.body()

    suspend fun updateKatalogSettings(settings: KatalogSettings): ApiResponse<Unit> =
        client.put("api/app/katalog") {
            setBody(mapOf("action" to "update-settings", "settings" to settings))
        }.body()

    // â”€â”€â”€ Marketing (full) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getMarketingData(unitId: Int): ApiResponse<MarketingData> =
        client.get("api/app/marketing") { parameter("unitId", unitId) }.body()

    suspend fun createMarketingLead(lead: MarketingLead): ApiResponse<Unit> =
        client.post("api/app/marketing") {
            setBody(mapOf("action" to "create-lead", "lead" to lead))
        }.body()

    suspend fun updateLeadStatus(leadId: Int, status: String): ApiResponse<Unit> =
        client.put("api/app/marketing") {
            setBody(mapOf("action" to "update-lead", "leadId" to leadId, "status" to status))
        }.body()

    // â”€â”€â”€ Unit Dashboard Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getUnitSummary(unitId: Int): ApiResponse<UnitDashboardSummary> =
        client.get("api/app/business") {
            parameter("unitId", unitId)
            parameter("action", "summary")
        }.body()

    // â”€â”€â”€ HR Departments (CRUD) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun updateDepartment(dept: Department): ApiResponse<Unit> =
        client.put("api/app/hr/departments") { setBody(dept) }.body()

    // â”€â”€â”€ HR Payroll (run payroll) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun runPayroll(unitId: Int, periode: String): ApiResponse<Unit> =
        client.post("api/app/hr/payroll") {
            setBody(mapOf("action" to "run-payroll", "unitId" to unitId, "periode" to periode))
        }.body()

    suspend fun markPayrollPaid(payrollId: Int): ApiResponse<Unit> =
        client.put("api/app/hr/payroll") {
            setBody(mapOf("action" to "mark-paid", "payrollId" to payrollId))
        }.body()

    // â”€â”€â”€ AI Advisor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getAiAdvice(unitId: Int, question: String): ApiResponse<AiAdvisorData> =
        client.get("api/ai-advisor") {
            parameter("unitId", unitId)
            parameter("question", question)
        }.body()

    // â”€â”€â”€ Business Plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getBusinessPlans(unitId: Int): ApiResponse<List<BusinessPlan>> =
        client.get("api/app/business-plan").body()

    suspend fun createBusinessPlan(plan: BusinessPlan): ApiResponse<BusinessPlan> =
        client.post("api/app/business-plan") { setBody(plan) }.body()

    suspend fun updateBusinessPlan(plan: BusinessPlan): ApiResponse<BusinessPlan> =
        client.post("api/app/business-plan") { setBody(plan) }.body()

    suspend fun deleteBusinessPlan(planId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/business-plan") { parameter("id", planId) }.body()

    suspend fun applyBusinessPlan(planId: Int, unitId: Int?): ApiResponse<Map<String, Any>> =
        client.post("api/app/business-plan/apply") {
            setBody(mapOf("planId" to planId, "unitId" to unitId))
        }.body()

    // â”€â”€â”€ Sosmed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getSocialPosts(unitId: Int): ApiResponse<List<SocialPost>> =
        client.get("api/app/sosmed") { parameter("unitId", unitId) }.body()

    suspend fun createSocialPost(post: SocialPost): ApiResponse<SocialPost> =
        client.post("api/app/sosmed") { setBody(post) }.body()

    suspend fun updateSocialPost(post: SocialPost): ApiResponse<SocialPost> =
        client.put("api/app/sosmed") { setBody(post) }.body()

    suspend fun deleteSocialPost(postId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/sosmed") {
            parameter("postId", postId)
            parameter("unitId", unitId)
        }.body()

    suspend fun generateAiCaption(platform: String, productName: String, tone: String = "energik"): ApiResponse<Map<String, String>> =
        client.post("api/app/sosmed/generate-caption") {
            setBody(mapOf("platform" to platform, "productName" to productName, "tone" to tone))
        }.body()

    // â”€â”€â”€ Website â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getAny(unitId: Int): ApiResponse<WebsiteSetting> =
        client.get("api/app/website") { parameter("unitId", unitId) }.body()

    suspend fun updateAny(settings: WebsiteSetting): ApiResponse<WebsiteSetting> =
        client.put("api/app/website") { setBody(settings) }.body()

    // â”€â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getHelpArticles(
        category: String? = null,
        query: String? = null
    ): ApiResponse<List<HelpArticle>> =
        client.get("api/app/help") {
            category?.let { parameter("category", it) }
            query?.let { parameter("query", it) }
        }.body()

    suspend fun sendHelpFeedback(articleId: String, helpful: Boolean): ApiResponse<Unit> =
        client.post("api/app/help") {
            setBody(mapOf("articleId" to articleId, "helpful" to helpful))
        }.body()

    // â”€â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getProfileSettings(): ApiResponse<Map<String, String>> =
        client.get("api/app/settings") { parameter("mode", "profile") }.body()

    suspend fun updateProfile(unitId: Int, data: Map<String, Any>): ApiResponse<Unit> =
        client.put("api/app/settings") {
            setBody(data + mapOf("mode" to "profile"))
        }.body()

    suspend fun changePassword(req: Map<String, String>): ApiResponse<Unit> =
        client.put("api/app/settings") {
            setBody(req + mapOf("mode" to "password"))
        }.body()

    suspend fun updatePreferences(data: Map<String, Any>): ApiResponse<Unit> =
        client.put("api/app/settings") {
            setBody(data + mapOf("mode" to "preferences"))
        }.body()

    // â”€â”€â”€ Landing Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    suspend fun getLandingPages(unitId: Int): ApiResponse<List<LandingPage>> =
        client.get("api/app/landing-page") { parameter("unitId", unitId) }.body()

    suspend fun getLandingPageTemplates(): ApiResponse<List<LandingPageTemplate>> =
        client.get("api/app/landing-page") { parameter("mode", "templates") }.body()

    suspend fun getLandingPageDetail(pageId: Int, unitId: Int): ApiResponse<LandingPage> =
        client.get("api/app/landing-page") {
            parameter("unitId", unitId)
            parameter("id", pageId)
        }.body()

    suspend fun createLandingPage(page: LandingPage): ApiResponse<LandingPage> =
        client.post("api/app/landing-page") { setBody(page) }.body()

    suspend fun updateLandingPage(page: LandingPage): ApiResponse<LandingPage> =
        client.put("api/app/landing-page") { setBody(page) }.body()

    suspend fun deleteLandingPage(pageId: Int, unitId: Int): ApiResponse<Unit> =
        client.delete("api/app/landing-page") {
            parameter("id", pageId)
            parameter("unitId", unitId)
        }.body()

    suspend fun toggleLandingPage(pageId: Int, unitId: Int, isActive: Boolean): ApiResponse<LandingPage> =
        client.put("api/app/landing-page") {
            setBody(mapOf("id" to pageId, "unitId" to unitId, "isActive" to isActive))
        }.body()

    // â”€â”€â”€ Shopee â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private fun <T> dummy(): ApiResponse<T> = ApiResponse(true, "Stub", null)
    suspend fun getUnits(): ApiResponse<List<BusinessUnit>> = dummy()
    suspend fun getSosmedPosts(unitId: Int): ApiResponse<List<SocialPost>> = dummy()
    suspend fun createSosmedPost(post: SocialPost): ApiResponse<SocialPost> = dummy()
    suspend fun getWebsiteSettings(unitId: Int): ApiResponse<WebsiteSetting> = dummy()
    suspend fun saveWebsiteSettings(settings: WebsiteSetting): ApiResponse<WebsiteSetting> = dummy()
    suspend fun sendChatMessage(message: ChatMessage): ApiResponse<ChatMessage> = dummy()

    suspend fun getShopeeStatus(unitId: Int): ApiResponse<ShopeeIntegration> =
        client.get("api/app/shopee") { parameter("unitId", unitId) }.body()

    suspend fun connectShopee(integration: ShopeeIntegration): ApiResponse<ShopeeIntegration> =
        client.post("api/app/shopee") {
            setBody(mapOf(
                "action" to "connect",
                "shopId" to integration.shopId,
                "shopName" to integration.shopName,
                "token" to integration.accessToken
            ))
        }.body()

    suspend fun disconnectShopee(unitId: Int): ApiResponse<Unit> =
        client.post("api/app/shopee") {
            setBody(mapOf("action" to "disconnect"))
        }.body()
}
