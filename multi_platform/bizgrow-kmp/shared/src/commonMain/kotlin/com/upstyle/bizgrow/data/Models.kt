@file:OptIn(kotlinx.serialization.ExperimentalSerializationApi::class)

package com.upstyle.bizgrow.data

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// â”€â”€â”€ Generic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val message: String? = null,
    val data: T? = null,
    val code: String? = null
) {
    /** Alias so call sites can use either `.error` or `.message`. */
    val error: String? get() = message
}

@Serializable
data class PaginatedResponse<T>(
    val success: Boolean,
    val data: List<T> = emptyList(),
    val pagination: Pagination? = null,
    /** Server /api/app mengirim metadata halaman di `meta` (bukan `pagination`). */
    val meta: Pagination? = null,
    val message: String? = null
) {
    /** Alias so call sites can use either `.error` or `.message` (sama seperti ApiResponse). */
    val error: String? get() = message
    /** Masih ada halaman berikutnya? */
    val adaHalamanBerikut: Boolean get() = (meta ?: pagination)?.hasNext == true
}

@Serializable
data class Pagination(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Int = 0,
    val totalPages: Int = 1,
    val hasNext: Boolean = false
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
    /** Id unit induk bila ini cabang. */
    val cabangDari: Int? = null,
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
    val hppTotal: Double = 0.0,
    /** Nama akun kas/metode bayar yang sudah diterjemahkan server (mis. "Kas Tunai", "QRIS"). */
    val metodeLabel: String? = null,
    /** Kategori ABC (nama & level A/B/C) bila transaksi dikategorikan. */
    val abcNama: String? = null,
    val abcLevel: String? = null,
    /** Saldo kas setelah transaksi ini (dihitung server, akurat walau daftar difilter). */
    val saldoSetelah: Double? = null
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
    val link: String? = null,
    /** Nama unit asal notifikasi (daftar notifikasi lintas unit). */
    val unitNama: String = ""
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
    val kpi: FinanceKpi = FinanceKpi(),
    /** Titik grafik arus kas periode terpilih (per jam bila satu hari, selain itu per tanggal). */
    val grafik: List<TitikGrafik> = emptyList(),
    val produkTerlaris: List<ProdukTerlaris> = emptyList(),
    val perJam: Boolean = false,
    /** Masih ada transaksi lebih lama untuk dimuat (paginasi riwayat). */
    val adaLagi: Boolean = false,
    val abcOptions: List<AbcOpsi> = emptyList()
)

@Serializable
data class AbcOpsi(val id: Int = 0, val nama: String = "", val level: String = "C")

/** Filter daftar riwayat transaksi (diproses server). */
data class RiwayatFilter(
    val start: String? = null,
    val end: String? = null,
    val jenis: String = "",
    val q: String = "",
    val abcId: Int = 0,
    val urut: String = "terbaru"
)

@Serializable
data class TitikGrafik(val label: String = "", val masuk: Double = 0.0, val keluar: Double = 0.0)

@Serializable
data class ProdukTerlaris(val nama: String = "", val total: Double = 0.0, val qty: Int = 0)

@Serializable
data class FinanceSummary(
    @SerialName("total_masuk") val totalMasuk: Double = 0.0,
    @SerialName("total_keluar") val totalKeluar: Double = 0.0,
    @SerialName("total_hpp") val totalHpp: Double = 0.0,
    /** Saldo kas sepanjang waktu (modal awal + masuk − keluar); tidak ikut filter periode. */
    val saldoKas: Double? = null
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

/** Rentang periode dashboard — sama dengan preset web (zona WIB). */
val PresetPeriode = listOf("Semua", "Hari Ini", "Kemarin", "7 Hari", "Bulan Ini")

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
    val qty: Int = 1,
    /** Akun pendapatan/beban (COA). Kosong → server pakai akun default unit. */
    val coaId: Int? = null,
    /** Akun kas/bank. Kosong → server pilih dari metodeBayar (KAS / BANK / QRIS ...). */
    val kasCoaId: Int? = null
)

/** Balasan POST api/app/finance */
@Serializable
data class TransaksiTersimpan(val id: Int? = null, val journalId: Int? = null)

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
    val variants: List<ProductVariant> = emptyList(),
    /** BARANG_JADI (dijual) | BAHAN_BAKU | KEMASAN | PERLENGKAPAN — hanya barang jadi yang boleh di kasir */
    val jenis: String = "BARANG_JADI"
) {
    val bisaDijual: Boolean get() = jenis.isBlank() || jenis.equals("BARANG_JADI", ignoreCase = true)
}

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

/** Isi formulir produk (tambah / ubah). */
data class ProdukForm(
    val nama: String,
    val jenis: String = "BARANG_JADI",
    val kategoriId: Int? = null,
    val kategoriBaru: String = "",
    val sku: String = "",
    val barcode: String = "",
    val hargaBeli: Double = 0.0,
    val hargaJual: Double = 0.0,
    val stok: Int = 0,
    val minStok: Int = 5,
    val foto: String? = null,
    val varian: List<ProductVariant> = emptyList()
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
    @EncodeDefault val action: String = "checkout",
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
    val queueNumber: String? = null,
    /** Kenakan PPN penjualan memakai tarif PPN aktif unit (dihitung server). */
    val kenaiPpn: Boolean = false,
    /** true = harga sudah termasuk PPN (PPN dipisah dari total). */
    val ppnInklusif: Boolean = false,
    val notes: String? = null,
    val amountPaid: Double? = null,
    val changeAmount: Double? = null,
    val payments: List<SplitPayment>? = null
)

@Serializable
data class CreateCustomerRequest(
    @EncodeDefault val action: String = "create-customer",
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
    val ringkasan: RingkasanHr = RingkasanHr(),
    val salaryComponents: List<SalaryComponent> = emptyList(),
    val employees: List<Employee> = emptyList(),
    val attendance: List<AttendanceRecord> = emptyList(),
    val payroll: List<PayrollRecord> = emptyList(),
    val leaveRequests: List<LeaveRequest> = emptyList()
)

/** Ringkasan eksekutif HR dari server (seluruh karyawan unit, bukan hanya halaman yang dimuat). */
@Serializable
data class RingkasanHr(
    val totalKaryawan: Int = 0,
    val karyawanAktif: Int = 0,
    val bebanGaji: Double = 0.0,
    val hadirHariIni: Int = 0,
    val cutiMenunggu: Int = 0,
    val kontrakSegeraHabis: Int = 0,
    val kontrakLewat: Int = 0,
    val kpiRataRata: Double? = null,
    val payrollBulanIni: RingkasanPayroll = RingkasanPayroll(),
    val bulan: Int = 0,
    val tahun: Int = 0
)

@Serializable
data class RingkasanPayroll(val dibayar: Int = 0, val belumDibayar: Int = 0, val nominalDibayar: Double = 0.0, val nominalBelum: Double = 0.0)

@Serializable
data class CreateEmployeeRequest(
    @EncodeDefault val action: String = "create-employee",
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
    val employeeIdCard: String = "",
    val password: String = "",
    val division: String = "",
    val jobGrade: String = "",
    val contractStart: String = "",
    val contractEnd: String = "",
    val bankName: String = "",
    val bankAccountNumber: String = "",
    val taxId: String = ""
)

@Serializable
data class CheckInRequest(
    @EncodeDefault val action: String = "check-in",
    val employeeId: Int,
    val unitId: Int,
    val date: String,
    val time: String,
    /** PIN karyawan; diverifikasi server bila karyawan punya PIN */
    val pin: String? = null
)

@Serializable
data class CheckOutRequest(
    @EncodeDefault val action: String = "check-out",
    val employeeId: Int,
    val date: String,
    val time: String,
    val pin: String? = null
)

@Serializable
data class ProcessPayrollRequest(
    @EncodeDefault val action: String = "process-payroll",
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
    val namaDeal: String = "",
    val contactName: String = "",
    val companyName: String = "",
    val dealValue: Double = 0.0,
    val stage: String = "PROSPEK",
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
    @EncodeDefault val action: String = "create-contact",
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
    val stage: String = "PROSPEK",
    val phone: String = "",
    val unitId: Int,
    val kontakId: Int? = null,
    val namaDeal: String? = null
)

@Serializable
data class UpdateDealStageRequest(val dealId: Int, val stage: String, val unitId: Int)

@Serializable
data class CreateActivityRequest(
    @EncodeDefault val action: String = "create-activity",
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
    val address: String,
    val npwp: String = "",
    val termPembayaran: Int = 30,
    val isActive: Int = 1
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
    val notes: String? = null,
    /** Jumlah baris barang di PO (kartu hanya menampilkan barang pertama). */
    val jumlahItem: Int = 1
)

@Serializable
data class LaporanPembelian(
    val dari: String = "",
    val sampai: String = "",
    val jumlahFaktur: Int = 0,
    val subtotal: Double = 0.0,
    val diskon: Double = 0.0,
    val ongkir: Double = 0.0,
    val ppn: Double = 0.0,
    val total: Double = 0.0,
    val perSupplier: List<LaporanPerSupplier> = emptyList(),
    val perProduk: List<LaporanPerProduk> = emptyList()
)

@Serializable
data class LaporanPerSupplier(val nama: String = "", val jumlah: Int = 0, val total: Double = 0.0)

@Serializable
data class LaporanPerProduk(val nama: String = "", val qty: Int = 0, val nilai: Double = 0.0)

@Serializable
data class ScmData(
    val suppliers: List<Supplier> = emptyList(),
    val purchaseOrders: List<PurchaseOrder> = emptyList()
)

@Serializable
data class CreateSupplierRequest(
    @EncodeDefault val action: String = "create-supplier",
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
    @EncodeDefault val action: String = "create-po",
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
    val nominalBayar: Double,
    /** Akun kas/bank penerima (piutang) atau sumber bayar (hutang); kosong = akun kas default */
    val kasCoaId: Int? = null
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
    val deskripsi: String? = null,
    /** Akun induk (sub-akun) — sama dengan "Sub-Akun Dari" di web. */
    val parentId: Int? = null
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
    val nomorJurnal: String = "",
    val sumber: String = "MANUAL",
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
    val saldoAwal: Double = 0.0,
    val totalDebit: Double = 0.0,
    val totalKredit: Double = 0.0,
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
    val unitId: Int = 0,
    val orderNumber: String = "",
    val customerName: String = "",
    val customerEmail: String = "",
    val customerPhone: String = "",
    val shippingAddress: String = "",
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val totalAmount: Double = 0.0,
    /** PENDING, PAID, FAILED, EXPIRED */
    val paymentStatus: String = "PENDING",
    /** PENDING, PROCESSING, SHIPPED, DELIVERED */
    val shippingStatus: String = "PENDING",
    /** Gabungan dari server: PENDING, PAID, PROCESSING, SHIPPED, COMPLETED, CANCELLED */
    val status: String = "PENDING",
    val source: String = "manual",
    val createdAt: String = "",
    val items: List<EcommerceOrderItem> = emptyList()
)

@Serializable
data class EcommerceOrderItem(
    val id: Int = 0,
    val ecommerceOrderId: Int = 0,
    val productId: String? = null,
    val productName: String = "",
    val qty: Int = 1,
    val price: Double = 0.0,
    val total: Double = 0.0
) {
    /** Alias lama. */
    val subtotal: Double get() = total
}

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
    @EncodeDefault val action: String = "create",
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
    val reply: String = "",
    val suggestions: List<String> = emptyList(),
    val intent: String? = null,
    /** Konfigurasi Chart.js dari server (type + data.labels + data.datasets). */
    val chartData: kotlinx.serialization.json.JsonElement? = null,
    /** Transaksi hasil deteksi bahasa natural — perlu dilengkapi akun kas & COA sebelum disimpan. */
    val transactionPreviews: List<TrxPreview>? = null
)

@Serializable
data class AiAdvisorRequest(val unitId: Int, val question: String)

@Serializable
data class AiAdvisorData(val analysis: String)

// ─── AI Entry (NLP Transaction Parsing) ──────────────────────────────────────

@Serializable
data class AiEntryRequest(
    val unitId: Int,
    val teksInput: String
)

@Serializable
data class AiEntryHasil(
    val product_id: String? = null,
    val qty: Int = 1,
    val kategori: String = "Masuk",   // "Masuk" | "Keluar"
    val coa_id: Int? = null,
    val kas_coa_id: Int? = null,
    val nominal: Double = 0.0,
    val catatan: String = ""
)

@Serializable
data class AiEntryData(val hasil: AiEntryHasil)

/** UI-level model — non-serializable, diisi dari AiEntryHasil */
data class AiEntryResult(
    val productId: String? = null,
    val qty: Int = 1,
    val kategori: String = "Masuk",
    val coaId: Int? = null,
    val kasCoaId: Int? = null,
    val nominal: Double = 0.0,
    val catatan: String = ""
)

// ─── AI Kategori ─────────────────────────────────────────────────────────────

@Serializable
data class AiKategoriRequest(
    val teks: String,
    val unitId: Int
)

@Serializable
data class AiKategoriResult(
    val abc_id: Int? = null,
    val confidence: Int = 0,
    val reason: String = ""
)

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

/** Pengaturan toko online (web: ecommerce/[slug]) */
@Serializable
data class StoreSettings(
    val unitId: Int = 0,
    val storefrontName: String = "",
    val description: String = "",
    val logoUrl: String = "",
    val domainSlug: String = "",
    val isActive: Boolean = false,
    val payment: StorePaymentConfig = StorePaymentConfig()
)

/** Konfigurasi bayar toko — server key tidak pernah dikirim ke app, hanya serverKeySet */
@Serializable
data class StorePaymentConfig(val midtrans: StoreMidtransConfig = StoreMidtransConfig())

@Serializable
data class StoreMidtransConfig(
    val clientKey: String = "",
    val sandbox: Boolean = true,
    val configured: Boolean = false,
    val serverKeySet: Boolean = false
)

/** Artikel knowledge base layanan pelanggan per unit */
@Serializable
data class KnowledgeArticle(
    val id: Int = 0,
    val unitId: Int = 0,
    val category: String = "Umum",
    val title: String = "",
    val content: String = "",
    val views: Int = 0,
    val createdAt: String = ""
)

/** Pengaturan fitur POS per unit (sama dengan halaman web pos/kelola/fitur) */
@Serializable
data class PosFeatureSettings(
    val category: String = "UMUM",
    /** fitur yang berlaku sekarang, mis. posEnabled, barcodeScanner, splitPayment, showStock ... */
    val activeFeatures: Map<String, Boolean> = emptyMap(),
    /** bawaan kategori usaha (dipakai setelah reset) */
    val defaultFeatures: Map<String, Boolean> = emptyMap(),
    val overrides: Map<String, Boolean> = emptyMap(),
    val keys: List<String> = emptyList()
)

/** Produk di pengaturan "tampil di kasir" (pos/kelola/produk) */
@Serializable
data class PosProductItem(
    val id: String = "",
    val nama: String = "",
    val sku: String = "",
    val hargaJual: Double = 0.0,
    val stok: Int = 0,
    val showInPos: Boolean = true
)

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

// ─── Pusat Bantuan (konten sama dengan halaman /help web, dari GET /api/app/help) ───

@Serializable
data class BantuanFaq(val id: Int = 0, val q: String = "", val a: String = "", val category: String = "")

@Serializable
data class BantuanKategori(val id: String = "", val label: String = "")

@Serializable
data class BantuanPanduan(val title: String = "", val desc: String = "", val steps: List<String> = emptyList())

@Serializable
data class BantuanMasalah(val problem: String = "", val solution: String = "")

@Serializable
data class BantuanTroubleshoot(val id: String = "", val label: String = "", val masalah: List<BantuanMasalah> = emptyList())

@Serializable
data class BantuanKonten(
    val items: List<BantuanFaq> = emptyList(),
    val kategori: List<BantuanKategori> = emptyList(),
    val panduan: List<BantuanPanduan> = emptyList(),
    val troubleshoot: List<BantuanTroubleshoot> = emptyList()
)

@Serializable
data class DokumenLink(val url: String = "", val berlakuMenit: Int = 10)

@Serializable
data class RealtimeConfig(val socketUrl: String = "", val token: String = "", val exp: Long = 0)

@Serializable
data class UpdatePortalRequest(
    val unitId: Int,
    val generateNewSlug: Boolean,
    val action: String
)

@Serializable
data class PortalResult(val loginSlug: String = "", val portalPath: String = "")

@Serializable
data class UpdateUnitSettingsRequest(
    val unitId: Int,
    @EncodeDefault val action: String = "updateBusiness",
    val namaUnit: String? = null,
    val kategori: String? = null,
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
    @EncodeDefault val action: String = "open-shift",
    val unitId: Int,
    val modalAwal: Double
)

@Serializable
data class CloseShiftRequest(
    @EncodeDefault val action: String = "close-shift",
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
    @EncodeDefault val action: String = "create-return",
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
    val keterangan: String? = null,
    /** Akun aset tetap di COA (opsional). */
    val coaId: Int? = null,
    val penyusutanBulanan: Double = 0.0,
    val bulanBerjalan: Int = 0
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
    val keterangan: String? = null,
    // dihitung server dari jurnal
    val namaAkun: String = "",
    val kodeAkun: String = "",
    val tipeAkun: String = "",
    val realisasi: Double = 0.0,
    val progress: Int = 0,
    val selisih: Double = 0.0,
    val melebihi: Boolean = false,
    val pendapatan: Boolean = false
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
    val status: String = "pending",
    val contactName: String = "",
    val createdAt: String = ""
)

/** Baris item yang dikirim saat membuat penawaran / sales order. */
data class ItemJual(val productId: String?, val qty: Int, val price: Double)

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
    val createdAt: String = "",
    val items: List<QuotationItem> = emptyList()
)

@Serializable
data class QuotationItem(
    val id: Int = 0,
    val quotationId: Int = 0,
    val productId: String? = null,
    val productName: String = "",
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
    val createdAt: String = "",
    val items: List<SalesOrderItem> = emptyList()
)

@Serializable
data class SalesOrderItem(
    val id: Int = 0,
    val salesOrderId: Int = 0,
    val productId: String? = null,
    val productName: String = "",
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
    val warehouseId: Int = 0,
    val createdBy: Int = 0,
    val status: String = "DRAFT",
    val notes: String? = null,
    val createdAt: String = "",
    val completedAt: String? = null,
    val items: List<StockOpnameItem> = emptyList()
)

@Serializable
data class StockOpnameItem(
    val id: Int = 0,
    val opnameId: Int = 0,
    val productId: String,
    val productName: String = "",
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
    /** Kategori usaha (kunci CATEGORY_TO_COA di server), dipakai saat plan diterapkan */
    val kategori: String = "RETAIL_MINIMARKET",
    val description: String = "",
    val executiveSummary: String = "",
    val marketAnalysis: String = "",
    val swot: String = "",
    val financialProjection: String = "",
    val actionPlan: String = "",
    val status: String = "DRAFT", // DRAFT | COMPLETE | APPLIED
    /** Langkah wizard terakhir (1–7) dan apakah sudah diterapkan jadi data bisnis. */
    val currentStep: Int = 1,
    val isSeeded: Boolean = false,
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
data class CreateUnitRequest(
    val name: String,
    val type: String? = null,
    val is_cabang: Boolean = false,
    val cabang_dari: Int? = null,
    val alamat: String? = null,
    val telepon: String? = null,
    val email: String? = null,
    val modal_awal: Double? = null
)

// ─── Subscription & Billing ───────────────────────────────────────────────────

@Serializable
data class UsageLimits(
    val maxProducts: Int = 0,
    val maxStorageMb: Long = 0L,
    val maxUsers: Int = 0,
    val maxBusinessUnits: Int = 0
)

@Serializable
data class PlanPricing(
    val monthly: Double = 0.0,
    val yearly: Double = 0.0,
    val currency: String = "IDR"
)

@Serializable
data class SubscriptionPlan(
    val id: String = "",
    val name: String = "",
    val tier: String = "FREE", // FREE | STARTER | PRO | ENTERPRISE
    val features: List<String> = emptyList(),
    val limits: UsageLimits = UsageLimits(),
    val pricing: PlanPricing = PlanPricing(),
    val isPopular: Boolean = false,
    val description: String = ""
) {
    val priceMonthly: Double get() = pricing.monthly
    val priceYearly: Double get() = pricing.yearly
    val maxProducts: Int get() = limits.maxProducts
    val maxUsers: Int get() = limits.maxUsers
    val maxStorageMb: Long get() = limits.maxStorageMb
}

@Serializable
data class BillingInfo(
    val paymentMethod: String = "",
    val lastFourDigits: String = "",
    val cardBrand: String = "",
    val billingEmail: String = "",
    val billingAddress: String = ""
)

@Serializable
data class CurrentUsage(
    val products: Int = 0,
    val storageUsedMb: Long = 0L,
    val users: Int = 0,
    val businessUnits: Int = 0
) {
    val productCount: Int get() = products
    val userCount: Int get() = users
}

@Serializable
data class CurrentSubscription(
    val planId: String = "",
    val planName: String = "",
    val status: String = "active", // active | cancelled | past_due | trialing
    val usage: CurrentUsage = CurrentUsage(),
    val limits: UsageLimits = UsageLimits(),
    val billingInfo: BillingInfo? = null,
    val nextBillingDate: String = "",
    val trialEndsAt: String? = null
)

@Serializable
data class UsageMetrics(
    val products: Int = 0,
    val storageUsedMb: Long = 0L,
    val users: Int = 0,
    val businessUnits: Int = 0,
    val apiCallsThisMonth: Int = 0,
    val lastUpdated: String = "",
    val limits: UsageLimits = UsageLimits()
) {
    /** Computed aliases used by SubscriptionPlansScreen / AppViewModel. */
    val productCount: Int get() = products
    val userCount: Int get() = users
    val maxProducts: Int get() = limits.maxProducts
    val maxUsers: Int get() = limits.maxUsers
    val maxStorageMb: Long get() = limits.maxStorageMb
}

@Serializable
data class Invoice(
    val id: String = "",
    val invoiceNumber: String = "",
    val amount: Double = 0.0,
    val currency: String = "IDR",
    val status: String = "paid", // paid | unpaid | void
    val issuedAt: String = "",
    val paidAt: String? = null,
    val downloadUrl: String? = null,
    val description: String = ""
) {
    val issuedDate: String get() = issuedAt
}

@Serializable
data class PaymentRequest(
    val planId: String,
    val paymentMethod: String,
    val currency: String = "IDR",
    val unitId: Int = 0
)

@Serializable
data class PaymentSession(
    val sessionId: String = "",
    val token: String = "",
    val redirectUrl: String? = null,
    val snapToken: String? = null,
    val amount: Double = 0.0,
    val currency: String = "IDR",
    val expiresAt: String = ""
)

@Serializable
data class PaymentResult(
    val transactionId: String = "",
    val status: String = "success", // success | failed | pending
    val planId: String = "",
    val amount: Double = 0.0,
    val currency: String = "IDR",
    val message: String = "",
    val paidAt: String = ""
)

// ─── Advanced Product Models ──────────────────────────────────────────────────

@Serializable
data class PricingStrategy(
    val id: String = "",
    val productId: String = "",
    val name: String = "",
    val type: String = "FIXED", // FIXED | PERCENTAGE | TIERED
    val value: Double = 0.0,
    val startDate: String = "",
    val endDate: String = "",
    val minQty: Int = 1,
    val isActive: Boolean = true
)

@Serializable
data class StockMovement(
    val id: String = "",
    val productId: String = "",
    val variantId: String? = null,
    val type: String = "ADJUSTMENT", // PURCHASE | SALE | ADJUSTMENT | RETURN | TRANSFER
    val quantity: Int = 0,
    val stockBefore: Int = 0,
    val stockAfter: Int = 0,
    val reason: String = "",
    val notes: String? = null,
    val referenceId: String? = null,
    val createdBy: String = "",
    val createdAt: String = ""
)

@Serializable
data class ProductBulkUpdate(
    val productId: String,
    val operation: String, // PRICE_UPDATE | CATEGORY_CHANGE | STATUS_CHANGE | ARCHIVE
    val newPrice: Double? = null,
    val newCategoryId: Int? = null,
    val newStatus: String? = null
)

@Serializable
data class BulkOperation(
    val id: String = "",
    val type: String = "", // PRICE_UPDATE | CATEGORY_CHANGE | STATUS_CHANGE | ARCHIVE
    val items: List<ProductBulkUpdate> = emptyList(),
    val unitId: Int = 0,
    val productIds: List<String> = emptyList(),
    val payload: Map<String, String> = emptyMap()
)

@Serializable
data class BulkOperationItemResult(
    val productId: String = "",
    val success: Boolean = false,
    val error: String? = null
)

@Serializable
data class BulkOperationResult(
    val operationId: String = "",
    val totalItems: Int = 0,
    val successCount: Int = 0,
    val failureCount: Int = 0,
    val itemResults: List<BulkOperationItemResult> = emptyList(),
    val completedAt: String = ""
)

// ─── Sync Queue ───────────────────────────────────────────────────────────────

@Serializable
data class SyncQueueItem(
    /** Dipakai juga sebagai header Idempotency-Key — server tidak mencatat request yang sama dua kali */
    val id: String = "",
    val action: String = "", // CREATE | UPDATE | DELETE
    val entityType: String = "", // product | transaction | contact etc.
    val entityId: String = "",
    val payload: String = "", // JSON-serialized request body
    val enqueuedAt: String = "",
    val retryCount: Int = 0,
    /** Endpoint asli, mis. "api/app/finance" (opsi B: kirim ulang ke API biasa) */
    val path: String = "",
    /** POST | PUT | DELETE */
    val method: String = "POST",
    /** Pesan terakhir dari server kalau ditolak permanen (4xx) */
    val lastError: String? = null
)

@Serializable
data class SyncConflict(
    val entityType: String = "",
    val entityId: String = "",
    val localVersion: String = "", // JSON
    val remoteVersion: String = "", // JSON
    val conflictAt: String = ""
)

@Serializable
data class SyncResult(
    val flushedCount: Int = 0,
    val failedCount: Int = 0,
    val conflictsDetected: Int = 0
)

// ─── Export / Import ──────────────────────────────────────────────────────────

@Serializable
data class ExportResult(
    val exportId: String = "",
    val filePath: String = "",
    val fileName: String = "",
    val format: String = "CSV", // CSV | EXCEL | PDF
    val recordCount: Int = 0,
    val fileSizeBytes: Long = 0L,
    val downloadUrl: String? = null,
    val createdAt: String = ""
)

@Serializable
data class ImportResult(
    val importId: String = "",
    val totalRows: Int = 0,
    val successRows: Int = 0,
    val failedRows: Int = 0,
    val errors: List<String> = emptyList(),
    val completedAt: String = ""
) {
    /** Aliases used by AppViewModel / ExportImportScreen. */
    val importedCount: Int get() = successRows
    val failedCount: Int get() = failedRows
}

@Serializable
data class ExportHistoryItem(
    val exportId: String = "",
    val fileName: String = "",
    val dataType: String = "",
    val format: String = "",
    val recordCount: Int = 0,
    val status: String = "completed", // completed | failed | processing
    val downloadUrl: String? = null,
    val createdAt: String = ""
)

@Serializable
data class ImportValidationResult(
    val isValid: Boolean = false,
    val totalRows: Int = 0,
    val errors: List<String> = emptyList(),
    val suggestedMapping: Map<String, String> = emptyMap()
) {
    /** Alias used by ExportImportScreen. */
    val rowCount: Int get() = totalRows
}

// ─── Help / Diagnostics ───────────────────────────────────────────────────────

@Serializable
data class DiagnosticCheck(
    val name: String = "",
    val status: String = "ok", // ok | warning | error
    val message: String = "",
    val detail: String? = null
)

@Serializable
data class DiagnosticResult(
    val overallStatus: String = "ok", // ok | warning | error
    val checks: List<DiagnosticCheck> = emptyList(),
    val timestamp: String = ""
)

@Serializable
data class SubmitSupportTicketRequest(
    val title: String,
    val description: String,
    val priority: String = "medium", // low | medium | high | urgent
    val category: String = "general",
    val attachmentUrls: List<String> = emptyList(),
    val unitId: Int,
    val screenContext: String? = null
)

// ─── Help FAQ ─────────────────────────────────────────────────────────────────

@Serializable
data class HelpFaqItem(
    val id: String,
    val question: String,
    val answer: String,
    val category: String
)

// ─── Submit Ticket (simplified) ───────────────────────────────────────────────

@Serializable
data class SubmitTicketRequest(
    val title: String,
    val description: String,
    val priority: String = "medium", // "low" | "medium" | "high"
    val unitId: Int
)

// ─── Help FAQ (alias for use in HelpCenterState) ─────────────────────────────
// Note: HelpFaqItem is the @Serializable API model; HelpFaq is the UI-level alias.
data class HelpFaq(
    val id: String,
    val question: String,
    val answer: String,
    val category: String
)

@Serializable
data class SyncQueueFlushRequest(
    val unitId: Int,
    val items: List<SyncQueueItem>
)

// ─── Laporan lengkap (sama dengan halaman Laporan web) ───────────────────────

@Serializable
data class AkunSaldo(val id: Int = 0, val kodeAkun: String = "", val namaAkun: String = "", val saldo: Double = 0.0)

@Serializable
data class LaporanSummary(
    val totalMasuk: Double = 0.0,
    val totalKeluar: Double = 0.0,
    val totalHpp: Double = 0.0,
    val jumlahTrx: Int = 0,
    val labaKotor: Double = 0.0
)

@Serializable
data class LaporanArusBulan(val bulan: Int = 0, val masuk: Double = 0.0, val keluar: Double = 0.0)

@Serializable
data class LaporanProdukLaris(
    val productId: String? = null,
    val namaProduk: String? = null,
    val totalRevenue: Double = 0.0,
    val totalQty: Double = 0.0
)

@Serializable
data class LaporanMetodeBayar(val metode: String = "KAS", val total: Double = 0.0)

@Serializable
data class LaporanTrxTerbaru(
    val id: Int = 0,
    val kategoriTrx: String = "",
    val nominal: Double = 0.0,
    val keterangan: String = "",
    val tanggal: Long? = null
)

@Serializable
data class LaporanDashboard(
    val summary: LaporanSummary = LaporanSummary(),
    val arusKas: List<LaporanArusBulan> = emptyList(),
    val produkTerlaris: List<LaporanProdukLaris> = emptyList(),
    val metodeBayarStats: List<LaporanMetodeBayar> = emptyList(),
    val riwayatTrx: List<LaporanTrxTerbaru> = emptyList()
)

@Serializable
data class LaporanLabaRugi(
    val pendapatan: List<AkunSaldo> = emptyList(),
    val hpp: List<AkunSaldo> = emptyList(),
    val beban: List<AkunSaldo> = emptyList(),
    val pendapatanLainnya: List<AkunSaldo> = emptyList(),
    val bebanLainnya: List<AkunSaldo> = emptyList(),
    val totalPendapatan: Double = 0.0,
    val totalHpp: Double = 0.0,
    val totalBeban: Double = 0.0,
    val totalPendapatanLainnya: Double = 0.0,
    val totalBebanLainnya: Double = 0.0,
    val labaKotor: Double = 0.0,
    val labaBersih: Double = 0.0
)

@Serializable
data class LaporanNeraca(
    val asetLancar: List<AkunSaldo> = emptyList(),
    val asetTetap: List<AkunSaldo> = emptyList(),
    val liabilitasLancar: List<AkunSaldo> = emptyList(),
    val liabilitasJangkaPanjang: List<AkunSaldo> = emptyList(),
    val ekuitas: List<AkunSaldo> = emptyList(),
    val totalAsetLancar: Double = 0.0,
    val totalAsetTetap: Double = 0.0,
    val totalAset: Double = 0.0,
    val totalLiabilitasLancar: Double = 0.0,
    val totalLiabilitasPanjang: Double = 0.0,
    val totalLiabilitas: Double = 0.0,
    val totalEkuitas: Double = 0.0
)

@Serializable
data class LaporanLengkap(
    val tahun: Int = 0,
    val bulan: String = "all",
    val dashboard: LaporanDashboard = LaporanDashboard(),
    val labaRugi: LaporanLabaRugi = LaporanLabaRugi(),
    val neraca: LaporanNeraca = LaporanNeraca()
)

// ─── Antrean dapur / kasir ───────────────────────────────────────────────────

@Serializable
data class PosQueueItem(
    val id: Int = 0,
    val orderNumber: String = "",
    val queueNumber: String = "",
    val fulfillmentStatus: String = "PENDING",
    val orderType: String = "TAKEAWAY",
    val tableNumber: String? = null,
    val total: Double = 0.0,
    val createdAt: String? = null
)

@Serializable
data class PosQueueData(val queue: List<PosQueueItem> = emptyList())

// ─── Detail Purchase Order (padanan pengadaan/po/[id] di web) ────────────────

@Serializable
data class PoItemDetail(
    val id: Int = 0,
    val productId: String = "",
    val namaProduk: String = "",
    val sku: String = "",
    val qtyOrdered: Int = 0,
    val qtyReceived: Int = 0,
    val qtyInvoiced: Int = 0,
    val qtyReturned: Int = 0,
    val unitPrice: Double = 0.0,
    val totalPrice: Double = 0.0
)

@Serializable
data class PoPenerimaan(val id: Int = 0, val nomor: String = "", val tanggal: String = "", val noSuratJalan: String = "", val ringkasan: String = "")

@Serializable
data class PoTagihan(
    val id: Int = 0,
    val nomorFaktur: String = "",
    val tanggal: String = "",
    val jatuhTempo: String = "",
    val total: Double = 0.0,
    val payableId: Int = 0,
    val nominalHutang: Double = 0.0,
    val sudahDibayar: Double = 0.0,
    val statusHutang: String = ""
)

@Serializable
data class PoRetur(val id: Int = 0, val nomor: String = "", val tanggal: String = "", val alasan: String = "", val ringkasan: String = "")

@Serializable
data class PoAkunKas(val id: Int = 0, val kodeAkun: String = "", val namaAkun: String = "")

@Serializable
data class PoDetail(
    val id: Int = 0,
    val poNumber: String = "",
    val status: String = "",
    val supplierName: String = "",
    val supplierPhone: String = "",
    val notes: String = "",
    val diskon: Double = 0.0,
    val ongkir: Double = 0.0,
    val ppnPersen: Double = 0.0,
    val totalAmount: Double = 0.0,
    val expectedDate: String? = null,
    val items: List<PoItemDetail> = emptyList(),
    val penerimaan: List<PoPenerimaan> = emptyList(),
    val tagihan: List<PoTagihan> = emptyList(),
    val retur: List<PoRetur> = emptyList(),
    val akunKas: List<PoAkunKas> = emptyList()
)

// ─── Detail karyawan (api/app/hr/[employeeId]) ───────────────────────────────

@Serializable
data class HrKaryawan(
    val id: Int = 0,
    val fullName: String = "",
    val position: String = "",
    val salary: Double = 0.0,
    val joinDate: String = "",
    val email: String = "",
    val phone: String = "",
    val division: String = "",
    val status: String = "active",
    val employmentStatus: String = "",
    val contractStart: String = "",
    val contractEnd: String = "",
    val bankName: String = "",
    val bankAccountNumber: String = "",
    val address: String = "",
    val emergencyContact: String = "",
    val jobGrade: String = "",
    val placementLocation: String = ""
)

@Serializable
data class HrKpi(val id: Int = 0, val periodMonth: Int = 0, val periodYear: Int = 0, val score: Double = 0.0, val notes: String = "")

@Serializable
data class HrRiwayatJabatan(val id: Int = 0, val oldPosition: String = "", val newPosition: String = "", val changeDate: String = "", val reason: String = "")

@Serializable
data class HrDokumen(val id: Int = 0, val documentType: String = "", val fileName: String = "", val uploadedAt: String = "")

@Serializable
data class HrDetailData(
    val employee: HrKaryawan = HrKaryawan(),
    val components: List<SalaryComponent> = emptyList(),
    val kpis: List<HrKpi> = emptyList(),
    val history: List<HrRiwayatJabatan> = emptyList(),
    val documents: List<HrDokumen> = emptyList()
)

// ─── Laporan POS (api/app/pos/reports) ───────────────────────────────────────

@Serializable
data class PosReportSummary(
    val totalRevenue: Double = 0.0,
    val totalOrders: Int = 0,
    val averageOrder: Double = 0.0,
    val paidOrders: Int = 0,
    val cancelledOrders: Int = 0
)

@Serializable
data class PosTopProduct(val name: String = "", val qty: Int = 0, val revenue: Double = 0.0)

@Serializable
data class PosReport(
    val summary: PosReportSummary = PosReportSummary(),
    val topProducts: List<PosTopProduct> = emptyList(),
    val paymentBreakdown: Map<String, Double> = emptyMap()
)

// ─── Rekap pajak (api/app/finance/pajak) ─────────────────────────────────────

@Serializable
data class TarifPpn(val id: Int = 0, val namaPajak: String = "", val persentase: Double = 0.0)

@Serializable
data class PpnBulan(val bulan: Int = 0, val keluaran: Double = 0.0, val masukan: Double = 0.0, val kurangBayar: Double = 0.0)

@Serializable
data class RekapPajak(
    val tahun: Int = 0,
    val tarifPpn: TarifPpn? = null,
    val bulan: List<PpnBulan> = emptyList(),
    val totalKeluaran: Double = 0.0,
    val totalMasukan: Double = 0.0,
    val totalKurangBayar: Double = 0.0
)
