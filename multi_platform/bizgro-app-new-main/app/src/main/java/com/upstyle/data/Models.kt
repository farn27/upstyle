package com.upstyle.data

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ─── Generic Responses ────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val code: String? = null
)

@JsonClass(generateAdapter = true)
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T> = emptyList(),
    val pagination: Pagination? = null
)

@JsonClass(generateAdapter = true)
data class Pagination(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Int = 0,
    @Json(name = "totalPages") val totalPages: Int = 1
)

// ─── Auth ─────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class LoginRequest(val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class RegisterRequest(val username: String, val email: String, val password: String)

@JsonClass(generateAdapter = true)
data class GoogleAuthRequest(val googleToken: String)

@JsonClass(generateAdapter = true)
data class LoginData(val token: String, val user: UserInfo)

@JsonClass(generateAdapter = true)
data class UserInfo(
    val id: Int,
    val username: String,
    val email: String,
    val role: String
)

// ─── Business Units ───────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class BusinessUnit(
    val id: Int,
    val name: String,
    val type: String,
    val uid: String = ""
)

@JsonClass(generateAdapter = true)
data class CreateBusinessRequest(
    val name: String,
    val type: String,
    @Json(name = "is_cabang") val isCabang: Boolean = false,
    @Json(name = "cabang_dari") val cabangDari: Int? = null
)

// ─── Finance / Transactions ───────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Transaction(
    val id: Int,
    val unitId: Int,
    val kategoriTrx: String,  // MASUK | KELUAR
    val nominal: Double,
    val tanggal: Long,
    val keterangan: String
)

@JsonClass(generateAdapter = true)
data class RiwayatAksi(
    val id: Int,
    val unitId: Int,
    val pesan: String,
    val tipe: String,
    val waktu: Long,
    val kategori: String
)

@JsonClass(generateAdapter = true)
data class BiMetrics(
    val totalMasuk: Double = 0.0,
    val totalKeluar: Double = 0.0,
    val netProfit: Double = 0.0,
    val margin: Double = 0.0,
    val efficiency: Double = 0.0,
    val cashRunway: Double = 0.0,
    val integrityScore: Int = 5,
    val outlook: String = "MODERATE",
    val riskAssessment: String = "LOW",
    val aiConfidence: Int = 45
)

@JsonClass(generateAdapter = true)
data class FinanceData(
    val transactions: List<Transaction> = emptyList(),
    val riwayatAksi: List<RiwayatAksi> = emptyList(),
    val biMetrics: BiMetrics = BiMetrics()
)

@JsonClass(generateAdapter = true)
data class CreateTransactionRequest(val transaction: TransactionBody)

@JsonClass(generateAdapter = true)
data class TransactionBody(
    val unitId: Int,
    val kategoriTrx: String,
    val nominal: Double,
    val keterangan: String
)

// ─── Products ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Product(
    val id: String,
    val sku: String = "",
    val nama: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int,
    val kategori: String = "UMUM",
    val unitId: Int,
    val variants: List<ProductVariant> = emptyList()
)

@JsonClass(generateAdapter = true)
data class ProductVariant(
    val id: String = "",
    val productId: String = "",
    val namaVariasi: String,
    val sku: String = "",
    val hargaBeli: Double = 0.0,
    val hargaJual: Double = 0.0,
    val stok: Int = 0
)

// ─── POS ──────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class PosOrder(
    val id: String,
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int? = null,
    val subtotal: Double,
    val total: Double,
    val paymentMethod: String,
    val status: String,
    val tanggal: Long,
    val items: List<PosOrderItem> = emptyList()
)

@JsonClass(generateAdapter = true)
data class PosOrderItem(
    val id: String = "",
    val orderId: String = "",
    val productId: String,
    val productName: String,
    val qty: Int,
    val price: Double
)

@JsonClass(generateAdapter = true)
data class PosCustomer(
    val id: Int,
    val unitId: Int,
    val namaCustomer: String,
    val email: String = "",
    val telepon: String = ""
)

@JsonClass(generateAdapter = true)
data class PosData(
    val orders: List<PosOrder> = emptyList(),
    val customers: List<PosCustomer> = emptyList()
)

@JsonClass(generateAdapter = true)
data class CheckoutRequest(
    val action: String = "checkout",
    val order: CheckoutBody
)

@JsonClass(generateAdapter = true)
data class CheckoutBody(
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int? = null,
    val subtotal: Double,
    val total: Double,
    val paymentMethod: String,
    val items: List<PosOrderItem>
)

@JsonClass(generateAdapter = true)
data class CreateCustomerRequest(
    val action: String = "create-customer",
    val customer: CreateCustomerBody
)

@JsonClass(generateAdapter = true)
data class CreateCustomerBody(
    val namaCustomer: String,
    val email: String = "",
    val telepon: String = "",
    val unitId: Int
)

// ─── HR ───────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Employee(
    val id: Int,
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String = "",
    val role: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class AttendanceRecord(
    val id: Int,
    val employeeId: Int,
    val date: String,
    val checkIn: String,
    val checkOut: String? = null,
    val status: String
)

@JsonClass(generateAdapter = true)
data class PayrollRecord(
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
data class HrData(
    val employees: List<Employee> = emptyList(),
    val attendance: List<AttendanceRecord> = emptyList(),
    val payroll: List<PayrollRecord> = emptyList()
)

@JsonClass(generateAdapter = true)
data class CreateEmployeeRequest(
    val action: String = "create-employee",
    val employee: CreateEmployeeBody
)

@JsonClass(generateAdapter = true)
data class CreateEmployeeBody(
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String,
    val role: String,
    val unitId: Int
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
    val payroll: ProcessPayrollBody
)

@JsonClass(generateAdapter = true)
data class ProcessPayrollBody(
    val employeeId: Int,
    val monthYear: String,
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val unitId: Int
)

// ─── CRM ──────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class CrmDeal(
    val id: Int,
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String,
    val phone: String = "",
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class CreateDealRequest(val deal: CreateDealBody)

@JsonClass(generateAdapter = true)
data class CreateDealBody(
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String = "PROSPECT",
    val phone: String = "",
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class UpdateDealStageRequest(
    val dealId: Int,
    val stage: String,
    val unitId: Int
)

// ─── SCM ──────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Supplier(
    val id: String,
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String
)

@JsonClass(generateAdapter = true)
data class PurchaseOrder(
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
    val status: String  // DRAFT | SENT | RECEIVED
)

@JsonClass(generateAdapter = true)
data class ScmData(
    val suppliers: List<Supplier> = emptyList(),
    val purchaseOrders: List<PurchaseOrder> = emptyList()
)

@JsonClass(generateAdapter = true)
data class CreateSupplierRequest(
    val action: String = "create-supplier",
    val supplier: CreateSupplierBody
)

@JsonClass(generateAdapter = true)
data class CreateSupplierBody(
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class CreatePoRequest(
    val action: String = "create-po",
    val po: CreatePoBody
)

@JsonClass(generateAdapter = true)
data class CreatePoBody(
    val poNumber: String,
    val supplierId: String,
    val productId: String,
    val qty: Int,
    val unitCost: Double,
    val totalAmount: Double,
    val unitId: Int
)

@JsonClass(generateAdapter = true)
data class UpdatePoStatusRequest(
    val poId: String,
    val status: String,
    val unitId: Int
)

// ─── AI Chat ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class ChatMessage(
    val role: String,   // "user" | "assistant"
    val content: String
)

@JsonClass(generateAdapter = true)
data class ChatRequest(
    val message: String,
    val activeUnitSlug: String? = null,
    val history: List<ChatMessage> = emptyList()
)

@JsonClass(generateAdapter = true)
data class ChatResponse(
    val reply: String,
    val suggestions: List<String> = emptyList(),
    val intent: String? = null
)

// ─── AI Advisor ───────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class AiAdvisorRequest(val unitId: Int, val question: String)

@JsonClass(generateAdapter = true)
data class AiAdvisorData(val analysis: String)

// ─── Low Stock ────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class LowStockProduct(
    val id: String,
    val nama: String,
    val stok: Int,
    val minStok: Int
)

// ─── Laporan WA ───────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class LaporanWaRequest(
    val unitId: Int,
    val periode: String = "hari_ini"  // hari_ini | kemarin | minggu_ini | bulan_ini
)

@JsonClass(generateAdapter = true)
data class LaporanWaData(
    val teks: String,
    val data: LaporanRawData? = null
)

@JsonClass(generateAdapter = true)
data class LaporanRawData(
    val masuk: Double = 0.0,
    val keluar: Double = 0.0,
    val laba: Double = 0.0,
    val totalTrx: Int = 0,
    val totalOrder: Int = 0,
    val totalOmzet: Double = 0.0,
    val periode: String = ""
)

// ─── Notifications ────────────────────────────────────────────────────────────

data class NotifItem(
    val id: Long = System.currentTimeMillis(),
    val pesan: String,
    val tipe: String = "info",
    val waktu: Long = System.currentTimeMillis(),
    val isRead: Boolean = false
)
