package com.upstyle.bizgrow.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// â”€â”€â”€ Generic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val code: String? = null
)

@Serializable
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T> = emptyList(),
    val pagination: Pagination? = null
)

@Serializable
data class Pagination(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Int = 0,
    val totalPages: Int = 1
)

// â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class RegisterRequest(val username: String, val email: String, val password: String)

@Serializable
data class GoogleAuthRequest(val googleToken: String)

@Serializable
data class LoginData(val token: String, val user: UserInfo)

@Serializable
data class UserInfo(
    val id: Int,
    val username: String,
    val email: String,
    val role: String
)

// â”€â”€â”€ Business Units â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class BusinessUnit(
    val id: Int,
    val name: String,
    val type: String,
    val uid: String = "",
    val slug: String = "",
    val loginSlug: String = "",
    val alamat: String? = null,
    val telepon: String? = null,
    val email: String? = null,
    val modalAwal: Double = 0.0,
    val isCabang: Int = 0,
    @SerialName("pos_feature_override") val posFeatureOverride: String? = null,
    val settings: BusinessUnitSettings? = null
)

@Serializable
data class BusinessUnitSettings(
    val alamat: String = "",
    val telepon: String = "",
    val email: String = "",
    val modalAwal: Double = 0.0,
    val isCabang: Int = 0,
    val posFeatureOverride: String? = null
)

@Serializable
data class CreateBusinessRequest(
    val name: String,
    val type: String,
    @SerialName("is_cabang") val isCabang: Boolean = false,
    @SerialName("cabang_dari") val cabangDari: Int? = null
)

// â”€â”€â”€ Finance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class Transaction(
    val id: Int,
    val unitId: Int,
    val kategoriTrx: String,
    val nominal: Double,
    val tanggal: String = "",
    val keterangan: String = "",
    val metodeBayar: String = "KAS",
    val abcCategoryId: Int? = null,
    val productId: String? = null,
    val qty: Int = 1,
    val hppTotal: Double = 0.0
)

@Serializable
data class RiwayatAksi(
    val id: Int,
    val unitId: Int,
    val pesan: String,
    val tipe: String,
    val waktu: String = "",
    val kategori: String = "",
    val isRead: Int = 0,
    val link: String? = null
)

@Serializable
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

@Serializable
data class FinanceData(
    val transactions: List<Transaction> = emptyList(),
    val riwayatAksi: List<RiwayatAksi> = emptyList(),
    val biMetrics: BiMetrics = BiMetrics(),
    val summary: FinanceSummary = FinanceSummary(),
    val alerts: FinanceAlerts = FinanceAlerts(),
    val bankBalances: List<BankBalance> = emptyList(),
    val kpi: FinanceKpi = FinanceKpi()
)

@Serializable
data class FinanceSummary(
    @SerialName("total_masuk") val totalMasuk: Double = 0.0,
    @SerialName("total_keluar") val totalKeluar: Double = 0.0,
    @SerialName("total_hpp") val totalHpp: Double = 0.0
)

@Serializable
data class FinanceAlerts(
    val receivables: Int = 0,
    val payables: Int = 0,
    val lowStock: Int = 0
)

@Serializable
data class BankBalance(
    val nama: String,
    val kode: String,
    val saldo: Double
)

@Serializable
data class FinanceKpi(
    val target: Double = 0.0,
    val current: Double = 0.0
)

@Serializable
data class CreateTransactionRequest(val transaction: TransactionBody)

@Serializable
data class TransactionBody(
    val unitId: Int,
    val kategoriTrx: String,
    val nominal: Double,
    val keterangan: String,
    val metodeBayar: String = "KAS",
    val abcCategoryId: Int? = null,
    val productId: String? = null,
    val qty: Int = 1
)

// â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class Product(
    val id: String,
    val sku: String = "",
    val nama: String,
    val hargaBeli: Double,
    val hargaJual: Double,
    val stok: Int,
    val minStok: Int = 5,
    val kategori: String = "UMUM",
    val kategoriId: Int? = null,
    val unitId: Int,
    val foto: String? = null,
    val barcode: String? = null,
    val status: String = "active",
    val hasVariant: Int = 0,
    val showInPos: Int = 1,
    val variants: List<ProductVariant> = emptyList()
)

@Serializable
data class ProductVariant(
    val id: String = "",
    val productId: String = "",
    val namaVariasi: String,
    val sku: String = "",
    val hargaBeli: Double = 0.0,
    val hargaJual: Double = 0.0,
    val stok: Int = 0,
    val minStok: Int = 0
)

@Serializable
data class KategoriProduk(
    val id: Int,
    val unitId: Int,
    val namaKategori: String
)

@Serializable
data class StockLog(
    val id: String,
    val productId: String,
    val userId: String,
    val unitId: Int,
    val stokAwal: Int,
    val perubahan: Int,
    val stokAkhir: Int,
    val alasan: String,
    val keterangan: String? = null,
    val createdAt: String = ""
)

// â”€â”€â”€ POS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class PosOrder(
    val id: String,
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int? = null,
    val subtotal: Double,
    val diskon: Double = 0.0,
    val total: Double,
    val paymentMethod: String,
    val status: String,
    val tanggal: String = "",
    val items: List<PosOrderItem> = emptyList()
)

@Serializable
data class PosOrderItem(
    val id: String = "",
    val orderId: String = "",
    val productId: String,
    val productName: String,
    val variantId: String? = null,
    val variantName: String? = null,
    val qty: Int,
    val price: Double,
    val hpp: Double = 0.0
)

@Serializable
data class PosCustomer(
    val id: Int,
    val unitId: Int,
    val namaCustomer: String,
    val email: String = "",
    val telepon: String = "",
    val totalPoint: Int = 0
)

@Serializable
data class PosData(
    val orders: List<PosOrder> = emptyList(),
    val customers: List<PosCustomer> = emptyList()
)

@Serializable
data class CheckoutRequest(
    val action: String = "checkout",
    val order: CheckoutBody
)

@Serializable
data class CheckoutBody(
    val orderNumber: String,
    val unitId: Int,
    val customerId: Int? = null,
    val subtotal: Double,
    val diskon: Double = 0.0,
    val total: Double,
    val paymentMethod: String,
    val items: List<PosOrderItem>,
    val voucherCode: String? = null,
    val orderType: String = "TAKEAWAY", // DINE_IN | TAKEAWAY | DELIVERY
    val tableNumber: String? = null,
    val notes: String? = null,
    val amountPaid: Double? = null,
    val changeAmount: Double? = null,
    val payments: List<SplitPayment>? = null
)

@Serializable
data class CreateCustomerRequest(
    val action: String = "create-customer",
    val customer: CreateCustomerBody
)

@Serializable
data class CreateCustomerBody(
    val namaCustomer: String,
    val email: String = "",
    val telepon: String = "",
    val unitId: Int
)

// â”€â”€â”€ HR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class Employee(
    val id: Int,
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String = "",
    val role: String,
    val unitId: Int,
    val email: String = "",
    val phone: String = "",
    val joinDate: String? = null,
    val address: String = "",
    val employmentStatus: String? = null,
    val placementLocation: String = "",
    val idNumber: String = "",
    val emergencyContact: String = "",
    val emergencyRelation: String = "",
    val bloodType: String = "",
    val employeeIdCard: String = ""
)

@Serializable
data class AttendanceRecord(
    val id: Int,
    val employeeId: Int,
    val date: String,
    val checkIn: String,
    val checkOut: String? = null,
    val status: String
)

@Serializable
data class PayrollRecord(
    val id: Int,
    val employeeId: Int,
    val monthYear: String,
    val periodMonth: Int = 0,
    val periodYear: Int = 0,
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val status: String
)

@Serializable
data class SalaryComponent(
    val id: Int,
    val employeeId: Int,
    val name: String,
    val amount: Double,
    val type: String // "addition" | "deduction"
)

@Serializable
data class EmployeeKpi(
    val id: Int,
    val employeeId: Int,
    val periodMonth: Int,
    val periodYear: Int,
    val score: Double,
    val notes: String? = null
)

@Serializable
data class LeaveRequest(
    val id: Int,
    val employeeId: Int,
    val employeeName: String = "",
    val type: String,
    val startDate: String,
    val endDate: String,
    val reason: String? = null,
    val status: String,
    val createdAt: String = ""
)

@Serializable
data class HrData(
    val employees: List<Employee> = emptyList(),
    val attendance: List<AttendanceRecord> = emptyList(),
    val payroll: List<PayrollRecord> = emptyList(),
    val leaveRequests: List<LeaveRequest> = emptyList()
)

@Serializable
data class CreateEmployeeRequest(
    val action: String = "create-employee",
    val employee: CreateEmployeeBody
)

@Serializable
data class CreateEmployeeBody(
    val fullName: String,
    val position: String,
    val salary: Double,
    val pin: String,
    val role: String,
    val unitId: Int,
    val email: String = "",
    val phone: String = "",
    val joinDate: String = "",
    val address: String = "",
    val employmentStatus: String = "active",
    val placementLocation: String = "",
    val idNumber: String = "",
    val emergencyContact: String = "",
    val emergencyRelation: String = "",
    val bloodType: String = "",
    val employeeIdCard: String = ""
)

@Serializable
data class CheckInRequest(
    val action: String = "check-in",
    val employeeId: Int,
    val unitId: Int,
    val date: String,
    val time: String
)

@Serializable
data class CheckOutRequest(
    val action: String = "check-out",
    val employeeId: Int,
    val date: String,
    val time: String
)

@Serializable
data class ProcessPayrollRequest(
    val action: String = "process-payroll",
    val payroll: ProcessPayrollBody
)

@Serializable
data class ProcessPayrollBody(
    val employeeId: Int,
    val monthYear: String,
    val periodMonth: Int = 0,
    val periodYear: Int = 0,
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val unitId: Int
)

// â”€â”€â”€ CRM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class CrmContact(
    val id: Int,
    val ownerId: Int,
    val unitId: Int,
    val nama: String,
    val telepon: String = "",
    val email: String = "",
    val perusahaan: String = "",
    val stage: String = "lead",
    val sumber: String = "manual",
    val tags: String? = null,
    val alamat: String = "",
    val catatan: String = "",
    val createdAt: String = ""
)

@Serializable
data class CrmDeal(
    val id: Int,
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String,
    val phone: String = "",
    val unitId: Int,
    val kontakId: Int? = null,
    val status: String = "open",
    val createdAt: String = "",
    val contact: CrmContact? = null
)

@Serializable
data class CrmActivity(
    val id: Int,
    val ownerId: Int,
    val unitId: Int,
    val kontakId: Int? = null,
    val tipe: String, // Call, WA, Meeting, Email, Task
    val catatan: String? = null,
    val tanggal: String = "",
    val contact: CrmContact? = null
)

@Serializable
data class CreateContactRequest(
    val action: String = "create-contact",
    val contact: CreateContactBody
)

@Serializable
data class CreateContactBody(
    val nama: String,
    val telepon: String = "",
    val email: String = "",
    val perusahaan: String = "",
    val stage: String = "lead",
    val sumber: String = "manual",
    val unitId: Int
)

@Serializable
data class CreateDealRequest(val deal: CreateDealBody)

@Serializable
data class CreateDealBody(
    val contactName: String,
    val companyName: String,
    val dealValue: Double,
    val stage: String = "PROSPECT",
    val phone: String = "",
    val unitId: Int,
    val kontakId: Int? = null
)

@Serializable
data class UpdateDealStageRequest(val dealId: Int, val stage: String, val unitId: Int)

@Serializable
data class CreateActivityRequest(
    val action: String = "create-activity",
    val activity: CreateActivityBody
)

@Serializable
data class CreateActivityBody(
    val kontakId: Int,
    val tipe: String,
    val catatan: String = "",
    val unitId: Int
)

// â”€â”€â”€ SCM â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class Supplier(
    val id: String,
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String
)

@Serializable
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
    val date: String = "",
    val status: String,
    val notes: String? = null
)

@Serializable
data class ScmData(
    val suppliers: List<Supplier> = emptyList(),
    val purchaseOrders: List<PurchaseOrder> = emptyList()
)

@Serializable
data class CreateSupplierRequest(
    val action: String = "create-supplier",
    val supplier: CreateSupplierBody
)

@Serializable
data class CreateSupplierBody(
    val name: String,
    val contactName: String,
    val phone: String,
    val email: String,
    val category: String,
    val address: String,
    val unitId: Int
)

@Serializable
data class CreatePoRequest(
    val action: String = "create-po",
    val po: CreatePoBody
)

@Serializable
data class CreatePoBody(
    val poNumber: String,
    val supplierId: String,
    val productId: String,
    val qty: Int,
    val unitCost: Double,
    val totalAmount: Double,
    val unitId: Int,
    val notes: String? = null
)

@Serializable
data class UpdatePoStatusRequest(
    val poId: String,
    val status: String,
    val unitId: Int
)

// â”€â”€â”€ Finance AR/AP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class AccountingContact(
    val id: Int,
    val unitId: Int,
    val namaKontak: String,
    val tipeKontak: String, // "customer" | "supplier" | "both"
    val email: String? = null,
    val telepon: String? = null,
    val alamat: String? = null,
    val npwp: String? = null,
    val limitKredit: Double = 0.0,
    val termPembayaran: Int = 30,
    val isActive: Int = 1
)

@Serializable
data class Receivable(
    val id: Int,
    val unitId: Int,
    val contactId: Int? = null,
    val journalId: Int? = null,
    val nomorInvoice: String,
    val tanggal: String,
    val jatuhTempo: String,
    val nominal: Double,
    val sudahDibayar: Double = 0.0,
    val status: String, // BELUM_BAYAR, SEBAGIAN, LUNAS
    val keterangan: String? = null,
    val contact: AccountingContact? = null
)

@Serializable
data class Payable(
    val id: Int,
    val unitId: Int,
    val contactId: Int? = null,
    val journalId: Int? = null,
    val nomorFaktur: String,
    val tanggal: String,
    val jatuhTempo: String,
    val nominal: Double,
    val sudahDibayar: Double = 0.0,
    val status: String, // BELUM_BAYAR, SEBAGIAN, LUNAS
    val keterangan: String? = null,
    val contact: AccountingContact? = null
)

@Serializable
data class CreateReceivableRequest(
    val contactId: Int,
    val tanggal: String,
    val jatuhTempo: String,
    val nominal: Double,
    val keterangan: String? = null
)

@Serializable
data class CreatePayableRequest(
    val contactId: Int,
    val nomorFaktur: String? = null,
    val tanggal: String,
    val jatuhTempo: String,
    val nominal: Double,
    val keterangan: String? = null
)

@Serializable
data class PayInvoiceRequest(
    val invoiceId: Int,
    val nominalBayar: Double
)

// â”€â”€â”€ Double Entry / Jurnal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ChartOfAccount(
    val id: Int = 0,
    val unitId: Int = 0,
    val kodeAkun: String = "",
    val namaAkun: String = "",
    val tipeAkun: String = "",
    val normalBalance: String = "DEBIT",
    val isActive: Int = 1,
    val deskripsi: String? = null
)

@Serializable
data class JournalEntryLine(
    val id: Int,
    val journalId: Int,
    val coaId: Int,
    val keterangan: String? = null,
    val debit: Double = 0.0,
    val kredit: Double = 0.0,
    val account: ChartOfAccount? = null
)

@Serializable
data class JournalEntry(
    val id: Int,
    val unitId: Int,
    val userId: Int,
    val tanggal: String,
    val nomorJurnal: String,
    val referensi: String? = null,
    val memo: String? = null,
    val sourceType: String = "MANUAL",
    val totalDebit: Double = 0.0,
    val totalKredit: Double = 0.0,
    val status: String = "POSTED",
    val lines: List<JournalEntryLine> = emptyList()
)

@Serializable
data class CreateJournalRequest(
    val tanggal: String,
    val referensi: String? = null,
    val memo: String? = null,
    val lines: List<CreateJournalLineBody>
)

@Serializable
data class CreateJournalLineBody(
    val coaId: Int,
    val keterangan: String? = null,
    val debit: Double = 0.0,
    val kredit: Double = 0.0
)

@Serializable
data class BukuBesarEntry(
    val tanggal: String,
    val keterangan: String,
    val referensi: String? = null,
    val debit: Double = 0.0,
    val kredit: Double = 0.0,
    val saldo: Double = 0.0
)

@Serializable
data class BukuBesarData(
    val account: ChartOfAccount? = null,
    val coa: ChartOfAccount? = null,
    val entries: List<BukuBesarEntry> = emptyList(),
    val saldoAkhir: Double = 0.0
)

// â”€â”€â”€ Laporan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class LabaRugiData(
    val pendapatan: Double = 0.0,
    val hpp: Double = 0.0,
    val labaKotor: Double = 0.0,
    val biayaOperasional: Double = 0.0,
    val labaBersih: Double = 0.0,
    val periode: String = ""
)

@Serializable
data class ArusKasData(
    val kasAwal: Double = 0.0,
    val totalMasuk: Double = 0.0,
    val totalKeluar: Double = 0.0,
    val kasAkhir: Double = 0.0,
    val periode: String = ""
)

// â”€â”€â”€ Ecommerce / Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class EcommerceOrder(
    val id: Int,
    val unitId: Int,
    val orderNumber: String,
    val customerName: String,
    val customerPhone: String = "",
    val totalAmount: Double,
    val status: String,
    val source: String = "manual",
    val createdAt: String = "",
    val items: List<EcommerceOrderItem> = emptyList()
)

@Serializable
data class EcommerceOrderItem(
    val id: Int,
    val orderId: Int,
    val productId: String,
    val productName: String,
    val qty: Int,
    val price: Double,
    val subtotal: Double
)

// â”€â”€â”€ CS / Support Tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class SupportTicket(
    val id: Int,
    val unitId: Int,
    val subject: String,
    val status: String, // open, in_progress, resolved, closed
    val priority: String = "medium",
    val customerId: Int? = null,
    val customerName: String = "",
    val assigneeId: Int? = null,
    val assignedTo: String? = null,
    val ticketNumber: String = "",
    val description: String = "",
    val createdAt: String = "",
    val updatedAt: String = "",
    val lastMessage: String? = null,
    val lastMessageAt: String? = null
)

@Serializable
data class TicketMessage(
    val id: Int,
    val ticketId: Int,
    val senderId: Int,
    val senderType: String, // "customer" | "agent"
    val message: String,
    val senderName: String? = null,
    val createdAt: String = ""
)

@Serializable
data class CreateTicketRequest(
    val action: String = "create",
    val subject: String,
    val customerName: String,
    val priority: String = "medium",
    val message: String = "",
    val unitId: Int
)

// â”€â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

data class NotifItem(
    val id: Long = 0L,
    val pesan: String,
    val tipe: String = "info",
    val waktu: String = "",
    val isRead: Boolean = false,
    val link: String? = null,
    val kategori: String = ""
)

// â”€â”€â”€ AI Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ChatMessage(val role: String, val content: String)

@Serializable
data class ChatRequest(
    val message: String,
    val activeUnitSlug: String? = null,
    val history: List<ChatMessage> = emptyList()
)

@Serializable
data class ChatResponse(
    val reply: String,
    val suggestions: List<String> = emptyList(),
    val intent: String? = null
)

@Serializable
data class AiAdvisorRequest(val unitId: Int, val question: String)

@Serializable
data class AiAdvisorData(val analysis: String)

// â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class LowStockProduct(
    val id: String,
    val nama: String,
    val stok: Int,
    val minStok: Int
)

@Serializable
data class LaporanWaRequest(val unitId: Int, val periode: String = "hari_ini")

@Serializable
data class LaporanWaData(
    val teks: String,
    val data: LaporanRawData? = null
)

@Serializable
data class LaporanRawData(
    val masuk: Double = 0.0,
    val keluar: Double = 0.0,
    val laba: Double = 0.0,
    val totalTrx: Int = 0,
    val totalOrder: Int = 0,
    val totalOmzet: Double = 0.0,
    val periode: String = ""
)

// â”€â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class PosFeatureOverride(
    val enableDiskon: Boolean = true,
    val enableVoucher: Boolean = false,
    val enableMultiPayment: Boolean = false,
    val enableCustomer: Boolean = true,
    val enableNotes: Boolean = true,
    val enableBarcode: Boolean = true,
    val enableStock: Boolean = true,
    val maxDiskonPersen: Int = 100
)

// â”€â”€â”€ POS Shift â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class UpdateUnitSettingsRequest(
    val unitId: Int,
    val action: String = "updateBusiness",
    val namaUnit: String? = null,
    val alamat: String? = null,
    val telepon: String? = null,
    val email: String? = null,
    val modalAwal: Double? = null
)

@Serializable
data class PosShift(
    val id: Int,
    val unitId: Int,
    val userId: Int,
    val waktuBuka: String,
    val waktuTutup: String? = null,
    val modalAwal: Double = 0.0,
    val kasAkhir: Double = 0.0,
    val kasAkhirAktual: Double = 0.0,
    val selisih: Double = 0.0,
    val status: String = "OPEN", // OPEN | CLOSED
    val catatan: String? = null
)

@Serializable
data class OpenShiftRequest(
    val action: String = "open-shift",
    val unitId: Int,
    val modalAwal: Double
)

@Serializable
data class CloseShiftRequest(
    val action: String = "close-shift",
    val shiftId: Int,
    val kasAkhirAktual: Double,
    val catatan: String = "",
    val unitId: Int
)

// â”€â”€â”€ POS Return â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class PosReturn(
    val id: Int,
    val returnNumber: String,
    val orderId: String,
    val unitId: Int,
    val totalRefund: Double,
    val reason: String? = null,
    val status: String = "COMPLETED",
    val createdAt: String = ""
)

@Serializable
data class ReturnItem(
    val orderItemId: Int,
    val productId: String,
    val qtyReturned: Int,
    val refundAmount: Double
)

@Serializable
data class CreateReturnRequest(
    val action: String = "create-return",
    val orderId: String,
    val items: List<ReturnItem>,
    val reason: String,
    val unitId: Int
)

// â”€â”€â”€ Split Payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class SplitPayment(
    val method: String,
    val amount: Double
)

// â”€â”€â”€ POS Cash & Vouchers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class PosCashTransaction(
    val id: Int = 0,
    val shiftId: Int,
    val unitId: Int,
    val type: String,
    val amount: Double,
    val description: String = "",
    val createdAt: String = ""
)

@Serializable
data class PosVoucher(
    val id: Int = 0,
    val unitId: Int,
    val code: String,
    val discountType: String = "PERCENTAGE",
    val discountValue: Double,
    val maxUsage: Int = 0,
    val currentUsage: Int = 0,
    val minPurchase: Double = 0.0,
    val validFrom: String = "",
    val validUntil: String = "",
    val isActive: Boolean = true
)

// â”€â”€â”€ Fixed Assets, Tax, Budget, Closing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class FixedAsset(
    val id: Int = 0,
    val unitId: Int,
    val namaAset: String,
    val kategori: String = "LAINNYA",
    val nilaiPerolehan: Double,
    val tanggalPerolehan: String,
    val umurEkonomis: Int,
    val metodePenyusutan: String = "GARIS_LURUS",
    val nilaiSisa: Double = 0.0,
    val akumulasiPenyusutan: Double = 0.0,
    val nilaiBuku: Double = 0.0,
    val status: String = "AKTIF",
    val keterangan: String? = null
)

@Serializable
data class TaxRate(
    val id: Int = 0,
    val unitId: Int,
    val namaPajak: String,
    val persentase: Double,
    val tipe: String = "PPN",
    val isDefault: Int = 0,
    val isActive: Int = 1
)

@Serializable
data class BudgetItem(
    val id: Int = 0,
    val unitId: Int,
    val coaId: Int,
    val tahun: Int,
    val bulan: Int = 0,
    val nominal: Double,
    val keterangan: String? = null
)

@Serializable
data class ClosingPeriod(
    val id: Int = 0,
    val unitId: Int,
    val periodStart: String,
    val periodEnd: String,
    val status: String = "CLOSED",
    val labaRugiPeriode: Double = 0.0,
    val keterangan: String? = null
)

// â”€â”€â”€ HR Advanced â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class Department(
    val id: Int = 0,
    val unitId: Int,
    val name: String = "",
    val description: String = "",
    val manager: String = "",
    val budget: Double = 0.0,
    val isActive: Boolean = true,
    val employeeCount: Int = 0
)

@Serializable
data class EmployeeDocument(
    val id: Int = 0,
    val employeeId: Int,
    val documentType: String,
    val filePath: String,
    val fileName: String? = null,
    val uploadedAt: String = ""
)

@Serializable
data class EmployeeKpiRecord(
    val id: Int = 0,
    val employeeId: Int,
    val periodMonth: Int,
    val periodYear: Int,
    val targetScore: Double = 0.0,
    val actualScore: Double = 0.0,
    val rating: String? = null,
    val notes: String? = null
)

@Serializable
data class Attendance(
    val id: Int = 0,
    val employeeId: Int = 0,
    val checkIn: String = "",
    val checkOut: String? = null,
    val status: String = "present",
    val tanggal: String = ""
)

@Serializable
data class Payroll(
    val id: Int = 0,
    val employeeId: Int = 0,
    val periodMonth: Int = 0,
    val periodYear: Int = 0,
    val basicSalary: Double = 0.0,
    val allowances: Double = 0.0,
    val deductions: Double = 0.0,
    val netSalary: Double = 0.0,
    val paymentStatus: String = "unpaid"
)

@Serializable
data class EmployeeDetail(
    val employee: Employee? = null,
    val documents: List<EmployeeDocument> = emptyList(),
    val kpis: List<EmployeeKpiRecord> = emptyList(),
    val history: List<Map<String, String>> = emptyList(),
    val attendance: List<Attendance> = emptyList(),
    val payrolls: List<Payroll> = emptyList()
)

// â”€â”€â”€ CRM Advanced â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class CrmTask(
    val id: Int = 0,
    val ownerId: Int = 0,
    val unitId: Int,
    val kontakId: Int? = null,
    val dealId: Int? = null,
    val deskripsi: String,
    val deadline: String? = null,
    val status: String = "pending"
)

@Serializable
data class Quotation(
    val id: Int = 0,
    val quotationNumber: String = "",
    val unitId: Int,
    val customerId: Int? = null,
    val customerName: String = "",
    val totalAmount: Double = 0.0,
    val status: String = "DRAFT",
    val validUntil: String = "",
    val notes: String? = null,
    val items: List<QuotationItem> = emptyList()
)

@Serializable
data class QuotationItem(
    val id: Int = 0,
    val quotationId: Int = 0,
    val productId: String? = null,
    val qty: Int = 1,
    val price: Double = 0.0,
    val total: Double = 0.0
)

@Serializable
data class SalesOrder(
    val id: Int = 0,
    val orderNumber: String = "",
    val unitId: Int,
    val customerId: Int? = null,
    val customerName: String = "",
    val totalAmount: Double = 0.0,
    val status: String = "PENDING",
    val notes: String? = null,
    val items: List<SalesOrderItem> = emptyList()
)

@Serializable
data class SalesOrderItem(
    val id: Int = 0,
    val salesOrderId: Int = 0,
    val productId: String? = null,
    val qty: Int = 1,
    val price: Double = 0.0,
    val total: Double = 0.0
)

@Serializable
data class MarketingCampaign(
    val id: Int = 0,
    val unitId: Int,
    val name: String,
    val type: String = "EMAIL",
    val status: String = "DRAFT",
    val budget: Double = 0.0,
    val composeSubject: String? = null,
    val composeText: String? = null,
    val scheduledAt: String? = null
)

// â”€â”€â”€ Products Advanced â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class StockOpnameSession(
    val id: Int = 0,
    val unitId: Int,
    val warehouseId: Int,
    val createdBy: Int = 0,
    val status: String = "DRAFT",
    val notes: String? = null,
    val items: List<StockOpnameItem> = emptyList()
)

@Serializable
data class StockOpnameItem(
    val id: Int = 0,
    val opnameId: Int = 0,
    val productId: String,
    val systemStock: Int,
    val actualStock: Int,
    val difference: Int = 0,
    val notes: String? = null
)


// â”€â”€â”€ Sales Targets & Komisi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class SalesTarget(
    val id: Int = 0,
    val unitId: Int,
    val employeeId: Int? = null,
    val employeeName: String = "",
    val periode: String = "", // "2025-08"
    val targetAmount: Double = 0.0,
    val actualAmount: Double = 0.0,
    val achievementPct: Double = 0.0,
    val status: String = "active" // active, achieved, missed
)

@Serializable
data class SalesCommission(
    val id: Int = 0,
    val targetId: Int,
    val employeeId: Int,
    val commissionPct: Double = 0.0,
    val commissionAmount: Double = 0.0,
    val status: String = "pending" // pending, paid
)

@Serializable
data class SalesTargetData(
    val targets: List<SalesTarget> = emptyList(),
    val commissions: List<SalesCommission> = emptyList(),
    val summary: SalesTargetSummary = SalesTargetSummary()
)

@Serializable
data class SalesTargetSummary(
    val totalTarget: Double = 0.0,
    val totalActual: Double = 0.0,
    val avgAchievement: Double = 0.0
)

// â”€â”€â”€ Approvals (Reimbursement & Loan) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ApprovalRequest(
    val id: Int = 0,
    val unitId: Int,
    val employeeId: Int,
    val employeeName: String = "",
    val type: String = "reimbursement", // reimbursement | loan
    val amount: Double = 0.0,
    val description: String = "",
    val status: String = "pending", // pending | approved | rejected
    val approvedBy: Int? = null,
    val approvedAt: String? = null,
    val createdAt: String = "",
    val attachmentUrl: String? = null
)

@Serializable
data class ApprovalsData(
    val pending: List<ApprovalRequest> = emptyList(),
    val approved: List<ApprovalRequest> = emptyList(),
    val rejected: List<ApprovalRequest> = emptyList()
)

// â”€â”€â”€ Katalog (Product Catalog) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class KatalogProduct(
    val id: String,
    val nama: String,
    val hargaJual: Double,
    val foto: String? = null,
    val deskripsi: String? = null,
    val kategori: String = "UMUM",
    val isPublished: Boolean = false,
    val stok: Int = 0
)

@Serializable
data class KatalogSettings(
    val unitId: Int,
    val slug: String = "",
    val namaPortal: String = "",
    val logoUrl: String? = null,
    val bannerUrl: String? = null,
    val isActive: Boolean = false,
    val totalProducts: Int = 0,
    val publishedProducts: Int = 0
)

@Serializable
data class KatalogData(
    val settings: KatalogSettings? = null,
    val products: List<KatalogProduct> = emptyList()
)

// â”€â”€â”€ Marketing (Leads, Ad Tracker) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class MarketingLead(
    val id: Int = 0,
    val unitId: Int,
    val nama: String,
    val email: String = "",
    val telepon: String = "",
    val source: String = "organic", // organic | ads | referral | social
    val status: String = "new", // new | contacted | converted | lost
    val notes: String? = null,
    val createdAt: String = ""
)

@Serializable
data class AdTracker(
    val id: Int = 0,
    val unitId: Int,
    val platform: String = "meta", // meta | google | tiktok | shopee
    val campaignName: String = "",
    val spend: Double = 0.0,
    val impressions: Int = 0,
    val clicks: Int = 0,
    val conversions: Int = 0,
    val roas: Double = 0.0,
    val period: String = ""
)

@Serializable
data class MarketingData(
    val campaigns: List<MarketingCampaign> = emptyList(),
    val leads: List<MarketingLead> = emptyList(),
    val adTrackers: List<AdTracker> = emptyList(),
    val summary: MarketingSummary = MarketingSummary()
)

@Serializable
data class MarketingSummary(
    val totalLeads: Int = 0,
    val convertedLeads: Int = 0,
    val totalSpend: Double = 0.0,
    val avgRoas: Double = 0.0
)

// â”€â”€â”€ Dashboard Summary (untuk HomeScreen) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class UnitDashboardSummary(
    val unitId: Int,
    val pendapatanHariIni: Double = 0.0,
    val totalProduk: Int = 0,
    val totalKaryawan: Int = 0,
    val totalTransaksi: Int = 0
)

// â”€â”€â”€ Business Plan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class BusinessPlan(
    val id: Int = 0,
    val unitId: Int,
    val title: String = "",
    val description: String = "",
    val executiveSummary: String = "",
    val marketAnalysis: String = "",
    val swot: String = "",
    val financialProjection: String = "",
    val actionPlan: String = "",
    val status: String = "DRAFT", // DRAFT | REVIEW | APPROVED | ACTIVE
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class BusinessPlanSeedLog(
    val id: Int = 0,
    val unitId: Int,
    val planId: Int,
    val action: String = "", // SEED | APPLY
    val sourceData: String = "",
    val resultSummary: String = "",
    val createdAt: String = ""
)

// â”€â”€â”€ Sosmed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class SocialPost(
    val id: Int = 0,
    val unitId: Int,
    val platform: String = "", // INSTAGRAM | FACEBOOK | TWITTER | WHATSAPP | TIKTOK
    val caption: String = "",
    val imageUrl: String = "",
    val status: String = "DRAFT", // DRAFT | SCHEDULED | PUBLISHED
    val scheduledAt: String? = null,
    val createdAt: String = ""
)

// â”€â”€â”€ Website â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class WebsiteSetting(
    val id: Int = 0,
    val unitId: Int,
    val domainSlug: String = "",
    val theme: String = "modern", // modern | classic | retro
    val colorPrimary: String = "#6366F1",
    val heroTitle: String = "",
    val heroSubtitle: String = "",
    val aboutUs: String = "",
    val contactPhone: String = "",
    val contactEmail: String = "",
    val contactAddress: String = "",
    val isPublished: Boolean = false,
    val updatedAt: String = ""
)

// â”€â”€â”€ Help â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class HelpArticle(
    val id: String = "",
    val title: String = "",
    val content: String = "",
    val category: String = "", // GENERAL | FINANCE | POS | HR | CRM
    val tags: List<String> = emptyList(),
    val views: Int = 0,
    val helpful: Int = 0,
    val notHelpful: Int = 0
)

// â”€â”€â”€ Landing Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class LandingPage(
    val id: Int = 0,
    val unitId: Int,
    val title: String = "",
    val pageSlug: String = "",
    val template: String = "leadgen", // leadgen | promo | catalog | portfolio | minimal | luxury | event | seasonal | webinar | restaurant
    val contentJson: String = "{}", // JSON string with sections config
    val isActive: Boolean = false,
    val views: Int = 0,
    val leads: Int = 0,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class LandingPageTemplate(
    val key: String = "",
    val name: String = "",
    val description: String = "",
    val sections: List<String> = emptyList(),
    val previewImage: String = ""
)

// â”€â”€â”€ Shopee â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ShopeeIntegration(
    val id: Int = 0,
    val unitId: Int,
    val shopId: String = "",
    val shopName: String = "",
    val accessToken: String = "",
    val refreshToken: String = "",
    val isActive: Boolean = false,
    val lastSyncAt: String = "",
    val connectedAt: String = ""
)



@Serializable
data class CreateUnitRequest(
    val name: String,
    val type: String,
    val is_cabang: Boolean = false,
    val cabang_dari: Int? = null
)
