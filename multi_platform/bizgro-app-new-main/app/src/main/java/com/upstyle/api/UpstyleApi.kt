package com.upstyle.api

import com.upstyle.data.*
import retrofit2.Response
import retrofit2.http.*

interface UpstyleApi {

    // ─── Auth ─────────────────────────────────────────────────────────────────

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginData>>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<Nothing>>

    @POST("api/auth/google")
    suspend fun loginGoogle(@Body request: GoogleAuthRequest): Response<ApiResponse<LoginData>>

    // ─── Business Units ───────────────────────────────────────────────────────

    @GET("api/app/business")
    suspend fun getBusinessUnits(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<BusinessUnit>>

    @POST("api/app/business")
    suspend fun createBusinessUnit(
        @Body request: CreateBusinessRequest
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/business")
    suspend fun deleteBusinessUnit(
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<Nothing>>

    // ─── Finance ──────────────────────────────────────────────────────────────

    @GET("api/app/finance")
    suspend fun getFinanceData(
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<FinanceData>>

    @POST("api/app/finance")
    suspend fun createTransaction(
        @Body request: CreateTransactionRequest
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/finance")
    suspend fun deleteTransaction(
        @Query("transactionId") transactionId: Int,
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<Nothing>>

    // ─── Products ─────────────────────────────────────────────────────────────

    @GET("api/app/products")
    suspend fun getProducts(
        @Query("unitId") unitId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<Product>>

    @POST("api/app/products")
    suspend fun createProduct(
        @Body request: Product
    ): Response<ApiResponse<Nothing>>

    @PUT("api/app/products")
    suspend fun updateProduct(
        @Body request: Product
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/products")
    suspend fun deleteProduct(
        @Query("productId") productId: String
    ): Response<ApiResponse<Nothing>>

    // ─── POS ──────────────────────────────────────────────────────────────────

    @GET("api/app/pos")
    suspend fun getPosData(
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<PosData>>

    @POST("api/app/pos")
    suspend fun checkout(
        @Body request: CheckoutRequest
    ): Response<ApiResponse<Nothing>>

    @POST("api/app/pos")
    suspend fun createPosCustomer(
        @Body request: CreateCustomerRequest
    ): Response<ApiResponse<Nothing>>

    // ─── HR ───────────────────────────────────────────────────────────────────

    @GET("api/app/hr")
    suspend fun getHrData(
        @Query("unitId") unitId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<ApiResponse<HrData>>

    @POST("api/app/hr")
    suspend fun createEmployee(
        @Body request: CreateEmployeeRequest
    ): Response<ApiResponse<Nothing>>

    @POST("api/app/hr")
    suspend fun checkIn(
        @Body request: CheckInRequest
    ): Response<ApiResponse<Nothing>>

    @POST("api/app/hr")
    suspend fun checkOut(
        @Body request: CheckOutRequest
    ): Response<ApiResponse<Nothing>>

    @POST("api/app/hr")
    suspend fun processPayroll(
        @Body request: ProcessPayrollRequest
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/hr")
    suspend fun deleteEmployee(
        @Query("employeeId") employeeId: Int,
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<Nothing>>

    // ─── CRM ──────────────────────────────────────────────────────────────────

    @GET("api/app/crm")
    suspend fun getCrmDeals(
        @Query("unitId") unitId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<CrmDeal>>

    @POST("api/app/crm")
    suspend fun createDeal(
        @Body request: CreateDealRequest
    ): Response<ApiResponse<Nothing>>

    @PUT("api/app/crm")
    suspend fun updateDealStage(
        @Body request: UpdateDealStageRequest
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/crm")
    suspend fun deleteDeal(
        @Query("dealId") dealId: Int,
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<Nothing>>

    // ─── SCM ──────────────────────────────────────────────────────────────────

    @GET("api/app/scm")
    suspend fun getScmData(
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<ScmData>>

    @POST("api/app/scm")
    suspend fun createSupplier(
        @Body request: CreateSupplierRequest
    ): Response<ApiResponse<Nothing>>

    @POST("api/app/scm")
    suspend fun createPurchaseOrder(
        @Body request: CreatePoRequest
    ): Response<ApiResponse<Nothing>>

    @PUT("api/app/scm")
    suspend fun updatePoStatus(
        @Body request: UpdatePoStatusRequest
    ): Response<ApiResponse<Nothing>>

    @DELETE("api/app/scm")
    suspend fun deleteSupplier(
        @Query("supplierId") supplierId: String,
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<Nothing>>

    // ─── AI Chat ──────────────────────────────────────────────────────────────

    @POST("api/chat")
    suspend fun chat(
        @Body request: ChatRequest
    ): Response<ChatResponse>

    @POST("api/ai-advisor")
    suspend fun aiAdvisor(
        @Body request: AiAdvisorRequest
    ): Response<ApiResponse<AiAdvisorData>>

    // ─── Reports & Utilities ─────────────────────────────────────────────────

    @GET("api/low-stock")
    suspend fun getLowStock(
        @Query("unitId") unitId: Int
    ): Response<ApiResponse<List<LowStockProduct>>>

    @POST("api/laporan-wa")
    suspend fun getLaporanWa(
        @Body request: LaporanWaRequest
    ): Response<ApiResponse<LaporanWaData>>

    @GET("api/updates")
    suspend fun getUpdates(
        @Query("slug") slug: String,
        @Query("lastUpdate") lastUpdate: Long,
        @Query("type") type: String = "all"
    ): Response<Map<String, Any>>
}
