package com.example.api

import com.example.data.*
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

// --- DTOs ---

@JsonClass(generateAdapter = true)
data class LoginRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class LoginResponse(
    val success: Boolean,
    val message: String?,
    val data: LoginData?
)

@JsonClass(generateAdapter = true)
data class LoginData(
    val token: String,
    val user: UserInfo
)

@JsonClass(generateAdapter = true)
data class UserInfo(
    val id: Int,
    val username: String,
    val email: String,
    val role: String
)

@JsonClass(generateAdapter = true)
data class GenericResponse(
    val success: Boolean,
    val message: String?
)

@JsonClass(generateAdapter = true)
data class RegisterRequest(val username: String, val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class GoogleAuthRequest(val googleToken: String)

@JsonClass(generateAdapter = true)
data class BusinessDto(
    val id: Int,
    val name: String,
    val type: String
)

@JsonClass(generateAdapter = true)
data class GetBusinessResponse(
    val success: Boolean,
    val data: List<BusinessDto>
)

@JsonClass(generateAdapter = true)
data class CreateBusinessRequest(
    val name: String,
    val type: String
)

@JsonClass(generateAdapter = true)
data class ProductDto(
    val id: String,
    val sku: String,
    val nama: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int,
    val kategori: String,
    val unitId: Int,
    val variants: List<ProductVariantDto> = emptyList()
)

@JsonClass(generateAdapter = true)
data class ProductVariantDto(
    val id: String,
    val productId: String,
    val namaVariasi: String,
    val sku: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int
)

@JsonClass(generateAdapter = true)
data class GetProductsResponse(
    val success: Boolean,
    val data: List<ProductDto>
)

@JsonClass(generateAdapter = true)
data class EmployeeDto(
    val id: Int,
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String,
    val role: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class AttendanceDto(
    val id: Int,
    val employeeId: Int,
    val date: String,
    val checkIn: String,
    val checkOut: String?,
    val status: String
)

@JsonClass(generateAdapter = true)
data class PayrollDto(
    val id: Int,
    val employeeId: Int,
    val monthYear: String,
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val status: String
)

@JsonClass(generateAdapter = true)
data class HrDataDto(
    val employees: List<EmployeeDto>,
    val attendance: List<AttendanceDto>,
    val payroll: List<PayrollDto>
)

@JsonClass(generateAdapter = true)
data class GetHrResponse(
    val success: Boolean,
    val data: HrDataDto
)

@JsonClass(generateAdapter = true)
data class AddEmployeeRequest(
    val action: String = "create-employee",
    val employee: EmployeeDto
)

@JsonClass(generateAdapter = true)
data class CheckInRequest(
    val action: String = "check-in",
    val employeeId: Int,
    val unitId: Int,
    val date: String,
    val time: String
)

@JsonClass(generateAdapter = true)
data class CheckOutRequest(
    val action: String = "check-out",
    val employeeId: Int,
    val date: String,
    val time: String
)

@JsonClass(generateAdapter = true)
data class ProcessPayrollRequest(
    val action: String = "process-payroll",
    val payroll: PayrollDto
)

@JsonClass(generateAdapter = true)
data class PosOrderDto(
    val id: String,
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int?,
    val subtotal: Double,
    val total: Double,
    val paymentMethod: String,
    val status: String,
    val tanggal: Long,
    val items: List<PosOrderItemDto> = emptyList()
)

@JsonClass(generateAdapter = true)
data class PosOrderItemDto(
    val id: String = "",
    val orderId: String = "",
    val productId: String,
    val productName: String,
    val qty: Int,
    val price: Double
)

@JsonClass(generateAdapter = true)
data class PosCustomerDto(
    val id: Int,
    val unitId: Int,
    val namaCustomer: String,
    val email: String,
    val telepon: String
)

@JsonClass(generateAdapter = true)
data class PosDataDto(
    val orders: List<PosOrderDto>,
    val customers: List<PosCustomerDto>
)

@JsonClass(generateAdapter = true)
data class GetPosResponse(
    val success: Boolean,
    val data: PosDataDto
)

@JsonClass(generateAdapter = true)
data class CheckoutRequest(
    val action: String = "checkout",
    val order: PosOrderDto
)

@JsonClass(generateAdapter = true)
data class CreateCustomerRequest(
    val action: String = "create-customer",
    val customer: PosCustomerDto
)

@JsonClass(generateAdapter = true)
data class CrmDealDto(
    val id: Int,
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String,
    val phone: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class GetCrmResponse(
    val success: Boolean,
    val data: List<CrmDealDto>
)

@JsonClass(generateAdapter = true)
data class AddDealRequest(
    val deal: CrmDealDto
)

@JsonClass(generateAdapter = true)
data class UpdateDealStageRequest(
    val dealId: Int,
    val stage: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class SupplierDto(
    val id: String,
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String
)

@JsonClass(generateAdapter = true)
data class PurchaseOrderDto(
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
    val status: String
)

@JsonClass(generateAdapter = true)
data class ScmDataDto(
    val suppliers: List<SupplierDto>,
    val purchaseOrders: List<PurchaseOrderDto>
)

@JsonClass(generateAdapter = true)
data class GetScmResponse(
    val success: Boolean,
    val data: ScmDataDto
)

@JsonClass(generateAdapter = true)
data class CreateSupplierRequest(
    val action: String = "create-supplier",
    val supplier: SupplierDto
)

@JsonClass(generateAdapter = true)
data class CreatePoRequest(
    val action: String = "create-po",
    val po: PurchaseOrderDto
)

@JsonClass(generateAdapter = true)
data class UpdatePoStatusRequest(
    val poId: String,
    val status: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class TransactionDto(
    val id: Int,
    val unitId: Int,
    val kategoriTrx: String,
    val nominal: Double,
    val tanggal: Long,
    val keterangan: String
)

@JsonClass(generateAdapter = true)
data class RiwayatAksiDto(
    val id: Int,
    val unitId: Int,
    val pesan: String,
    val tipe: String,
    val waktu: Long,
    val kategori: String
)

@JsonClass(generateAdapter = true)
data class BiMetricsDto(
    val totalMasuk: Double,
    val totalKeluar: Double,
    val netProfit: Double,
    val margin: Double,
    val efficiency: Double,
    val cashRunway: Double,
    val integrityScore: Int,
    val outlook: String,
    val riskAssessment: String,
    val aiConfidence: Int
)

@JsonClass(generateAdapter = true)
data class FinanceDataDto(
    val transactions: List<TransactionDto>,
    val riwayatAksi: List<RiwayatAksiDto>,
    val biMetrics: BiMetricsDto
)

@JsonClass(generateAdapter = true)
data class GetFinanceResponse(
    val success: Boolean,
    val data: FinanceDataDto
)

@JsonClass(generateAdapter = true)
data class CreateTransactionRequest(
    val transaction: TransactionDto
)

@JsonClass(generateAdapter = true)
data class AiAdvisorRequest(
    val unitId: Int,
    val question: String
)

@JsonClass(generateAdapter = true)
data class AiAdvisorResponse(
    val success: Boolean,
    val message: String?,
    val data: AiAdvisorData?
)

@JsonClass(generateAdapter = true)
data class AiAdvisorData(
    val analysis: String
)

// --- Retrofit API Service Interface ---

interface NusantaraApiService {

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): GenericResponse

    @POST("api/auth/google")
    suspend fun loginGoogle(@Body request: GoogleAuthRequest): LoginResponse

    @GET("api/app/business")
    suspend fun getUnits(): GetBusinessResponse

    @POST("api/app/business")
    suspend fun createUnit(@Body request: CreateBusinessRequest): GenericResponse

    @DELETE("api/app/business")
    suspend fun deleteUnit(@Query("unitId") unitId: Int): GenericResponse

    @GET("api/app/products")
    suspend fun getProducts(@Query("unitId") unitId: Int): GetProductsResponse

    @POST("api/app/products")
    suspend fun createProduct(@Body request: ProductDto): GenericResponse

    @PUT("api/app/products")
    suspend fun updateProduct(@Body request: ProductDto): GenericResponse

    @DELETE("api/app/products")
    suspend fun deleteProduct(
        @Query("unitId") unitId: Int,
        @Query("productId") productId: String
    ): GenericResponse

    @GET("api/app/hr")
    suspend fun getHrData(@Query("unitId") unitId: Int): GetHrResponse

    @POST("api/app/hr")
    suspend fun processHrAction(@Body request: Any): GenericResponse

    @DELETE("api/app/hr")
    suspend fun deleteEmployee(
        @Query("unitId") unitId: Int,
        @Query("employeeId") employeeId: Int
    ): GenericResponse

    @GET("api/app/pos")
    suspend fun getPosData(@Query("unitId") unitId: Int): GetPosResponse

    @POST("api/app/pos")
    suspend fun processPosAction(@Body request: Any): GenericResponse

    @GET("api/app/crm")
    suspend fun getCrmData(@Query("unitId") unitId: Int): GetCrmResponse

    @POST("api/app/crm")
    suspend fun createDeal(@Body request: AddDealRequest): GenericResponse

    @PUT("api/app/crm")
    suspend fun updateDealStage(@Body request: UpdateDealStageRequest): GenericResponse

    @DELETE("api/app/crm")
    suspend fun deleteDeal(
        @Query("unitId") unitId: Int,
        @Query("dealId") dealId: Int
    ): GenericResponse

    @GET("api/app/scm")
    suspend fun getScmData(@Query("unitId") unitId: Int): GetScmResponse

    @POST("api/app/scm")
    suspend fun processScmAction(@Body request: Any): GenericResponse

    @PUT("api/app/scm")
    suspend fun updatePoStatus(@Body request: UpdatePoStatusRequest): GenericResponse

    @DELETE("api/app/scm")
    suspend fun deleteSupplier(
        @Query("unitId") unitId: Int,
        @Query("supplierId") supplierId: String
    ): GenericResponse

    @GET("api/app/finance")
    suspend fun getFinanceData(@Query("unitId") unitId: Int): GetFinanceResponse

    @POST("api/app/finance")
    suspend fun createTransaction(@Body request: CreateTransactionRequest): GenericResponse

    @DELETE("api/app/finance")
    suspend fun deleteTransaction(
        @Query("unitId") unitId: Int,
        @Query("transactionId") transactionId: Int
    ): GenericResponse

    @POST("api/ai-advisor")
    suspend fun getAiAdvice(@Body request: AiAdvisorRequest): AiAdvisorResponse
}

// --- Retrofit Client Setup ---

object NusantaraRetrofitClient {
    private const val BASE_URL = "http://localhost:5173/" // Set to localhost for adb reverse port forwarding

    private val authInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val token = SessionManager.getToken()
        
        val newRequest = if (!token.isNullOrEmpty()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            originalRequest
        }
        chain.proceed(newRequest)
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    val apiService: NusantaraApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(NusantaraApiService::class.java)
    }
}
