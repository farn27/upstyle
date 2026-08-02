package com.upstyle.bizgrow.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Generic ──────────────────────────────────────────────────────────────────

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

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

// ─── Business Units ───────────────────────────────────────────────────────────

@Serializable
data class BusinessUnit(
    val id: Int,
    val name: String,
    val type: String,
    val uid: String = "",
    val slug: String = "",
    val alamat: String? = null,
    val telepon: String? = null,
    val email: String? = null,
    val modalAwal: Double = 0.0,
    val isCabang: Int = 0,
    @SerialName("pos_feature_override") val posFeatureOverride: String? = null
)

@Serializable
data class CreateBusinessRequest(
    val name: String,
    val type: String,
    @SerialName("is_cabang") val isCabang: Boolean = false,
    @SerialName("cabang_dari") val cabangDari: Int? = null
)

// ─── Finance ──────────────────────────────────────────────────────────────────

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

// ─── Products ─────────────────────────────────────────────────────────────────

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

// ─── POS ──────────────────────────────────────────────────────────────────────

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

// ─── HR ───────────────────────────────────────────────────────────────────────

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
    val status: String = "active",
    val division: String? = null,
    val employmentStatus: String? = null,
    val joinDate: String? = null
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
    val type: String,
    val startDate: String,
    val endDate: String,
    val reason: String? = null,
    val status: String
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
    val division: String = "",
    val employmentStatus: String = "TETAP"
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
    val salary: Double,
    val allowance: Double,
    val deduction: Double,
    val netSalary: Double,
    val unitId: Int
)

// ─── CRM ──────────────────────────────────────────────────────────────────────

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
    val createdAt: String = ""
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

// ─── SCM ──────────────────────────────────────────────────────────────────────

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

// ─── Finance AR/AP ────────────────────────────────────────────────────────────

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

// ─── Double Entry / Jurnal ────────────────────────────────────────────────────

@Serializable
data class ChartOfAccount(
    val id: Int,
    val unitId: Int,
    val kodeAkun: String,
    val namaAkun: String,
    val tipeAkun: String,
    val isActive: Boolean = true,
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
    val account: ChartOfAccount,
    val entries: List<BukuBesarEntry> = emptyList(),
    val saldoAkhir: Double = 0.0
)

// ─── Laporan ──────────────────────────────────────────────────────────────────

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

// ─── Ecommerce / Orders ───────────────────────────────────────────────────────

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

// ─── CS / Support Tickets ─────────────────────────────────────────────────────

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
    val createdAt: String = "",
    val updatedAt: String = "",
    val lastMessage: String? = null
)

@Serializable
data class TicketMessage(
    val id: Int,
    val ticketId: Int,
    val senderId: Int,
    val senderType: String, // "customer" | "agent"
    val message: String,
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

// ─── Notifications ────────────────────────────────────────────────────────────

data class NotifItem(
    val id: Long = 0L,
    val pesan: String,
    val tipe: String = "info",
    val waktu: String = "",
    val isRead: Boolean = false,
    val link: String? = null,
    val kategori: String = ""
)

// ─── AI Chat ─────────────────────────────────────────────────────────────────

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

// ─── Reports ─────────────────────────────────────────────────────────────────

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

// ─── Settings ─────────────────────────────────────────────────────────────────

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

@Serializable
data class UpdateUnitSettingsRequest(
    val namaUnit: String? = null,
    val alamat: String? = null,
    val telepon: String? = null,
    val email: String? = null,
    val posShortageThreshold: Double? = null,
    val posFeatureOverride: String? = null
)

// ─── POS Shift ───────────────────────────────────────────────────────────

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

// ─── POS Return ──────────────────────────────────────────────────────────

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

// ─── Split Payment ──────────────────────────────────────────────────────────

@Serializable
data class SplitPayment(
    val method: String,
    val amount: Double
)
